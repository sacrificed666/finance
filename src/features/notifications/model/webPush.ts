import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  randomBytes,
  sign,
  type KeyObject,
} from "node:crypto";

import { readRecord, readText } from "@/shared/lib/guards";

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface VapidKeys {
  publicKey: Buffer;
  privateKey: KeyObject;
}

const RECORD_SIZE = 4096;

// The push services of the major browsers
const PUSH_HOSTS = [".googleapis.com", ".mozilla.com", ".push.apple.com", ".notify.windows.com"];

// Bytes as base64url
export const base64url = (data: Buffer | Uint8Array): string => Buffer.from(data).toString("base64url");
// Base64url text as bytes
export const fromBase64url = (text: string): Buffer => Buffer.from(text, "base64url");

// An HMAC-SHA256 of the parts
const hmac = (key: Buffer, ...parts: Buffer[]) => {
  const mac = createHmac("sha256", key);
  for (const part of parts) mac.update(part);
  return mac.digest();
};

// The VAPID key pair derived from a seed, the same one every time
export const vapidFromSeed = (seed: Buffer): VapidKeys => {
  for (let round = 0; ; round++) {
    const d = hmac(seed, Buffer.from(`web-push vapid ${round}`));
    try {
      const ecdh = createECDH("prime256v1");
      ecdh.setPrivateKey(d);
      const publicKey = ecdh.getPublicKey();
      const privateKey = createPrivateKey({
        key: {
          kty: "EC",
          crv: "P-256",
          d: base64url(d),
          x: base64url(publicKey.subarray(1, 33)),
          y: base64url(publicKey.subarray(33)),
        },
        format: "jwk",
      });
      return { publicKey, privateKey };
    } catch {
      if (round > 8) throw new Error("Could not derive a VAPID key");
    }
  }
};

// Whether an address is a browser push service over https
export const isPushEndpoint = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((host) => url.hostname.endsWith(host));
  } catch {
    return false;
  }
};

// Whether a value is a browser's push subscription with keys of the right size
export const isSubscription = (value: unknown): value is PushSubscriptionKeys => {
  const endpoint = readText(value, "endpoint");
  const keys = readRecord(value, "keys");
  const p256dh = readText(keys, "p256dh");
  const auth = readText(keys, "auth");
  if (endpoint === null || p256dh === null || auth === null) return false;
  return isPushEndpoint(endpoint) && fromBase64url(p256dh).length === 65 && fromBase64url(auth).length === 16;
};

// A message encrypted for a device as RFC 8291 describes
export const encryptPayload = (
  payload: Buffer,
  receiverPublic: Buffer,
  authSecret: Buffer,
  sender: { privateKey: Buffer; publicKey: Buffer } = newSenderKeys(),
  salt: Buffer = randomBytes(16),
): Buffer => {
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(sender.privateKey);
  const shared = ecdh.computeSecret(receiverPublic);
  const prkKey = hmac(authSecret, shared);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), receiverPublic, sender.publicKey, Buffer.from([1])]);
  const ikm = hmac(prkKey, keyInfo);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01")).subarray(0, 12);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([
    cipher.update(Buffer.concat([payload, Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD_SIZE, 16);
  header.writeUInt8(sender.publicKey.length, 20);
  return Buffer.concat([header, sender.publicKey, body]);
};

// A fresh key pair for one message
const newSenderKeys = (): { privateKey: Buffer; publicKey: Buffer } => {
  const ecdh = createECDH("prime256v1");
  const publicKey = ecdh.generateKeys();
  return { privateKey: ecdh.getPrivateKey(), publicKey };
};

// The signed VAPID header that tells the push service who sends
export const vapidHeader = (endpoint: string, vapid: VapidKeys, subject: string, nowMs = Date.now()): string => {
  const header = base64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = base64url(
    Buffer.from(
      JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(nowMs / 1000) + 12 * 3600, sub: subject }),
    ),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: vapid.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `vapid t=${header}.${claims}.${base64url(signature)}, k=${base64url(vapid.publicKey)}`;
};

export type PushResult = "sent" | "gone" | "failed";

// Sends a message to a device: sent, gone when the service forgot it, or failed
export const sendPush = async (
  subscription: PushSubscriptionKeys,
  message: unknown,
  vapid: VapidKeys,
  subject: string,
  ttlSeconds = 24 * 3600,
): Promise<PushResult> => {
  const body = encryptPayload(
    Buffer.from(JSON.stringify(message)),
    fromBase64url(subscription.keys.p256dh),
    fromBase64url(subscription.keys.auth),
  );
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: vapidHeader(subscription.endpoint, vapid, subject),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttlSeconds),
      Urgency: "normal",
    },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res) return "failed";
  if (res.ok) return "sent";
  return [403, 404, 410].includes(res.status) ? "gone" : "failed";
};

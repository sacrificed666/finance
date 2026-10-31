import { createDecipheriv, createECDH, createHmac, createPublicKey, verify } from "node:crypto";
import { createServer, type IncomingHttpHeaders } from "node:http";

import { describe, expect, it } from "vitest";

import {
  base64url,
  encryptPayload,
  fromBase64url,
  isPushEndpoint,
  isSubscription,
  sendPush,
  vapidFromSeed,
  vapidHeader,
} from "@/features/notifications/model/webPush";

const RFC = {
  plaintext: "When I grow up, I want to be a watermelon",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  uaPrivate: "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  message:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

// An HMAC-SHA256 of some data
const hmac = (key: Buffer, data: Buffer) => createHmac("sha256", key).update(data).digest();

// A message decrypted as the device would, checking its padding
function decrypt(message: Buffer, uaPrivate: Buffer, auth: Buffer): string {
  const salt = message.subarray(0, 16);
  const idlen = message.readUInt8(20);
  const senderPublic = message.subarray(21, 21 + idlen);
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(uaPrivate);
  const uaPublic = ecdh.getPublicKey();
  const ikm = hmac(
    hmac(auth, ecdh.computeSecret(senderPublic)),
    Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, senderPublic, Buffer.from([1])]),
  );
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01")).subarray(0, 12);
  const body = message.subarray(21 + idlen);
  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  decipher.setAuthTag(body.subarray(body.length - 16));
  const padded = Buffer.concat([decipher.update(body.subarray(0, body.length - 16)), decipher.final()]);
  expect(padded.at(-1)).toBe(2);
  return padded.subarray(0, -1).toString();
}

describe("web push encryption", () => {
  it("matches the RFC 8291 example byte for byte", () => {
    const message = encryptPayload(
      Buffer.from(RFC.plaintext),
      fromBase64url(RFC.uaPublic),
      fromBase64url(RFC.auth),
      { privateKey: fromBase64url(RFC.asPrivate), publicKey: fromBase64url(RFC.asPublic) },
      fromBase64url(RFC.salt),
    );
    expect(base64url(message)).toBe(RFC.message);
  });

  it("round-trips with fresh keys and salt", () => {
    const ua = createECDH("prime256v1");
    const uaPublic = ua.generateKeys();
    const auth = Buffer.from("0123456789abcdef");
    const text = JSON.stringify({ title: "Завтра", body: "Netflix · 399 ₴" });
    const message = encryptPayload(Buffer.from(text), uaPublic, auth);
    expect(message.readUInt32BE(16)).toBe(4096);
    expect(decrypt(message, ua.getPrivateKey(), auth)).toBe(text);
  });
});

describe("vapid", () => {
  it("derives the same key from the same seed, and a different one from another", () => {
    const a = vapidFromSeed(Buffer.from("seed one"));
    const b = vapidFromSeed(Buffer.from("seed one"));
    const c = vapidFromSeed(Buffer.from("seed two"));
    expect(a.publicKey.equals(b.publicKey)).toBe(true);
    expect(a.publicKey.equals(c.publicKey)).toBe(false);
    expect(a.publicKey).toHaveLength(65);
  });

  it("signs a token the public key verifies, for the push service's origin", () => {
    const vapid = vapidFromSeed(Buffer.from("seed"));
    const header = vapidHeader(
      "https://fcm.googleapis.com/fcm/send/abc",
      vapid,
      "mailto:me@example.com",
      1_700_000_000_000,
    );
    const [, token, key] = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
    const [h = "", c = "", s = ""] = token!.split(".");
    const claims = JSON.parse(fromBase64url(c).toString());
    expect(claims).toEqual({
      aud: "https://fcm.googleapis.com",
      exp: 1_700_000_000 + 43_200,
      sub: "mailto:me@example.com",
    });
    const pub = fromBase64url(key!);
    const publicKey = createPublicKey({
      key: { kty: "EC", crv: "P-256", x: base64url(pub.subarray(1, 33)), y: base64url(pub.subarray(33)) },
      format: "jwk",
    });
    expect(
      verify("sha256", Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, fromBase64url(s)),
    ).toBe(true);
  });
});

describe("subscriptions", () => {
  const keys = { p256dh: base64url(createECDH("prime256v1").generateKeys()), auth: base64url(Buffer.alloc(16, 7)) };

  it("accepts the browsers' push services only, over https", () => {
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/x")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isPushEndpoint("https://web.push.apple.com/x")).toBe(true);
    expect(isPushEndpoint("https://wns2-db5p.notify.windows.com/w/?token=x")).toBe(true);
    expect(isPushEndpoint("http://fcm.googleapis.com/fcm/send/x")).toBe(false);
    expect(isPushEndpoint("https://evil.example/fcm.googleapis.com")).toBe(false);
    expect(isPushEndpoint("https://localhost:5432/")).toBe(false);
  });

  it("checks the key sizes", () => {
    expect(isSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys })).toBe(true);
    expect(isSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { ...keys, auth: "AAAA" } })).toBe(
      false,
    );
    expect(isSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/x" })).toBe(false);
    expect(isSubscription(null)).toBe(false);
  });
});

// A local push service that answers with a status and keeps what it receives
async function pushService(status: number) {
  const received: Array<{ headers: IncomingHttpHeaders; body: Buffer }> = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      received.push({ headers: req.headers, body: Buffer.concat(chunks) });
      res.writeHead(status).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const url = `http://127.0.0.1:${String(port)}/push/device-1`;
  return { url, received, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

describe("sendPush", () => {
  const ua = createECDH("prime256v1");
  const uaPublic = ua.generateKeys();
  const auth = Buffer.alloc(16, 3);
  const vapid = vapidFromSeed(Buffer.from("wire"));

  it("delivers an encrypted, signed message the device can read", async () => {
    const service = await pushService(201);
    try {
      const result = await sendPush(
        { endpoint: service.url, keys: { p256dh: base64url(uaPublic), auth: base64url(auth) } },
        { title: "Що на черзі" },
        vapid,
        "mailto:me@example.com",
      );
      expect(result).toBe("sent");
      const { headers, body } = service.received[0]!;
      expect(headers["content-encoding"]).toBe("aes128gcm");
      expect(headers.ttl).toBe("86400");
      expect(headers.authorization).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
      expect(JSON.parse(decrypt(body, ua.getPrivateKey(), auth))).toEqual({ title: "Що на черзі" });
    } finally {
      await service.close();
    }
  });

  it.each([
    [410, "gone"],
    [404, "gone"],
    [500, "failed"],
  ] as const)("reports status %i as %s", async (status, expected) => {
    const service = await pushService(status);
    try {
      const result = await sendPush(
        { endpoint: service.url, keys: { p256dh: base64url(uaPublic), auth: base64url(auth) } },
        {},
        vapid,
        "mailto:me@example.com",
      );
      expect(result).toBe(expected);
    } finally {
      await service.close();
    }
  });
});

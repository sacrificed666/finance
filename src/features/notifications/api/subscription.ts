import { readNumber, readString } from "@/shared/lib/guards";

// The address of push subscriptions on the app's server
const PUSH_URL = "/api/push";

export type PushStatus = "loading" | "unsupported" | "ios" | "dev" | "server" | "denied" | "off" | "on";

export interface PushSetup {
  status: PushStatus;
  key: Uint8Array<ArrayBuffer> | null;
  hour: number;
}

// The bytes of a base64url text
export const bytesOf = (base64url: string): Uint8Array<ArrayBuffer> => {
  const raw = atob(base64url.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

// Whether a subscription was made with the server's current key
export const sameKey = (stored: ArrayBuffer | null | undefined, key: Uint8Array): boolean => {
  if (!stored || stored.byteLength !== key.length) return false;
  return new Uint8Array(stored).every((byte, index) => byte === key[index]);
};

// The app's service worker, if one is registered
const registration = async () => (await navigator.serviceWorker.getRegistration("/")) ?? null;

// Sends a subscription change to the server, true when it was kept
const send = async (method: "PUT" | "DELETE", body: object): Promise<boolean> => {
  const response = await fetch(PUSH_URL, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return response?.ok === true;
};

// Whether this browser can take push notifications at all
const capable = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// Whether this is an iPhone or iPad browser that needs the app on the home screen
const homeScreenNeeded = () =>
  /iPad|iPhone|iPod/u.test(navigator.userAgent) && !matchMedia("(display-mode: standalone)").matches;

// Where notifications stand in this browser, refreshing a kept subscription
export const pushSetup = async (production: boolean): Promise<PushSetup> => {
  if (!capable()) return { status: homeScreenNeeded() ? "ios" : "unsupported", key: null, hour: 9 };
  if (!production) return { status: "dev", key: null, hour: 9 };
  const response = await fetch(PUSH_URL, { cache: "no-store" }).catch(() => null);
  const body: unknown = response ? await response.json().catch(() => null) : null;
  const encoded = readString(body, "key");
  const hour = readNumber(body, "hour") ?? 9;
  if (!encoded) return { status: "server", key: null, hour };
  const key = bytesOf(encoded);
  if (Notification.permission === "denied") return { status: "denied", key, hour };
  const current = await (await registration())?.pushManager.getSubscription();
  if (current && sameKey(current.options.applicationServerKey, key)) {
    await send("PUT", { subscription: current.toJSON() });
    return { status: "on", key, hour };
  }
  if (current) await current.unsubscribe().catch(() => false);
  return { status: "off", key, hour };
};

// Asks for permission and subscribes this browser: on, off, denied or failed
export const subscribe = async (key: Uint8Array<ArrayBuffer>): Promise<"on" | "off" | "denied" | "failed"> => {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const subscription = await (
    await registration()
  )?.pushManager
    .subscribe({ userVisibleOnly: true, applicationServerKey: key })
    .catch(() => null);
  if (subscription && (await send("PUT", { subscription: subscription.toJSON() }))) return "on";
  await subscription?.unsubscribe().catch(() => false);
  return "failed";
};

// Stops notifications in this browser and tells the server
export const unsubscribe = async (): Promise<void> => {
  const subscription = await (await registration())?.pushManager.getSubscription();
  if (!subscription) return;
  await send("DELETE", { endpoint: subscription.endpoint });
  await subscription.unsubscribe().catch(() => false);
};

// Asks the server for a test notification: sent, too soon or failed
export const sendTest = async (): Promise<"sent" | "wait" | "failed"> => {
  const subscription = await (await registration())?.pushManager.getSubscription();
  if (!subscription) return "failed";
  const response = await fetch(`${PUSH_URL}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => null);
  if (response?.ok) return "sent";
  return response?.status === 429 ? "wait" : "failed";
};

import type {
  AppState,
  Budget,
  Category,
  CategoryRule,
  Debt,
  Goal,
  Investment,
  NetWorthSnapshot,
  PlannedEvent,
  Receivable,
  RecurringRule,
  SavingsAccount,
  Settings,
  Subscription,
  Transaction,
  WishItem,
} from "@/features/data/model/types";
import { isRecord, type UnknownRecord } from "@/shared/lib/guards";

// The item each collection of the state holds
interface ItemTypes {
  transactions: Transaction;
  categories: Category;
  recurring: RecurringRule;
  subscriptions: Subscription;
  savings: SavingsAccount;
  investments: Investment;
  budgets: Budget;
  debts: Debt;
  rules: CategoryRule;
  receivables: Receivable;
  wishlist: WishItem;
  plannedEvents: PlannedEvent;
  snapshots: NetWorthSnapshot;
  goals: Goal;
}

export type CollectionName = keyof ItemTypes;
export type ItemOf<K extends CollectionName> = ItemTypes[K];
export type Collections = { [K in CollectionName]: ItemOf<K>[] };

// The state's collections, typed so each name reads its own items
export const collectionsOf = (state: AppState): Collections => state;

// The state with one collection replaced
const withCollection = <K extends CollectionName>(state: AppState, name: K, items: ItemOf<K>[]): AppState => ({
  ...state,
  [name]: items,
});

export const COLLECTION_NAMES = [
  "transactions",
  "categories",
  "recurring",
  "subscriptions",
  "savings",
  "investments",
  "budgets",
  "debts",
  "rules",
  "receivables",
  "wishlist",
  "plannedEvents",
  "snapshots",
  "goals",
] as const satisfies readonly CollectionName[];

// What identifies an item in each collection
const KEYS: { [K in CollectionName]: (item: ItemOf<K>) => string } = {
  transactions: (t) => t.id,
  categories: (c) => c.id,
  recurring: (r) => r.id,
  subscriptions: (s) => s.id,
  savings: (a) => a.id,
  investments: (i) => i.id,
  budgets: (b) => b.categoryId,
  debts: (d) => d.id,
  rules: (r) => r.id,
  receivables: (r) => r.id,
  wishlist: (w) => w.id,
  plannedEvents: (e) => e.id,
  snapshots: (s) => s.date,
  goals: (g) => g.id,
};

// The key of an item in its collection
export const keyOf = <K extends CollectionName>(name: K, item: ItemOf<K>): string => KEYS[name](item);

export interface CollectionChange<T> {
  upsert: T[];
  remove: string[];
  // The fields of each edited item by its key; an item left out is sent whole
  fields?: Record<string, string[]>;
}

export type CollectionChanges<K extends CollectionName = CollectionName> = { [P in K]?: CollectionChange<ItemOf<P>> };

// Puts a collection's change into a change set
const setChange = <K extends CollectionName>(
  changes: CollectionChanges<K>,
  name: K,
  change: CollectionChange<ItemOf<K>>,
): void => {
  changes[name] = change;
};

export type StateChanges = CollectionChanges & { settings?: Settings; settingsFields?: string[] };

// Settings that are maps, merged key by key so two devices can both add to them
const SETTINGS_MAPS: ReadonlySet<string> = new Set(["taxPaid", "monthRates", "bankLinks"]);

// A value's fields, or none when it is not an object
const fieldsOf = (value: unknown): UnknownRecord => (isRecord(value) ? value : {});

// The fields whose values differ between two records
const changedFields = (before: unknown, after: unknown): string[] => {
  const a = fieldsOf(before);
  const b = fieldsOf(after);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((key) => stableJson(a[key]) !== stableJson(b[key]));
};

// The settings that differ: a field, or one key of a map as "taxPaid.key"
const changedSettings = (before: Settings, after: Settings): string[] =>
  changedFields(before, after).flatMap((field) =>
    SETTINGS_MAPS.has(field)
      ? changedFields(Reflect.get(before, field), Reflect.get(after, field)).map((key) => `${field}.${key}`)
      : [field],
  );

// The list of fields sent for a key, only when the map really has its own
const ownFields = (fields: Record<string, string[]> | undefined, key: string): string[] | undefined =>
  fields && Object.hasOwn(fields, key) ? fields[key] : undefined;

// A copy of a record with one field set from another, or left out like there
const copyField = (out: object, source: unknown, field: string): void => {
  const value: unknown = Reflect.get(fieldsOf(source), field);
  if (value === undefined) Reflect.deleteProperty(out, field);
  else Reflect.set(out, field, value);
};

// A record with the listed fields taken from another and the rest kept
const withFields = <T extends object>(target: T, source: T, fields: readonly string[]): T => {
  const out = { ...target };
  for (const field of fields) copyField(out, source, field);
  return out;
};

// Settings with the listed fields, or single keys of maps, taken from others
const withSettings = (target: Settings, source: Settings, paths: readonly string[]): Settings => {
  const out = { ...target };
  for (const path of paths) {
    const dot = path.indexOf(".");
    const field = dot < 0 ? path : path.slice(0, dot);
    if (dot < 0 || !SETTINGS_MAPS.has(field)) {
      copyField(out, source, field);
      continue;
    }
    const map = { ...fieldsOf(Reflect.get(out, field)) };
    copyField(map, Reflect.get(source, field), path.slice(dot + 1));
    Reflect.set(out, field, map);
  }
  return out;
};

// The items added or edited and the keys removed between two lists, or null
const diffCollection = <K extends CollectionName>(
  name: K,
  before: Collections[K],
  after: Collections[K],
): CollectionChange<ItemOf<K>> | null => {
  if (before === after) return null;
  const previous = new Map(before.map((item) => [keyOf(name, item), item]));
  const seen = new Set<string>();
  const upsert: ItemOf<K>[] = [];
  const fields: Array<[string, string[]]> = [];
  for (const item of after) {
    const key = keyOf(name, item);
    seen.add(key);
    const old = previous.get(key);
    if (old === item) continue;
    const changed = old === undefined ? null : changedFields(old, item);
    if (changed?.length === 0) continue;
    upsert.push(item);
    if (changed) fields.push([key, changed]);
  }
  const remove = [...previous.keys()].filter((key) => !seen.has(key));
  if (upsert.length === 0 && remove.length === 0) return null;
  return fields.length > 0 ? { upsert, remove, fields: Object.fromEntries(fields) } : { upsert, remove };
};

// Adds a collection's change to the set when there is one
const diffInto = <K extends CollectionName>(
  changes: CollectionChanges,
  name: K,
  before: Pick<Collections, K>,
  after: Pick<Collections, K>,
) => {
  const change = diffCollection(name, before[name], after[name]);
  if (change) setChange(changes, name, change);
};

// What changed between two states, item by item and setting by setting
export const diffState = (before: AppState, after: AppState): StateChanges => {
  const changes: CollectionChanges = {};
  for (const name of COLLECTION_NAMES) diffInto(changes, name, before, after);
  if (before.settings === after.settings) return changes;
  const settingsFields = changedSettings(before.settings, after.settings);
  return settingsFields.length > 0 ? { ...changes, settings: after.settings, settingsFields } : changes;
};

// Whether a change set changes nothing
export const isEmptyChange = (changes: StateChanges): boolean => Object.keys(changes).length === 0;

// How many items and settings a change set touches
export const changeSize = (changes: StateChanges): number =>
  COLLECTION_NAMES.reduce(
    (total, name) => total + (changes[name]?.upsert.length ?? 0) + (changes[name]?.remove.length ?? 0),
    changes.settings ? 1 : 0,
  );

// A change set for the server log, as "transactions +2 −1, settings"
export const describeChanges = (changes: StateChanges): string => {
  const parts = COLLECTION_NAMES.flatMap((name) => {
    const change = changes[name];
    return change ? [`${name} +${String(change.upsert.length)} −${String(change.remove.length)}`] : [];
  });
  if (changes.settings) parts.push("settings");
  return parts.join(", ") || "nothing";
};

// A list with removals and upserts applied; an upsert wins over a removal
const applyCollection = <K extends CollectionName>(
  name: K,
  items: Collections[K],
  change: CollectionChange<ItemOf<K>>,
): ItemOf<K>[] => {
  const removed = new Set(change.remove);
  const incoming = new Map(change.upsert.map((item) => [keyOf(name, item), item]));
  const out: ItemOf<K>[] = [];
  for (const item of items) {
    const key = keyOf(name, item);
    const replacement = incoming.get(key);
    if (replacement) {
      const fields = ownFields(change.fields, key);
      out.push(fields ? withFields(item, replacement, fields) : replacement);
      incoming.delete(key);
    } else if (!removed.has(key)) {
      out.push(item);
    }
  }
  out.push(...incoming.values());
  return out;
};

// The state with one collection's change applied, if there is one
const applyTo = <K extends CollectionName>(state: AppState, name: K, change: CollectionChanges[K]): AppState =>
  change ? withCollection(state, name, applyCollection(name, collectionsOf(state)[name], change)) : state;

// The settings after a change: only the fields it names, or all of them
const settingsAfter = (current: Settings, changes: StateChanges): Settings => {
  if (!changes.settings) return current;
  return changes.settingsFields ? withSettings(current, changes.settings, changes.settingsFields) : changes.settings;
};

// A state with a change set applied, field by field where it says which
export const applyChanges = (state: AppState, changes: StateChanges): AppState => {
  const next = COLLECTION_NAMES.reduce((current, name) => applyTo(current, name, changes[name]), state);
  return changes.settings ? { ...next, settings: settingsAfter(next.settings, changes) } : next;
};

// Whether a value is a list of field names
const isFieldList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((field) => typeof field === "string" && field.length <= 120);

// Whether a value maps item keys to the fields that changed
const isFieldMap = (value: unknown): value is Record<string, string[]> =>
  isRecord(value) && Object.values(value).every(isFieldList);

// Whether a value has the shape of a collection change; items are normalized later
const isChangeOf = <K extends CollectionName>(_name: K, value: unknown): value is CollectionChange<ItemOf<K>> =>
  isRecord(value) &&
  Array.isArray(value.upsert) &&
  Array.isArray(value.remove) &&
  value.upsert.every(isRecord) &&
  value.remove.every((key) => typeof key === "string") &&
  (value.fields === undefined || isFieldMap(value.fields));

// Whether a value has the shape of settings; the server normalizes them after
const isSettingsShape = (value: unknown): value is Settings => isRecord(value);

// Adds a collection's change from a request, or says the request is malformed
const parseInto = <K extends CollectionName>(
  changes: CollectionChanges,
  name: K,
  raw: Partial<Record<K, unknown>>,
): boolean => {
  const value = raw[name];
  if (value === undefined) return true;
  if (!isChangeOf(name, value)) return false;
  const change = { upsert: value.upsert, remove: value.remove };
  setChange(changes, name, value.fields ? { ...change, fields: value.fields } : change);
  return true;
};

// A change set from a request body, or null when its shape is wrong
export const parseChanges = (raw: unknown): StateChanges | null => {
  if (!isRecord(raw)) return null;
  const changes: CollectionChanges = {};
  if (!COLLECTION_NAMES.every((name) => parseInto(changes, name, raw))) return null;
  if (raw.settings === undefined) return changes;
  if (!isSettingsShape(raw.settings)) return null;
  if (raw.settingsFields === undefined) return { ...changes, settings: raw.settings };
  return isFieldList(raw.settingsFields)
    ? { ...changes, settings: raw.settings, settingsFields: raw.settingsFields }
    : null;
};

// JSON with keys in order and undefined fields left out, for comparing values
export const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_key, entry: unknown) =>
    isRecord(entry)
      ? Object.fromEntries(
          Object.keys(entry)
            .toSorted()
            .map((key) => [key, entry[key]]),
        )
      : entry,
  );

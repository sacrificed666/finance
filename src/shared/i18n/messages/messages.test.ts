import { describe, expect, it } from "vitest";

import { cs } from "./cs";
import { de } from "./de";
import { en, type MessageKey } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { it as italian } from "./it";
import { nl } from "./nl";
import { pl } from "./pl";
import { pt } from "./pt";
import { uk } from "./uk";

// The plural forms some languages need beyond the English one and other
const EXTRA_PLURALS = new Set(["few", "many"]);

// Sorts texts alphabetically
const byText = (a: string, b: string) => a.localeCompare(b);

// The placeholders of a text, whatever shape they ask for
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)(?:\|\w+)?\}/gu)].map((match) => match[1] ?? "").toSorted(byText);

// The shapes a placeholder may ask for: a month in the genitive, a capital
const SHAPES = new Set(["gen", "cap"]);

const keys = Object.keys(en).filter((key): key is MessageKey => Object.hasOwn(en, key));

// The plural groups of English, such as "common.entries" for its .one and .other
const pluralGroups = new Set(keys.filter((key) => key.endsWith(".other")).map((key) => key.slice(0, -".other".length)));

// Whether a key is an extra plural form of an English plural group
const isExtraPlural = (key: string) => {
  const at = key.lastIndexOf(".");
  return EXTRA_PLURALS.has(key.slice(at + 1)) && pluralGroups.has(key.slice(0, at));
};

describe.each([
  ["uk", uk],
  ["cs", cs],
  ["de", de],
  ["es", es],
  ["fr", fr],
  ["it", italian],
  ["nl", nl],
  ["pl", pl],
  ["pt", pt],
])("%s messages", (_locale, messages) => {
  it("have every English key, and beyond them only plural forms", () => {
    const own = Object.keys(messages);
    expect(keys.filter((key) => !Object.hasOwn(messages, key))).toEqual([]);
    expect(own.filter((key) => !Object.hasOwn(en, key) && !isExtraPlural(key))).toEqual([]);
  });

  it("keep every placeholder of the English text", () => {
    const mismatched = keys.filter((key) => placeholders(messages[key]).join() !== placeholders(en[key]).join());
    expect(mismatched).toEqual([]);
  });

  it("give extra plural forms the placeholders of the other form", () => {
    const extras = Object.keys(messages).filter(isExtraPlural);
    const mismatched = extras.filter((key) => {
      const other = `${key.slice(0, key.lastIndexOf("."))}.other`;
      return placeholders(messages[key] ?? "").join() !== placeholders(messages[other] ?? "").join();
    });
    expect(mismatched).toEqual([]);
  });

  it("ask only for the shapes the translator knows", () => {
    const unknown = Object.values(messages).flatMap((text) =>
      [...text.matchAll(/\{\w+\|(\w+)\}/gu)].map((match) => match[1] ?? "").filter((shape) => !SHAPES.has(shape)),
    );
    expect(unknown).toEqual([]);
  });

  it("have no empty texts", () => {
    expect(Object.entries(messages).filter(([, text]) => text.trim() === "")).toEqual([]);
  });
});

"use client";

import { useState } from "react";

import Icon from "@/shared/ui/Icon/Icon";

import styles from "./TagInput.module.scss";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder: string;
  removeLabel: (tag: string) => string;
}

// An entry carries at most this many tags
const MAX_TAGS = 8;
// A tag is cut to this many characters
const MAX_LENGTH = 24;
// How many tags from other entries are offered
const OFFERED = 6;
// No offered tags
const NONE: string[] = [];

// Turns words into tags on Enter or a comma, offering the tags used before
const TagInput = ({ value, onChange, suggestions = NONE, placeholder, removeLabel }: TagInputProps) => {
  const [draft, setDraft] = useState("");
  // Whether the entry already has a tag, ignoring case
  const has = (tag: string) => value.some((existing) => existing.toLocaleLowerCase() === tag.toLocaleLowerCase());

  // Adds a typed or offered tag without its hash, once and within the limits
  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#/u, "").slice(0, MAX_LENGTH);
    setDraft("");
    if (!tag || has(tag) || value.length >= MAX_TAGS) return;
    onChange([...value, tag]);
  };
  const offered = suggestions.filter((suggestion) => !has(suggestion)).slice(0, OFFERED);

  return (
    <div>
      <div className={styles.box}>
        {value.map((tag) => (
          <span key={tag} className={styles.tag}>
            #{tag}
            <button
              type="button"
              aria-label={removeLabel(tag)}
              onClick={() => onChange(value.filter((existing) => existing !== tag))}
              className={styles.remove}
            >
              <Icon name="close" size={11} strokeWidth={2.6} />
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS && (
          <input
            value={draft}
            onChange={(event) => {
              const text = event.target.value;
              if (text.endsWith(",")) add(text.slice(0, -1));
              else setDraft(text);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add(draft);
              } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
                onChange(value.slice(0, -1));
              }
            }}
            onBlur={() => add(draft)}
            placeholder={value.length === 0 ? placeholder : undefined}
            className={styles.input}
          />
        )}
      </div>
      {offered.length > 0 && (
        <div className={styles.offered}>
          {offered.map((tag) => (
            <button key={tag} type="button" onClick={() => add(tag)} className={styles.suggestion}>
              +#{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;

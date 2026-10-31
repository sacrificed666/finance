"use client";

import {
  Children,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import OptionPicker, { type PickerGroup, type PickerItem } from "../OptionPicker/OptionPicker";
import type { ControlSize } from "../TextInput/TextInput";

// The choice as a native select's change event would carry it
export interface SelectChange {
  target: { value: string };
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "onChange"> {
  size?: ControlSize;
  onChange?: (event: SelectChange) => void;
}

interface OptionProps {
  value?: string | number;
  children?: ReactNode;
  disabled?: boolean;
  label?: string;
}

// The words of an option, however its text was put together
const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((part) => (typeof part === "string" || typeof part === "number" ? String(part) : ""))
    .join("");

// An option element as an item of the list
const itemOf = (option: ReactElement<OptionProps>): PickerItem => {
  const label = textOf(option.props.children);
  return { value: String(option.props.value ?? label), label };
};

// Options and option groups, written as for a native select, as the list's groups
const groupsOf = (children: ReactNode): PickerGroup[] => {
  const groups: PickerGroup[] = [];
  let loose: PickerItem[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement<OptionProps>(child)) continue;
    if (child.type === "optgroup") {
      if (loose.length > 0) groups.push({ items: loose });
      loose = [];
      const items = Children.toArray(child.props.children).filter((option) => isValidElement<OptionProps>(option));
      groups.push({ label: child.props.label, items: items.map((option) => itemOf(option)) });
    } else if (child.type === "option" && !child.props.disabled) {
      loose.push(itemOf(child));
    }
  }
  if (loose.length > 0) groups.push({ items: loose });
  return groups;
};

// A dropdown in the app's own style, its options written as for a native select
const Select = ({
  className,
  size = "md",
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: SelectProps) => {
  const [own, setOwn] = useState(String(defaultValue ?? ""));
  const current = value === undefined ? own : String(value);
  // Hands the choice on the way a native select's change event would
  const choose = (next: string) => {
    if (value === undefined) setOwn(next);
    onChange?.({ target: { value: next } });
  };
  return (
    <OptionPicker
      id={id}
      label={ariaLabel}
      value={current}
      onChange={choose}
      groups={groupsOf(children)}
      size={size}
      disabled={disabled}
      className={className}
    />
  );
};

export default Select;

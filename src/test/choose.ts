import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

// Opens a dropdown and picks the option that holds a value, as selectOptions would
export const chooseValue = async (user: UserEvent, combobox: HTMLElement, value: string) => {
  await user.click(combobox);
  const option = screen.getByRole("listbox").querySelector(`[role="option"][data-value="${value}"]`);
  if (!option) throw new Error(`No option holds ${value}`);
  await user.click(option);
};

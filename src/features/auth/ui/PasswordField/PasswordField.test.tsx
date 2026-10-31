import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Field from "@/shared/ui/Field/Field";
import { renderWithI18n } from "@/test/render";

import PasswordField from "./PasswordField";

describe("PasswordField", () => {
  it("hides the password until the show button is pressed", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user, container } = renderWithI18n(<PasswordField label="Password" value="secret" onChange={onChange} />);
    const input = container.querySelector("input") ?? document.body;
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show passwords" }));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide passwords" }));
    expect(input).toHaveAttribute("type", "password");
    await user.type(input, "!");
    expect(onChange).toHaveBeenCalledWith("secret!");
  });

  it("rates a new password and lists what it misses", () => {
    renderWithI18n(
      <PasswordField label="Password" value="abcdefghij" onChange={vi.fn<(value: string) => void>()} meter />,
    );
    expect(screen.getByText("Weak")).toBeInTheDocument();
    expect(screen.getByText("Letters and numbers")).toBeInTheDocument();
  });

  it("shows no meter for an empty password", () => {
    const { container } = renderWithI18n(
      <PasswordField label="Password" value="" onChange={vi.fn<(value: string) => void>()} meter />,
    );
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("keeps its name apart from the show button inside a field label", () => {
    renderWithI18n(
      <Field label="Password">
        <PasswordField label="Password" value="" onChange={vi.fn<(value: string) => void>()} />
      </Field>,
    );
    expect(screen.getByLabelText("Password", { selector: "input" })).toHaveAccessibleName("Password");
  });
});

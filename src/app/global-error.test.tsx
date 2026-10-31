import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const report = vi.hoisted(() => vi.fn<(error: unknown, page: string) => Promise<void>>());

vi.mock("@/features/settings/api/serverErrors", () => ({ reportClientError: report }));

const { default: GlobalError } = await import("./global-error");

describe("GlobalError", () => {
  afterEach(() => {
    document.cookie = "finance-locale=; max-age=0";
  });

  it("draws nothing on the server, then the words in the account's language", async () => {
    expect(renderToStaticMarkup(<GlobalError error={new Error("x")} retry={() => {}} />)).toContain('lang="en"');
    report.mockResolvedValue();
    document.cookie = "finance-locale=uk";
    const retry = vi.fn<() => void>();
    const { render } = await import("@testing-library/react");
    render(<GlobalError error={new Error("boom")} retry={retry} />, { container: document });
    expect(await screen.findByRole("heading", { name: "На цій сторінці щось пішло не так" })).toBeInTheDocument();
    expect(report).toHaveBeenCalledWith(expect.any(Error), "/");
    await userEvent.click(screen.getByRole("button", { name: "Спробувати ще" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

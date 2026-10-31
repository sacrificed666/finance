import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ReceiptPhotos from "./ReceiptPhotos";

vi.mock("@/features/transactions/model/receipts", () => ({
  shrinkPhoto: () => Promise.resolve({ mime: "image/webp", data: "AAAA" }),
}));

const LABELS = {
  add: "Add photo",
  remove: "Remove photo",
  open: "Open photo",
  uploading: "Uploading",
  failed: "Upload failed",
};

// A picked image file
const photo = () => new File(["x"], "receipt.jpg", { type: "image/jpeg" });

// The hidden file field of a rendered picker
const fileInput = (container: HTMLElement) => {
  const input = container.querySelector("input[type=file]");
  if (!(input instanceof HTMLInputElement)) throw new Error("No file input");
  return input;
};

describe("ReceiptPhotos", () => {
  it("shows the photos with links and removes one", async () => {
    const onChange = vi.fn<(ids: string[]) => void>();
    render(<ReceiptPhotos value={["a", "b"]} onChange={onChange} labels={LABELS} />);
    expect(screen.getAllByRole("link", { name: "Open photo" })[0]).toHaveAttribute("href", "/api/attachments/a");
    await userEvent.click(screen.getAllByRole("button", { name: "Remove photo" })[0]!);
    expect(onChange).toHaveBeenCalledWith(["b"]);
  });

  it("uploads picked photos and adds their ids", async () => {
    const onChange = vi.fn<(ids: string[]) => void>();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ id: "new" }))),
    );
    const { container } = render(<ReceiptPhotos value={[]} onChange={onChange} labels={LABELS} />);
    await userEvent.click(screen.getByRole("button", { name: "Add photo" }));
    fireEvent.change(fileInput(container), { target: { files: [photo()] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["new"]));
  });

  it("says when an upload fails and keeps the photos stored before it", async () => {
    const onChange = vi.fn<(ids: string[]) => void>();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.resolve(new Response("{}", { status: 413 }))),
    );
    const { container } = render(<ReceiptPhotos value={[]} onChange={onChange} labels={LABELS} />);
    fireEvent.change(fileInput(container), { target: { files: [photo()] } });
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does nothing without files and hides the add button at four photos", () => {
    const onChange = vi.fn<(ids: string[]) => void>();
    const { container, rerender } = render(<ReceiptPhotos value={[]} onChange={onChange} labels={LABELS} />);
    fireEvent.change(fileInput(container), { target: { files: [] } });
    expect(onChange).not.toHaveBeenCalled();
    rerender(<ReceiptPhotos value={["1", "2", "3", "4"]} onChange={onChange} labels={LABELS} />);
    expect(screen.queryByRole("button", { name: "Add photo" })).not.toBeInTheDocument();
  });
});

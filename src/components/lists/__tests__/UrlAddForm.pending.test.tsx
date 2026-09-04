import { fireEvent, render, screen } from "@testing-library/react";
import { UrlAddForm } from "@/components/lists/UrlAddForm";

jest.mock("@/components/ai/UrlEnhancer", () => ({
  UrlEnhancer: () => null,
}));

const formProps = {
  newUrl: "https://example.com",
  setNewUrl: jest.fn(),
  newTags: "",
  setNewTags: jest.fn(),
  newNote: "",
  setNewNote: jest.fn(),
  newReminder: "",
  setNewReminder: jest.fn(),
  isExpanded: true,
  onAdd: jest.fn(),
  onClear: jest.fn(),
};

describe("UrlAddForm pending overlay", () => {
  it("blocks close while the add mutation is in flight", () => {
    const onCancel = jest.fn();

    render(
      <UrlAddForm
        {...formProps}
        isLoading
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Adding/i })).toBeDisabled();
  });
});

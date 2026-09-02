import { render, screen } from "@testing-library/react";
import { IconButton } from "@/components/ui/HoverTooltip";

describe("IconButton empty href guard", () => {
  it("renders a disabled button when href is empty", () => {
    render(
      <IconButton icon={<span>i</span>} href="" tooltip="Visit Site" />,
    );
    const control = screen.getByRole("button", { name: "Visit Site" });
    expect(control).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Visit Site" })).toBeNull();
  });

  it("renders a real new-tab link when href is absolute", () => {
    render(
      <IconButton
        icon={<span>i</span>}
        href="https://example.com"
        tooltip="Visit Site"
      />,
    );
    const link = screen.getByRole("link", { name: "Visit Site" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
  });
});

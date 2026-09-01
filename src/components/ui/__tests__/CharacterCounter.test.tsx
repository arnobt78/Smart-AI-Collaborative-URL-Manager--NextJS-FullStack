import { render, screen } from "@testing-library/react";
import { CharacterCounter } from "@/components/ui/CharacterCounter";

describe("CharacterCounter", () => {
  it("shows current and max counts", () => {
    render(<CharacterCounter current={12} max={200} />);
    expect(screen.getByText("12/200")).toBeInTheDocument();
  });

  it("uses warn styling near the limit", () => {
    render(<CharacterCounter current={185} max={200} />);
    expect(screen.getByText("185/200")).toHaveClass("text-amber-400/90");
  });
});

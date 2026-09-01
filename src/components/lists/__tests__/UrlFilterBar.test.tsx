import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UrlFilterBar } from "../UrlFilterBar";

describe("UrlFilterBar", () => {
  it("opens Radix menu and selects a sort option", async () => {
    const user = userEvent.setup();
    const setSortOption = jest.fn();

    render(
      <UrlFilterBar sortOption="latest" setSortOption={setSortOption} />,
    );

    await user.click(
      screen.getByRole("button", { name: /filter and sort urls/i }),
    );

    await user.click(await screen.findByText("A-Z"));

    expect(setSortOption).toHaveBeenCalledWith("az");
  });

  it("shows active indicator when sort is not latest", () => {
    render(
      <UrlFilterBar sortOption="favourite" setSortOption={jest.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: /filter and sort urls/i }),
    ).toHaveClass("bg-blue-600");
  });

  it("shows active indicator when menu is open on latest", async () => {
    const user = userEvent.setup();

    render(
      <UrlFilterBar sortOption="latest" setSortOption={jest.fn()} />,
    );

    const trigger = screen.getByRole("button", {
      name: /filter and sort urls/i,
    });

    await user.click(trigger);

    expect(trigger).toHaveClass("bg-blue-600");
    expect(trigger.querySelector(".rounded-full")).toBeInTheDocument();
  });

  it("opens Radix menu and selects a filter option", async () => {
    const user = userEvent.setup();
    const setSortOption = jest.fn();

    render(
      <UrlFilterBar sortOption="latest" setSortOption={setSortOption} />,
    );

    await user.click(
      screen.getByRole("button", { name: /filter and sort urls/i }),
    );

    await user.click(await screen.findByText("Favourites"));

    expect(setSortOption).toHaveBeenCalledWith("favourite");
  });
});

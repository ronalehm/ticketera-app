import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { FeaturedEventsRail } from "./FeaturedEventsRail";

afterEach(cleanup);

it("FeaturedEventsRail no renderiza nada sin destacados", () => {
  const { container } = render(<FeaturedEventsRail events={[]} />);
  expect(container.innerHTML).toBe("");
});

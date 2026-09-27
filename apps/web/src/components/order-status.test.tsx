import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrderProgress, OrderStatusBadge } from "./order-status";

describe("OrderStatusBadge", () => {
  it("shows a human label, never the enum value", () => {
    render(<OrderStatusBadge status="OUT_FOR_DELIVERY" />);

    expect(screen.getByText("Out for delivery")).toBeInTheDocument();
    expect(screen.queryByText("OUT_FOR_DELIVERY")).not.toBeInTheDocument();
  });
});

describe("OrderProgress", () => {
  it("shows the four steps of a normal order", () => {
    render(<OrderProgress status="PACKED" />);

    expect(screen.getByText("Order placed")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("renders nothing at all for a cancelled order", () => {
    // Greyed out would read as "not yet", which is the opposite of "never".
    const { container } = render(<OrderProgress status="CANCELLED" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an order that has not been paid for", () => {
    const { container } = render(<OrderProgress status="PENDING_PAYMENT" />);
    expect(container).toBeEmptyDOMElement();
  });
});

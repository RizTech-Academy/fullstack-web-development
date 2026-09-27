import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { VariantSummary } from "@kirana/shared";

import { Price } from "./price";

const variant = (overrides: Partial<VariantSummary> = {}): VariantSummary => ({
  id: "v1",
  sku: "DAL-TOOR-500",
  label: "500 g",
  unit: "GRAM",
  quantity: 500,
  pricePaise: 9500,
  mrpPaise: null,
  inStock: true,
  ...overrides,
});

describe("Price", () => {
  it("shows the price in rupees", () => {
    render(<Price variant={variant()} />);
    expect(screen.getByText(/95\.00/)).toBeInTheDocument();
  });

  it("shows the saving when there is an MRP above the price", () => {
    render(<Price variant={variant({ pricePaise: 28_500, mrpPaise: 31_000 })} />);

    expect(screen.getByText(/310\.00/)).toBeInTheDocument();
    expect(screen.getByText(/8% off/)).toBeInTheDocument();
  });

  it("shows no saving when there is no MRP", () => {
    render(<Price variant={variant()} />);
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
  });

  it("shows the price per kilogram so pack sizes can be compared", () => {
    // 500 g at ₹95 is ₹190/kg. This is the number that makes a 5 kg bag
    // obviously better value than five 1 kg bags.
    render(<Price variant={variant()} />);
    expect(screen.getByText(/190\.00\/kg/)).toBeInTheDocument();
  });

  it("shows no unit price for a pack that cannot be compared", () => {
    render(<Price variant={variant({ unit: "PACKET", quantity: 1 })} />);
    expect(screen.queryByText(/\/kg/)).not.toBeInTheDocument();
  });
});

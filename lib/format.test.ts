import { describe, expect, it } from "vitest";

import { formatCurrency, formatDate, formatSignedCurrency } from "./format";

describe("formatCurrency", () => {
  it("formats a positive amount as GBP", () => {
    expect(formatCurrency(1234.5)).toBe("£1,234.50");
  });

  it("formats zero without a sign", () => {
    expect(formatCurrency(0)).toBe("£0.00");
  });

  it("formats a negative amount with a leading minus", () => {
    expect(formatCurrency(-42)).toBe("-£42.00");
  });
});

describe("formatSignedCurrency", () => {
  it("prefixes a positive amount with a plus sign", () => {
    expect(formatSignedCurrency(50)).toBe("+£50.00");
  });

  it("prefixes a negative amount with a minus sign", () => {
    expect(formatSignedCurrency(-50)).toBe("-£50.00");
  });

  it("shows no sign for zero", () => {
    expect(formatSignedCurrency(0)).toBe("£0.00");
  });
});

describe("formatDate", () => {
  it("formats a date as 'D Mon YYYY' in en-GB style", () => {
    expect(formatDate(new Date("2024-03-05T00:00:00Z"))).toBe("5 Mar 2024");
  });
});

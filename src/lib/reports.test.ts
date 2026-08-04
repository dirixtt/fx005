import { describe, expect, it } from "vitest";
import {
  REPORT_ROW_LIMIT,
  defaultDateRange,
  summarizeReport,
  type ReportItem,
  type ReportSale,
} from "@/lib/reports";

function sale(created_at: string, total: number): ReportSale {
  return { created_at, total };
}

function item(
  product_name: string,
  quantity: number,
  unit_cost: number,
  unit_price: number,
): ReportItem {
  return {
    product_name,
    quantity,
    unit_cost,
    unit_price,
    line_total: unit_price * quantity,
  };
}

describe("summarizeReport", () => {
  it("sums revenue from sales and profit as revenue minus cost of goods sold", () => {
    const result = summarizeReport({
      sales: [sale("2026-01-01T10:00:00Z", 100_000), sale("2026-01-02T10:00:00Z", 50_000)],
      items: [item("Кабель 2x1.5", 2, 30_000, 50_000), item("Отвёртка", 1, 10_000, 50_000)],
      products: [],
    });

    expect(result.revenue).toBe(150_000);
    // cost = 2*30000 + 1*10000 = 70000
    expect(result.profit).toBe(80_000);
  });

  it("values stock at cost price, not sale price", () => {
    const result = summarizeReport({
      sales: [],
      items: [],
      products: [
        { stock_quantity: 3, cost_price: 10_000 },
        { stock_quantity: 5, cost_price: 2_000 },
      ],
    });

    expect(result.stockValuation).toBe(40_000);
  });

  it("groups revenue by calendar day and returns it in chronological order", () => {
    const result = summarizeReport({
      sales: [
        sale("2026-01-02T09:00:00Z", 500),
        sale("2026-01-01T23:00:00Z", 100),
        sale("2026-01-02T18:00:00Z", 300),
      ],
      items: [],
      products: [],
    });

    expect(result.revenueByDay).toEqual([
      { date: "2026-01-01", revenue: 100 },
      { date: "2026-01-02", revenue: 800 },
    ]);
  });

  it("ranks top products by total quantity across separate sales", () => {
    const result = summarizeReport({
      sales: [],
      items: [
        item("Отвёртка", 1, 1, 2),
        item("Кабель", 5, 1, 2),
        item("Отвёртка", 7, 1, 2),
      ],
      products: [],
    });

    expect(result.topProducts).toEqual([
      { name: "Отвёртка", quantity: 8 },
      { name: "Кабель", quantity: 5 },
    ]);
  });

  it("caps top products at eight entries", () => {
    const result = summarizeReport({
      sales: [],
      items: Array.from({ length: 20 }, (_, i) => item(`Товар ${i}`, i + 1, 1, 2)),
      products: [],
    });

    expect(result.topProducts).toHaveLength(8);
    expect(result.topProducts[0]).toEqual({ name: "Товар 19", quantity: 20 });
  });

  it("reports zeroes rather than NaN when the period has no activity", () => {
    const result = summarizeReport({ sales: [], items: [], products: [] });

    expect(result).toMatchObject({
      revenue: 0,
      profit: 0,
      stockValuation: 0,
      revenueByDay: [],
      topProducts: [],
      truncated: false,
    });
  });

  it("flags truncation once the row limit is exceeded, so totals are not shown as fact", () => {
    const overLimit = Array.from({ length: REPORT_ROW_LIMIT + 1 }, () =>
      sale("2026-01-01T00:00:00Z", 1),
    );

    expect(summarizeReport({ sales: overLimit, items: [], products: [] }).truncated).toBe(true);
    expect(
      summarizeReport({ sales: overLimit.slice(0, REPORT_ROW_LIMIT), items: [], products: [] })
        .truncated,
    ).toBe(false);
  });
});

describe("defaultDateRange", () => {
  it("covers the caller's day fully, from midnight to the last millisecond", () => {
    const { fromDate, toDate } = defaultDateRange({ from: "2026-03-01", to: "2026-03-31" });

    expect(fromDate.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(toDate.toISOString()).toBe("2026-03-31T23:59:59.999Z");
  });

  it("defaults to a trailing 30-day window when no range is given", () => {
    const { from, to } = defaultDateRange({});
    const spanDays =
      (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000;

    expect(spanDays).toBe(30);
  });
});

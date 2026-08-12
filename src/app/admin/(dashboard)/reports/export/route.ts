import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { defaultDateRange, getReportData } from "@/lib/reports";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const { from, to, fromDate, toDate } = defaultDateRange({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const supabase = await createClient();
  const { sales, items, revenue, profit, stockValuation, revenueByDay, topProducts } = await getReportData(
    supabase,
    fromDate,
    toDate,
  );

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Отчёт — Javob"],
    [`Период: ${from} — ${to}`],
    [],
    ["Показатель", "Значение"],
    ["Выручка", revenue],
    ["Прибыль", profit],
    ["Заказов", sales.length],
    ["Оценка склада", stockValuation],
  ]);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Сводка");

  const revenueSheet = XLSX.utils.json_to_sheet(
    revenueByDay.map((r) => ({ Дата: r.date, Выручка: r.revenue })),
  );
  revenueSheet["!cols"] = [{ wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, revenueSheet, "Выручка по дням");

  const topProductsSheet = XLSX.utils.json_to_sheet(
    topProducts.map((p) => ({ Товар: p.name, "Продано, шт.": p.quantity })),
  );
  topProductsSheet["!cols"] = [{ wch: 40 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, topProductsSheet, "Топ товаров");

  const salesSheet = XLSX.utils.json_to_sheet(
    sales
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((s) => ({
        Дата: new Date(s.created_at).toLocaleString("ru-RU"),
        Канал: s.channel === "pos" ? "Касса" : "Онлайн",
        Сумма: s.total,
      })),
  );
  salesSheet["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, salesSheet, "Продажи");

  const itemsSheet = XLSX.utils.json_to_sheet(
    items.map((i) => ({
      Товар: i.product_name,
      "Кол-во": i.quantity,
      "Цена за шт.": i.unit_price,
      "Себестоимость за шт.": i.unit_cost,
      Сумма: i.line_total,
    })),
  );
  itemsSheet["!cols"] = [{ wch: 40 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, itemsSheet, "Позиции продаж");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="javob-report-${from}-${to}.xlsx"`,
    },
  });
}

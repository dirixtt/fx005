import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

export async function GET() {
  const supabase = await createClient();

  // Every table is paged to exhaustion — this file is the owner's only backup,
  // so a silently short export would be actively misleading.
  const [products, categories, customers, sales, saleItems] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from("products").select("*, categories(name)").order("created_at").range(from, to),
    ),
    fetchAllRows((from, to) => supabase.from("categories").select("*").order("name").range(from, to)),
    fetchAllRows((from, to) =>
      supabase.from("customers").select("*").order("created_at").range(from, to),
    ),
    fetchAllRows((from, to) => supabase.from("sales").select("*").order("created_at").range(from, to)),
    fetchAllRows((from, to) => supabase.from("sale_items").select("*").order("id").range(from, to)),
  ]);

  const workbook = XLSX.utils.book_new();

  const productsSheet = XLSX.utils.json_to_sheet(
    products.map((p) => ({
      Название: p.name,
      Категория: p.categories?.name ?? "",
      SKU: p.sku ?? "",
      Штрихкод: p.barcode ?? "",
      Себестоимость: p.cost_price,
      Цена: p.sale_price,
      Остаток: p.stock_quantity,
      Активен: p.is_active ? "да" : "нет",
      "На витрине": p.show_on_storefront ? "да" : "нет",
      Slug: p.slug,
      "Создан": p.created_at,
    })),
  );
  productsSheet["!cols"] = [
    { wch: 35 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, productsSheet, "Товары");

  const categoriesSheet = XLSX.utils.json_to_sheet(
    categories.map((c) => ({ Название: c.name, Создана: c.created_at })),
  );
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, "Категории");

  const customersSheet = XLSX.utils.json_to_sheet(
    customers.map((c) => ({
      Имя: c.full_name,
      Телефон: c.phone ?? "",
      Email: c.email ?? "",
      Заметки: c.notes ?? "",
      Создан: c.created_at,
    })),
  );
  XLSX.utils.book_append_sheet(workbook, customersSheet, "Клиенты");

  const salesSheet = XLSX.utils.json_to_sheet(
    sales.map((s) => ({
      Дата: new Date(s.created_at).toLocaleString("ru-RU"),
      Канал: s.channel === "pos" ? "Касса" : "Онлайн",
      Статус: s.status,
      Клиент: s.customer_name ?? "",
      Телефон: s.customer_phone ?? "",
      Оплата: s.payment_method ?? "",
      Сумма: s.total,
    })),
  );
  XLSX.utils.book_append_sheet(workbook, salesSheet, "Продажи");

  const saleItemsSheet = XLSX.utils.json_to_sheet(
    saleItems.map((i) => ({
      "ID продажи": i.sale_id,
      Товар: i.product_name,
      "Кол-во": i.quantity,
      "Цена за шт.": i.unit_price,
      Себестоимость: i.unit_cost,
      Сумма: i.line_total,
    })),
  );
  XLSX.utils.book_append_sheet(workbook, saleItemsSheet, "Позиции продаж");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fx005-backup-${today}.xlsx"`,
    },
  });
}

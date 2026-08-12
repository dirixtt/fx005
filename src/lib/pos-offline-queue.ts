export type PendingSale = {
  id: string;
  items: { variant_id: string; quantity: number }[];
  payment_method: "cash" | "card" | "other";
  customer_id?: string;
  created_at: string;
  error?: string;
};

// Bumped when queued lines changed from product_id to variant_id. Replaying a
// pre-variant sale would post identifiers create_pos_sale no longer accepts, so
// it would fail on every sync attempt forever.
const STORAGE_KEY = "pos_pending_sales_v2";
const LEGACY_STORAGE_KEY = "pos_pending_sales";

/**
 * Queued sales are real money already taken across the counter, so anything left
 * in the old key is moved aside rather than deleted — it stays readable in
 * localStorage under `pos_pending_sales_orphaned` for manual entry, instead of
 * vanishing on the first page load after deploy.
 */
function quarantineLegacyQueue() {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy || legacy === "[]") {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  const existing = localStorage.getItem("pos_pending_sales_orphaned");
  localStorage.setItem(
    "pos_pending_sales_orphaned",
    existing ? `${existing.replace(/]$/, "")},${legacy.replace(/^\[/, "")}` : legacy,
  );
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  console.warn(
    "[pos] offline sales queued before the size update were moved to " +
      "localStorage['pos_pending_sales_orphaned'] and must be entered by hand.",
  );
}

export function loadPendingSales(): PendingSale[] {
  if (typeof window === "undefined") return [];
  try {
    quarantineLegacyQueue();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // A line without variant_id predates the change and can never sync.
    return parsed.filter(
      (s): s is PendingSale =>
        Array.isArray(s?.items) &&
        s.items.every((i: { variant_id?: unknown }) => typeof i?.variant_id === "string"),
    );
  } catch {
    return [];
  }
}

function savePendingSales(sales: PendingSale[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

export function queueSale(sale: Omit<PendingSale, "id" | "created_at">) {
  const sales = loadPendingSales();
  const entry: PendingSale = {
    ...sale,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  sales.push(entry);
  savePendingSales(sales);
  return entry;
}

export function removePendingSale(id: string) {
  savePendingSales(loadPendingSales().filter((s) => s.id !== id));
}

export function markPendingSaleError(id: string, message: string) {
  const sales = loadPendingSales().map((s) => (s.id === id ? { ...s, error: message } : s));
  savePendingSales(sales);
}

// A network failure from supabase-js surfaces as a plain fetch error rather than
// a Postgres error code, so we treat those (plus the browser's own offline flag)
// as "queue it" instead of "show the user a hard failure".
export function isNetworkError(message: string | undefined) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!message) return false;
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message);
}

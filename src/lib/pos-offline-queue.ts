export type PendingSale = {
  id: string;
  items: { product_id: string; quantity: number }[];
  payment_method: "cash" | "card" | "other";
  customer_id?: string;
  created_at: string;
  error?: string;
};

const STORAGE_KEY = "pos_pending_sales";

export function loadPendingSales(): PendingSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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

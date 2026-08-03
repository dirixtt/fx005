"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sale_price: number;
  stock_quantity: number;
};

type Customer = { id: string; full_name: string; phone: string | null };

type CartItem = { product_id: string; name: string; sale_price: number; quantity: number };

export function PosClient({ products, customers }: { products: Product[]; customers: Customer[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [availableStock, setAvailableStock] = useState<Record<string, number>>(
    Object.fromEntries(products.map((p) => [p.id, p.stock_quantity])),
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "other">("cash");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, search]);

  function addToCart(product: Product) {
    const available = availableStock[product.id] ?? 0;
    if (available <= 0) {
      setError(`${product.name} is out of stock`);
      return;
    }
    setError(null);
    setLastSaleId(null);
    setAvailableStock((s) => ({ ...s, [product.id]: available - 1 }));
    setCart((c) => {
      const existing = c.find((i) => i.product_id === product.id);
      if (existing) {
        return c.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...c, { product_id: product.id, name: product.name, sale_price: product.sale_price, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((c) => {
      const item = c.find((i) => i.product_id === productId);
      if (!item) return c;
      const available = availableStock[productId] ?? 0;
      if (delta > 0 && available <= 0) {
        setError("No more stock available for this item");
        return c;
      }
      setAvailableStock((s) => ({ ...s, [productId]: (s[productId] ?? 0) - delta }));
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return c.filter((i) => i.product_id !== productId);
      }
      return c.map((i) => (i.product_id === productId ? { ...i, quantity: newQty } : i));
    });
  }

  function removeItem(productId: string) {
    const item = cart.find((i) => i.product_id === productId);
    if (!item) return;
    setAvailableStock((s) => ({ ...s, [productId]: (s[productId] ?? 0) + item.quantity }));
    setCart((c) => c.filter((i) => i.product_id !== productId));
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = barcode.trim();
    setBarcode("");
    if (!code) return;
    const product = products.find((p) => p.barcode === code);
    if (!product) {
      setError(`No product found for barcode "${code}"`);
      return;
    }
    addToCart(product);
  }

  const subtotal = cart.reduce((sum, i) => sum + i.sale_price * i.quantity, 0);

  async function completeSale() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);

    const { data, error } = await supabase.rpc("create_pos_sale", {
      p_items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      p_payment_method: paymentMethod,
      p_customer_id: customerId || undefined,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setLastSaleId(data);
    setCart([]);
    router.refresh();
    barcodeRef.current?.focus();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h1 className="text-xl font-semibold text-neutral-900">Point of Sale</h1>

        <Card>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={handleBarcodeSubmit} className="space-y-1.5">
              <Label htmlFor="barcode">Scan barcode</Label>
              <Input
                id="barcode"
                ref={barcodeRef}
                autoFocus
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or type barcode, then Enter"
              />
            </form>

            <div className="space-y-1.5">
              <Label htmlFor="search">Search products</Label>
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or barcode"
              />
              {searchResults.length > 0 && (
                <div className="mt-1 divide-y divide-neutral-100 rounded-md border border-neutral-200 bg-white">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        addToCart(p);
                        setSearch("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                    >
                      <span>{p.name}</span>
                      <span className="text-neutral-500">
                        {formatMoney(p.sale_price)} · {availableStock[p.id] ?? 0} in stock
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 && <p className="text-sm text-neutral-500">Cart is empty.</p>}
            {cart.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex-1 font-medium">{item.name}</span>
                <span className="text-neutral-500">{formatMoney(item.sale_price)}</span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => changeQuantity(item.product_id, -1)}>
                    -
                  </Button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => changeQuantity(item.product_id, 1)}>
                    +
                  </Button>
                </div>
                <span className="w-20 text-right">{formatMoney(item.sale_price * item.quantity)}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.product_id)}>
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer (optional)</Label>
              <Select id="customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment">Payment method</Label>
              <Select
                id="payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(subtotal)}</span>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {lastSaleId && (
              <p className="text-sm text-green-700">Sale completed (#{lastSaleId.slice(0, 8)}).</p>
            )}

            <Button
              type="button"
              className="w-full"
              disabled={cart.length === 0 || submitting}
              onClick={completeSale}
            >
              {submitting ? "Processing..." : "Complete sale"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/actions/products";
import type { Tables } from "@/lib/types/database.types";

type Category = Tables<"categories">;
type Product = Tables<"products">;

export function ProductForm({
  action,
  categories,
  product,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  product?: Product;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Product name</Label>
        <Input id="name" name="name" required defaultValue={product?.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" defaultValue={product?.barcode ?? ""} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category_id">Category</Label>
        <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ""}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cost_price">Cost price</Label>
          <Input
            id="cost_price"
            name="cost_price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product?.cost_price ?? 0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sale_price">Sale price</Label>
          <Input
            id="sale_price"
            name="sale_price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product?.sale_price ?? 0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock_quantity">Stock qty</Label>
          <Input
            id="stock_quantity"
            name="stock_quantity"
            type="number"
            step="1"
            min="0"
            required
            defaultValue={product?.stock_quantity ?? 0}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={product?.description ?? ""} />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="show_on_storefront"
          name="show_on_storefront"
          type="checkbox"
          className="h-4 w-4 rounded border-neutral-300"
          defaultChecked={product?.show_on_storefront ?? true}
        />
        <Label htmlFor="show_on_storefront" className="font-normal">
          Show on online storefront
        </Label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : product ? "Save changes" : "Add product"}
      </Button>
    </form>
  );
}

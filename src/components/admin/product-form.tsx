"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProductImageUpload } from "@/components/admin/product-image-upload";
import { VariantEditor } from "@/components/admin/variant-editor";
import type { ActionState } from "@/lib/actions/products";
import type { Tables } from "@/lib/types/database.types";

type Category = Tables<"categories">;
type Product = Tables<"products">;
type Variant = Tables<"product_variants">;

export function ProductForm({
  action,
  categories,
  product,
  variants,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  product?: Product;
  variants?: Variant[];
}) {
  const t = useTranslations("inventory");
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <ProductImageUpload initialUrl={product?.image_url} />

      <div className="space-y-1.5">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input id="name" name="name" required defaultValue={product?.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category_id">{t("categoryLabel")}</Label>
        <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ""}>
          <option value="">{t("noCategoryOption")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <VariantEditor variants={variants} />

      <div className="space-y-1.5">
        <Label htmlFor="description">{t("descriptionLabel")}</Label>
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
          {t("showOnStorefront")}
        </Label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : product ? t("saveChanges") : t("addProduct")}
      </Button>
    </form>
  );
}

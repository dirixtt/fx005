"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";

export function AddToCartButton({
  product,
}: {
  product: { id: string; name: string; slug: string; sale_price: number; image_url: string | null };
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <Button
      type="button"
      size="lg"
      className="w-full sm:w-auto"
      onClick={() => {
        addItem({
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          sale_price: product.sale_price,
          image_url: product.image_url,
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? (
        <>
          <Check className="h-4 w-4" /> Добавлено
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" /> В корзину
        </>
      )}
    </Button>
  );
}

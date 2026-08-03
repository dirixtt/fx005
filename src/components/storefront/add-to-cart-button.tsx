"use client";

import { useState } from "react";
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
      onClick={() => {
        addItem({
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          sale_price: product.sale_price,
          image_url: product.image_url,
        });
        setAdded(true);
      }}
    >
      {added ? "Added ✓" : "Add to cart"}
    </Button>
  );
}

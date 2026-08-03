"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Link href="/cart" className="text-sm font-medium text-neutral-700 hover:underline">
      Cart {itemCount > 0 && `(${itemCount})`}
    </Link>
  );
}

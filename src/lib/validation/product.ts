import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  description: z.string().optional(),
  cost_price: z.coerce.number().min(0, "Cost must be 0 or more"),
  sale_price: z.coerce.number().min(0, "Price must be 0 or more"),
  stock_quantity: z.coerce.number().int("Must be a whole number").min(0, "Must be 0 or more"),
  show_on_storefront: z.coerce.boolean().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

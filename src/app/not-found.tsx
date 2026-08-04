import Link from "next/link";
import { PackageX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <PackageX className="h-6 w-6" />
      </span>
      <h1 className="text-xl font-bold text-neutral-900">Страница не найдена</h1>
      <p className="text-sm text-neutral-500">
        Возможно, товар снят с продажи или ссылка устарела.
      </p>
      <Link href="/" className={buttonVariants()}>
        В каталог
      </Link>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, PackageX, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ProductImageUpload({ initialUrl }: { initialUrl?: string | null }) {
  const t = useTranslations("inventory");
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: false });

    setUploading(false);

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setUrl(data.publicUrl);
  }

  return (
    <div className="space-y-1.5">
      <Label>{t("photoLabel")}</Label>
      <input type="hidden" name="image_url" value={url} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-300">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <PackageX className="h-6 w-6" strokeWidth={1.5} />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("uploading")}
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" /> {url ? t("replacePhoto") : t("uploadPhoto")}
              </>
            )}
          </Button>
          {url && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setUrl("")}>
              <X className="h-4 w-4" /> {t("remove")}
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

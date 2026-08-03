"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const REGION_ID = "pos-barcode-scanner-region";

export function BarcodeCameraScanner({ onScan }: { onScan: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(REGION_ID);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decodedText) => {
            const now = Date.now();
            // debounce: ignore the same code re-firing within 2s while the camera keeps reading it
            if (decodedText === lastScanRef.current.code && now - lastScanRef.current.at < 2000) return;
            lastScanRef.current = { code: decodedText, at: now };
            onScan(decodedText);
          },
          () => {
            // per-frame decode failures are expected while aiming the camera; ignore
          },
        )
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Не удалось открыть камеру");
        });
    });

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        {open ? (
          <>
            <X className="h-4 w-4" /> Закрыть камеру
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" /> Сканировать камерой
          </>
        )}
      </Button>

      {open && (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <div id={REGION_ID} className="w-full" />
          {error && <p className="p-2 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

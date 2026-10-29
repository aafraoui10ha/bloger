"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";

export function ImageDropzone({ accept, acceptedLabel, onFile, disabled }: { accept: string; acceptedLabel: string; onFile: (f: File) => void; disabled?: boolean }) {
  const t = useTranslations("image");
  const id = useId();
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f && !disabled) onFile(f);
      }}
      className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${over ? "border-accent bg-accent-soft" : "border-border-strong bg-surface-2"}`}
    >
      <Upload className="mx-auto size-8 text-muted" aria-hidden="true" />
      <label htmlFor={id} className="mt-3 block cursor-pointer font-medium after:absolute after:inset-0">
        {t("dropHere")}
      </label>
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
        {acceptedLabel}
      </p>
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

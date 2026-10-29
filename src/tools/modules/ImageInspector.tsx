"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { detectFormat, formatBytes, FORMAT_MIME, MAX_IMAGE_BYTES, readDimensions, type DetectedFormat } from "@/tools/logic/image";
import { ImageDropzone } from "@/tools/image/ImageDropzone";
import { ErrorMessage, ResetButton, useToolEvents } from "@/tools/ui";

type Report = {
  name: string;
  size: number;
  declared: string;
  extension: string;
  format: DetectedFormat;
  width: number | null;
  height: number | null;
  matches: boolean;
};

const EXT_FOR: Partial<Record<DetectedFormat, string[]>> = {
  png: ["png"], jpeg: ["jpg", "jpeg", "jfif"], gif: ["gif"], webp: ["webp"], bmp: ["bmp"], avif: ["avif"], heic: ["heic", "heif"], tiff: ["tif", "tiff"], ico: ["ico"], svg: ["svg"],
};

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

export function ImageInspector() {
  const t = useTranslations("inspector");
  const ti = useTranslations("image");
  const locale = useLocale();
  const events = useToolEvents("image-inspector");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    setReport(null);
    events.reset();
    if (file.size === 0) return setError(ti("errors.empty"));
    if (file.size > MAX_IMAGE_BYTES * 4) return setError(ti("errors.tooLarge", { max: formatBytes(MAX_IMAGE_BYTES * 4, locale) }));
    // Only the header is read; the file never leaves the device.
    const head = new Uint8Array(await file.slice(0, 131072).arrayBuffer());
    const format = detectFormat(head);
    let dims = readDimensions(head, format);
    if (!dims && format !== "unknown" && format !== "svg") {
      try {
        const bmp = await createImageBitmap(file);
        dims = { width: bmp.width, height: bmp.height };
        bmp.close();
      } catch {
        dims = null;
      }
    }
    const extension = (file.name.match(/\.([^.]+)$/)?.[1] ?? "").toLowerCase();
    const declared = file.type || "";
    const expectedMime = format !== "unknown" ? FORMAT_MIME[format] : "";
    const extOk = format !== "unknown" && (EXT_FOR[format] ?? []).includes(extension);
    const mimeOk = !declared || declared === expectedMime || (format === "jpeg" && declared === "image/jpg");
    setReport({ name: file.name, size: file.size, declared, extension, format, width: dims?.width ?? null, height: dims?.height ?? null, matches: extOk && mimeOk });
    events.complete({ format });
  }

  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-MA-u-nu-latn" : locale, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <ImageDropzone accept="image/*,.heic,.heif,.avif,.ico,.tif,.tiff" acceptedLabel={t("inspect")} onFile={onFile} />
      <ErrorMessage>{error}</ErrorMessage>
      {report && (
        <div aria-live="polite" className="space-y-4">
          <p className={report.matches ? "alert-success flex items-center gap-2" : "alert-warning flex items-center gap-2"}>
            {report.matches ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <AlertTriangle className="size-4" aria-hidden="true" />}
            {report.matches ? t("matches") : t("mismatch")}
          </p>
          <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
            {[
              [t("realFormat"), report.format === "unknown" ? t("unknown") : report.format.toUpperCase()],
              [t("declaredType"), report.declared || t("unknown")],
              [t("extension"), report.extension ? `.${report.extension}` : t("unknown")],
              [t("fileSize"), `${formatBytes(report.size, locale)} (${nf.format(report.size)} B)`],
              [t("pixels"), report.width && report.height ? `${report.width} × ${report.height}` : t("unknown")],
              [t("megapixels"), report.width && report.height ? nf.format((report.width * report.height) / 1e6) : t("unknown")],
              [
                t("aspect"),
                report.width && report.height ? `${report.width / gcd(report.width, report.height)}:${report.height / gcd(report.width, report.height)} (${nf.format(report.width / report.height)})` : t("unknown"),
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium tabular-nums" dir="ltr">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <ResetButton onClick={() => setReport(null)} />
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { db } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitize";
import { readFaq, readStringList } from "@/lib/json-fields";
import { adminContext } from "@/admin/server";
import { isToolModuleKey } from "@/tools/registry";
import { ToolRenderer } from "@/tools/ToolRenderer";
import { loadMessages } from "@/i18n/messages";
import { ConsentProvider } from "@/components/consent/ConsentProvider";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ToolPreview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ locale?: string }> }) {
  const [{ id }, { locale: raw }] = await Promise.all([params, searchParams]);
  const { t } = await adminContext("tool.manage");
  const locale = (["en", "fr", "ar"] as const).find((l) => l === raw) ?? "en";
  const tool = await db.tool.findUnique({ where: { id }, include: { translations: { where: { locale } } } });
  const tr = tool?.translations[0];
  if (!tool || !tr || !isToolModuleKey(tool.moduleKey)) notFound();
  const messages = await loadMessages(locale);

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="mx-auto max-w-4xl">
      <p className="alert-warning mb-6">{t("art.previewNotice")}</p>
      <h1 className="text-3xl font-bold">{tr.title}</h1>
      <p className="mt-2 text-muted">{tr.shortDescription}</p>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ConsentProvider config={{ mode: "BUILT_IN", bannerEnabled: false, policyVersion: 1, gaMeasurementId: null }}>
          <div className="card mt-6 p-6"><ToolRenderer moduleKey={tool.moduleKey} toolKey={tool.moduleKey} /></div>
        </ConsentProvider>
      </NextIntlClientProvider>
      <div className="prose-content mt-10" dangerouslySetInnerHTML={{ __html: sanitizeRichText(tr.aboutHtml) }} />
      <ol className="mt-6 list-decimal ps-6">{readStringList(tr.steps).map((s, i) => <li key={i}>{s}</li>)}</ol>
      <ul className="mt-6 space-y-1">{readStringList(tr.examples).map((s, i) => <li key={i} className="text-sm">• {s}</li>)}</ul>
      {readFaq(tr.faq).map((f, i) => (
        <div key={i} className="mt-4"><p className="font-medium">{f.q}</p><p className="text-sm text-muted">{f.a}</p></div>
      ))}
    </div>
  );
}

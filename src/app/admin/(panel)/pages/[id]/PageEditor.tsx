"use client";

import { useState } from "react";
import { restorePageRevisionAction, savePageAction } from "@/admin/actions/content";
import { ActionForm, ConfirmAction, CountedInput, FieldError, LocaleTabs, SubmitButton, useT } from "@/admin/components/client";
import { RichTextEditor, type MediaOption } from "@/admin/components/RichTextEditor";

type Tr = { locale: string; title: string; slug: string; contentHtml: string; seoTitle: string | null; seoDescription: string | null; isPublished: boolean; legalReviewed: boolean };
const NAMES: Record<string, string> = { en: "English", fr: "Français", ar: "العربية" };

function LocaleForm({ pageId, locale, tr, isLegal, media }: { pageId: string; locale: string; tr?: Tr; isLegal: boolean; media: MediaOption[] }) {
  const t = useT();
  const [html, setHtml] = useState(tr?.contentHtml ?? "");
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <ActionForm action={savePageAction} className="space-y-4">
      {(state) => (
        <div className="space-y-4" dir={dir}>
          <input type="hidden" name="pageId" value={pageId} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="contentHtml" value={html} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`title-${locale}`}>{t("c.title")}</label>
              <input id={`title-${locale}`} name="title" className="input" defaultValue={tr?.title ?? ""} />
              <FieldError state={state} name="title" />
            </div>
            <div>
              <label className="label" htmlFor={`slug-${locale}`}>{t("c.slug")}</label>
              <input id={`slug-${locale}`} name="slug" className="input font-mono text-xs" dir="auto" defaultValue={tr?.slug ?? ""} />
              <FieldError state={state} name="slug" />
            </div>
          </div>
          <RichTextEditor value={html} onChange={setHtml} media={media} dir={dir} label={`${t("art.content")} (${NAMES[locale]})`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`seot-${locale}`}>{t("c.seoTitle")}</label>
              <CountedInput id={`seot-${locale}`} name="seoTitle" max={60} defaultValue={tr?.seoTitle} />
            </div>
            <div>
              <label className="label" htmlFor={`seod-${locale}`}>{t("c.seoDescription")}</label>
              <CountedInput id={`seod-${locale}`} name="seoDescription" max={160} textarea defaultValue={tr?.seoDescription} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" defaultChecked={tr?.isPublished ?? false} /> {t("page.published")}</label>
          {isLegal && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="legalReviewed" defaultChecked={tr?.legalReviewed ?? false} /> {t("page.legalReviewed")}</label>}
          <SubmitButton>{t("c.save")}</SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}

export function PageEditor({ pageId, isLegal, translations, media }: { pageId: string; isLegal: boolean; translations: Tr[]; media: MediaOption[] }) {
  return (
    <div className="card p-5">
      <LocaleTabs
        locales={["en", "fr", "ar"]}
        labels={NAMES}
        render={(l) => <LocaleForm pageId={pageId} locale={l} tr={translations.find((x) => x.locale === l)} isLegal={isLegal} media={media} />}
      />
    </div>
  );
}

export function RestorePageRevision({ revisionId }: { revisionId: string }) {
  const t = useT();
  return <ConfirmAction action={restorePageRevisionAction} label={t("c.restore")} title={t("c.restore")} body={t("art.restoreConfirm")} hidden={{ revisionId }} className="btn-secondary btn-sm" />;
}

"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { changeArticleStatus, saveArticle, type ArticlePayload, type ArticleSaveResult, type StatusChange } from "@/admin/actions/articles";
import { useT, LocaleTabs } from "@/admin/components/client";
import { RichTextEditor, FaqEditor, type MediaOption } from "@/admin/components/RichTextEditor";
import { wordCount } from "@/admin/article-rules";
import { slugify } from "@/lib/slug";
import { readingTimeMinutes } from "@/lib/reading-time";
import type { AdminKey } from "@/admin/i18n";

type Translation = ArticlePayload["translations"][number];
const LOCALES = ["en", "fr", "ar"] as const;
const LOCALE_NAMES = { en: "English", fr: "Français", ar: "العربية" } as const;

export type EditorProps = {
  initial: ArticlePayload;
  status: string;
  publishAt: string | null;
  isDemo: boolean;
  canPublish: boolean;
  canDelete: boolean;
  categories: { id: string; name: string }[];
  articles: { id: string; title: string }[];
  tools: { id: string; title: string }[];
  media: MediaOption[];
  deleteSlot: React.ReactNode;
};

function blank(locale: (typeof LOCALES)[number]): Translation {
  return {
    locale, title: "", slug: "", excerpt: "", contentHtml: "", faq: [], featuredImageAlt: null, seoTitle: null, seoDescription: null,
    canonicalUrl: null, ogTitle: null, ogDescription: null, robotsNoindex: false, robotsNofollow: false, structuredData: "BLOG_POSTING", isComplete: false, tags: "",
  };
}

export function ArticleEditor(props: EditorProps) {
  const t = useT();
  const router = useRouter();
  const [data, setData] = useState<ArticlePayload>(props.initial);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ArticleSaveResult | null>(null);
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [scheduleAt, setScheduleAt] = useState("");
  const autosaveEnabled = props.status === "DRAFT" || props.status === "IN_REVIEW";
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
  }, [data]);

  const update = useCallback((locale: string, patch: Partial<Translation>) => {
    setData((d) => ({ ...d, translations: d.translations.map((tr) => (tr.locale === locale ? { ...tr, ...patch } : tr)) }));
    setDirty(true);
  }, []);
  const setField = <K extends keyof ArticlePayload>(k: K, v: ArticlePayload[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    setDirty(true);
  };

  // Autosave drafts 4 seconds after the last change.
  useEffect(() => {
    if (!dirty || !autosaveEnabled) return;
    const id = setTimeout(async () => {
      const r = await saveArticle(latest.current, { autosave: true });
      if (r.ok) {
        setDirty(false);
        setAutosavedAt(new Date().toLocaleTimeString());
      } else setResult(r);
    }, 4000);
    return () => clearTimeout(id);
  }, [data, dirty, autosaveEnabled]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  function save() {
    startTransition(async () => {
      const r = await saveArticle(data);
      setResult(r);
      if (r.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  }

  function status(change: StatusChange) {
    startTransition(async () => {
      if (dirty) {
        const s = await saveArticle(data);
        if (!s.ok) return setResult(s);
        setDirty(false);
      }
      const r = await changeArticleStatus(data.id, change, change === "schedule" && scheduleAt ? new Date(scheduleAt).toISOString() : undefined);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  const present = data.translations.map((x) => x.locale);
  const missing = LOCALES.filter((l) => !present.includes(l));
  const fe = result?.fieldErrors ?? {};
  const sorted = LOCALES.filter((l) => present.includes(l));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        {props.isDemo && <p className="alert-warning">{t("art.demoNotice")}</p>}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span aria-live="polite" className="text-muted">
            {pending ? t("c.saving") : dirty ? t("art.unsaved") : autosavedAt ? t("art.autosaved", { time: autosavedAt }) : autosaveEnabled ? t("art.autosaveOn") : t("art.autosaveOff")}
          </span>
        </div>
        {result?.error && (
          <div role="alert" className="alert-error">
            <p>{t(result.error)}</p>
            {result.issues && (
              <ul className="mt-1 list-disc ps-5">
                {result.issues.map((i, n) => (
                  <li key={n}>{i.code === "needComplete" ? t("art.needComplete") : t(`art.issue.${i.code}` as AdminKey, { locale: i.locale ?? "" })}</li>
                ))}
              </ul>
            )}
            {Object.entries(fe).length > 0 && (
              <ul className="mt-1 list-disc ps-5">
                {Object.entries(fe).map(([k, v]) => (
                  <li key={k}>
                    {k}: {t(v)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {result?.ok && result.message && (
          <p role="status" className="alert-success">
            {t(result.message)}
          </p>
        )}

        <LocaleTabs
          locales={sorted}
          labels={Object.fromEntries(sorted.map((l) => [l, `${LOCALE_NAMES[l]}${data.translations.find((x) => x.locale === l)?.isComplete ? " ✓" : ""}`]))}
          render={(lk) => {
            const l = lk as (typeof LOCALES)[number];
            const tr = data.translations.find((x) => x.locale === l)!;
            const dir = l === "ar" ? "rtl" : "ltr";
            const words = wordCount(tr.contentHtml);
            return (
              <div className="space-y-4" dir={dir}>
                <div>
                  <label className="label" htmlFor={`${l}-title`}>{t("c.title")}</label>
                  <input
                    id={`${l}-title`}
                    className="input text-lg font-semibold"
                    value={tr.title}
                    maxLength={200}
                    onChange={(e) => update(l, { title: e.target.value, ...(props.status === "DRAFT" && (!tr.slug || tr.slug === slugify(tr.title)) ? { slug: slugify(e.target.value) } : {}) })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`${l}-slug`}>{t("c.slug")}</label>
                  <input id={`${l}-slug`} className="input font-mono text-xs" dir="auto" value={tr.slug} onChange={(e) => update(l, { slug: e.target.value.toLowerCase() })} aria-invalid={!!fe[`${l}.slug`]} />
                  {fe[`${l}.slug`] && <p className="mt-1 text-xs text-danger">{t(fe[`${l}.slug`]!)}</p>}
                  <p className="hint" dir="ltr">/{l}/blog/{tr.slug}</p>
                </div>
                <div>
                  <label className="label" htmlFor={`${l}-excerpt`}>{t("art.excerpt")}</label>
                  <textarea id={`${l}-excerpt`} className="input" rows={2} maxLength={500} value={tr.excerpt} onChange={(e) => update(l, { excerpt: e.target.value })} aria-describedby={`${l}-excerpt-hint`} />
                  <p id={`${l}-excerpt-hint`} className="hint">{t("art.excerptHint")} {t("c.chars", { count: tr.excerpt.length })}</p>
                </div>
                <div>
                  <p className="label">{t("art.content")}</p>
                  <RichTextEditor value={tr.contentHtml} onChange={(html) => update(l, { contentHtml: html })} media={props.media} dir={dir} label={`${t("art.content")} (${LOCALE_NAMES[l]})`} />
                  <p className="hint">
                    {t("art.wordCount", { count: words })} · {t("art.readingTime", { count: readingTimeMinutes(tr.contentHtml) })} · {t("art.toc")}
                  </p>
                </div>
                <details className="rounded-lg border border-border p-4">
                  <summary className="cursor-pointer font-medium">{t("art.faq")} ({tr.faq.length})</summary>
                  <div className="mt-3"><FaqEditor value={tr.faq} onChange={(faq) => update(l, { faq })} /></div>
                </details>
                <details className="rounded-lg border border-border p-4">
                  <summary className="cursor-pointer font-medium">{t("art.seo")}</summary>
                  <div className="mt-3 grid gap-4">
                    <div>
                      <label className="label" htmlFor={`${l}-seot`}>{t("c.seoTitle")}</label>
                      <input id={`${l}-seot`} className="input" value={tr.seoTitle ?? ""} onChange={(e) => update(l, { seoTitle: e.target.value || null })} />
                      <p className="hint">{t("c.seoTitleHint")} {t("c.chars", { count: (tr.seoTitle ?? "").length })}</p>
                    </div>
                    <div>
                      <label className="label" htmlFor={`${l}-seod`}>{t("c.seoDescription")}</label>
                      <textarea id={`${l}-seod`} className="input" rows={2} value={tr.seoDescription ?? ""} onChange={(e) => update(l, { seoDescription: e.target.value || null })} />
                      <p className="hint">{t("c.seoDescriptionHint")} {t("c.chars", { count: (tr.seoDescription ?? "").length })}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor={`${l}-ogt`}>{t("art.ogTitle")}</label>
                        <input id={`${l}-ogt`} className="input" value={tr.ogTitle ?? ""} onChange={(e) => update(l, { ogTitle: e.target.value || null })} />
                      </div>
                      <div>
                        <label className="label" htmlFor={`${l}-ogd`}>{t("art.ogDescription")}</label>
                        <input id={`${l}-ogd`} className="input" value={tr.ogDescription ?? ""} onChange={(e) => update(l, { ogDescription: e.target.value || null })} />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor={`${l}-can`}>{t("art.canonical")}</label>
                      <input id={`${l}-can`} className="input" dir="ltr" placeholder="https://" value={tr.canonicalUrl ?? ""} onChange={(e) => update(l, { canonicalUrl: e.target.value || null })} />
                      <p className="hint">{t("art.canonicalHint")}</p>
                      {fe[`${l}.canonicalUrl`] && <p className="mt-1 text-xs text-danger">{t(fe[`${l}.canonicalUrl`]!, { locale: l })}</p>}
                    </div>
                    <div>
                      <label className="label" htmlFor={`${l}-sd`}>{t("art.structuredData")}</label>
                      <select id={`${l}-sd`} className="input" value={tr.structuredData} onChange={(e) => update(l, { structuredData: e.target.value as Translation["structuredData"] })}>
                        {(["BLOG_POSTING", "ARTICLE", "NONE"] as const).map((s) => <option key={s} value={s}>{t(`art.sd.${s}`)}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tr.robotsNoindex} onChange={(e) => update(l, { robotsNoindex: e.target.checked })} /> {t("art.noindex")}</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tr.robotsNofollow} onChange={(e) => update(l, { robotsNofollow: e.target.checked })} /> {t("art.nofollow")}</label>
                  </div>
                </details>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor={`${l}-tags`}>{t("art.tags")}</label>
                    <input id={`${l}-tags`} className="input" value={tr.tags} onChange={(e) => update(l, { tags: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`${l}-alt`}>{t("art.featuredAlt")}</label>
                    <input id={`${l}-alt`} className="input" value={tr.featuredImageAlt ?? ""} onChange={(e) => update(l, { featuredImageAlt: e.target.value || null })} />
                  </div>
                </div>
                <label className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-sm">
                  <input type="checkbox" className="mt-1" checked={tr.isComplete} onChange={(e) => update(l, { isComplete: e.target.checked })} />
                  <span>
                    <span className="font-medium">{t("c.complete")}</span>
                    <span className="block text-xs text-muted">{t("c.completeHint")}</span>
                  </span>
                </label>
              </div>
            );
          }}
        />
        {missing.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {missing.map((l) => (
              <button key={l} type="button" className="btn-secondary btn-sm" onClick={() => { setData((d) => ({ ...d, translations: [...d.translations, blank(l)] })); setDirty(true); }}>
                + {t("art.addTranslation", { locale: LOCALE_NAMES[l] })}
              </button>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <section className="card space-y-3 p-4">
          <button type="button" className="btn-primary w-full" onClick={save} disabled={pending}>
            {props.status === "PUBLISHED" ? t("art.update") : t("art.saveDraft")}
          </button>
          {props.status === "DRAFT" && (
            <button type="button" className="btn-secondary w-full" onClick={() => status("submitReview")} disabled={pending}>{t("art.submitReview")}</button>
          )}
          {props.canPublish && ["DRAFT", "IN_REVIEW", "SCHEDULED"].includes(props.status) && (
            <>
              <button type="button" className="btn-primary w-full" onClick={() => status("publish")} disabled={pending}>{t("art.publish")}</button>
              {props.status !== "SCHEDULED" && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <label className="label" htmlFor="schedule-at">{t("art.scheduleAt")}</label>
                  <input id="schedule-at" type="datetime-local" className="input" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                  <button type="button" className="btn-secondary w-full" disabled={!scheduleAt || pending} onClick={() => status("schedule")}>{t("art.schedule")}</button>
                </div>
              )}
            </>
          )}
          {props.status === "SCHEDULED" && props.publishAt && <p className="text-sm text-muted">{t("art.scheduledFor", { time: new Date(props.publishAt).toLocaleString() })}</p>}
          {props.canPublish && ["PUBLISHED", "SCHEDULED"].includes(props.status) && (
            <button type="button" className="btn-secondary w-full" onClick={() => status("unpublish")} disabled={pending}>{t("art.unpublish")}</button>
          )}
          {props.canPublish && props.status !== "ARCHIVED" && (
            <button type="button" className="btn-ghost w-full" onClick={() => status("archive")} disabled={pending}>{t("art.archive")}</button>
          )}
          {props.canPublish && props.status === "ARCHIVED" && (
            <button type="button" className="btn-secondary w-full" onClick={() => status("restoreDraft")} disabled={pending}>{t("art.restoreDraft")}</button>
          )}
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {sorted.map((l) => (
              <Link key={l} href={`/admin/preview/articles/${data.id}?locale=${l}`} target="_blank" className="btn-ghost btn-sm">{t("c.preview")} {l.toUpperCase()}</Link>
            ))}
            <Link href={`/admin/articles/${data.id}/revisions`} className="btn-ghost btn-sm">{t("art.revisions")}</Link>
          </div>
          {props.canDelete && <div className="border-t border-border pt-3">{props.deleteSlot}</div>}
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="font-semibold">{t("art.settings")}</h2>
          <div>
            <label className="label" htmlFor="category">{t("art.category")}</label>
            <select id="category" className="input" value={data.categoryId ?? ""} onChange={(e) => setField("categoryId", e.target.value || null)}>
              <option value="">{t("c.none")}</option>
              {props.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="featured">{t("art.featuredImage")}</label>
            <select id="featured" className="input" value={data.featuredImageId ?? ""} onChange={(e) => setField("featuredImageId", e.target.value || null)}>
              <option value="">{t("c.none")}</option>
              {props.media.map((m) => <option key={m.id} value={m.id}>{m.filename}</option>)}
            </select>
            {data.featuredImageId && (
              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
              <img src={`/media/${data.featuredImageId}`} alt="" className="mt-2 max-h-32 rounded border border-border" />
            )}
          </div>
          <MultiSelect id="related" label={t("art.relatedArticles")} options={props.articles.filter((a) => a.id !== data.id)} value={data.relatedArticleIds} onChange={(v) => setField("relatedArticleIds", v)} />
          <MultiSelect id="tools" label={t("art.relatedTools")} options={props.tools} value={data.toolIds} onChange={(v) => setField("toolIds", v)} />
        </section>
      </aside>
    </div>
  );
}

function MultiSelect({ id, label, options, value, onChange }: { id: string; label: string; options: { id: string; title: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} multiple className="input h-32" value={value} onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value).slice(0, 10))}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
      </select>
    </div>
  );
}

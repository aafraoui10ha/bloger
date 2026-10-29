"use client";

import { useState } from "react";
import Link from "next/link";
import { saveToolAction } from "@/admin/actions/content";
import { ActionForm, CountedInput, FieldError, LocaleTabs, SubmitButton, useT } from "@/admin/components/client";
import { FaqEditor, RichTextEditor, type MediaOption } from "@/admin/components/RichTextEditor";
import { TOOL_ICONS } from "@/tools/registry";

type Tr = { locale: string; title: string; slug: string; shortDescription: string; aboutHtml: string; steps: string; examples: string; faq: { q: string; a: string }[]; seoTitle: string | null; seoDescription: string | null; isComplete: boolean };
type ToolData = { id: string; icon: string; order: number; featured: boolean; enabled: boolean; categoryId: string | null; related: string[]; placements: string[]; translations: Tr[] };
const NAMES: Record<string, string> = { en: "English", fr: "Français", ar: "العربية" };

export function ToolForm({ tool, categories, others, placements, media }: { tool: ToolData; categories: { id: string; name: string }[]; others: { id: string; title: string }[]; placements: { id: string; key: string; label: string }[]; media: MediaOption[] }) {
  const t = useT();
  const [about, setAbout] = useState<Record<string, string>>(Object.fromEntries(tool.translations.map((x) => [x.locale, x.aboutHtml])));
  const [faq, setFaq] = useState<Record<string, { q: string; a: string }[]>>(Object.fromEntries(tool.translations.map((x) => [x.locale, x.faq])));

  return (
    <ActionForm action={saveToolAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      {(state) => (
        <>
          <input type="hidden" name="id" value={tool.id} />
          <div className="card min-w-0 p-5">
            <h2 className="mb-2 font-semibold">{t("tool.translations")}</h2>
            <LocaleTabs
              locales={["en", "fr", "ar"]}
              labels={Object.fromEntries(["en", "fr", "ar"].map((l) => [l, `${NAMES[l]}${tool.translations.find((x) => x.locale === l)?.isComplete ? " ✓" : ""}`]))}
              render={(l) => {
                const tr = tool.translations.find((x) => x.locale === l);
                const dir = l === "ar" ? "rtl" : "ltr";
                return (
                  <div className="grid gap-4" dir={dir}>
                    <input type="hidden" name={`about_${l}`} value={about[l] ?? ""} />
                    <input type="hidden" name={`faq_${l}`} value={JSON.stringify((faq[l] ?? []).filter((f) => f.q.trim() && f.a.trim()))} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor={`title_${l}`}>{t("c.title")}</label>
                        <input id={`title_${l}`} name={`title_${l}`} className="input" defaultValue={tr?.title ?? ""} />
                        <FieldError state={state} name={`title_${l}`} />
                      </div>
                      <div>
                        <label className="label" htmlFor={`slug_${l}`}>{t("c.slug")}</label>
                        <input id={`slug_${l}`} name={`slug_${l}`} className="input font-mono text-xs" dir="auto" defaultValue={tr?.slug ?? ""} />
                        <FieldError state={state} name={`slug_${l}`} />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor={`short_${l}`}>{t("tool.shortDescription")}</label>
                      <textarea id={`short_${l}`} name={`short_${l}`} rows={2} className="input" defaultValue={tr?.shortDescription ?? ""} />
                    </div>
                    <div>
                      <p className="label">{t("tool.about")}</p>
                      <RichTextEditor value={about[l] ?? ""} onChange={(html) => setAbout((a) => ({ ...a, [l]: html }))} media={media} dir={dir} label={`${t("tool.about")} (${NAMES[l]})`} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor={`steps_${l}`}>{t("tool.steps")}</label>
                        <textarea id={`steps_${l}`} name={`steps_${l}`} rows={6} className="input" defaultValue={tr?.steps ?? ""} />
                      </div>
                      <div>
                        <label className="label" htmlFor={`examples_${l}`}>{t("tool.examples")}</label>
                        <textarea id={`examples_${l}`} name={`examples_${l}`} rows={6} className="input" defaultValue={tr?.examples ?? ""} />
                      </div>
                    </div>
                    <details className="rounded-lg border border-border p-4">
                      <summary className="cursor-pointer font-medium">{t("art.faq")} ({(faq[l] ?? []).length})</summary>
                      <div className="mt-3"><FaqEditor value={faq[l] ?? []} onChange={(v) => setFaq((f) => ({ ...f, [l]: v }))} /></div>
                      <FieldError state={state} name={`faq_${l}`} />
                    </details>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor={`seoTitle_${l}`}>{t("c.seoTitle")}</label>
                        <CountedInput id={`seoTitle_${l}`} name={`seoTitle_${l}`} max={60} defaultValue={tr?.seoTitle} />
                      </div>
                      <div>
                        <label className="label" htmlFor={`seoDescription_${l}`}>{t("c.seoDescription")}</label>
                        <CountedInput id={`seoDescription_${l}`} name={`seoDescription_${l}`} max={160} textarea defaultValue={tr?.seoDescription} />
                      </div>
                    </div>
                    <label className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-sm">
                      <input type="checkbox" name={`complete_${l}`} defaultChecked={tr?.isComplete} className="mt-1" />
                      <span><span className="font-medium">{t("c.complete")}</span><span className="block text-xs text-muted">{t("c.completeHint")}</span></span>
                    </label>
                    <Link href={`/admin/preview/tools/${tool.id}?locale=${l}`} target="_blank" className="btn-ghost btn-sm w-fit">{t("c.preview")} {l.toUpperCase()}</Link>
                  </div>
                );
              }}
            />
          </div>
          <aside className="space-y-4">
            <section className="card space-y-4 p-4">
              <h2 className="font-semibold">{t("tool.settings")}</h2>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={tool.enabled} /> {t("c.enabled")}</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={tool.featured} /> {t("tool.featured")}</label>
              <div>
                <label className="label" htmlFor="categoryId">{t("tool.category")}</label>
                <select id="categoryId" name="categoryId" className="input" defaultValue={tool.categoryId ?? ""}>
                  <option value="">{t("c.none")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="icon">{t("c.icon")}</label>
                  <select id="icon" name="icon" className="input" defaultValue={tool.icon}>
                    {TOOL_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="order">{t("c.order")}</label>
                  <input id="order" name="order" type="number" className="input" defaultValue={tool.order} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="related">{t("tool.related")}</label>
                <select id="related" name="related" multiple className="input h-36" defaultValue={tool.related}>
                  {others.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
              </div>
              <fieldset>
                <legend className="label">{t("tool.adPlacements")}</legend>
                {placements.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="placements" value={p.id} defaultChecked={tool.placements.includes(p.id)} /> {p.label}
                  </label>
                ))}
                <p className="hint">{t("tool.adPlacementsHint")}</p>
              </fieldset>
              <SubmitButton className="btn-primary w-full">{t("c.save")}</SubmitButton>
            </section>
          </aside>
        </>
      )}
    </ActionForm>
  );
}

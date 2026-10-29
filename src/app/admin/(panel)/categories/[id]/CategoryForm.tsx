"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { deleteCategoryAction, saveCategoryAction } from "@/admin/actions/site";
import { ActionForm, ConfirmAction, CountedInput, FieldError, LocaleTabs, SubmitButton, useT } from "@/admin/components/client";
import { TOOL_ICONS } from "@/tools/registry";

type Tr = { locale: string; name: string; slug: string; description: string | null; seoTitle: string | null; seoDescription: string | null };
const NAMES: Record<string, string> = { en: "English", fr: "Français", ar: "العربية" };

export function CategoryForm({ kind, category, media }: { kind: "ARTICLE" | "TOOL"; category: { id: string; icon: string | null; order: number; imageId: string | null; translations: Tr[] } | null; media: { id: string; filename: string }[] }) {
  const t = useT();
  return (
    <ActionForm action={saveCategoryAction} className="space-y-6">
      {(state) => (
        <>
          <input type="hidden" name="kind" value={kind} />
          {category && <input type="hidden" name="id" value={category.id} />}
          <div className="card grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="icon">{t("c.icon")}</label>
              <select id="icon" name="icon" className="input" defaultValue={category?.icon ?? ""}>
                <option value="">{t("c.none")}</option>
                {TOOL_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="order">{t("c.order")}</label>
              <input id="order" name="order" type="number" className="input" defaultValue={category?.order ?? 0} />
            </div>
            <div>
              <label className="label" htmlFor="imageId">{t("cat.image")}</label>
              <select id="imageId" name="imageId" className="input" defaultValue={category?.imageId ?? ""}>
                <option value="">{t("c.none")}</option>
                {media.map((m) => <option key={m.id} value={m.id}>{m.filename}</option>)}
              </select>
            </div>
          </div>
          <div className="card p-5">
            <LocaleTabs
              locales={["en", "fr", "ar"]}
              labels={NAMES}
              render={(l) => {
                const tr = category?.translations.find((x) => x.locale === l);
                return (
                  <div className="grid gap-4" dir={l === "ar" ? "rtl" : "ltr"}>
                    <div>
                      <label className="label" htmlFor={`name_${l}`}>{t("c.name")}</label>
                      <input id={`name_${l}`} name={`name_${l}`} className="input" defaultValue={tr?.name ?? ""} />
                      <FieldError state={state} name={`name_${l}`} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`slug_${l}`}>{t("c.slug")}</label>
                      <input id={`slug_${l}`} name={`slug_${l}`} className="input font-mono text-xs" dir="auto" defaultValue={tr?.slug ?? ""} />
                      <FieldError state={state} name={`slug_${l}`} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`description_${l}`}>{t("c.description")}</label>
                      <textarea id={`description_${l}`} name={`description_${l}`} rows={3} className="input" defaultValue={tr?.description ?? ""} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`seoTitle_${l}`}>{t("c.seoTitle")}</label>
                      <CountedInput id={`seoTitle_${l}`} name={`seoTitle_${l}`} max={60} defaultValue={tr?.seoTitle} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`seoDescription_${l}`}>{t("c.seoDescription")}</label>
                      <CountedInput id={`seoDescription_${l}`} name={`seoDescription_${l}`} max={160} textarea defaultValue={tr?.seoDescription} />
                    </div>
                  </div>
                );
              }}
            />
          </div>
          <SubmitButton>{t("c.save")}</SubmitButton>
          <SavedRedirect ok={!!state.ok && !category} kind={kind} />
        </>
      )}
    </ActionForm>
  );
}

function SavedRedirect({ ok, kind }: { ok: boolean; kind: string }) {
  const router = useRouter();
  useEffect(() => {
    if (ok) router.push(kind === "TOOL" ? "/admin/categories?kind=TOOL" : "/admin/categories");
  }, [ok, kind, router]);
  return null;
}

export function DeleteCategory({ id, hasItems, targets }: { id: string; hasItems: boolean; targets: { id: string; name: string }[] }) {
  const t = useT();
  return (
    <ConfirmAction action={deleteCategoryAction} label={t("c.delete")} title={t("cat.deleteTitle")} body={hasItems ? t("cat.inUse") : t("c.confirmDelete")} hidden={{ id }}>
      <div>
        <label className="label" htmlFor="mergeInto">{t("cat.mergeInto")}</label>
        <select id="mergeInto" name="mergeInto" className="input">
          <option value="">{t("c.none")}</option>
          {targets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <p className="hint">{t("cat.mergeHint")}</p>
      </div>
    </ConfirmAction>
  );
}

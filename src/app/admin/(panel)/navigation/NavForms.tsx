"use client";

import { deleteNavItemAction, saveNavItemAction } from "@/admin/actions/site";
import { ActionForm, ConfirmAction, FieldError, SubmitButton, useT } from "@/admin/components/client";

type Item = { id: string; location: string; order: number; href: string; labelEn: string; labelFr: string; labelAr: string; enabled: boolean };

export function NavItemForm({ item }: { item?: Item }) {
  const t = useT();
  const p = item?.id ?? "new";
  return (
    <ActionForm action={saveNavItemAction} className="grid gap-3 md:grid-cols-6 md:items-end" resetOnSuccess={!item}>
      {(state) => (
        <>
          {item && <input type="hidden" name="id" value={item.id} />}
          <div>
            <label className="label" htmlFor={`loc-${p}`}>{t("nv.location")}</label>
            <select id={`loc-${p}`} name="location" className="input" defaultValue={item?.location ?? "HEADER"}>
              {(["HEADER", "FOOTER", "SOCIAL"] as const).map((l) => <option key={l} value={l}>{t(`nv.loc.${l}`)}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor={`href-${p}`}>{t("nv.href")}</label>
            <input id={`href-${p}`} name="href" className="input" dir="ltr" defaultValue={item?.href ?? ""} />
            <FieldError state={state} name="href" />
          </div>
          <div>
            <label className="label" htmlFor={`en-${p}`}>{t("nv.labelEn")}</label>
            <input id={`en-${p}`} name="labelEn" className="input" defaultValue={item?.labelEn ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor={`fr-${p}`}>{t("nv.labelFr")}</label>
            <input id={`fr-${p}`} name="labelFr" className="input" defaultValue={item?.labelFr ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor={`ar-${p}`}>{t("nv.labelAr")}</label>
            <input id={`ar-${p}`} name="labelAr" className="input" dir="rtl" defaultValue={item?.labelAr ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor={`ord-${p}`}>{t("c.order")}</label>
            <input id={`ord-${p}`} name="order" type="number" className="input" defaultValue={item?.order ?? 0} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={item?.enabled ?? true} /> {t("c.enabled")}</label>
          <SubmitButton className="btn-primary">{item ? t("c.save") : t("c.add")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DeleteNavItem({ id }: { id: string }) {
  const t = useT();
  return <ConfirmAction action={deleteNavItemAction} label={t("c.delete")} title={t("c.delete")} body={t("c.confirmDelete")} hidden={{ id }} className="btn-ghost btn-sm text-danger" />;
}

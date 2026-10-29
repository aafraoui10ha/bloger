import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Card, formatDateTime } from "@/admin/components/ui";
import { RunScheduler, SettingsForm } from "./SettingsForms";

export default async function SettingsPage() {
  const { user, t } = await adminContext("settings.manage");
  const s = await db.siteSettings.findUnique({ where: { id: "default" } });
  return (
    <>
      <AdminPageHeader title={t("st.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("st.title") }]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <SettingsForm
            s={{
              siteName: s?.siteName ?? "Toolbox Atlas",
              taglineEn: s?.taglineEn ?? "",
              taglineFr: s?.taglineFr ?? "",
              taglineAr: s?.taglineAr ?? "",
              contactEmail: s?.contactEmail ?? "",
              organizationName: s?.organizationName ?? "",
              organizationLogoUrl: s?.organizationLogoUrl ?? "",
              defaultLocale: s?.defaultLocale ?? "en",
            }}
          />
        </Card>
        <Card title={t("st.scheduler")}>
          <p className="text-sm">{t("ov.lastRun", { time: s?.lastSchedulerRunAt ? formatDateTime(s.lastSchedulerRunAt, user.locale) : t("c.never") })}</p>
          <p className="hint mb-3">{t("st.cronHint")}</p>
          <RunScheduler />
        </Card>
      </div>
    </>
  );
}

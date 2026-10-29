import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Card } from "@/admin/components/ui";
import { AnalyticsForm } from "./AnalyticsForm";

export default async function AnalyticsPage() {
  const { t } = await adminContext("analytics.manage");
  const a = await db.analyticsSettings.findUnique({ where: { id: "default" } });
  return (
    <>
      <AdminPageHeader title={t("an.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("an.title") }]} description={t("an.noReports")} />
      <Card className="max-w-3xl">
        <AnalyticsForm a={{ enabled: a?.enabled ?? false, gaMeasurementId: a?.gaMeasurementId ?? "", searchConsoleVerification: a?.searchConsoleVerification ?? "" }} />
        <p className="hint mt-4">{t("an.events")}</p>
      </Card>
    </>
  );
}

import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Card } from "@/admin/components/ui";
import { ConsentForm } from "./ConsentForm";

export default async function ConsentPage() {
  const { t } = await adminContext("consent.manage");
  const c = await db.consentConfiguration.findUnique({ where: { id: "default" } });
  return (
    <>
      <AdminPageHeader title={t("cs.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("cs.title") }]} description={t("cs.disclaimer")} />
      <Card className="max-w-3xl">
        <ConsentForm c={{ mode: c?.mode ?? "BUILT_IN", bannerEnabled: c?.bannerEnabled ?? true, policyVersion: c?.policyVersion ?? 1, externalCmpNotes: c?.externalCmpNotes ?? "" }} />
      </Card>
    </>
  );
}

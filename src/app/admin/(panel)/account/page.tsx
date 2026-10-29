import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Card } from "@/admin/components/ui";
import { PasswordForm, ProfileForm } from "./AccountForms";

export default async function AccountPage() {
  const { user, t } = await adminContext();
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, locale: true, bio: true, role: true } });
  return (
    <>
      <AdminPageHeader title={t("acc.title")} description={`${me.email} · ${t(`role.${me.role}`)}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t("acc.title")}><ProfileForm me={{ name: me.name, locale: me.locale, bio: me.bio ?? "" }} /></Card>
        <Card title={t("acc.changePassword")}><PasswordForm /></Card>
      </div>
    </>
  );
}

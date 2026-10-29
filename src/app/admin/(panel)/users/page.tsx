import { db } from "@/lib/db";
import { canAssignRole, canManageUser } from "@/lib/auth/permissions";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Badge, Card, Table, Td, formatDateTime } from "@/admin/components/ui";
import { NewUserForm, UserRowActions } from "./UserForms";

const ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR"] as const;

export default async function UsersPage() {
  const { user, t } = await adminContext("user.manage");
  // Never select password hashes or tokens.
  const users = await db.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }], select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true } });
  const assignable = ROLES.filter((r) => canAssignRole(user.role, r));

  return (
    <>
      <AdminPageHeader title={t("usr.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("usr.title") }]} />
      <Card title={t("usr.new")} className="mb-6">
        <NewUserForm roles={assignable} />
        <p className="hint mt-2">{t("usr.inviteHint")}</p>
      </Card>
      <Table head={[t("c.name"), t("c.email"), t("c.role"), t("c.status"), t("usr.lastLogin"), t("c.actions")]}>
        {users.map((u) => (
          <tr key={u.id}>
            <Td className="font-medium">{u.name}</Td>
            <Td className="text-muted" >{u.email}</Td>
            <Td>{t(`role.${u.role}`)}</Td>
            <Td>{u.isActive ? <Badge tone="success">{t("c.active")}</Badge> : <Badge>{t("c.disabled")}</Badge>}</Td>
            <Td className="text-muted">{formatDateTime(u.lastLoginAt, user.locale)}</Td>
            <Td>
              {canManageUser(user.role, u.role) ? (
                <UserRowActions u={u} roles={ROLES.filter((r) => canAssignRole(user.role, r) || r === u.role)} self={u.id === user.id} />
              ) : (
                <span className="text-xs text-muted">—</span>
              )}
            </Td>
          </tr>
        ))}
      </Table>
      <Card title={t("usr.permissions")} className="mt-6">
        <dl className="space-y-2 text-sm">
          {ROLES.map((r) => (
            <div key={r}>
              <dt className="font-medium">{t(`role.${r}`)}</dt>
              <dd className="text-muted">{t(`usr.perm.${r}`)}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}

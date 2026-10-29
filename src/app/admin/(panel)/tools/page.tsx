import Link from "next/link";
import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Badge, Table, Td } from "@/admin/components/ui";
import { TOOL_MODULES } from "@/tools/registry";
import { ToolIconView } from "@/components/icons";
import { RegisterToolForm } from "./RegisterToolForm";

export default async function ToolsAdminPage() {
  const { user, t } = await adminContext("tool.manage");
  const tools = await db.tool.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { translations: { select: { locale: true, title: true, isComplete: true } }, category: { include: { translations: { where: { locale: user.locale } } } } },
  });
  const unregistered = Object.keys(TOOL_MODULES).filter((k) => !tools.some((x) => x.moduleKey === k));

  return (
    <>
      <AdminPageHeader title={t("tool.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("tool.title") }]} />
      <div className="card mb-6 p-4">
        {unregistered.length ? <RegisterToolForm modules={unregistered} /> : <p className="text-sm text-muted">{t("tool.allRegistered")}</p>}
        <p className="hint mt-2">{t("tool.moduleHint")}</p>
      </div>
      <Table head={[t("c.title"), t("tool.module"), t("tool.category"), t("art.languages"), t("c.status"), t("c.order")]}>
        {tools.map((tool) => {
          const title = tool.translations.find((x) => x.locale === user.locale)?.title ?? tool.moduleKey;
          return (
            <tr key={tool.id}>
              <Td>
                <Link href={`/admin/tools/${tool.id}`} className="flex items-center gap-2 font-medium hover:text-accent">
                  <ToolIconView name={tool.icon} className="size-4 text-muted" />
                  {title}
                </Link>
              </Td>
              <Td className="font-mono text-xs text-muted">{tool.moduleKey}</Td>
              <Td className="text-muted">{tool.category?.translations[0]?.name ?? "—"}</Td>
              <Td>
                <div className="flex gap-1">
                  {(["en", "fr", "ar"] as const).map((l) => (
                    <Badge key={l} tone={tool.translations.find((x) => x.locale === l)?.isComplete ? "success" : "warning"}>{l.toUpperCase()}</Badge>
                  ))}
                </div>
              </Td>
              <Td>
                {tool.enabled ? <Badge tone="success">{t("c.enabled")}</Badge> : <Badge>{t("c.disabled")}</Badge>}
                {tool.featured && <span className="ms-1"><Badge tone="accent">{t("tool.featured")}</Badge></span>}
              </Td>
              <Td className="tabular-nums">{tool.order}</Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}

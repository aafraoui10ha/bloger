import { adminContext } from "@/admin/server";

export default async function ForbiddenPage() {
  const { t } = await adminContext();
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <p className="text-4xl font-bold text-danger">403</p>
      <h1 className="mt-2 text-xl font-bold">{t("auth.forbiddenTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("auth.forbiddenBody")}</p>
    </div>
  );
}

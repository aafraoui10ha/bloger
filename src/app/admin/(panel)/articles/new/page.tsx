import { adminContext } from "@/admin/server";
import { AdminPageHeader } from "@/admin/components/ui";
import { NewArticleForm } from "./NewArticleForm";

export default async function NewArticlePage() {
  const { t, user } = await adminContext("article.create");
  return (
    <>
      <AdminPageHeader title={t("art.createTitle")} crumbs={[{ label: t("art.title"), href: "/admin/articles" }, { label: t("art.new") }]} />
      <div className="card max-w-xl p-5">
        <NewArticleForm defaultLocale={user.locale} />
      </div>
    </>
  );
}

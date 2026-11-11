import { notFound } from "next/navigation";
import { CATEGORIES, type CategoryId } from "@desktop/catalog";
import { CategoryView } from "@desktop/views/views";

export const dynamicParams = false;
export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!(CATEGORIES as readonly string[]).includes(category)) notFound();
  return <CategoryView category={category as CategoryId} />;
}

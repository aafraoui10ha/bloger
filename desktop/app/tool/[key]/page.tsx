import { notFound } from "next/navigation";
import { TOOLS, getTool } from "@desktop/catalog";
import { ToolView } from "@desktop/views/views";

export const dynamicParams = false;
export function generateStaticParams() {
  return TOOLS.map((t) => ({ key: t.key }));
}

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!getTool(key)) notFound();
  return <ToolView toolKey={key} />;
}

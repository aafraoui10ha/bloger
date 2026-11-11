import { Calculator, Code, Image as ImageIcon, Palette, PenTool, Type } from "lucide-react";
import type { CategoryId } from "../catalog";

const ICONS = { image: ImageIcon, design: PenTool, colors: Palette, text: Type, calculators: Calculator, developer: Code } as const;

export function CategoryIcon({ category, className = "size-5" }: { category: CategoryId; className?: string }) {
  const Icon = ICONS[category];
  return <Icon className={className} aria-hidden="true" />;
}

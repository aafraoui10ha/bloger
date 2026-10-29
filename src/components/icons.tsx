import {
  Binary, Braces, Cake, Calculator, Clock, Dices, Hash, HeartPulse, KeyRound, Landmark, Pilcrow, Scissors, CaseSensitive, Code, Eraser, FileImage, FileSearch, FileType, Image as ImageIcon,
  ImageDown, Link as LinkIcon, Palette, Percent, QrCode, Ruler, Scaling, Sigma, Tag, Text, Type, Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ToolIcon } from "@/tools/registry";

const ICONS: Record<ToolIcon, LucideIcon> = {
  "image-down": ImageDown,
  scaling: Scaling,
  "file-image": FileImage,
  "file-type": FileType,
  "file-search": FileSearch,
  type: Type,
  eraser: Eraser,
  "case-sensitive": CaseSensitive,
  percent: Percent,
  tag: Tag,
  sigma: Sigma,
  "qr-code": QrCode,
  braces: Braces,
  palette: Palette,
  ruler: Ruler,
  binary: Binary,
  link: LinkIcon,
  wrench: Wrench,
  image: ImageIcon,
  calculator: Calculator,
  code: Code,
  text: Text,
  "key-round": KeyRound,
  dices: Dices,
  hash: Hash,
  clock: Clock,
  "heart-pulse": HeartPulse,
  cake: Cake,
  landmark: Landmark,
  pilcrow: Pilcrow,
  scissors: Scissors,
};

/** Renders an allow-listed icon by name; unknown names fall back to a wrench. */
export function ToolIconView({ name, className = "size-5" }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && ICONS[name as ToolIcon]) || Wrench;
  return <Icon className={className} aria-hidden="true" />;
}

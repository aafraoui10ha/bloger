import type { AppLocale } from "@/i18n/routing";
import { redirectOrNotFound } from "@/lib/not-found";
import { decodeParam } from "@/lib/urls";

/** Catches unknown multi-segment paths: follows stored redirects, otherwise 404. */
export default async function CatchAll({ params }: { params: Promise<{ locale: AppLocale; rest: string[] }> }) {
  const { locale, rest } = await params;
  return redirectOrNotFound(`/${locale}/${rest.map(decodeParam).join("/")}`);
}

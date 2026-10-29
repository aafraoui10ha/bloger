export async function loadMessages(locale: "en" | "fr" | "ar") {
  return (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
}

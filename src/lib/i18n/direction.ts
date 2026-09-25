export type SupportedLanguage = "ar" | "en";

export function directionFor(language: SupportedLanguage): "rtl" | "ltr" {
  return language === "ar" ? "rtl" : "ltr";
}

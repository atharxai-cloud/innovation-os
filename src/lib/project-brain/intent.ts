export type AskProjectIntent =
  | "GENERAL"
  | "EVIDENCE"
  | "PRIOR_ART"
  | "GAP"
  | "EXPERIMENT";

export function detectIntent(question: string): AskProjectIntent {
  const q = question.toLowerCase();

  if (/تجرب|experiment|hypothesis|control|قياس|measurement/.test(q)) {
    return "EXPERIMENT";
  }

  if (/براء|patent|prior art|سابقة|تشابه|جدة/.test(q)) {
    return "PRIOR_ART";
  }

  if (/فجوة|gap|limitation|قيد|فرصة/.test(q)) {
    return "GAP";
  }

  if (/دليل|مصدر|دراسة|claim|evidence|source|بحث/.test(q)) {
    return "EVIDENCE";
  }

  return "GENERAL";
}

import { WorkspacePlaceholder } from "@/components/project/workspace-placeholder";

export default function GapPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Gap"
      title="تحديد الفجوة"
      known="الفجوات يجب أن تُبنى على Evidence وPrior Art محفوظين."
      unknown="أين توجد القيود أو السياقات غير المخدومة أو فرص التحسين؟"
      next="Gap Finder سيُفعل بعد تحقق الحد الأدنى من السياق."
    />
  );
}

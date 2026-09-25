import { WorkspacePlaceholder } from "@/components/project/workspace-placeholder";

export default function PriorArtPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Prior Art"
      title="اكتشاف الأعمال السابقة"
      known="لا توجد نتائج Prior Art محفوظة بعد."
      unknown="ما أقرب الأبحاث أو التقنيات أو سجلات البراءات ذات الصلة؟"
      next="Prior-Art Discovery سيتم تنفيذه في Epic 6 دون إصدار رأي قانوني."
    />
  );
}

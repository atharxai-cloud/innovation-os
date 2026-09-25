import { WorkspacePlaceholder } from "@/components/project/workspace-placeholder";

export default function TimelinePage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Timeline"
      title="الخط الزمني"
      known="الأحداث ستكون Append-oriented وغير قابلة للتعديل من المستخدم."
      unknown="لا توجد أحداث مشروع فعلية قبل ربط قاعدة البيانات."
      next="سيتم بناء Timeline من audit_events والقرارات المهمة."
    />
  );
}

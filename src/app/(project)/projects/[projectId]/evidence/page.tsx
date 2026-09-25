import { WorkspacePlaceholder } from "@/components/project/workspace-placeholder";

export default function EvidencePage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Evidence"
      title="مساحة الأدلة"
      known="لا توجد مصادر محفوظة في هذه المرحلة التأسيسية."
      unknown="ما الدليل الذي يثبت وجود المشكلة أو الآلية العلمية؟"
      next="Evidence Engine سيتم تنفيذه في Epic 5."
    />
  );
}

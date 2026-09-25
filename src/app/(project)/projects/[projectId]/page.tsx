import { WorkspacePlaceholder } from "@/components/project/workspace-placeholder";

export default function ProjectOverviewPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Overview"
      title="نظرة عامة على المشروع"
      known="لم يتم تحميل Project State بعد."
      unknown="سيتم اشتقاق الأسئلة المفتوحة والمخاطر من بيانات المشروع الفعلية."
      next="Epic 2 سيربط هذه الشاشة بـ Project State Machine."
    />
  );
}

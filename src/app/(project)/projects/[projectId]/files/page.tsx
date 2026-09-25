import { WorkspacePlaceholder } from "@/components/project/workspace-placeholder";

export default function FilesPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Files"
      title="ملفات المشروع"
      known="التخزين الخاص غير مربوط بعد."
      unknown="ما الملفات التي يحتاج المشروع إلى حفظها أو فهرستها؟"
      next="سيتم ربط Supabase Storage مع سياسات وصول خاصة بالمشروع."
    />
  );
}

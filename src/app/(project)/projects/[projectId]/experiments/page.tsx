import { WorkspacePlaceholder } from "@/components/project/workspace-placeholder";

export default function ExperimentsPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Experiments"
      title="تصميم التجربة"
      known="لا توجد تجربة مصممة بعد."
      unknown="ما الفرضية والمتغيرات وطريقة القياس ومعيار النجاح؟"
      next="Experiment Designer + Scientific Critic سيتم تنفيذهما كعاملين مستقلين."
    />
  );
}

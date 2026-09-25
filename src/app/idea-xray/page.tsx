import { IdeaXRayWorkbench } from "@/components/idea-xray/idea-xray-workbench";

export default function IdeaXrayPage() {
  return (
    <main className="shell py-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-[var(--accent)]">Idea X-Ray</p>
        <h1 className="mt-3 text-4xl font-semibold">
          افهم فكرتك قبل أن تبدأ ببناء الحل
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-[var(--muted-foreground)]">
          سنفصل المشكلة عن الافتراضات والمجهولات، ونحدد الأسئلة التي تحتاج إلى
          إثبات والخطوة التالية الأكثر منطقية.
        </p>
        <div className="mt-8">
          <IdeaXRayWorkbench />
        </div>
      </div>
    </main>
  );
}

import { ConvertIdeaXRayDraft } from "@/components/idea-xray/convert-draft";

export default function ConvertIdeaXRayPage() {
  return (
    <main className="shell py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold">تحويل التحليل إلى مشروع</h1>
        <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
          هذه هي النقطة التي ينتقل فيها التحليل المؤقت إلى Project State محفوظ
          داخل مساحة عملك الخاصة.
        </p>
        <div className="mt-8">
          <ConvertIdeaXRayDraft />
        </div>
      </div>
    </main>
  );
}

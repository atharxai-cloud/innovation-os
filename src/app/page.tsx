import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="shell flex min-h-screen items-center py-12">
      <section className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold tracking-wide text-[var(--accent)]">
            Innovation OS
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.2] sm:text-6xl">
            حوّل الفكرة غير المنظمة إلى مشروع ابتكاري قابل للإثبات والاختبار.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
            المنصة لا تعطيك ابتكارًا جاهزًا؛ بل تساعدك على فهم المشكلة، كشف
            الافتراضات، جمع الأدلة، مقارنة الأعمال السابقة، تحديد الفجوة،
            وتصميم التجربة التالية.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/idea-xray"
              className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--accent-foreground)]"
            >
              افحص فكرتك
            </Link>
            <a
              href="#how"
              className="rounded-full border border-[var(--border)] bg-white px-6 py-3 font-semibold"
            >
              كيف تعمل المنصة؟
            </a>
          </div>
        </div>

        <div className="surface p-6 sm:p-8">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            North Star
          </p>
          <p className="mt-3 text-2xl font-semibold leading-9" dir="ltr">
            What should this innovator do next — and why?
          </p>
          <div className="mt-8 grid gap-3 text-sm">
            {["IDEA", "UNDERSTAND", "EVIDENCE", "PRIOR ART", "GAP", "EXPERIMENT"].map(
              (step, index) => (
                <div
                  key={step}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3"
                  dir="ltr"
                >
                  <span className="font-semibold">{step}</span>
                  <span className="text-[var(--muted-foreground)]">
                    0{index + 1}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

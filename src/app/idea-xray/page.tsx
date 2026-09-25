export default function IdeaXrayPage() {
  return (
    <main className="shell py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-[var(--accent)]">Idea X-Ray</p>
        <h1 className="mt-3 text-4xl font-semibold">
          ما المشكلة أو الفكرة التي تعمل عليها؟
        </h1>
        <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
          اكتبها بطريقتك الطبيعية، بالعربية أو الإنجليزية أو بالمزج بينهما.
          سنفصل المشكلة عن الافتراضات والأسئلة التي تحتاج إثباتًا.
        </p>

        <section className="surface mt-8 p-5">
          <label htmlFor="idea" className="text-sm font-semibold">
            وصف الفكرة أو المشكلة
          </label>
          <textarea
            id="idea"
            rows={9}
            className="mt-3 w-full resize-y rounded-2xl border border-[var(--border)] bg-white p-4 leading-7 outline-none focus:border-[var(--accent)]"
            placeholder="مثال: أريد تطوير نظام يقلل تشغيل المكيفات في الفصول الفارغة..."
          />
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              الربط الفعلي مع Idea X-Ray Agent سيتم في Epic 3.
            </p>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full bg-[var(--surface-muted)] px-5 py-3 font-semibold text-[var(--muted-foreground)]"
            >
              افحص الفكرة
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

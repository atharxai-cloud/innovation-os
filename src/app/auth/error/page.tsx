import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="shell py-12">
      <section className="surface mx-auto max-w-xl p-8">
        <p className="text-sm font-semibold text-[var(--danger)]">Authentication</p>
        <h1 className="mt-3 text-3xl font-semibold">تعذر إكمال تسجيل الدخول</h1>
        <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
          رابط المصادقة غير صالح أو انتهت صلاحيته. أعد المحاولة من صفحة تسجيل الدخول.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white"
        >
          العودة لتسجيل الدخول
        </Link>
      </section>
    </main>
  );
}

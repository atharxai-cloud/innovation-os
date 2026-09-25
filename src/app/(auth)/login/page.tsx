import Link from "next/link";
import { login } from "../actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message, next } = await searchParams;

  return (
    <main className="shell py-12">
      <section className="surface mx-auto max-w-xl p-8">
        <p className="text-sm font-semibold text-[var(--accent)]">Authentication</p>
        <h1 className="mt-3 text-3xl font-semibold">تسجيل الدخول</h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          ادخل إلى مشاريعك ومساحة الابتكار الخاصة بك.
        </p>

        {message === "check-email" ? (
          <p className="mt-5 rounded-2xl border border-[var(--border)] p-4 text-sm">
            تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.
          </p>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--danger)]">
            تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور وأعد المحاولة.
          </p>
        ) : null}

        <form action={login} className="mt-7 grid gap-4">
          <input type="hidden" name="next" value={next ?? "/innovations"} />
          <label className="grid gap-2 text-sm font-semibold">
            البريد الإلكتروني
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            كلمة المرور
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              dir="ltr"
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button className="mt-2 rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white">
            تسجيل الدخول
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--muted-foreground)]">
          ليس لديك حساب؟{" "}
          <Link
            className="font-semibold text-[var(--accent)]"
            href={`/signup?next=${encodeURIComponent(next ?? "/innovations")}`}
          >
            إنشاء حساب
          </Link>
        </p>
      </section>
    </main>
  );
}

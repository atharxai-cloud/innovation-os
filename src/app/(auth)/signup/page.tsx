import Link from "next/link";
import { signup } from "../actions";

type SignupPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error, next } = await searchParams;

  return (
    <main className="shell py-12">
      <section className="surface mx-auto max-w-xl p-8">
        <p className="text-sm font-semibold text-[var(--accent)]">Create Account</p>
        <h1 className="mt-3 text-3xl font-semibold">أنشئ حسابك</h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          سيتم إنشاء مساحة عمل شخصية لك تلقائيًا.
        </p>

        {error ? (
          <p className="mt-5 rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--danger)]">
            تحقق من الاسم والبريد وكلمة المرور. يجب ألا تقل كلمة المرور عن 8 أحرف.
          </p>
        ) : null}

        <form action={signup} className="mt-7 grid gap-4">
          <input type="hidden" name="next" value={next ?? "/innovations"} />
          <label className="grid gap-2 text-sm font-semibold">
            الاسم
            <input
              name="fullName"
              required
              autoComplete="name"
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal outline-none focus:border-[var(--accent)]"
            />
          </label>
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
              minLength={8}
              required
              autoComplete="new-password"
              dir="ltr"
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button className="mt-2 rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white">
            إنشاء الحساب
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--muted-foreground)]">
          لديك حساب؟ <Link
            className="font-semibold text-[var(--accent)]"
            href={`/login?next=${encodeURIComponent(next ?? "/innovations")}`}
          >
            تسجيل الدخول
          </Link>
        </p>
      </section>
    </main>
  );
}

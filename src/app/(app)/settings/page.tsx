export default function SettingsPage() {
  return (
    <main className="shell py-10">
      <section className="surface max-w-3xl p-7">
        <p className="text-sm font-semibold text-[var(--accent)]">Account</p>
        <h1 className="mt-2 text-3xl font-semibold">إعدادات الحساب</h1>
        <p className="mt-4 text-[var(--muted-foreground)]">
          الاسم، اللغة المفضلة، الدولة، وإفصاحات الخصوصية وسياسة إرسال البيانات
          إلى مزودي الذكاء الاصطناعي ستظهر هنا بعد ربط Supabase Auth.
        </p>
      </section>
    </main>
  );
}

import { requireUser } from "@/lib/auth/require-user";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  return children;
}

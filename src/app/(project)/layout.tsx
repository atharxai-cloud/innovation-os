import { requireUser } from "@/lib/auth/require-user";

export default async function ProtectedProjectLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  return children;
}

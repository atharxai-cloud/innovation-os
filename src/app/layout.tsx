import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Innovation OS",
  description: "نظام تشغيل الابتكار والبحث والتطوير",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

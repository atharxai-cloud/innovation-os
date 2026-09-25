import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/innovations";
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/innovations";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

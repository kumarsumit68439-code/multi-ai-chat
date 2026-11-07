import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  if (errorParam) {
    const msg = encodeURIComponent(errorDesc || errorParam);
    return NextResponse.redirect(`${origin}/?error=oauth&message=${msg}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback]", error.message);
      return NextResponse.redirect(
        `${origin}/?error=auth&message=${encodeURIComponent(error.message)}`
      );
    }

    // Mark connector connected + store provider tokens (Gmail/Drive/Calendar)
    try {
      const nextUrl = new URL(next, origin);
      const connectorId = nextUrl.searchParams.get("connectors");
      const user = data.session?.user;
      const providerToken = data.session?.provider_token;
      const providerRefresh = data.session?.provider_refresh_token;

      if (user && connectorId) {
        await supabase.from("user_connectors").upsert(
          {
            user_id: user.id,
            connector_id: connectorId,
            connected: true,
            provider: data.session?.user?.app_metadata?.provider || "google",
            access_token: providerToken || null,
            refresh_token: providerRefresh || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,connector_id" }
        );
      }
    } catch (e) {
      console.warn("[auth/callback] connector upsert failed", e);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}

import { NextRequest, NextResponse } from "next/server";
import { removeConnection } from "@/lib/connectors/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const connectorId = String(body.connectorId || "");
    if (!connectorId) {
      return NextResponse.json({ error: "connectorId is required" }, { status: 400 });
    }
    await removeConnection(connectorId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to disconnect";
    return NextResponse.json(
      { error: message },
      { status: message === "Not signed in" ? 401 : 500 }
    );
  }
}

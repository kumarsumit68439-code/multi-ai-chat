import { NextResponse } from "next/server";
import { CONNECTORS, missingEnv } from "@/lib/connectors/registry";
import { listConnectionsLite, type ConnLite } from "@/lib/connectors/store";
import { isEncryptionConfigured } from "@/lib/connectors/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await listConnectionsLite();
    const byId: Record<string, ConnLite> = {};
    rows.forEach((r) => {
      byId[r.connectorId] = r;
    });

    const connectors = CONNECTORS.map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      group: def.group,
      allowToken: !!def.allowToken,
      tokenHelp: def.tokenHelp,
      missingEnv: missingEnv(def),
      connected: !!byId[def.id] && byId[def.id].status === "connected",
      pending: !!byId[def.id] && byId[def.id].status === "pending",
    }));

    const custom = rows
      .filter((r) => r.connectorId.indexOf("custom:") === 0)
      .map((r) => ({
        id: r.connectorId,
        label: r.label,
        url: r.serverUrl,
        connected: r.status === "connected",
      }));

    return NextResponse.json({
      encryptionConfigured: isEncryptionConfigured(),
      connectors,
      custom,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load connectors";
    return NextResponse.json(
      { error: message },
      { status: message === "Not signed in" ? 401 : 500 }
    );
  }
}

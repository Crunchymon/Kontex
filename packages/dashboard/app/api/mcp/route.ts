import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { callMcpToolServer } from "../../../lib/mcp-server-client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.apiKey) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthenticated", message: "Sign in required" } },
      { status: 401 }
    );
  }

  try {
    const payload = (await req.json()) as { tool: string; input: unknown };
    if (!payload?.tool) {
      return NextResponse.json(
        { ok: false, error: { code: "validation", message: "Missing tool name" } },
        { status: 400 }
      );
    }
    const result = await callMcpToolServer(payload.tool, payload.input, session.apiKey);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: error instanceof Error ? error.message : "Unknown error" }
      },
      { status: 500 }
    );
  }
}

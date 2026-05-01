import { NextResponse } from "next/server";
import { callMcpToolServer } from "../../../lib/mcp-server-client";

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as { tool: string; input: unknown };
    const rawResult = (await callMcpToolServer(payload.tool, payload.input)) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = rawResult.content?.find((item) => item.type === "text")?.text ?? "{}";
    const result = JSON.parse(text);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

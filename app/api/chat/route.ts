import { NextRequest, NextResponse } from "next/server";
import { verifyToken, toSessionContext } from "@/lib/auth";
import { runAgent, Message, PendingAction } from "@/lib/agent";

export const maxDuration = 60; // 60 second timeout for Vercel

export async function POST(request: NextRequest) {
  // 1. Auth check
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Parse request
  const { messages, confirmed_action } = (await request.json()) as {
    messages: Message[];
    confirmed_action?: PendingAction;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  // 3. Run agent
  const session = toSessionContext(user);

  try {
    const result = await runAgent(messages, session, apiKey, confirmed_action);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Surface access control errors with 403
    if (message.startsWith("ACCESS_DENIED")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    console.error("Agent error:", error);
    return NextResponse.json(
      { error: `Agent error: ${message}` },
      { status: 500 }
    );
  }
}

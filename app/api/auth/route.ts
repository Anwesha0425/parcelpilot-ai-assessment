import { NextRequest, NextResponse } from "next/server";
import { validateCredentials, signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const user = validateCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signToken(user);

  return NextResponse.json({
    token,
    user: {
      email: user.email,
      role: user.role,
      account_id: user.account_id,
      name: user.name,
    },
  });
}

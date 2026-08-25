// Auth utility — mock JWT using jose (works in Next.js Edge Runtime)
import { SignJWT, jwtVerify } from "jose";
import { SessionContext } from "./tools/data-tools";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "parcelpilot-dev-secret-change-in-production"
);

export interface AuthUser {
  email: string;
  role: "customer" | "internal";
  account_id: string | null;
  name: string;
}

// Mock user registry
const MOCK_USERS: Record<string, AuthUser & { password: string }> = {
  "customer@northstar.com": {
    email: "customer@northstar.com",
    password: "pass",
    role: "customer",
    account_id: "ACC-001",
    name: "Northstar Logistics",
  },
  "customer@lumenworks.com": {
    email: "customer@lumenworks.com",
    password: "pass",
    role: "customer",
    account_id: "ACC-002",
    name: "LumenWorks",
  },
  "customer@brightmove.com": {
    email: "customer@brightmove.com",
    password: "pass",
    role: "customer",
    account_id: "ACC-003",
    name: "BrightMove Retail",
  },
  "customer@fastfreight.com": {
    email: "customer@fastfreight.com",
    password: "pass",
    role: "customer",
    account_id: "ACC-004",
    name: "FastFreight Co.",
  },
  "ops@parcelpilot.com": {
    email: "ops@parcelpilot.com",
    password: "pass",
    role: "internal",
    account_id: null,
    name: "Ops Team",
  },
  "admin@parcelpilot.com": {
    email: "admin@parcelpilot.com",
    password: "pass",
    role: "internal",
    account_id: null,
    name: "Admin",
  },
};

export function validateCredentials(
  email: string,
  password: string
): AuthUser | null {
  const user = MOCK_USERS[email];
  if (!user || user.password !== password) return null;
  return {
    email: user.email,
    role: user.role,
    account_id: user.account_id,
    name: user.name,
  };
}

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

export function toSessionContext(user: AuthUser): SessionContext {
  return {
    role: user.role,
    account_id: user.account_id,
    user_email: user.email,
  };
}

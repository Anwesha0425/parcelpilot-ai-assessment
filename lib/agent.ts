// Gemini Agent Core
// Orchestrates function-calling loop with tool routing and session context

import {
  GoogleGenerativeAI,
  FunctionCallingMode,
  Tool,
  SchemaType,
  Content,
} from "@google/generative-ai";
import { SessionContext } from "./tools/data-tools";
import {
  getOrder,
  getTicket,
  getTicketsForAccount,
  getOrdersForAccount,
  getAccount,
  getAllTickets,
  getAllAccounts,
  getAllOrders,
  calculateCancellationFee,
  calculateServiceCredit,
  createEscalation,
  createTask,
  detectSLABreaches,
  detectTicketClusters,
  detectCarrierAnomalies,
  getEscalations,
} from "./tools/data-tools";
import { searchDocuments, formatSearchResults } from "./data/vector-store";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface PendingAction {
  type: "create_escalation" | "create_task";
  args: Record<string, unknown>;
  description: string;
}

export interface AgentResponse {
  text: string;
  tool_calls: ToolCall[];
  pending_action: PendingAction | null;
  sources: Array<{ name: string; authority: number; section: string }>;
}

// ─── Gemini Tool Definitions ──────────────────────────────────────────────────

const ALL_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "search_documents",
        description:
          "Search ParcelPilot policy documents, SOPs, customer agreements, and product guides. Use this to answer questions about policies, rules, service credits, cancellation fees, support SLAs, plan features, and known issues. Always search documents before answering policy questions.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description:
                "Natural language search query about policies, agreements, or product information",
            },
            include_deprecated: {
              type: SchemaType.BOOLEAN,
              description:
                "Set to true only when specifically asked about historical or deprecated policies. Default: false",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_order",
        description:
          "Look up a specific order by order ID. Returns order status, carrier, booking time, pickup window, shipment fee, and other details.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            order_id: {
              type: SchemaType.STRING,
              description: "Order ID, e.g. ORD-1001",
            },
          },
          required: ["order_id"],
        },
      },
      {
        name: "get_ticket",
        description:
          "Look up a specific support ticket by ticket ID. Returns ticket details, severity, status, and notes.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticket_id: {
              type: SchemaType.STRING,
              description: "Ticket ID, e.g. TKT-1001",
            },
          },
          required: ["ticket_id"],
        },
      },
      {
        name: "get_account_summary",
        description:
          "Get account information including plan, agreement, and CSM. For customers, returns their own account. For internal staff, can look up any account.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            account_id: {
              type: SchemaType.STRING,
              description:
                "Account ID, e.g. ACC-001. Leave empty to get own account (customer context).",
            },
          },
          required: [],
        },
      },
      {
        name: "get_orders_for_account",
        description: "List all orders for an account.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            account_id: {
              type: SchemaType.STRING,
              description: "Account ID to list orders for",
            },
          },
          required: ["account_id"],
        },
      },
      {
        name: "get_tickets_for_account",
        description: "List all support tickets for an account.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            account_id: {
              type: SchemaType.STRING,
              description: "Account ID to list tickets for",
            },
          },
          required: ["account_id"],
        },
      },
      {
        name: "calculate_cancellation_fee",
        description:
          "Calculate whether a cancellation fee applies for a specific order. Checks order status, time since booking, and customer agreement for fee waivers.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            order_id: {
              type: SchemaType.STRING,
              description: "Order ID to check cancellation fee for",
            },
          },
          required: ["order_id"],
        },
      },
      {
        name: "calculate_service_credit",
        description:
          "Calculate whether a service credit is owed for a delayed or failed pickup. Checks delay duration, carrier fault, customer agreement terms, and credit caps.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            order_id: {
              type: SchemaType.STRING,
              description: "Order ID for the delayed pickup",
            },
            delay_minutes_past_window: {
              type: SchemaType.NUMBER,
              description:
                "Number of minutes the pickup was delayed past the end of the scheduled pickup window",
            },
            carrier_fault: {
              type: SchemaType.BOOLEAN,
              description: "Whether the delay was confirmed as carrier fault",
            },
            customer_caused: {
              type: SchemaType.BOOLEAN,
              description:
                "Whether the customer caused the issue (e.g. access denied, wrong address)",
            },
          },
          required: [
            "order_id",
            "delay_minutes_past_window",
            "carrier_fault",
            "customer_caused",
          ],
        },
      },
      {
        name: "create_escalation",
        description:
          "Prepare an escalation for a support ticket. This is a state-changing action that REQUIRES user confirmation before execution. Call this to prepare the escalation details, then ask the user to confirm.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticket_id: {
              type: SchemaType.STRING,
              description: "Ticket ID to escalate",
            },
            reason: {
              type: SchemaType.STRING,
              description: "Reason for escalation",
            },
            assignee: {
              type: SchemaType.STRING,
              description:
                "Who to assign the escalation to (e.g. 'Tier 2 Engineering', 'Priya Mehta - CSM')",
            },
            confirmed: {
              type: SchemaType.BOOLEAN,
              description:
                "Set to false to preview the action. Set to true ONLY after user has explicitly confirmed.",
            },
          },
          required: ["ticket_id", "reason", "assignee", "confirmed"],
        },
      },
      {
        name: "create_task",
        description:
          "Create a follow-up task for a support issue. Requires user confirmation before execution.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            account_id: {
              type: SchemaType.STRING,
              description: "Account ID this task relates to",
            },
            ticket_id: {
              type: SchemaType.STRING,
              description: "Related ticket ID (optional)",
            },
            description: {
              type: SchemaType.STRING,
              description: "Task description",
            },
            due_date: {
              type: SchemaType.STRING,
              description: "Due date in ISO 8601 format",
            },
            confirmed: {
              type: SchemaType.BOOLEAN,
              description:
                "Set to false to preview. Set to true ONLY after user confirmation.",
            },
          },
          required: ["account_id", "description", "due_date", "confirmed"],
        },
      },
    ],
  },
];

const INTERNAL_ONLY_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "get_all_tickets",
        description:
          "Get all support tickets across all accounts. Internal use only.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: "get_all_accounts",
        description: "Get all customer accounts. Internal use only.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: "get_all_orders",
        description: "Get all orders across all accounts. Internal use only.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: "detect_sla_breaches",
        description:
          "Scan all open tickets for SLA first-response target breaches. Returns tickets past their response target with time overrun. Internal use only.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: "detect_ticket_clusters",
        description:
          "Identify recurring patterns across support tickets (e.g. multiple customers reporting bulk upload failures). Returns grouped clusters. Internal use only.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: "detect_carrier_anomalies",
        description:
          "Detect carriers with unusually high rates of delayed pickups affecting multiple customers. Internal use only.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
    ],
  },
];

// ─── System Prompts ───────────────────────────────────────────────────────────

const CUSTOMER_SYSTEM_PROMPT = `You are ParcelPilot Support AI, a helpful customer support assistant for ParcelPilot, a B2B logistics platform.

DATASET SNAPSHOT TIME: 2026-08-22T18:00:00+05:30. Use this as the current reference time for all time-based calculations.

SOURCE AUTHORITY (most authoritative first):
1. Customer Agreement (highest) — overrides all other sources for your account
2. Current Support Policy v3 — default rules
3. Cancellation & Service Credit SOP v4 — operational procedures
4. Product Operations Guide — features and known issues
5. Historical ticket notes — CONTEXT ONLY, may contain incorrect past guidance

IMPORTANT RULES:
- Always search documents before answering policy questions
- If a customer agreement overrides a policy, clearly state: "Per your [Agreement name], which overrides the standard policy..."
- If sources conflict, use the higher-authority source and note the conflict
- NEVER show data from other customer accounts
- Do NOT promise service credits when carrier fault or pickup timing is uncertain
- For state-changing actions (escalations, tasks): prepare the action and ASK FOR CONFIRMATION before executing
- If you cannot answer confidently, say so clearly and offer escalation to a human agent
- Do not use deprecated policy v2 for any answers — it is marked as historical reference only
- When the user asks about pickup delays and the carrier is SwiftShip, note KI-211 (webhook delay up to 20 min) before concluding pickup failed`;

const INTERNAL_SYSTEM_PROMPT = `You are ParcelPilot Internal Support AI, assisting ParcelPilot operations and support staff.

DATASET SNAPSHOT TIME: 2026-08-22T18:00:00+05:30. Use this as the current reference time.

You have access to all customer accounts, orders, and tickets. You can investigate issues across all accounts.

SOURCE AUTHORITY (most authoritative first):
1. Customer Agreements (highest) — e.g. Northstar's Enterprise Agreement overrides standard policies for ACC-001
2. Current Support Policy v3
3. Cancellation & Service Credit SOP v4
4. Product Operations Guide & Known Issues
5. Historical ticket notes — CONTEXT ONLY, may contain INCORRECT guidance from past staff

KEY INTELLIGENCE:
- TKT-3002 has a historical note that told a customer bulk upload is on Standard plan — THIS IS INCORRECT. It is Growth/Enterprise only.
- TKT-1003 has a historical note that applied standard cancellation fee to Northstar — THIS IS INCORRECT. Northstar's agreement waives fees.
- Always verify agreement terms before quoting policies to customers with signed agreements.

For state-changing actions: always prepare first, then request confirmation before executing.

PROACTIVE ANALYSIS: Use detect_* tools to surface SLA breaches, ticket clusters, and carrier anomalies when asked for a dashboard view or "what needs attention".`;

// ─── Tool Executor ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  session: SessionContext,
  apiKey: string,
  pendingActions: Map<string, PendingAction>
): Promise<{ result: unknown; pendingAction?: PendingAction }> {
  switch (name) {
    case "search_documents": {
      const results = await searchDocuments(args.query as string, apiKey, {
        customerScope: session.role === "customer" ? session.account_id : null,
        includeDeprecated: (args.include_deprecated as boolean) ?? false,
        topK: 6,
      });
      return { result: formatSearchResults(results) };
    }

    case "get_order":
      return { result: getOrder(args.order_id as string, session) };

    case "get_ticket":
      return { result: getTicket(args.ticket_id as string, session) };

    case "get_account_summary": {
      const accountId =
        (args.account_id as string) || session.account_id || "";
      return { result: getAccount(accountId, session) };
    }

    case "get_orders_for_account":
      return {
        result: getOrdersForAccount(args.account_id as string, session),
      };

    case "get_tickets_for_account":
      return {
        result: getTicketsForAccount(args.account_id as string, session),
      };

    case "calculate_cancellation_fee":
      return {
        result: calculateCancellationFee(args.order_id as string, session),
      };

    case "calculate_service_credit":
      return {
        result: calculateServiceCredit(
          args.order_id as string,
          args.delay_minutes_past_window as number,
          args.carrier_fault as boolean,
          args.customer_caused as boolean,
          session
        ),
      };

    case "create_escalation": {
      if (!args.confirmed) {
        const preview = {
          action: "create_escalation",
          ticket_id: args.ticket_id,
          reason: args.reason,
          assignee: args.assignee,
          description: `Create escalation for ticket ${args.ticket_id}: "${args.reason}" → assigned to ${args.assignee}`,
        };
        const pendingAction: PendingAction = {
          type: "create_escalation",
          args: args,
          description: preview.description,
        };
        pendingActions.set("pending", pendingAction);
        return {
          result: { preview, requires_confirmation: true },
          pendingAction,
        };
      }
      return {
        result: createEscalation(
          args.ticket_id as string,
          args.reason as string,
          args.assignee as string,
          session
        ),
      };
    }

    case "create_task": {
      if (!args.confirmed) {
        const pendingAction: PendingAction = {
          type: "create_task",
          args: args,
          description: `Create task for account ${args.account_id}: "${args.description}" due ${args.due_date}`,
        };
        pendingActions.set("pending", pendingAction);
        return {
          result: { preview: pendingAction, requires_confirmation: true },
          pendingAction,
        };
      }
      return {
        result: createTask(
          args.account_id as string,
          (args.ticket_id as string) || null,
          args.description as string,
          args.due_date as string,
          session
        ),
      };
    }

    // Internal-only tools
    case "get_all_tickets":
      return { result: getAllTickets(session) };
    case "get_all_accounts":
      return { result: getAllAccounts(session) };
    case "get_all_orders":
      return { result: getAllOrders(session) };
    case "detect_sla_breaches":
      return { result: detectSLABreaches(session) };
    case "detect_ticket_clusters":
      return { result: detectTicketClusters(session) };
    case "detect_carrier_anomalies":
      return { result: detectCarrierAnomalies(session) };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Main Agent Function ──────────────────────────────────────────────────────

export async function runAgent(
  messages: Message[],
  session: SessionContext,
  apiKey: string,
  confirmedAction?: PendingAction
): Promise<AgentResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction:
      session.role === "customer"
        ? CUSTOMER_SYSTEM_PROMPT
        : INTERNAL_SYSTEM_PROMPT,
  });

  const tools =
    session.role === "internal"
      ? [...ALL_TOOLS, ...INTERNAL_ONLY_TOOLS]
      : ALL_TOOLS;

  const toolCalls: ToolCall[] = [];
  const sources: Array<{ name: string; authority: number; section: string }> =
    [];
  const pendingActions = new Map<string, PendingAction>();
  let currentPendingAction: PendingAction | null = null;

  // If user confirmed a pending action, execute it
  if (confirmedAction) {
    const result = await executeTool(
      confirmedAction.type,
      { ...confirmedAction.args, confirmed: true },
      session,
      apiKey,
      pendingActions
    );
    toolCalls.push({
      name: confirmedAction.type,
      args: confirmedAction.args,
      result: result.result,
    });

    const resultText = JSON.stringify(result.result, null, 2);
    return {
      text: `✅ Action completed successfully!\n\n\`\`\`json\n${resultText}\n\`\`\``,
      tool_calls: toolCalls,
      pending_action: null,
      sources,
    };
  }

  // Build chat history for Gemini
  // Gemini requires history to start with a 'user' role message.
  // The welcome message sent by the frontend is role 'assistant', so we skip
  // any leading assistant/model messages before the first user turn.
  const rawHistory: Content[] = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));

  // Drop all leading model messages — find first user turn
  const firstUserIdx = rawHistory.findIndex((h) => h.role === "user");
  const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

  const contents = [...history];
  const lastMessage = messages[messages.length - 1];
  contents.push({
    role: "user",
    parts: [{ text: lastMessage.content }],
  });

  let response = await model.generateContent({
    contents,
    tools,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  });

  // Agentic loop — keep calling tools until model produces text
  let iterations = 0;
  const MAX_ITERATIONS = 8;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const candidate = response.response.candidates?.[0];
    if (!candidate) break;

    const parts = candidate.content.parts;
    
    // Append model response (including function calls) to history
    contents.push({
      role: "model",
      parts: parts,
    });

    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) break; // No more tool calls, model is done

    // Execute all function calls in parallel where possible
    const toolResults = await Promise.all(
      functionCalls.map(async (part) => {
        const fc = part.functionCall!;
        const args = fc.args as Record<string, unknown>;

        let result: unknown;
        try {
          const execResult = await executeTool(
            fc.name,
            args,
            session,
            apiKey,
            pendingActions
          );
          result = execResult.result;
          if (execResult.pendingAction) {
            currentPendingAction = execResult.pendingAction;
          }
        } catch (e) {
          result = { error: (e as Error).message };
        }

        toolCalls.push({ name: fc.name, args, result });

        // Extract source info from document searches
        if (fc.name === "search_documents" && typeof result === "string") {
          const sourceMatches = result.matchAll(
            /Document: (.+)\nSection: (.+)\nAuthority: .+ \(level (\d)/g
          );
          for (const match of sourceMatches) {
            sources.push({
              name: match[1],
              section: match[2],
              authority: parseInt(match[3]),
            });
          }
        }

        return {
          functionResponse: {
            name: fc.name,
            response: { result: JSON.stringify(result) },
          },
        };
      })
    );

    // Pass tool results back as a 'user' role message
    contents.push({
      role: "user",
      parts: toolResults,
    });

    response = await model.generateContent({
      contents,
      tools,
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    });
  }

  const finalText =
    response.response.text() ||
    "I was unable to generate a response. Please try again.";

  return {
    text: finalText,
    tool_calls: toolCalls,
    pending_action: currentPendingAction,
    sources: [...new Map(sources.map((s) => [s.name + s.section, s])).values()],
  };
}

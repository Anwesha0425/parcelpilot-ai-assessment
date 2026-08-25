// Tool: query_operational_data
// Access-controlled structured data queries over the operational database
// CRITICAL: Customer role always hard-filters by their own account_id

import {
  ACCOUNTS,
  ORDERS,
  TICKETS,
  ESCALATIONS,
  TASKS,
  Account,
  Order,
  Ticket,
  Escalation,
  Task,
  SNAPSHOT_TIME,
  getFirstResponseTargetMinutes,
} from "../data/database";

export type UserRole = "customer" | "internal";

export interface SessionContext {
  role: UserRole;
  account_id: string | null; // null only for internal role
  user_email: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function enforceAccountScope(
  account_id: string,
  session: SessionContext
): void {
  if (session.role === "customer" && session.account_id !== account_id) {
    throw new Error(
      `ACCESS_DENIED: You are not authorised to access data for account ${account_id}.`
    );
  }
}

function enforceInternalOnly(session: SessionContext): void {
  if (session.role !== "internal") {
    throw new Error(
      `ACCESS_DENIED: This operation requires internal staff access.`
    );
  }
}

// ─── Account Queries ─────────────────────────────────────────────────────────

export function getAccount(
  account_id: string,
  session: SessionContext
): Account {
  enforceAccountScope(account_id, session);
  const acc = ACCOUNTS.find((a) => a.account_id === account_id);
  if (!acc) throw new Error(`Account ${account_id} not found.`);
  return acc;
}

export function getAccountByEmail(email: string): Account | null {
  // Used internally for auth resolution
  const emailToAccount: Record<string, string> = {
    "customer@northstar.com": "ACC-001",
    "customer@lumenworks.com": "ACC-002",
    "customer@brightmove.com": "ACC-003",
    "customer@fastfreight.com": "ACC-004",
    "customer@apexdeliveries.com": "ACC-005",
  };
  const accountId = emailToAccount[email];
  if (!accountId) return null;
  return ACCOUNTS.find((a) => a.account_id === accountId) ?? null;
}

export function getAllAccounts(session: SessionContext): Account[] {
  enforceInternalOnly(session);
  return ACCOUNTS.filter((a) => a.active);
}

// ─── Order Queries ────────────────────────────────────────────────────────────

export function getOrder(
  order_id: string,
  session: SessionContext
): Order {
  const order = ORDERS.find((o) => o.order_id === order_id);
  if (!order) throw new Error(`Order ${order_id} not found.`);
  enforceAccountScope(order.account_id, session);
  return order;
}

export function getOrdersForAccount(
  account_id: string,
  session: SessionContext
): Order[] {
  enforceAccountScope(account_id, session);
  return ORDERS.filter((o) => o.account_id === account_id);
}

export function getAllOrders(session: SessionContext): Order[] {
  enforceInternalOnly(session);
  return ORDERS;
}

// ─── Ticket Queries ───────────────────────────────────────────────────────────

export function getTicket(
  ticket_id: string,
  session: SessionContext
): Ticket {
  const ticket = TICKETS.find((t) => t.ticket_id === ticket_id);
  if (!ticket) throw new Error(`Ticket ${ticket_id} not found.`);
  enforceAccountScope(ticket.account_id, session);
  return ticket;
}

export function getTicketsForAccount(
  account_id: string,
  session: SessionContext
): Ticket[] {
  enforceAccountScope(account_id, session);
  return TICKETS.filter((t) => t.account_id === account_id);
}

export function getAllTickets(session: SessionContext): Ticket[] {
  enforceInternalOnly(session);
  return TICKETS;
}

// ─── Service Credit Calculator ────────────────────────────────────────────────

export interface ServiceCreditResult {
  eligible: boolean;
  reason: string;
  credit_amount: number | null;
  requires_manager_approval: boolean;
  account: Account;
  order: Order;
  calculation_details: string;
}

export function calculateServiceCredit(
  order_id: string,
  delay_minutes_past_window: number,
  carrier_fault: boolean,
  customer_caused: boolean,
  session: SessionContext
): ServiceCreditResult {
  const order = getOrder(order_id, session);
  const account = getAccount(order.account_id, session);

  // Threshold: agreement may override the default 2 hours (120 min)
  // Currently no agreements override the threshold, but the structure supports it
  const threshold_minutes = 120; // 2 hours per SOP default

  const details: string[] = [];
  details.push(`Order: ${order_id}, Carrier: ${order.carrier}`);
  details.push(`Delay past window end: ${delay_minutes_past_window} minutes`);
  details.push(`Threshold: ${threshold_minutes} minutes (2 hours past window end)`);
  details.push(`Carrier at fault: ${carrier_fault}`);
  details.push(`Customer-caused issue: ${customer_caused}`);

  if (!carrier_fault || customer_caused) {
    const reason = customer_caused
      ? "Not eligible: Customer-caused issue."
      : "Not eligible: Carrier fault not confirmed.";
    return {
      eligible: false,
      reason,
      credit_amount: null,
      requires_manager_approval: false,
      account,
      order,
      calculation_details: details.join("\n"),
    };
  }

  if (delay_minutes_past_window <= threshold_minutes) {
    return {
      eligible: false,
      reason: `Not eligible: Delay of ${delay_minutes_past_window} minutes does not exceed the ${threshold_minutes}-minute threshold.`,
      credit_amount: null,
      requires_manager_approval: false,
      account,
      order,
      calculation_details: details.join("\n"),
    };
  }

  // Calculate credit amount
  const defaultCreditMax = 500; // INR 500 default cap per SOP
  const tenPercent = order.shipment_fee * 0.1;
  let creditAmount = Math.min(defaultCreditMax, tenPercent);

  details.push(
    `Credit calculation: min(INR ${defaultCreditMax}, 10% of INR ${order.shipment_fee}) = min(${defaultCreditMax}, ${tenPercent.toFixed(2)}) = INR ${creditAmount.toFixed(2)}`
  );

  // Check monthly cap if account has one
  if (account.monthly_credit_cap !== null) {
    details.push(
      `Account monthly credit cap: INR ${account.monthly_credit_cap}`
    );
  }

  const requiresManagerApproval = creditAmount > 1000;

  return {
    eligible: true,
    reason: `Eligible: Pickup was ${delay_minutes_past_window} minutes past window end (>${threshold_minutes} min threshold), carrier at fault, no customer-caused issue.`,
    credit_amount: creditAmount,
    requires_manager_approval: requiresManagerApproval,
    account,
    order,
    calculation_details: details.join("\n"),
  };
}

// ─── Cancellation Fee Calculator ──────────────────────────────────────────────

export interface CancellationResult {
  can_cancel: boolean;
  fee: number;
  fee_waived: boolean;
  reason: string;
  account: Account;
  order: Order;
}

export function calculateCancellationFee(
  order_id: string,
  session: SessionContext
): CancellationResult {
  const order = getOrder(order_id, session);
  const account = getAccount(order.account_id, session);

  if (order.status === "DELIVERED") {
    return {
      can_cancel: false,
      fee: 0,
      fee_waived: false,
      reason: "Cannot cancel: Order is already DELIVERED.",
      account,
      order,
    };
  }

  if (order.status === "PICKED_UP") {
    return {
      can_cancel: false,
      fee: 0,
      fee_waived: false,
      reason:
        "Cannot cancel: Order is PICKED_UP. Use the return-to-origin workflow if needed.",
      account,
      order,
    };
  }

  if (order.status === "CANCELLED") {
    return {
      can_cancel: false,
      fee: 0,
      fee_waived: false,
      reason: "Order is already CANCELLED.",
      account,
      order,
    };
  }

  if (order.status === "DRAFT") {
    return {
      can_cancel: true,
      fee: 0,
      fee_waived: false,
      reason: "DRAFT orders can be cancelled with no fee.",
      account,
      order,
    };
  }

  // BOOKED status
  const bookingTime = new Date(order.booking_time);
  const snapshotTime = SNAPSHOT_TIME;
  const minutesSinceBooking =
    (snapshotTime.getTime() - bookingTime.getTime()) / (1000 * 60);

  if (account.cancellation_fee_waived) {
    // Customer agreement waives cancellation fee (e.g. Northstar)
    return {
      can_cancel: true,
      fee: 0,
      fee_waived: true,
      reason: `No cancellation fee: Your Enterprise Agreement explicitly waives the standard cancellation fee for BOOKED shipments before pickup. (Booked ${Math.round(minutesSinceBooking)} minutes ago — standard policy would charge INR 250 after 30 minutes, but your agreement overrides this.)`,
      account,
      order,
    };
  }

  if (minutesSinceBooking <= 30) {
    return {
      can_cancel: true,
      fee: 0,
      fee_waived: false,
      reason: `No cancellation fee: Within 30 minutes of booking (booked ${Math.round(minutesSinceBooking)} minutes ago).`,
      account,
      order,
    };
  }

  return {
    can_cancel: true,
    fee: 250,
    fee_waived: false,
    reason: `Cancellation fee applies: INR 250. Order was booked ${Math.round(minutesSinceBooking)} minutes ago (more than 30 minutes). No agreement waiver on file.`,
    account,
    order,
  };
}

// ─── SLA Breach Detector (internal only) ─────────────────────────────────────

export interface SLABreachResult {
  ticket: Ticket;
  account: Account;
  target_minutes: number;
  elapsed_minutes: number;
  breached: boolean;
  minutes_over: number;
}

export function detectSLABreaches(session: SessionContext): SLABreachResult[] {
  enforceInternalOnly(session);

  const results: SLABreachResult[] = [];
  const now = SNAPSHOT_TIME;

  for (const ticket of TICKETS) {
    if (ticket.status === "RESOLVED") continue;

    const account = ACCOUNTS.find((a) => a.account_id === ticket.account_id)!;
    const targetMinutes = getFirstResponseTargetMinutes(
      account.plan,
      ticket.severity,
      account.agreement_id
    );

    const createdAt = new Date(ticket.created_at);
    const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    // If no first response yet, check against target
    if (!ticket.first_response_at) {
      const breached = elapsedMinutes > targetMinutes;
      results.push({
        ticket,
        account,
        target_minutes: targetMinutes,
        elapsed_minutes: elapsedMinutes,
        breached,
        minutes_over: breached ? elapsedMinutes - targetMinutes : 0,
      });
    }
  }

  return results.sort((a, b) => b.minutes_over - a.minutes_over);
}

// ─── Ticket Cluster Detector (internal only) ──────────────────────────────────

export interface TicketCluster {
  tag: string;
  tickets: Ticket[];
  accounts: string[];
  count: number;
  severity_distribution: Record<string, number>;
}

export function detectTicketClusters(session: SessionContext): TicketCluster[] {
  enforceInternalOnly(session);

  const tagMap = new Map<string, Ticket[]>();
  for (const ticket of TICKETS) {
    if (ticket.status === "RESOLVED") continue;
    for (const tag of ticket.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag)!.push(ticket);
    }
  }

  const clusters: TicketCluster[] = [];
  for (const [tag, tickets] of tagMap.entries()) {
    if (tickets.length < 2) continue; // Only show clusters with 2+ tickets
    const accounts = [...new Set(tickets.map((t) => t.account_id))];
    const severityDist = tickets.reduce(
      (acc, t) => {
        acc[t.severity] = (acc[t.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    clusters.push({
      tag,
      tickets,
      accounts,
      count: tickets.length,
      severity_distribution: severityDist,
    });
  }

  return clusters.sort((a, b) => b.count - a.count);
}

// ─── Carrier Anomaly Detector (internal only) ─────────────────────────────────

export interface CarrierAnomaly {
  carrier: string;
  late_pickups: Order[];
  late_pickup_rate: number;
  affected_accounts: string[];
}

export function detectCarrierAnomalies(
  session: SessionContext
): CarrierAnomaly[] {
  enforceInternalOnly(session);

  const carrierOrders = new Map<string, Order[]>();
  const carrierLate = new Map<string, Order[]>();

  for (const order of ORDERS) {
    if (!carrierOrders.has(order.carrier))
      carrierOrders.set(order.carrier, []);
    carrierOrders.get(order.carrier)!.push(order);

    if (
      order.actual_pickup_time &&
      order.scheduled_pickup_window_end &&
      order.actual_pickup_time > order.scheduled_pickup_window_end
    ) {
      const windowEnd = new Date(order.scheduled_pickup_window_end);
      const actualPickup = new Date(order.actual_pickup_time);
      const lateMinutes =
        (actualPickup.getTime() - windowEnd.getTime()) / (1000 * 60);
      if (lateMinutes > 120) {
        // More than 2 hours late
        if (!carrierLate.has(order.carrier))
          carrierLate.set(order.carrier, []);
        carrierLate.get(order.carrier)!.push(order);
      }
    }
  }

  const anomalies: CarrierAnomaly[] = [];
  for (const [carrier, lateOrders] of carrierLate.entries()) {
    const total = carrierOrders.get(carrier)?.length ?? 1;
    const rate = lateOrders.length / total;
    if (rate >= 0.3 || lateOrders.length >= 2) {
      // 30%+ late or 2+ incidents
      anomalies.push({
        carrier,
        late_pickups: lateOrders,
        late_pickup_rate: rate,
        affected_accounts: [...new Set(lateOrders.map((o) => o.account_id))],
      });
    }
  }

  return anomalies.sort(
    (a, b) => b.late_pickup_rate - a.late_pickup_rate
  );
}

// ─── Escalation & Task Management ────────────────────────────────────────────

export function createEscalation(
  ticket_id: string,
  reason: string,
  assignee: string,
  session: SessionContext
): Escalation {
  const ticket = TICKETS.find((t) => t.ticket_id === ticket_id);
  if (!ticket) throw new Error(`Ticket ${ticket_id} not found.`);

  if (session.role === "customer") {
    enforceAccountScope(ticket.account_id, session);
  }

  const newEscalation: Escalation = {
    escalation_id: `ESC-${String(ESCALATIONS.length + 1).padStart(3, "0")}`,
    ticket_id,
    account_id: ticket.account_id,
    created_at: SNAPSHOT_TIME.toISOString(),
    created_by: session.user_email,
    priority: ticket.severity,
    reason,
    assignee,
    status: "OPEN",
  };

  ESCALATIONS.push(newEscalation);

  // Update ticket status
  const ticketIndex = TICKETS.findIndex((t) => t.ticket_id === ticket_id);
  if (ticketIndex !== -1) {
    TICKETS[ticketIndex] = { ...TICKETS[ticketIndex], status: "ESCALATED" };
  }

  return newEscalation;
}

export function createTask(
  account_id: string,
  ticket_id: string | null,
  description: string,
  due_date: string,
  session: SessionContext
): Task {
  enforceInternalOnly(session);

  const newTask: Task = {
    task_id: `TASK-${String(TASKS.length + 1).padStart(3, "0")}`,
    ticket_id,
    account_id,
    created_at: SNAPSHOT_TIME.toISOString(),
    created_by: session.user_email,
    due_date,
    description,
    status: "PENDING",
  };

  TASKS.push(newTask);
  return newTask;
}

export function getEscalations(session: SessionContext): Escalation[] {
  if (session.role === "customer") {
    return ESCALATIONS.filter((e) => e.account_id === session.account_id);
  }
  return ESCALATIONS;
}

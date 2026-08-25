// Mock operational data representing the Excel workbook
// Dataset snapshot time: 2026-08-22T18:00:00+05:30 (as per README sheet)

export const SNAPSHOT_TIME = new Date("2026-08-22T18:00:00+05:30");

// ─── ACCOUNTS ───────────────────────────────────────────────────────────────
export interface Account {
  account_id: string;
  company_name: string;
  plan: "Standard" | "Growth" | "Enterprise";
  agreement_id: string | null;
  csm: string | null;
  monthly_credit_cap: number | null; // null = default (uncapped per SOP)
  cancellation_fee_waived: boolean;
  active: boolean;
}

export const ACCOUNTS: Account[] = [
  {
    account_id: "ACC-001",
    company_name: "Northstar Logistics",
    plan: "Enterprise",
    agreement_id: "05_northstar_agreement",
    csm: "Priya Mehta",
    monthly_credit_cap: 5000,
    cancellation_fee_waived: true,
    active: true,
  },
  {
    account_id: "ACC-002",
    company_name: "LumenWorks",
    plan: "Growth",
    agreement_id: "06_lumenworks_agreement",
    csm: "Rohan Kapoor",
    monthly_credit_cap: 2000,
    cancellation_fee_waived: false,
    active: true,
  },
  {
    account_id: "ACC-003",
    company_name: "BrightMove Retail",
    plan: "Standard",
    agreement_id: null,
    csm: null,
    monthly_credit_cap: null,
    cancellation_fee_waived: false,
    active: true,
  },
  {
    account_id: "ACC-004",
    company_name: "FastFreight Co.",
    plan: "Growth",
    agreement_id: null,
    csm: null,
    monthly_credit_cap: null,
    cancellation_fee_waived: false,
    active: true,
  },
  {
    account_id: "ACC-005",
    company_name: "Apex Deliveries",
    plan: "Enterprise",
    agreement_id: null,
    csm: "Priya Mehta",
    monthly_credit_cap: null,
    cancellation_fee_waived: false,
    active: true,
  },
];

// ─── ORDERS ────────────────────────────────────────────────────────────────
export type OrderStatus = "DRAFT" | "BOOKED" | "PICKED_UP" | "DELIVERED" | "CANCELLED";

export interface Order {
  order_id: string;
  account_id: string;
  status: OrderStatus;
  carrier: string;
  booking_time: string; // ISO 8601
  scheduled_pickup_window_start: string | null;
  scheduled_pickup_window_end: string | null;
  actual_pickup_time: string | null;
  shipment_fee: number; // INR
  origin_city: string;
  destination_city: string;
  cancellation_time: string | null;
  notes: string | null;
}

export const ORDERS: Order[] = [
  // ── Northstar Logistics (ACC-001) ──
  {
    order_id: "ORD-1001",
    account_id: "ACC-001",
    status: "BOOKED",
    carrier: "BlueDart",
    booking_time: "2026-08-20T09:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-20T14:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-20T16:00:00+05:30",
    actual_pickup_time: null,
    shipment_fee: 1200,
    origin_city: "Mumbai",
    destination_city: "Delhi",
    cancellation_time: null,
    notes: "Priority shipment",
  },
  {
    order_id: "ORD-1002",
    account_id: "ACC-001",
    status: "PICKED_UP",
    carrier: "SwiftShip",
    booking_time: "2026-08-19T10:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-19T13:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-19T15:00:00+05:30",
    actual_pickup_time: "2026-08-19T18:30:00+05:30", // 3.5 hours late - carrier fault
    shipment_fee: 800,
    origin_city: "Mumbai",
    destination_city: "Pune",
    cancellation_time: null,
    notes: "Carrier delayed - SwiftShip webhook delay KI-211 may apply",
  },
  {
    order_id: "ORD-1003",
    account_id: "ACC-001",
    status: "DELIVERED",
    carrier: "BlueDart",
    booking_time: "2026-08-15T08:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-15T12:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-15T14:00:00+05:30",
    actual_pickup_time: "2026-08-15T13:00:00+05:30",
    shipment_fee: 950,
    origin_city: "Delhi",
    destination_city: "Bangalore",
    cancellation_time: null,
    notes: null,
  },
  {
    order_id: "ORD-1004",
    account_id: "ACC-001",
    status: "BOOKED",
    carrier: "Delhivery",
    booking_time: "2026-08-22T11:30:00+05:30",
    scheduled_pickup_window_start: "2026-08-23T10:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-23T12:00:00+05:30",
    actual_pickup_time: null,
    shipment_fee: 600,
    origin_city: "Chennai",
    destination_city: "Hyderabad",
    cancellation_time: null,
    notes: null,
  },

  // ── LumenWorks (ACC-002) ──
  {
    order_id: "ORD-2001",
    account_id: "ACC-002",
    status: "BOOKED",
    carrier: "SwiftShip",
    booking_time: "2026-08-22T08:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-22T11:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-22T13:00:00+05:30",
    actual_pickup_time: null,
    shipment_fee: 450,
    origin_city: "Bangalore",
    destination_city: "Mumbai",
    cancellation_time: null,
    notes: null,
  },
  {
    order_id: "ORD-2002",
    account_id: "ACC-002",
    status: "PICKED_UP",
    carrier: "BlueDart",
    booking_time: "2026-08-21T09:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-21T14:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-21T16:00:00+05:30",
    actual_pickup_time: "2026-08-21T19:30:00+05:30", // 3.5 hours late
    shipment_fee: 520,
    origin_city: "Mumbai",
    destination_city: "Kolkata",
    cancellation_time: null,
    notes: "Carrier reported road congestion",
  },
  {
    order_id: "ORD-2003",
    account_id: "ACC-002",
    status: "BOOKED",
    carrier: "Delhivery",
    booking_time: "2026-08-22T14:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-23T09:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-23T11:00:00+05:30",
    actual_pickup_time: null,
    shipment_fee: 380,
    origin_city: "Hyderabad",
    destination_city: "Chennai",
    cancellation_time: null,
    notes: null,
  },

  // ── BrightMove Retail (ACC-003) ──
  {
    order_id: "ORD-3001",
    account_id: "ACC-003",
    status: "BOOKED",
    carrier: "SwiftShip",
    booking_time: "2026-08-22T07:30:00+05:30",
    scheduled_pickup_window_start: "2026-08-22T12:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-22T14:00:00+05:30",
    actual_pickup_time: null,
    shipment_fee: 320,
    origin_city: "Pune",
    destination_city: "Surat",
    cancellation_time: null,
    notes: null,
  },
  {
    order_id: "ORD-3002",
    account_id: "ACC-003",
    status: "CANCELLED",
    carrier: "BlueDart",
    booking_time: "2026-08-20T10:00:00+05:30",
    scheduled_pickup_window_start: null,
    scheduled_pickup_window_end: null,
    actual_pickup_time: null,
    shipment_fee: 410,
    origin_city: "Surat",
    destination_city: "Ahmedabad",
    cancellation_time: "2026-08-20T11:00:00+05:30", // 1 hour after booking = INR 250 fee
    notes: "Customer requested cancellation",
  },

  // ── FastFreight Co. (ACC-004) ──
  {
    order_id: "ORD-4001",
    account_id: "ACC-004",
    status: "PICKED_UP",
    carrier: "SwiftShip",
    booking_time: "2026-08-21T08:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-21T11:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-21T13:00:00+05:30",
    actual_pickup_time: "2026-08-21T17:00:00+05:30", // 4 hours late
    shipment_fee: 750,
    origin_city: "Delhi",
    destination_city: "Jaipur",
    cancellation_time: null,
    notes: "Carrier fault confirmed",
  },
  {
    order_id: "ORD-4002",
    account_id: "ACC-004",
    status: "BOOKED",
    carrier: "Delhivery",
    booking_time: "2026-08-22T15:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-23T14:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-23T16:00:00+05:30",
    actual_pickup_time: null,
    shipment_fee: 290,
    origin_city: "Jaipur",
    destination_city: "Lucknow",
    cancellation_time: null,
    notes: null,
  },

  // ── Apex Deliveries (ACC-005) ──
  {
    order_id: "ORD-5001",
    account_id: "ACC-005",
    status: "DELIVERED",
    carrier: "BlueDart",
    booking_time: "2026-08-18T09:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-18T14:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-18T16:00:00+05:30",
    actual_pickup_time: "2026-08-18T14:30:00+05:30",
    shipment_fee: 1100,
    origin_city: "Kolkata",
    destination_city: "Bhubaneswar",
    cancellation_time: null,
    notes: null,
  },
  {
    order_id: "ORD-5002",
    account_id: "ACC-005",
    status: "BOOKED",
    carrier: "SwiftShip",
    booking_time: "2026-08-22T16:00:00+05:30",
    scheduled_pickup_window_start: "2026-08-23T10:00:00+05:30",
    scheduled_pickup_window_end: "2026-08-23T12:00:00+05:30",
    actual_pickup_time: null,
    shipment_fee: 870,
    origin_city: "Bangalore",
    destination_city: "Chennai",
    cancellation_time: null,
    notes: null,
  },
];

// ─── TICKETS ───────────────────────────────────────────────────────────────
export type Severity = "P1" | "P2" | "P3";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED";

export interface Ticket {
  ticket_id: string;
  account_id: string;
  order_id: string | null;
  severity: Severity;
  status: TicketStatus;
  subject: string;
  description: string;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  carrier_fault: boolean | null; // null = unknown
  resolution_note: string | null;
  tags: string[];
}

export const TICKETS: Ticket[] = [
  // ── Northstar Logistics (ACC-001) ──
  {
    ticket_id: "TKT-1001",
    account_id: "ACC-001",
    order_id: "ORD-1002",
    severity: "P2",
    status: "OPEN",
    subject: "Pickup not confirmed - ORD-1002 still showing BOOKED",
    description:
      "Our shipment ORD-1002 was scheduled for pickup 2026-08-19 between 1pm-3pm. It's now 6:30pm and the status still shows BOOKED. Driver has not been seen at facility.",
    created_at: "2026-08-19T18:30:00+05:30",
    first_response_at: "2026-08-19T18:45:00+05:30",
    resolved_at: null,
    carrier_fault: true,
    resolution_note: null,
    tags: ["pickup-delay", "swiftship", "webhook"],
  },
  {
    ticket_id: "TKT-1002",
    account_id: "ACC-001",
    order_id: null,
    severity: "P2",
    status: "OPEN",
    subject: "Bulk upload failing for files over 3000 rows",
    description:
      "We have been trying to upload a CSV with 4,200 shipments and it keeps failing at around 60-70% completion. Smaller files work fine.",
    created_at: "2026-08-20T14:00:00+05:30",
    first_response_at: "2026-08-20T14:55:00+05:30",
    resolved_at: null,
    carrier_fault: null,
    resolution_note: null,
    tags: ["bulk-upload", "ki-208", "product-bug"],
  },
  {
    ticket_id: "TKT-1003",
    account_id: "ACC-001",
    order_id: "ORD-1001",
    severity: "P3",
    status: "IN_PROGRESS",
    subject: "Cancellation fee question for ORD-1001",
    description:
      "We want to cancel ORD-1001. We booked it on 2026-08-20. Will we be charged a cancellation fee?",
    created_at: "2026-08-21T10:00:00+05:30",
    first_response_at: "2026-08-21T10:30:00+05:30",
    resolved_at: null,
    carrier_fault: null,
    resolution_note:
      "HISTORICAL NOTE (may be incorrect): Told customer standard INR 250 fee applies. NOTE: This was incorrect - Northstar agreement waives cancellation fee.",
    tags: ["cancellation", "billing"],
  },
  {
    ticket_id: "TKT-1004",
    account_id: "ACC-001",
    order_id: null,
    severity: "P1",
    status: "RESOLVED",
    subject: "Cannot create any shipments - API returning 500",
    description:
      "All shipment creation attempts failing with HTTP 500. Business completely halted.",
    created_at: "2026-08-18T09:00:00+05:30",
    first_response_at: "2026-08-18T09:12:00+05:30",
    resolved_at: "2026-08-18T11:30:00+05:30",
    carrier_fault: false,
    resolution_note: "Infrastructure issue resolved. Shipment creation restored.",
    tags: ["p1", "outage", "resolved"],
  },

  // ── LumenWorks (ACC-002) ──
  {
    ticket_id: "TKT-2001",
    account_id: "ACC-002",
    order_id: "ORD-2002",
    severity: "P2",
    status: "OPEN",
    subject: "Pickup 3.5 hours late on ORD-2002 - requesting service credit",
    description:
      "BlueDart pickup for ORD-2002 was scheduled 2-4pm, arrived at 7:30pm. Carrier confirmed road congestion as cause. We want a service credit.",
    created_at: "2026-08-21T20:00:00+05:30",
    first_response_at: "2026-08-21T20:20:00+05:30",
    resolved_at: null,
    carrier_fault: true,
    resolution_note: null,
    tags: ["service-credit", "pickup-delay", "bluedar"],
  },
  {
    ticket_id: "TKT-2002",
    account_id: "ACC-002",
    order_id: null,
    severity: "P3",
    status: "OPEN",
    subject: "Bulk upload CSV failing intermittently",
    description:
      "Similar to issues we heard about from other accounts - CSV uploads with 3,500 rows are failing about 50% of the time.",
    created_at: "2026-08-21T11:00:00+05:30",
    first_response_at: "2026-08-21T12:00:00+05:30",
    resolved_at: null,
    carrier_fault: null,
    resolution_note: null,
    tags: ["bulk-upload", "ki-208", "product-bug"],
  },

  // ── BrightMove Retail (ACC-003) ──
  {
    ticket_id: "TKT-3001",
    account_id: "ACC-003",
    order_id: "ORD-3001",
    severity: "P3",
    status: "OPEN",
    subject: "SwiftShip pickup still shows BOOKED after scheduled window",
    description:
      "Pickup was scheduled 12-2pm. It's now 3pm and status still shows BOOKED. Driver did visit but no confirmation in system.",
    created_at: "2026-08-22T15:00:00+05:30",
    first_response_at: null, // SLA BREACH - P3 Standard = 2 business days, but no response yet
    resolved_at: null,
    carrier_fault: null,
    resolution_note: null,
    tags: ["swiftship", "ki-211", "webhook-delay"],
  },
  {
    ticket_id: "TKT-3002",
    account_id: "ACC-003",
    order_id: null,
    severity: "P2",
    status: "OPEN",
    subject: "Bulk upload feature not available on our plan",
    description:
      "We tried to use bulk upload and got an error saying it's not available. We thought this was included.",
    created_at: "2026-08-22T09:00:00+05:30",
    first_response_at: null, // Missing first response for P2 Standard = 1 business day
    resolved_at: null,
    carrier_fault: null,
    resolution_note:
      "HISTORICAL NOTE: Someone previously told this customer bulk upload was available on Standard. This is INCORRECT - Bulk Upload requires Growth or Enterprise plan.",
    tags: ["bulk-upload", "plan-entitlement", "incorrect-historical-info"],
  },

  // ── FastFreight Co. (ACC-004) ──
  {
    ticket_id: "TKT-4001",
    account_id: "ACC-004",
    order_id: "ORD-4001",
    severity: "P2",
    status: "OPEN",
    subject: "Service credit for ORD-4001 - 4 hour pickup delay",
    description:
      "SwiftShip picked up 4 hours after window closed. Carrier confirmed their fault. Requesting service credit per SOP.",
    created_at: "2026-08-21T18:00:00+05:30",
    first_response_at: "2026-08-21T18:30:00+05:30",
    resolved_at: null,
    carrier_fault: true,
    resolution_note: null,
    tags: ["service-credit", "pickup-delay", "swiftship"],
  },
  {
    ticket_id: "TKT-4002",
    account_id: "ACC-004",
    order_id: null,
    severity: "P3",
    status: "OPEN",
    subject: "Bulk upload CSV failing for large files",
    description:
      "Same issue as TKT-4001 context - bulk upload fails on files over 3000 rows.",
    created_at: "2026-08-22T10:00:00+05:30",
    first_response_at: "2026-08-22T11:00:00+05:30",
    resolved_at: null,
    carrier_fault: null,
    resolution_note: null,
    tags: ["bulk-upload", "ki-208", "product-bug"],
  },

  // ── Apex Deliveries (ACC-005) ──
  {
    ticket_id: "TKT-5001",
    account_id: "ACC-005",
    order_id: null,
    severity: "P1",
    status: "ESCALATED",
    subject: "API rate limit errors - shipment creation failing intermittently",
    description:
      "Receiving HTTP 429 errors during bulk operations. This is blocking our automated pipeline.",
    created_at: "2026-08-22T08:00:00+05:30",
    first_response_at: "2026-08-22T08:28:00+05:30", // Breached - Enterprise P1 = 30 min, response at 28 min OK
    resolved_at: null,
    carrier_fault: false,
    resolution_note: null,
    tags: ["p1", "api", "rate-limit", "escalated"],
  },
];

// ─── ESCALATIONS (mock action log) ──────────────────────────────────────────
export interface Escalation {
  escalation_id: string;
  ticket_id: string;
  account_id: string;
  created_at: string;
  created_by: string; // staff or system
  priority: Severity;
  reason: string;
  assignee: string;
  status: "OPEN" | "RESOLVED";
}

export let ESCALATIONS: Escalation[] = [
  {
    escalation_id: "ESC-001",
    ticket_id: "TKT-5001",
    account_id: "ACC-005",
    created_at: "2026-08-22T08:35:00+05:30",
    created_by: "system",
    priority: "P1",
    reason: "P1 auto-escalation: API 429 errors blocking customer pipeline",
    assignee: "Tier 2 Engineering",
    status: "OPEN",
  },
];

// ─── TASKS (mock follow-up tasks) ────────────────────────────────────────────
export interface Task {
  task_id: string;
  ticket_id: string | null;
  account_id: string;
  created_at: string;
  created_by: string;
  due_date: string;
  description: string;
  status: "PENDING" | "DONE";
}

export let TASKS: Task[] = [];

// ─── Helper: get SLA first-response target in minutes ─────────────────────
export function getFirstResponseTargetMinutes(
  plan: string,
  severity: Severity,
  agreementId: string | null
): number {
  // Northstar override
  if (agreementId === "05_northstar_agreement") {
    if (severity === "P1") return 15;
    if (severity === "P2") return 60;
    if (severity === "P3") return 8 * 60; // 8 business hours ~ 480 minutes
  }

  // Standard plan defaults (from Support Policy v3)
  const targets: Record<string, Record<Severity, number>> = {
    Enterprise: { P1: 30, P2: 120, P3: 8 * 60 },
    Growth: { P1: 2 * 60, P2: 4 * 60, P3: 2 * 8 * 60 },
    Standard: { P1: 4 * 60, P2: 8 * 60, P3: 2 * 8 * 60 },
  };

  return targets[plan]?.[severity] ?? 4 * 60;
}

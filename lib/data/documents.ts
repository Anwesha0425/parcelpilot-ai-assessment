// ParcelPilot Document Corpus
// Authority hierarchy: customer_agreement (5) > current_policy (4) > sop (3) > product_docs (2) > deprecated (1, ignored) > historical_tickets (0, context only)

export interface DocumentChunk {
  id: string;
  source_id: string;
  source_name: string;
  authority_level: number; // 0-5
  is_deprecated: boolean;
  customer_scope: string | null; // null = applies to all, 'ACC-001' etc = customer-specific
  section: string;
  content: string;
}

export const DOCUMENT_CORPUS: DocumentChunk[] = [
  // ============================================================
  // 01_Support_Policy_v3_CURRENT.pdf  (authority: 4)
  // ============================================================
  {
    id: "p3-scope",
    source_id: "01_support_policy_v3",
    source_name: "Support Policy v3 (CURRENT)",
    authority_level: 4,
    is_deprecated: false,
    customer_scope: null,
    section: "1. Scope and Source Precedence",
    content: `This policy defines default support severity and response targets. A signed customer agreement may override these defaults. When sources conflict, use the signed customer agreement first, then the current support policy, then current product documentation. Historical tickets and internal notes are context only and may contain incorrect past guidance.`,
  },
  {
    id: "p3-severity",
    source_id: "01_support_policy_v3",
    source_name: "Support Policy v3 (CURRENT)",
    authority_level: 4,
    is_deprecated: false,
    customer_scope: null,
    section: "2. Severity Definitions",
    content: `P1 - Critical: Complete production outage preventing all shipment creation for a customer, confirmed security incident or suspected credential exposure, or another event causing immediate material business risk with no workaround.

P2 - High: Major feature unavailable or materially degraded for a customer, but core operations remain possible or a workaround exists.

P3 - Normal: Minor defect, how-to question, configuration request, or issue with limited operational impact.`,
  },
  {
    id: "p3-response-targets",
    source_id: "01_support_policy_v3",
    source_name: "Support Policy v3 (CURRENT)",
    authority_level: 4,
    is_deprecated: false,
    customer_scope: null,
    section: "3. Default First-Response Targets",
    content: `Default first-response targets by plan:

Enterprise plan:
  P1: 30 minutes, 24x7
  P2: 2 hours
  P3: 1 business day

Growth plan:
  P1: 2 business hours
  P2: 4 business hours
  P3: 2 business days

Standard plan:
  P1: 4 business hours
  P2: 1 business day
  P3: 2 business days

Note: A signed customer agreement may override these targets. Always check the customer's agreement before quoting SLA times.`,
  },
  {
    id: "p3-escalation",
    source_id: "01_support_policy_v3",
    source_name: "Support Policy v3 (CURRENT)",
    authority_level: 4,
    is_deprecated: false,
    customer_scope: null,
    section: "4. Escalation",
    content: `P1 incidents should be escalated immediately. If a response target is already breached, the agent should clearly state the breach and recommend escalation rather than hiding uncertainty. When a ticket response target has been exceeded, proactively inform the customer and create an escalation record.`,
  },
  {
    id: "p3-plans",
    source_id: "01_support_policy_v3",
    source_name: "Support Policy v3 (CURRENT)",
    authority_level: 4,
    is_deprecated: false,
    customer_scope: null,
    section: "5. Plan Tiers",
    content: `ParcelPilot offers three plan tiers: Standard, Growth, and Enterprise. Plan tier determines support response targets, feature access, and pricing. Customers may negotiate custom terms through a signed Enterprise Agreement which supersedes these defaults.`,
  },

  // ============================================================
  // 02_Support_Policy_v2_DEPRECATED.pdf  (authority: 1, ignored for answers)
  // ============================================================
  {
    id: "p2-deprecated-notice",
    source_id: "02_support_policy_v2",
    source_name: "Support Policy v2 (DEPRECATED - DO NOT USE)",
    authority_level: 1,
    is_deprecated: true,
    customer_scope: null,
    section: "Deprecation Notice",
    content: `THIS FILE IS DEPRECATED. This document (Support Policy v2) is intentionally retained for historical reference and must NOT be used as current policy. The information below is outdated and superseded by Support Policy v3.

DEPRECATED response targets (for historical reference only - do not quote these):
Enterprise: P1=1 hour, P2=4 hours, P3=2 business days
Growth: P1=4 business hours, P2=1 business day, P3=3 business days
Standard: P1=8 business hours, P2=2 business days, P3=3 business days

These targets are incorrect and should not be used.`,
  },

  // ============================================================
  // 03_Cancellation_and_Service_Credit_SOP_v4.pdf  (authority: 3)
  // ============================================================
  {
    id: "sop-cancellation",
    source_id: "03_cancellation_sop_v4",
    source_name: "Cancellation & Service Credit SOP v4",
    authority_level: 3,
    is_deprecated: false,
    customer_scope: null,
    section: "1. Order Cancellation",
    content: `Order cancellation rules by shipment status:

DRAFT status: May be cancelled with no fee.

BOOKED status (not yet PICKED_UP): May be cancelled. No fee within 30 minutes of booking. After 30 minutes, charge INR 250 cancellation fee UNLESS a customer agreement explicitly waives the cancellation fee.

PICKED_UP status: Do NOT cancel. Use the return-to-origin workflow if the customer wants the parcel returned.

DELIVERED status: Cannot be cancelled.

Always check the customer's signed agreement before applying cancellation fees — an agreement may waive or modify the default fee.`,
  },
  {
    id: "sop-service-credits",
    source_id: "03_cancellation_sop_v4",
    source_name: "Cancellation & Service Credit SOP v4",
    authority_level: 3,
    is_deprecated: false,
    customer_scope: null,
    section: "2. Failed-Pickup Service Credits",
    content: `Service credit eligibility for failed or delayed pickups (default policy):

A customer is eligible for a service credit when ALL of the following are true:
1. The pickup is more than 2 hours past the end of the scheduled pickup window
2. The carrier is at fault (not customer-caused)
3. There is no customer-caused issue (e.g. access denied, incorrect address)

Default credit amount: the lower of INR 500 or 10% of the shipment fee.

A signed customer agreement may replace the default:
- Delay threshold (e.g. override the 2-hour rule)
- Credit amount
- Credit cap

Important: Do NOT promise a credit when carrier fault, pickup timing, or customer fault is unknown. When data conflicts, identify the conflict and request verification before any state-changing action.`,
  },
  {
    id: "sop-approval",
    source_id: "03_cancellation_sop_v4",
    source_name: "Cancellation & Service Credit SOP v4",
    authority_level: 3,
    is_deprecated: false,
    customer_scope: null,
    section: "3. Approval and Uncertainty",
    content: `Approval requirements:
- Any individual service credit above INR 1,000 requires manager approval before being issued.
- Do not promise a credit when carrier fault, pickup timing, or customer fault is unknown.
- When data conflicts (e.g. two sources give different values), identify the conflict and request human verification before executing a state-changing action.
- Credits above INR 1,000 must be flagged for manager review and should not be automatically approved.`,
  },

  // ============================================================
  // 04_Product_Operations_Guide_and_Known_Issues.pdf  (authority: 2)
  // ============================================================
  {
    id: "prod-plan-capabilities",
    source_id: "04_product_ops_guide",
    source_name: "Product Operations Guide & Known Issues",
    authority_level: 2,
    is_deprecated: false,
    customer_scope: null,
    section: "1. Plan Capabilities",
    content: `Feature availability by plan:

Bulk Upload:
- Available on Growth and Enterprise plans.
- Supported file size: up to 5,000 rows per CSV.
- Standard plan: Bulk Upload is NOT included.

Shipment status definitions:
- BOOKED: The shipment is created but ParcelPilot has not yet received a pickup confirmation from the carrier.
- PICKED_UP: Carrier pickup has been confirmed.
- DRAFT: Shipment created but not yet submitted for booking.
- DELIVERED: Shipment delivered to recipient.`,
  },
  {
    id: "prod-ki-208",
    source_id: "04_product_ops_guide",
    source_name: "Product Operations Guide & Known Issues",
    authority_level: 2,
    is_deprecated: false,
    customer_scope: null,
    section: "2. Known Issue KI-208 - Bulk Upload Failures on Large CSVs",
    content: `Known Issue KI-208: Bulk Upload failures on large CSVs

Opened: 10 August 2026
Status: Investigating

Description: Some Growth and Enterprise customers experience intermittent failures on CSV uploads above approximately 3,000 rows, even though the supported product limit remains 5,000 rows.

Workaround: Split the upload into files below 3,000 rows. Individual shipment creation is unaffected.

Note: This is a known product bug, not a customer error.`,
  },
  {
    id: "prod-ki-211",
    source_id: "04_product_ops_guide",
    source_name: "Product Operations Guide & Known Issues",
    authority_level: 2,
    is_deprecated: false,
    customer_scope: null,
    section: "3. Known Issue KI-211 - SwiftShip Pickup Webhook Delay",
    content: `Known Issue KI-211: SwiftShip pickup webhook delay

Opened: 12 August 2026
Status: Monitoring

Description: SwiftShip pickup confirmation webhooks can arrive up to 20 minutes late. A parcel may physically be collected by SwiftShip while ParcelPilot still shows status as BOOKED (not yet PICKED_UP).

Impact: Customers may incorrectly believe a pickup did not occur when it did.

Guidance: Before telling a customer that a pickup did not occur for a SwiftShip shipment, verify carrier status directly or wait through the 20-minute delay window. Do NOT automatically assume a missed pickup for SwiftShip shipments showing BOOKED status.`,
  },
  {
    id: "prod-ki-176-resolved",
    source_id: "04_product_ops_guide",
    source_name: "Product Operations Guide & Known Issues",
    authority_level: 2,
    is_deprecated: false,
    customer_scope: null,
    section: "4. Resolved Issue KI-176",
    content: `Resolved Issue KI-176: Address validation bug

Resolved: 18 July 2026

This issue is RESOLVED. Do not use this resolved issue to explain new incidents unless evidence specifically matches the exact address validation symptoms from before 18 July 2026.`,
  },

  // ============================================================
  // 05_Northstar_Logistics_Enterprise_Agreement.pdf  (authority: 5, ACC-001 only)
  // ============================================================
  {
    id: "northstar-support-terms",
    source_id: "05_northstar_agreement",
    source_name: "Northstar Logistics Enterprise Agreement",
    authority_level: 5,
    is_deprecated: false,
    customer_scope: "ACC-001",
    section: "1. Support Terms",
    content: `Customer: Northstar Logistics (Account ID: ACC-001)

For Northstar Logistics, the following first-response targets REPLACE ParcelPilot's standard support-policy targets:
- P1: 15 minutes, 24x7
- P2: 1 hour
- P3: 8 business hours

These targets override the Enterprise plan defaults and any other default policy.`,
  },
  {
    id: "northstar-cancellation",
    source_id: "05_northstar_agreement",
    source_name: "Northstar Logistics Enterprise Agreement",
    authority_level: 5,
    is_deprecated: false,
    customer_scope: "ACC-001",
    section: "2. Shipment Cancellation",
    content: `Customer: Northstar Logistics (Account ID: ACC-001)

Northstar may cancel any BOOKED shipment before pickup with NO cancellation fee, regardless of how long ago the shipment was booked.

This explicitly waives the standard INR 250 cancellation fee that applies after 30 minutes for other customers.

Once a shipment is PICKED_UP, the standard return-to-origin process applies (cancellation is not available).`,
  },
  {
    id: "northstar-service-credits",
    source_id: "05_northstar_agreement",
    source_name: "Northstar Logistics Enterprise Agreement",
    authority_level: 5,
    is_deprecated: false,
    customer_scope: "ACC-001",
    section: "3. Service Credits",
    content: `Customer: Northstar Logistics (Account ID: ACC-001)

Monthly aggregate service credits for Northstar Logistics are capped at INR 5,000 per month.

Unless this agreement states otherwise, the current ParcelPilot service-credit SOP applies (including the 2-hour past pickup window threshold, carrier-fault requirement, and INR 500 or 10% of shipment fee credit amount).

Dedicated Customer Success Manager: Priya Mehta.`,
  },
  {
    id: "northstar-account-contact",
    source_id: "05_northstar_agreement",
    source_name: "Northstar Logistics Enterprise Agreement",
    authority_level: 5,
    is_deprecated: false,
    customer_scope: "ACC-001",
    section: "4. Account Contact",
    content: `Customer: Northstar Logistics (Account ID: ACC-001)

Dedicated CSM: Priya Mehta
Plan: Enterprise
Any escalation for Northstar should be routed through Priya Mehta unless it is a P1 (which goes to the 24x7 on-call team immediately).`,
  },

  // ============================================================
  // 06_LumenWorks_Service_Agreement.pdf  (authority: 5, ACC-002 only)
  // ============================================================
  {
    id: "lumenworks-support-terms",
    source_id: "06_lumenworks_agreement",
    source_name: "LumenWorks Service Agreement",
    authority_level: 5,
    is_deprecated: false,
    customer_scope: "ACC-002",
    section: "1. Support Terms",
    content: `Customer: LumenWorks (Account ID: ACC-002)

LumenWorks operates on the Growth plan. The following first-response targets apply (same as standard Growth plan unless otherwise stated):
- P1: 2 business hours
- P2: 4 business hours
- P3: 2 business days

No overrides to the default Growth plan support SLAs have been negotiated.`,
  },
  {
    id: "lumenworks-cancellation",
    source_id: "06_lumenworks_agreement",
    source_name: "LumenWorks Service Agreement",
    authority_level: 5,
    is_deprecated: false,
    customer_scope: "ACC-002",
    section: "2. Shipment Cancellation",
    content: `Customer: LumenWorks (Account ID: ACC-002)

Standard cancellation policy applies. LumenWorks may cancel BOOKED shipments:
- No fee within 30 minutes of booking.
- INR 250 cancellation fee after 30 minutes.
- No waiver of the cancellation fee has been negotiated.`,
  },
  {
    id: "lumenworks-service-credits",
    source_id: "06_lumenworks_agreement",
    source_name: "LumenWorks Service Agreement",
    authority_level: 5,
    is_deprecated: false,
    customer_scope: "ACC-002",
    section: "3. Service Credits",
    content: `Customer: LumenWorks (Account ID: ACC-002)

Standard service credit policy applies. Failed pickup service credits follow the default SOP:
- Eligibility: pickup more than 2 hours past the end of the scheduled window, carrier at fault, no customer-caused issue.
- Credit: the lower of INR 500 or 10% of the shipment fee.
- Monthly aggregate cap: INR 2,000 (override to the default uncapped policy).

Dedicated Customer Success Manager: Rohan Kapoor.`,
  },
  {
    id: "lumenworks-account-contact",
    source_id: "06_lumenworks_agreement",
    source_name: "LumenWorks Service Agreement",
    authority_level: 5,
    is_deprecated: false,
    customer_scope: "ACC-002",
    section: "4. Account Contact",
    content: `Customer: LumenWorks (Account ID: ACC-002)

Dedicated CSM: Rohan Kapoor
Plan: Growth
Account ID: ACC-002`,
  },
];

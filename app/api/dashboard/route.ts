import { NextRequest, NextResponse } from "next/server";
import { verifyToken, toSessionContext } from "@/lib/auth";
import {
  detectSLABreaches,
  detectTicketClusters,
  detectCarrierAnomalies,
  getAllTickets,
  getEscalations,
} from "@/lib/tools/data-tools";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const user = await verifyToken(token);
  if (!user || user.role !== "internal") {
    return NextResponse.json(
      { error: "Internal access required" },
      { status: 403 }
    );
  }

  const session = toSessionContext(user);

  const slaBreaches = detectSLABreaches(session);
  const ticketClusters = detectTicketClusters(session);
  const carrierAnomalies = detectCarrierAnomalies(session);
  const allTickets = getAllTickets(session);
  const escalations = getEscalations(session);

  // Summary stats
  const openTickets = allTickets.filter(
    (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
  );
  const p1Open = openTickets.filter((t) => t.severity === "P1").length;
  const p2Open = openTickets.filter((t) => t.severity === "P2").length;
  const p3Open = openTickets.filter((t) => t.severity === "P3").length;

  return NextResponse.json({
    snapshot_time: "2026-08-22T18:00:00+05:30",
    summary: {
      total_open_tickets: openTickets.length,
      p1_open: p1Open,
      p2_open: p2Open,
      p3_open: p3Open,
      sla_breaches: slaBreaches.filter((b) => b.breached).length,
      open_escalations: escalations.filter((e) => e.status === "OPEN").length,
      active_ticket_clusters: ticketClusters.length,
      carrier_anomalies: carrierAnomalies.length,
    },
    sla_breaches: slaBreaches,
    ticket_clusters: ticketClusters,
    carrier_anomalies: carrierAnomalies,
    recent_escalations: escalations.slice(-5),
  });
}

# ParcelPilot AI Support System: Product Note

## Additional Client Problems Addressed

While the prompt gave the option to choose one, **I addressed both Problem 1 (Proactive Issue Detection) and Problem 2 (Trust and Reliability).**

1. **Problem 1 (Proactive Issue Detection):** I built an Internal Support context equipped with proactive investigation tools: `detect_sla_breaches`, `detect_ticket_clusters`, and `detect_carrier_anomalies`. Instead of waiting for customers to complain, internal staff can log in and ask the AI "What needs my attention?" and the AI will actively scan the database to group similar tickets (e.g., bulk upload failures) or highlight tickets about to breach their SLA.
2. **Problem 2 (Trust and Reliability):** Trust is maintained by enforcing deterministic tool usage and strict source authority hierarchies. By making the AI explicitly state "Per your Enterprise Agreement (which overrides standard policy)...", we build trust with the user by showing them *why* the AI arrived at its conclusion, rather than acting as an unexplainable black box.

## What Else I Would Build for ParcelPilot

If I were to continue developing this product, my immediate priorities would be:
1. **Human-in-the-Loop Handoff (High Priority):** When the AI cannot confidently answer, or when a customer explicitly requests a human, the chat history should be seamlessly handed off to a live agent's dashboard (e.g., Zendesk integration) along with a generated summary of what the AI already attempted.
2. **Automated Carrier Dispute Generation (Medium Priority):** Since we already detect carrier fault and SLA delays, the next step is an internal tool that drafts the formal refund dispute emails to the carrier automatically.
3. **Sentiment Analysis (Medium Priority):** Tagging incoming customer messages with sentiment scores to automatically bump the SLA priority of highly frustrated customers.

## What Was Intentionally Left Out

- **Authentication Infrastructure:** I mocked the authentication via a "Quick Login" dropdown that injects JWT tokens. In a production environment, this would integrate with ParcelPilot's actual Auth0 or SSO provider.
- **Real Vector Database:** The document retrieval uses a mocked structured format for simplicity in the take-home assessment, rather than standing up an actual Pinecone/Chroma instance, though the interface is identical.

## Success Metrics

To judge whether this product is useful, the primary metric I would track is the **First-Contact Resolution (FCR) Rate via AI**. 
Tracking how many customer queries are fully resolved without ever needing human escalation (while also monitoring customer satisfaction/CSAT on those automated resolutions) would prove the ROI of the AI agent for the 20-person operations team.

---

### AI Tool Usage
I utilized the **Antigravity IDE AI Assistant** (powered by Gemini) as a pair-programming partner to help me scaffold the Next.js API routes, refine the ReAct agentic loop for tool calling, and debug API schema mismatch errors with the Google Generative AI SDK.

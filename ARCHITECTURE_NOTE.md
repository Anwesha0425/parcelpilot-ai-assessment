# ParcelPilot AI Support System: Architecture Note

## Agent Design
The system uses a custom agentic loop built around the `@google/generative-ai` SDK (Gemini Flash). Rather than a simple call-and-response, the agent employs a ReAct-style loop (`runAgent` in `lib/agent.ts`) that allows the model to autonomously execute multiple tools in sequence before generating a final natural-language response. 

To support the two distinct user contexts, the agent dynamically injects different System Prompts (`CUSTOMER_SYSTEM_PROMPT` vs `INTERNAL_SYSTEM_PROMPT`) and restricts the toolset based on the user's authenticated `SessionContext`.

## Tool Design
Tools are defined using Gemini's native `FunctionCallingMode.AUTO`. 
- **Customer Context**: Access to general lookup, calculation, and document search tools (`ALL_TOOLS`).
- **Internal Context**: Access to all customer tools plus aggregate and proactive detection tools (`INTERNAL_ONLY_TOOLS`).

To satisfy the explicit confirmation requirement, state-changing tools (e.g., `create_escalation`, `create_task`) are intercepted in the execution layer. If `confirmed: false` is passed, the tool returns a `requires_confirmation` payload to the frontend, pausing the agent loop and surfacing a UI dialog. The loop only resumes when the frontend re-submits the request with `confirmed_action`.

## Document and Structured-Data Handling
- **Structured Data**: Handled via direct deterministic functions (`get_order`, `get_ticket`, `calculate_service_credit`). **Crucially, access control is enforced at this layer.** Every structured data tool receives the `SessionContext`, ensuring a customer can only ever retrieve orders or tickets belonging to their own `account_id`.
- **Document Handling**: Handled via a vector search abstraction (`search_documents`). The search function accepts a `customerScope` to filter documents (ensuring customers only retrieve their own specific agreements, while internal staff can search across all).

## Source Reliability and Conflict Handling
The system explicitly addresses the "imperfect source base" by enforcing a strict hierarchy of authority:
1. Customer Agreements (Highest)
2. Current Support Policy v3
3. SOPs
4. Product Guides
5. Historical Ticket Notes (Lowest / Context Only)

This hierarchy is embedded directly into the System Prompt. Furthermore, the `search_documents` tool returns chunks tagged with an `authority` level. The model is explicitly instructed that if sources conflict (e.g., a standard policy vs. an enterprise agreement waiver), the source with the higher authority strictly overrides the lower one.

## Major Technical Trade-offs
1. **Custom Agent Loop vs. Framework**: We opted for a custom `while` loop over a heavy framework like LangChain. This provided precise control over the conversation history and allowed us to easily pause the loop for user confirmation (which is often difficult in abstracted frameworks).
2. **Deterministic Calculations vs. LLM Math**: Tools like `calculate_service_credit` perform the actual math in TypeScript rather than asking the LLM to do arithmetic. The LLM only acts as the router/orchestrator, reducing hallucinations on pricing and SLAs.
3. **Mocked Vector Store**: For this assessment, the document retrieval layer is simulated, but the interface is designed so it can be swapped out for a real vector database (like Pinecone or pgvector) without changing the agent logic.

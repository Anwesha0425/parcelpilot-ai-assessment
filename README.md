# ParcelPilot AI Support System

An AI-powered customer support platform for ParcelPilot's B2B logistics operations. Built with Next.js 14, Google Gemini 1.5 Flash (free tier), and TypeScript.

## Features

- **Two user contexts**: Customer portal + Internal ops dashboard  
- **4 agent tools**: Document search, structured data queries, calculations, state-changing actions
- **Access control**: Enforced at the tool layer — customers see only their own data
- **Proactive detection**: SLA breach scanner, ticket cluster detector, carrier anomaly detector
- **Source authority**: Customer agreements > Policy > SOP > Product Docs > Historical (context only)
- **Confirmation flow**: All state-changing actions require explicit user confirmation

## Demo Accounts (all use password: pass)

| Email | Role | Account |
|-------|------|---------|
| customer@northstar.com | Customer | Northstar Logistics (Enterprise) |
| customer@lumenworks.com | Customer | LumenWorks (Growth) |
| customer@brightmove.com | Customer | BrightMove Retail (Standard) |
| ops@parcelpilot.com | Internal | Full access |
| admin@parcelpilot.com | Internal | Full access |

## Quick Start

### 1. Get a free Gemini API key

Go to https://aistudio.google.com/apikey - Sign in with Google - Create API Key. No credit card needed.

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Example Queries to Try

Customer (Northstar Logistics):
- "Can I cancel ORD-1001 without a cancellation fee?"
- "My pickup was 3 hours late due to carrier fault. Am I eligible for a credit?"
- "What are my P1 support SLA targets?"

Customer (LumenWorks):
- "What happened with my pickup on ORD-2002?"
- "Calculate my service credit for the BlueDart delay"

Internal Staff:
- "Which tickets are breaching SLA right now?"
- "Show me all bulk upload issues across accounts"
- "Escalate TKT-1002 to Tier 2 Engineering"

## Document Sources and Authority

| Source | Authority | Notes |
|--------|-----------|-------|
| Customer Agreements | 5 (Highest) | Overrides everything |
| Support Policy v3 CURRENT | 4 | Default rules |
| Cancellation and Credit SOP v4 | 3 | Operational procedures |
| Product Operations Guide | 2 | Features and known issues |
| Support Policy v2 DEPRECATED | 1 | Ignored, reference only |
| Historical ticket notes | 0 | Context only, may be wrong |

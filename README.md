<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Divyanshi Capital AI-Based OS (Canonical Master Repository)

Unified Enterprise Fintech Operating System combining:
1. **AI Studio Web App & OCR Ingestion**: React 19 + Vite 6 + Gemini 2.5 Flash + Express API (`server.ts`).
2. **Core Apps Script & Bulbhul Banking Brain**: `gas-backend/` & `Code.gs` connected to Script ID `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp`.
3. **Unified Loan Automation Core**: Integrated workflow documentation, credit policy models, and Firestore rules.

---

## Production Identifiers
- **Apps Script ID**: `1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp`
- **Web App Deployment ID**: `AKfycbwzdhZF3cVTT01atwZOSnXq7kBvx6k9NgFCbSvfAIXldCjBnMUqxKIBlLUPTiA7V8tc`
- **Authoritative Sheets**: `ALL_EMPLOYEES`, `COMMON_ENTRY`, `MASTER_DATA`, `Loan_Bank_Map`.

---

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   # Configure GEMINI_API_KEY and APPS_SCRIPT_URL
   ```
3. Start development server:
   ```bash
   npm run dev
   ```

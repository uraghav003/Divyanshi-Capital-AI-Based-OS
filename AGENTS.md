# Divyanshi Capital CRM and Automation Platform Guidelines

This file persists critical instructions and constraints for the AI agents working on this project. Do not modify these constraints unless explicitly requested by the user.

## Master Development Constraints (Do Not Overwrite/Rebuild)
* **Scope Discipline**: Do NOT rewrite, restructure, or add unrequested features to the login flow, BULBHUL logic/prompts, `DC_CALLING_APP` flow, API routes, or sheet structure.
* **No Unsolicited Themes**: Keep the single premium theme exactly as designed.

## Critical Channels Configuration
Keep the finalized channel setup exactly as is:
1. **External Marketing**: Deropo CSV export button (accessible by MD role only).
2. **Internal Alerts**: Meta Cloud API via Apps Script.
3. **Team Broadcast**: Telegram channel integrations.
4. **Calling**: Integrated via `DC_CALLING_APP` protocols.
5. **No AiSensy**: Strictly avoid any references to AiSensy in the UI or backend.

## Google Account and Context Configuration
* **Apps Script Owner Account**: `upendra.raghav@divyanshicapital.com` (Main GAS backend)
* **AI Studio Project Workspace Account**: `u.raghav003@gmail.com`
* **Execution Rule**: These are different, separate Google Accounts. This is fully intentional. The application must only call the already-deployed Apps Script Web App execution URL (`APPS_SCRIPT_URL` env variable) as a standard HTTPS endpoint. 
* **Do NOT**: Generate steps or code that expect the user to re-deploy the Apps Script project, re-authorize scopes, or login/authenticate to the other account. Maintain standard HTTPS fetch communication.

## Neutralized Error Fallback Protocol
* The system is protected by an intelligent Error Boundary and API Neutralization layer.
* If a permanent connection or authentication issue occurs, the system automatically redirects to secure local mockup sandboxes after exactly **3 attempts** using exponential backoff, preventing full app white-screen crashes.
* In the event of a permanent failure, the system will trigger alert notifications via WhatsApp, Telegram, or email directly to the MD.

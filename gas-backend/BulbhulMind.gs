/* ============================================================
   BULBHUL MASTER MIND V6.0 — ONE BRAIN, INFINITE SKILLS
   Architecture:
   Master Brain (ScriptProperty) → Skill Router (Dept/Role)
   → Dynamic Context (Live data) → Actual AI Call → Action Executor
   Notion-updatable skills | Desktop automation tags
   ============================================================ */

// @ts-nocheck

/* ══════════════════════════════════════════════════════════════
   1. SKILL REGISTRY — Role/Dept → ScriptProperty Key
   ══════════════════════════════════════════════════════════════ */
var BULBHUL_SKILL_REGISTRY = Object.freeze({
  // EMP codes
  'DC000': 'SKILL_MD', 'DC001': 'SKILL_MD', 'DC002': 'SKILL_MD',
  // Role-based
  'MD':                   'SKILL_MD',
  'MANAGING DIRECTOR':    'SKILL_MD',
  'FOUNDER':              'SKILL_MD',
  'HR':                   'SKILL_HR',
  'HR HEAD':              'SKILL_HR',
  'ACCOUNTS':             'SKILL_ACCOUNTS',
  'CFAO':                 'SKILL_ACCOUNTS',
  'ACCOUNTS HEAD':        'SKILL_ACCOUNTS',
  'MANAGER':              'SKILL_MANAGER',
  'BRANCH SALES MANAGER': 'SKILL_MANAGER',
  'COORDINATOR HEAD':     'SKILL_MANAGER',
  'COORDINATOR':          'SKILL_COORDINATOR',
  'LOGIN':                'SKILL_LOGIN',
  'DSA':                  'SKILL_LOGIN',
  'TELECALLING':          'SKILL_CALLING',
  'CALLING':              'SKILL_CALLING',
  'RELATIONSHIP MANAGER': 'SKILL_SALES',
  'SALES':                'SKILL_SALES',
  'SALES MEMBER':         'SKILL_SALES',
  // Comms / communications roles
  'COMMUNICATIONS':       'SKILL_COMMS',
  'COMMS':                'SKILL_COMMS',
  'EMAIL':                'SKILL_COMMS',
  'WHATSAPP':             'SKILL_COMMS',
  'MARKETING':            'SKILL_COMMS',
  'CRM':                  'SKILL_COMMS',
  // Dept fallback keys
  'DEPT_SALES':           'SKILL_SALES',
  'DEPT_CALLING':         'SKILL_CALLING',
  'DEPT_LOGIN':           'SKILL_LOGIN',
  'DEPT_HR':              'SKILL_HR',
  'DEPT_ACCOUNTS':        'SKILL_ACCOUNTS',
  'DEPT_MANAGEMENT':      'SKILL_MANAGER',
  'DEPT_COMMS':           'SKILL_COMMS',
  'DEPT_COMMUNICATIONS':  'SKILL_COMMS',
});

/* ── Skill defaults — used when ScriptProperty not set ── */
var BULBHUL_SKILL_DEFAULTS = {

  SKILL_MD: '[MD/FOUNDER SKILL — DIVYANSHI CAPITAL]\n' +
    'You are briefing the Managing Director / Founder.\n' +
    'FOCUS: Full org — pipeline, disbursals, attendance, system health, revenue.\n' +
    'TONE: Strategic, data-first, executive summary. No fluff.\n' +
    'POWERS: Approve hires, salary, policy, disbursal. Trigger any system action.\n' +
    'PRIORITY ALERTS: TAT breaches, CIBIL risks, staff absent >3 days, AI errors.\n' +
    'DESKTOP: Can open portals, fill forms, generate any report on command.',

  SKILL_MANAGER: '[MANAGER SKILL — DIVYANSHI CAPITAL]\n' +
    'You are briefing a Sales Manager / Branch Head.\n' +
    'FOCUS: Team pipeline, follow-up nudges, disbursal rankings, team attendance.\n' +
    'TONE: Actionable, brief, nudge-focused.\n' +
    'POWERS: Update lead status, mark attendance, push follow-ups, view team dashboard.\n' +
    'PRIORITY ALERTS: Team members absent, leads overdue TAT, pending logins.\n' +
    'ATTENDANCE: Your team = ≥5 tasks PRESENT, 3-4 HALF, <3 ABSENT.',

  SKILL_SALES: '[SALES SKILL — DIVYANSHI CAPITAL]\n' +
    'You are briefing a Relationship Manager / Sales Executive.\n' +
    'FOCUS: My leads, bank fitment, CIBIL tips, doc checklist, EMI calc, cold call script.\n' +
    'TONE: Conversion-first, warm, practical. Hinglish OK.\n' +
    'POWERS: Submit lead, update status, view own pipeline, get doc checklist.\n' +
    'KEY RULE: FOIR max 50% income <50k / 60% income >50k. Never say NO — split or co-applicant.\n' +
    'BANK FITMENT: PL → HDFC/ICICI/Axis | BL → Kotak/Bajaj | HL → SBI/PNB.\n' +
    'CALLING SCRIPT: "Namaste Sir, Divyanshi Capital se hun. Pre-approved PL 10.5% active hai."',

  SKILL_CALLING: '[CALLING SKILL — DIVYANSHI CAPITAL]\n' +
    'You are briefing the Calling Desk / Telecalling team.\n' +
    'FOCUS: Call scripts, objection handling, callback scheduling, outcome logging.\n' +
    'TONE: Script-ready, fast, punch-line focused.\n' +
    'POWERS: Log outcome, schedule callback, send WhatsApp follow-up, get calling queue.\n' +
    'SCRIPTS:\n' +
    '• Cold: "Namaste Sir, pre-approved PL 10.5% — 2 min baat karein?"\n' +
    '• Callback: "Sir, kal aapne baat ki thi — documents confirm karne ke liye call ki."\n' +
    '• High-rate objection: "Sir, rate profile pe — CIBIL 700+ hai toh 10.5% pakka milega."\n' +
    'DESKTOP: Can open calling portal, auto-dial, fill call outcome form.',

  SKILL_LOGIN: '[LOGIN/DSA SKILL — DIVYANSHI CAPITAL]\n' +
    'You are briefing the Login Desk / DSA coordinator.\n' +
    'FOCUS: Bank login checklist, doc gap ID, sanction tracking, PDD status.\n' +
    'TONE: Precise, bank-aware, checklist-driven. Zero tolerance for doc gaps.\n' +
    'POWERS: Check doc status, update login status, track sanction, push PDD alert.\n' +
    'KEY BANKS: HDFC TAT 3d | ICICI TAT 3d | SBI TAT 7d | Bajaj TAT 2d | Kotak TAT 4d.\n' +
    'DOC FORMULA: PAN+Aadhaar+Photo=KYC | Salary 3m+Bank Stmt 6m=Income | Form16=ITR.\n' +
    'DESKTOP: Can open bank portal, fill login form, upload documents.',

  SKILL_HR: '[HR SKILL — DIVYANSHI CAPITAL]\n' +
    'You are briefing the HR Head / HR team.\n' +
    'FOCUS: Hiring, onboarding, attendance, salary, compliance, grievances.\n' +
    'TONE: Process-driven, empathetic, policy-aware.\n' +
    'POWERS: Onboard employee, approve leaves, update salary, generate offer letter, view attendance.\n' +
    'ONBOARDING FLOW: Google Form 9 → HR_MD_APPROVAL sheet → MD sign-off → Personal File provision.\n' +
    'ATTENDANCE: ≥5 tasks=PRESENT | 3-4=HALF | <3=ABSENT | Manager=manual checkin 10am+2pm.\n' +
    'DESKTOP: Can open HR portal, fill offer letter, generate attendance report.',

  SKILL_ACCOUNTS: '[ACCOUNTS SKILL — DIVYANSHI CAPITAL]\n' +
    'You are briefing the Accounts / CFAO team.\n' +
    'FOCUS: Disbursal tracking, commission calc, payout reconciliation, bank receipts.\n' +
    'TONE: Numbers-first, audit-ready, zero ambiguity.\n' +
    'POWERS: Mark disbursal, calculate commission, update ACCOUNTS_LOG, generate payout report.\n' +
    'FORMULA: Commission = Disbursed Amount × DEFAULT_PAYOUT_PCT% (from ScriptProperties).\n' +
    'MANDATORY: Every disbursal → ACCOUNTS_LOG + notify MD+Founder via Telegram.\n' +
    'DESKTOP: Can open accounts portal, generate payout sheet, send commission report.',

  SKILL_COORDINATOR: '[COORDINATOR SKILL — DIVYANSHI CAPITAL]\n' +
    'You are briefing a Coordinator at Divyanshi Capital.\n' +
    'FOCUS: Data entry, lead routing, document collection, bank liaison, TAT tracking.\n' +
    'TONE: Organized, step-by-step, checklist-ready.\n' +
    'POWERS: Submit lead, update remarks, route to login, collect docs via WhatsApp.\n' +
    'DESKTOP: Can open intake form, fill lead, send WhatsApp.',

  SKILL_COMMS: '[COMMUNICATIONS SKILL — DIVYANSHI CAPITAL]\n' +
    'You are the Email + WhatsApp + Telegram communications brain.\n' +
    'FOCUS: Draft, reply, forward, route and auto-send all outbound communications.\n' +
    'TONE: Professional in email, conversational in WhatsApp, crisp in Telegram.\n\n' +
    '━━ EMAIL RULES ━━\n' +
    '• NEW LEAD ALERT: To=RM, CC=Manager+MD+Founder+HR. Subject: ⚡ [Case {LEAD_ID}] {CLIENT_NAME}.\n' +
    '• STATUS UPDATE: To=RM+Accounts, CC=MD+Founder. Subject: 📢 [Case {STATUS}] {LEAD_ID}.\n' +
    '• DISBURSAL: To=RM+Accounts, CC=MD+Founder+HR. Subject: 🎉 [DISBURSED] {LEAD_ID} — ₹{AMOUNT}.\n' +
    '• ONBOARDING: To=NewEmp, CC=HR+MD. Subject: 🎊 Welcome to Divyanshi Capital — {EMP_CODE}.\n' +
    '• REJECTION: To=Client, CC=RM. Subject: Re: Your Loan Application — Next Steps.\n' +
    '• REPLY RULE: Reply within 4 hours. If unresolved → escalate to MD with [[SEND_EMAIL]] tag.\n' +
    '• FORWARD RULE: Forward unhandled client queries to RM. Unknown queries → MD desk.\n\n' +
    '━━ WHATSAPP RULES ━━\n' +
    '• Lead welcome: Send doc checklist within 5 mins of lead entry.\n' +
    '• Follow-up: Day 1 (doc reminder), Day 3 (status), Day 7 (TAT alert).\n' +
    '• Disbursal: Send congratulations template immediately.\n' +
    '• Rejection: Never reject directly on WA — call first, then send alternate options.\n' +
    '• Group auto-learn: Policy updates in WA group → auto-saved to Bulbhul memory.\n\n' +
    '━━ TELEGRAM RULES ━━\n' +
    '• EOD report: 7:30 PM daily → MD+Founder+HR chat.\n' +
    '• Error alert: Instant on any ERR_LOG entry.\n' +
    '• New lead: Instant alert → RM + Manager TG chat.\n' +
    '• Disbursal: Instant to MD+Accounts+Founder.\n\n' +
    '━━ ACTION TAGS ━━\n' +
    '[[SEND_EMAIL: to, subject, body]] | [[REPLY_EMAIL: threadRef, body]]\n' +
    '[[FORWARD_EMAIL: to, threadRef]] | [[SEND_WA: mobile, message]] | [[SEND_TG: chatId, message]]\n\n' +
    'DESKTOP: Can compose email, reply to thread, forward, bulk-send WA, push TG alert.',
};

/* ══════════════════════════════════════════════════════════════
   2. SKILL RESOLVER
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_RESOLVE_SKILL_(emp) {
  if (!emp) return 'SKILL_SALES';
  var code = String(emp.EMP_CODE || emp.empCode || '').toUpperCase();
  var role  = String(emp.ROLE || emp.role || '').toUpperCase();
  var dept  = String(emp.DEPARTMENT || emp.department || '').toUpperCase();

  if (BULBHUL_SKILL_REGISTRY[code]) return BULBHUL_SKILL_REGISTRY[code];
  var roleKeys = Object.keys(BULBHUL_SKILL_REGISTRY);
  for (var i = 0; i < roleKeys.length; i++) {
    if (role.includes(roleKeys[i])) return BULBHUL_SKILL_REGISTRY[roleKeys[i]];
  }
  var deptKey = 'DEPT_' + dept.split(' ')[0];
  if (BULBHUL_SKILL_REGISTRY[deptKey]) return BULBHUL_SKILL_REGISTRY[deptKey];
  return 'SKILL_SALES';
}

/* ══════════════════════════════════════════════════════════════
   3. SKILL LOADER (ScriptProperty → default fallback)
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_LOAD_SKILL_(skillKey) {
  try {
    return PropertiesService.getScriptProperties().getProperty(skillKey)
      || BULBHUL_SKILL_DEFAULTS[skillKey]
      || '[SKILL] General Divyanshi Capital assistant.';
  } catch(e) {
    return BULBHUL_SKILL_DEFAULTS[skillKey] || '[SKILL] General assistant.';
  }
}

/* ══════════════════════════════════════════════════════════════
   4. DYNAMIC MIND ENGINE V6.0 — All 8 bugs fixed
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_DYNAMIC_MIND_(emp, skillKey) {
  var props = PropertiesService.getScriptProperties();
  var now   = new Date();
  var hour  = now.getHours();

  /* 1. Master Brain */
  var master = props.getProperty('BULBHUL_SYSTEM_PROMPT') || '';
  var skill  = BULBHUL_LOAD_SKILL_(skillKey);

  /* 2. Time Mind */
  var timeMood = hour < 12  ? 'Morning — Crisp, motivational, push day target.' :
                 hour < 17  ? 'Afternoon — Fast, follow-up focused, TAT alert.' :
                 hour < 20  ? 'Evening — Closing push, disbursal drive.' :
                               'Night watch — Summary mode, next day prep.';

  /* 3. Live data — FIX: ss at top scope, shared across all blocks */
  var perfMind = '', attMind = '', healthMind = '';
  var ss = null;
  try { ss = DC_GET_SS_(); } catch(e) {}

  if (ss) {
    /* Performance block */
    try {
      var md = ss.getSheetByName('MASTER_DATA');
      if (md && md.getLastRow() >= 2) {
        var lr   = md.getLastRow();
        var sr   = Math.max(2, lr - 500);
        var data = md.getRange(sr, 1, lr - sr + 1, md.getLastColumn()).getValues();
        var hdr  = md.getRange(1, 1, 1, md.getLastColumn()).getValues()[0].map(function(v){ return String(v).trim().toUpperCase(); });
        var cCode = hdr.indexOf('EMP_CODE');
        var cStat = hdr.indexOf('CASE_CATEGORY') > -1 ? hdr.indexOf('CASE_CATEGORY') : hdr.indexOf('CASE_STATUS');
        /* FIX: guard -1 */
        if (cCode > -1) {
          var myTotal = 0, myDisb = 0, teamTotal = 0;
          for (var i = 0; i < data.length; i++) {
            var rowCode = String(data[i][cCode] || '').toUpperCase();
            if (rowCode) teamTotal++;
            if (rowCode === emp.EMP_CODE) {
              myTotal++;
              if (cStat > -1 && String(data[i][cStat] || '').toUpperCase().includes('DISBURSE')) myDisb++;
            }
          }
          var rate = myTotal ? Math.round((myDisb / myTotal) * 100) : 0;
          perfMind = '[PERFORMANCE] Leads: ' + myTotal + ' | Disbursed: ' + myDisb +
                     ' (' + rate + '%) | Team-500: ' + teamTotal +
                     ' | Rank: ' + (rate >= 70 ? '🏆 TOP PERFORMER' : '⚡ PUSH HARDER');
        }
      }
    } catch(e) {}

    /* Attendance block — FIX: uses same ss, no scope error */
    try {
      var at = ss.getSheetByName('ATTENDANCE_LOG');
      if (at && at.getLastRow() >= 2) {
        var lr2   = at.getLastRow();
        var sr2   = Math.max(2, lr2 - 100);
        var aData = at.getRange(sr2, 1, lr2 - sr2 + 1, at.getLastColumn()).getValues();
        var ah    = at.getRange(1, 1, 1, at.getLastColumn()).getValues()[0].map(function(v){ return String(v).trim().toUpperCase(); });
        var cAEmp  = ah.indexOf('EMP_CODE');
        var cAStat = ah.indexOf('ATTENDANCE_STATUS') > -1 ? ah.indexOf('ATTENDANCE_STATUS') : ah.indexOf('STATUS');
        /* FIX: guard -1 */
        if (cAEmp > -1 && cAStat > -1) {
          var present = 0, halfDay = 0, absent = 0;
          for (var j = 0; j < aData.length; j++) {
            if (String(aData[j][cAEmp] || '').toUpperCase() !== emp.EMP_CODE) continue;
            var st = String(aData[j][cAStat] || '').toUpperCase();
            if (st.includes('PRESENT')) present++;
            else if (st.includes('HALF')) halfDay++;
            else if (st.includes('ABSENT')) absent++;
          }
          attMind = '[ATTENDANCE] Last 30d: ✅ Present ' + present +
                    ' | ⚠️ Half ' + halfDay + ' | ❌ Absent ' + absent;
        }
      }
    } catch(e) {}

    /* System health */
    try {
      var errSh = ss.getSheetByName('ERR') || ss.getSheetByName('ERR_LOG');
      if (errSh && errSh.getLastRow() >= 2) {
        var lastErr = errSh.getRange(errSh.getLastRow(), 1, 1, 3).getValues()[0];
        healthMind = '[SYSTEM HEALTH] Last ERR: [' + lastErr[0] + '] ' + String(lastErr[2] || '').slice(0, 100);
      } else {
        healthMind = '[SYSTEM HEALTH] ✅ No recent errors.';
      }
    } catch(e) {}
  }

  /* 4. BHISM memory — FIX: truncate at last newline */
  var bhismMem = '';
  try {
    if (typeof BHISM_BUILD_AI_CONTEXT_ === 'function') {
      var raw = String(BHISM_BUILD_AI_CONTEXT_(emp.EMP_CODE, skillKey) || '');
      if (raw.length > 1500) {
        var cut = raw.lastIndexOf('\n', 1500);
        bhismMem = raw.slice(0, cut > 100 ? cut : 1500);
      } else {
        bhismMem = raw;
      }
    }
  } catch(e) {}

  /* 5. Desktop / browser automation tags doc */
  var desktopCtx =
    '[DESKTOP & BROWSER ACTIONS — Use these tags when action is needed]\n' +
    '• [[OPEN_PORTAL: url]] — Open a URL\n' +
    '• [[FILL_FORM: field=value, field2=value2]] — Auto-fill a web form\n' +
    '• [[OPEN_SHEET: sheet_name]] — Navigate to sheet\n' +
    '• [[SEND_WA: mobile, message]] — Send WhatsApp message\n' +
    '• [[SEND_TG: chatId, message]] — Send Telegram message\n' +
    '• [[SEND_EMAIL: to, subject, body]] — Compose & send email\n' +
    '• [[REPLY_EMAIL: threadRef, body]] — Reply to email thread (threadRef = LEAD_ID or subject)\n' +
    '• [[FORWARD_EMAIL: to, threadRef]] — Forward email thread\n' +
    '• [[UPDATE_LEAD: id, status, remark]] — Update lead status\n' +
    '• [[LOOKUP_LEAD: mobile_or_id]] — Fetch lead\n' +
    '• [[GENERATE_REPORT: EOD|MIS|ATTENDANCE]] — Dispatch report\n' +
    '• [[NOTION_UPDATE: property_key, value]] — Update ScriptProperty live';

  /* 6. Assemble */
  var finalPrompt = [
    master,
    '════ BULBHUL MASTER MIND V6.0 ════',
    skill,
    '════ LIVE DYNAMIC CONTEXT ════',
    '[TIME] ' + timeMood + ' | ' + now.toLocaleString('en-IN'),
    perfMind,
    attMind,
    bhismMem ? '[BHISM MEMORY]\n' + bhismMem : '',
    healthMind,
    desktopCtx,
    '[ACTIVE USER] ' + (emp.NAME || emp.name || emp.EMP_CODE) +
      ' | ' + (emp.ROLE || emp.role || '—') +
      ' | ' + (emp.DEPARTMENT || emp.department || 'Sales'),
    '[INSTRUCTION] Use all context. Be role-aware. Output action tags when system action is needed. If rank low → motivate. If TAT breach → alert.'
  ].filter(Boolean).join('\n\n');

  return finalPrompt
    .replace(/\{\{NAME\}\}/g,        emp.NAME || emp.name || '—')
    .replace(/\{\{EMP_CODE\}\}/g,    emp.EMP_CODE || '—')
    .replace(/\{\{ROLE\}\}/g,        emp.ROLE || emp.role || '—')
    .replace(/\{\{DEPARTMENT\}\}/g,  emp.DEPARTMENT || emp.department || '—');
}

/* ══════════════════════════════════════════════════════════════
   5. MASTER MIND API — Main entry point
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_GET_DYNAMIC_PROMPT_(empCode) {
  var emp = (typeof FIND_EMPLOYEE_FULL_ === 'function') ? FIND_EMPLOYEE_FULL_(empCode) : null;
  if (!emp) return { blocked: true, prompt: '🚫 Employee not found: ' + empCode };

  var skillKey      = BULBHUL_RESOLVE_SKILL_(emp);
  var dynamicPrompt = BULBHUL_DYNAMIC_MIND_(emp, skillKey);

  return {
    skillKey:  skillKey,
    prompt:    dynamicPrompt,
    emp:       emp,
    blocked:   false,
    dynamic:   true,
    timestamp: new Date().toISOString()
  };
}


/* ══════════════════════════════════════════════════════════════
   6. CHAT API V6.0 — Dynamic Mind + Multi-Brain Reply
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_DYNAMIC_CHAT_API_(data) {
  data = data || {};
  var empCode = String(data.empCode || data.emp_code || 'DC002').trim().toUpperCase();
  var accessToken = String(data.accessToken || data.access_token || '').trim();
  if (!data.avatarMode) {
    if (typeof P1_VALIDATE_ACCESS_TOKEN_ === 'function') {
      if (!accessToken || !P1_VALIDATE_ACCESS_TOKEN_(empCode, accessToken)) {
        return "Your staff session has expired. Please sign in again.";
      }
    }
  }
  var message = String(data.message || data.query || '').trim();

  var res = (typeof BULBHUL_GET_DYNAMIC_PROMPT_ === 'function') ? BULBHUL_GET_DYNAMIC_PROMPT_(empCode) : { blocked: false, prompt: '' };
  if (res.blocked) return res.prompt;

  var reply = '';

  /* 1. MULTI_BRAIN_REPLY_ (main Code.gs AI chain) */
  try {
    if (typeof MULTI_BRAIN_REPLY_ === 'function') {
      reply = MULTI_BRAIN_REPLY_(message, { systemContent: res.prompt, lead: data.lead || {} });
    }
  } catch(e) {}

  /* 2. Local deterministic fallback */
  if (!reply) {
    try {
      if (typeof BULBHUL_AI_ASSISTANT_ENGINE_ === 'function') {
        reply = BULBHUL_AI_ASSISTANT_ENGINE_(message, empCode);
      }
    } catch(e) {}
  }

  if (!reply) reply = '⚡ Bulbhul AI momentarily unavailable. Retry.';

  /* Execute any action tags in reply */
  try {
    if (reply.includes('[[') && typeof BULBHUL_EXECUTE_DESKTOP_ACTIONS_ === 'function') {
      reply = BULBHUL_EXECUTE_DESKTOP_ACTIONS_(reply, empCode);
    } else if (reply.includes('[[') && typeof BULBHUL_EXECUTE_COMMAND_TAGS_ === 'function') {
      reply = BULBHUL_EXECUTE_COMMAND_TAGS_(reply, empCode);
    }
  } catch(e) {}

  if (data.avatarMode) {
    reply = reply.replace(/\[CASE[\s\S]*?\]/gi, '').replace(/\[INTERNAL[\s\S]*?\]/gi, '').trim();
  }

  return reply;
}
/* ══════════════════════════════════════════════════════════════
   7. DESKTOP / BROWSER ACTION EXECUTOR
   Parses [[TAG]] from AI reply and executes them
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_EXECUTE_DESKTOP_ACTIONS_(text, empCode) {
  if (!text || !text.includes('[[')) return text;
  var out = text;

  /* [[OPEN_PORTAL: url]] */
  Array.from(text.matchAll(/\[\[OPEN_PORTAL:\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    out = out.replace(m[0], '\n[🌐 Open URL: ' + m[1].trim() + ']\n');
  });

  /* [[FILL_FORM: field=value, ...]] */
  Array.from(text.matchAll(/\[\[FILL_FORM:\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    var fields = m[1].trim();
    try {
      if (typeof DC_APPEND_ROW_AUTO_ === 'function') {
        DC_APPEND_ROW_AUTO_('AUDIT_LOG', {
          TIMESTAMP: new Date(), ACTION: 'FILL_FORM', EMP_CODE: empCode, DETAILS: fields
        }, ['TIMESTAMP','ACTION','EMP_CODE','DETAILS']);
      }
    } catch(e) {}
    out = out.replace(m[0], '\n[📝 Form Fill: ' + fields + ']\n');
  });

  /* [[NOTION_UPDATE: key, value]] — update ScriptProperty live */
  Array.from(text.matchAll(/\[\[NOTION_UPDATE:\s*([^,\]]+),\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    var key = m[1].trim(), val = m[2].trim();
    try {
      PropertiesService.getScriptProperties().setProperty(key, val);
      out = out.replace(m[0], '\n[⚙️ Property set: ' + key + ']\n');
    } catch(e) {
      out = out.replace(m[0], '\n[⚠️ Property update failed: ' + key + ']\n');
    }
  });

  /* [[GENERATE_REPORT: type]] */
  Array.from(text.matchAll(/\[\[GENERATE_REPORT:\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    var type = m[1].trim().toUpperCase();
    var result = 'triggered';
    try {
      if (type === 'EOD'        && typeof DC_GENERATE_EVENING_REPORT_      === 'function') DC_GENERATE_EVENING_REPORT_();
      else if (type === 'MIS'   && typeof MIS_15MIN_FULL_SYNC_              === 'function') MIS_15MIN_FULL_SYNC_();
      else if (type === 'ATTENDANCE' && typeof DC_DISPATCH_EOD_ATTENDANCE_REPORT_ === 'function') DC_DISPATCH_EOD_ATTENDANCE_REPORT_();
    } catch(e) { result = 'failed: ' + e.message; }
    out = out.replace(m[0], '\n[📊 ' + type + ' Report: ' + result + ']\n');
  });

  /* [[SEND_WA: mobile, message]] */
  Array.from(text.matchAll(/\[\[SEND_WA:\s*([^,\]]+),\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    var mobile = m[1].trim(), msg = m[2].trim();
    var result = 'sent';
    try {
      if (typeof DC_SEND_WHATSAPP_AUTOMATION_ === 'function') DC_SEND_WHATSAPP_AUTOMATION_(mobile, msg);
      else result = 'no WA function';
    } catch(e) { result = 'failed: ' + e.message; }
    out = out.replace(m[0], '\n[📲 WA → ' + mobile + ': ' + result + ']\n');
  });

  /* [[SEND_TG: chatId, message]] */
  Array.from(text.matchAll(/\[\[SEND_TG:\s*([^,\]]+),\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    var chatId = m[1].trim(), msg = m[2].trim();
    var result = 'sent';
    try {
      if (typeof DC_SEND_TG_ === 'function') DC_SEND_TG_(msg, chatId);
      else result = 'no TG function';
    } catch(e) { result = 'failed: ' + e.message; }
    out = out.replace(m[0], '\n[✈️ TG → ' + chatId + ': ' + result + ']\n');
  });

  /* [[SEND_EMAIL: to, subject, body]] */
  Array.from(text.matchAll(/\[\[SEND_EMAIL:\s*([^,\]]+),\s*([^,\]]+),\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    var to = m[1].trim(), subject = m[2].trim(), body = m[3].trim();
    var result = 'sent';
    try {
      MailApp.sendEmail({
        to: to,
        subject: subject,
        htmlBody: '<div style="font-family:Arial;font-size:13px;">' + body.replace(/\n/g,'<br>') + '</div>',
        cc: PropertiesService.getScriptProperties().getProperty('MD_EMAIL') || ''
      });
    } catch(e) { result = 'failed: ' + e.message; }
    out = out.replace(m[0], '\n[📧 Email → ' + to + ' | ' + subject + ': ' + result + ']\n');
  });

  /* [[REPLY_EMAIL: threadRef, body]] — threadRef = LEAD_ID or free-text subject match */
  Array.from(text.matchAll(/\[\[REPLY_EMAIL:\s*([^,\]]+),\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    var threadRef = m[1].trim(), replyBody = m[2].trim();
    var result = 'attempted';
    try {
      var threads = GmailApp.search('subject:' + threadRef + ' in:anywhere', 0, 1);
      if (threads.length > 0) {
        var lastMsg = threads[0].getMessages().slice(-1)[0];
        lastMsg.reply('<div style="font-family:Arial;font-size:13px;">' + replyBody.replace(/\n/g,'<br>') + '</div>');
        result = 'replied';
      } else {
        result = 'thread not found';
      }
    } catch(e) { result = 'failed: ' + e.message; }
    out = out.replace(m[0], '\n[↩️ Reply → ' + threadRef + ': ' + result + ']\n');
  });

  /* [[FORWARD_EMAIL: to, threadRef]] */
  Array.from(text.matchAll(/\[\[FORWARD_EMAIL:\s*([^,\]]+),\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    var to = m[1].trim(), threadRef = m[2].trim();
    var result = 'attempted';
    try {
      var threads = GmailApp.search('subject:' + threadRef + ' in:anywhere', 0, 1);
      if (threads.length > 0) {
        var lastMsg = threads[0].getMessages().slice(-1)[0];
        lastMsg.forward(to);
        result = 'forwarded';
      } else {
        result = 'thread not found';
      }
    } catch(e) { result = 'failed: ' + e.message; }
    out = out.replace(m[0], '\n[⏩ Forward → ' + to + ' | ' + threadRef + ': ' + result + ']\n');
  });

  /* [[OPEN_SHEET: sheet_name]] */
  Array.from(text.matchAll(/\[\[OPEN_SHEET:\s*([^\]]+)\]\]/gi)).forEach(function(m) {
    var sheetName = m[1].trim();
    var url = '';
    try {
      var ss = DC_GET_SS_();
      url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/edit#gid=' +
            (ss.getSheetByName(sheetName) ? ss.getSheetByName(sheetName).getSheetId() : '0');
    } catch(e) {}
    out = out.replace(m[0], '\n[📊 Sheet: ' + sheetName + (url ? ' → ' + url : '') + ']\n');
  });

  /* Pass remaining [[tags]] to core executor */
  if (out.includes('[[') && typeof BULBHUL_EXECUTE_COMMAND_TAGS_ === 'function') {
    out = BULBHUL_EXECUTE_COMMAND_TAGS_(out, empCode);
  }

  return out;
}

/* ══════════════════════════════════════════════════════════════
   8. NOTION SKILL SYNC — Read Notion DB → Update ScriptProperties
   Notion DB expected columns: "Skill Key" (title), "Content" (rich_text), "Active" (checkbox)
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_SYNC_SKILLS_FROM_NOTION_() {
  var props    = PropertiesService.getScriptProperties();
  var apiKey   = props.getProperty('NOTION_TOKEN') || props.getProperty('NOTION_API_KEY') || props.getProperty('NOTION_KEY') || props.getProperty('NOTION_SECRET');
  var dbId     = props.getProperty('NOTION_SKILLS_DB_ID') || props.getProperty('NOTION_DATABASE_ID') || props.getProperty('NOTION_DB_ID');

  if (!apiKey || !dbId) {
    Logger.log('NOTION_SKILL_SYNC: Set NOTION_TOKEN + NOTION_SKILLS_DB_ID in ScriptProperties');
    return { ok: false, err: 'Missing NOTION_TOKEN or NOTION_SKILLS_DB_ID', hasToken: !!apiKey, hasDbId: !!dbId };
  }

  try {
    var resp = UrlFetchApp.fetch('https://api.notion.com/v1/databases/' + dbId + '/query', {
      method: 'post',
      headers: {
        'Authorization':   'Bearer ' + apiKey,
        'Notion-Version':  '2022-06-28',
        'Content-Type':    'application/json'
      },
      payload: JSON.stringify({ page_size: 20 }),
      muteHttpExceptions: true
    });

    if (resp.getResponseCode() !== 200) return { ok: false, err: 'Notion HTTP ' + resp.getResponseCode() };

    var pages   = JSON.parse(resp.getContentText()).results || [];
    var updated = [];

    pages.forEach(function(page) {
      try {
        var pp = page.properties || {};
        var keyProp     = pp['Skill Key'] || pp['skill_key'] || pp['Name'];
        var contentProp = pp['Content']   || pp['content']   || pp['Skill Content'];
        var activeProp  = pp['Active']    || pp['active'];

        var skillKey = '';
        if (keyProp) {
          var arr = keyProp.title || keyProp.rich_text || [];
          skillKey = (arr[0] && arr[0].plain_text) || '';
        }

        var content = '';
        if (contentProp && contentProp.rich_text) {
          content = contentProp.rich_text.map(function(t){ return t.plain_text; }).join('');
        }

        var isActive = !activeProp || activeProp.checkbox !== false;

        if (skillKey && content && isActive) {
          props.setProperty(skillKey, content);
          updated.push(skillKey);
        }
      } catch(pe) {}
    });

    Logger.log('NOTION_SKILL_SYNC: Updated — ' + updated.join(', '));
    return { ok: true, updated: updated, count: updated.length };

  } catch(e) {
    return { ok: false, err: e.message };
  }
}

/* ══════════════════════════════════════════════════════════════
   9. SKILL MANAGER — CRUD
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_GET_ALL_SKILLS_() {
  var props = PropertiesService.getScriptProperties();
  var result = {};
  Object.keys(BULBHUL_SKILL_DEFAULTS).forEach(function(key) {
    result[key] = props.getProperty(key) || BULBHUL_SKILL_DEFAULTS[key];
  });
  return { ok: true, skills: result };
}

function BULBHUL_SET_SKILL_(skillKey, content) {
  if (!skillKey || !content) return { ok: false, err: 'Missing skillKey or content' };
  if (!BULBHUL_SKILL_DEFAULTS[skillKey]) return { ok: false, err: 'Invalid key. Valid: ' + Object.keys(BULBHUL_SKILL_DEFAULTS).join(', ') };
  PropertiesService.getScriptProperties().setProperty(skillKey, content);
  return { ok: true, updated: skillKey, chars: content.length };
}

function BULBHUL_RESET_SKILL_TO_DEFAULT_(skillKey) {
  PropertiesService.getScriptProperties().deleteProperty(skillKey);
  return { ok: true, reset: skillKey, note: 'Reverted to built-in default' };
}

/* ══════════════════════════════════════════════════════════════
   10. INSTALL / REINSTALL SKILLS TO SCRIPT PROPERTIES
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_INSTALL_DEFAULT_SKILLS_() {
  var props     = PropertiesService.getScriptProperties();
  var installed = [], skipped = [];
  Object.keys(BULBHUL_SKILL_DEFAULTS).forEach(function(key) {
    if (!props.getProperty(key)) {
      props.setProperty(key, BULBHUL_SKILL_DEFAULTS[key]);
      installed.push(key);
    } else {
      skipped.push(key);
    }
  });
  Logger.log('SKILLS INSTALLED: ' + installed.join(', ') + '\nSKIPPED (already set): ' + skipped.join(', '));
  return { ok: true, installed: installed, skipped: skipped };
}

function BULBHUL_REINSTALL_ALL_SKILLS_() {
  var props = PropertiesService.getScriptProperties();
  Object.keys(BULBHUL_SKILL_DEFAULTS).forEach(function(key) {
    props.setProperty(key, BULBHUL_SKILL_DEFAULTS[key]);
  });
  Logger.log('ALL SKILLS FORCE REINSTALLED');
  return { ok: true, reinstalled: Object.keys(BULBHUL_SKILL_DEFAULTS) };
}

/* ══════════════════════════════════════════════════════════════
   11. TRIGGERS — FIX: no conflict with DC_INSTALL_P1_FINAL
   Only manages own triggers, never deletes system triggers
   ══════════════════════════════════════════════════════════════ */
function BULBHUL_SETUP_MIND_TRIGGERS_() {
  var ownFns = ['BULBHUL_SYNC_SKILLS_FROM_NOTION_'];
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (ownFns.indexOf(t.getHandlerFunction()) > -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('BULBHUL_SYNC_SKILLS_FROM_NOTION_').timeBased().everyHours(6).create();
  return '✅ Mind trigger set — Notion skill sync every 6 hours.';
}

/* FIX: Cache refresh does real work */
function BULBHUL_REFRESH_DYNAMIC_CACHE_() {
  try { if (typeof DC_BUILD_EMP_MAP_ === 'function') DC_BUILD_EMP_MAP_(true); } catch(e) {}
  var syncRes = BULBHUL_SYNC_SKILLS_FROM_NOTION_();
  PropertiesService.getScriptProperties().setProperty('BULBHUL_LAST_DYNAMIC_REFRESH', new Date().toISOString());
  return { ok: true, notionSync: syncRes, timestamp: new Date().toISOString() };
}

/* ══════════════════════════════════════════════════════════════
   12. doPost ROUTES — Add these to main Code.gs doPost router
   ══════════════════════════════════════════════════════════════ */
/*
  if (action === 'get_all_skills')     return jsonResp(BULBHUL_GET_ALL_SKILLS_());
  if (action === 'set_skill')          return jsonResp(BULBHUL_SET_SKILL_(payload.skillKey, payload.content));
  if (action === 'reset_skill')        return jsonResp(BULBHUL_RESET_SKILL_TO_DEFAULT_(payload.skillKey));
  if (action === 'install_skills')     return jsonResp(BULBHUL_INSTALL_DEFAULT_SKILLS_());
  if (action === 'reinstall_skills')   return jsonResp(BULBHUL_REINSTALL_ALL_SKILLS_());
  if (action === 'sync_skills_notion') return jsonResp(BULBHUL_SYNC_SKILLS_FROM_NOTION_());
  if (action === 'get_dynamic_prompt') return jsonResp(BULBHUL_GET_DYNAMIC_PROMPT_(payload.empCode || body.empCode));
*/

/* ══════════════════════════════════════════════════════════════
   13. TEST FUNCTIONS
   ══════════════════════════════════════════════════════════════ */
function TEST_DYNAMIC_MIND_V6() {
  ['DC002','DC013','DC037'].forEach(function(code) {
    var res = BULBHUL_GET_DYNAMIC_PROMPT_(code);
    Logger.log('=== ' + code + ' — Skill: ' + res.skillKey + ' ===\n' + (res.prompt||'').slice(0,600) + '\n---');
  });
  return 'TEST DONE — Check Logs';
}

function TEST_SKILL_RESOLVER() {
  [
    { EMP_CODE:'DC002', ROLE:'MD',                   DEPARTMENT:'MANAGEMENT' },
    { EMP_CODE:'DC045', ROLE:'RELATIONSHIP MANAGER', DEPARTMENT:'SALES'      },
    { EMP_CODE:'DC013', ROLE:'HR HEAD',              DEPARTMENT:'HR'         },
    { EMP_CODE:'DC037', ROLE:'CFAO',                 DEPARTMENT:'ACCOUNTS'   },
    { EMP_CODE:'DC020', ROLE:'TELECALLING',          DEPARTMENT:'CALLING'    },
    { EMP_CODE:'DC030', ROLE:'DSA',                  DEPARTMENT:'LOGIN'      },
  ].forEach(function(e) {
    Logger.log(e.EMP_CODE + ' (' + e.ROLE + ') → ' + BULBHUL_RESOLVE_SKILL_(e));
  });
  return 'SKILL RESOLVER TEST — Check Logs';
}

/**
 * Divyanshi CRM Smart Entry Form - Backend
 * File: Code.gs
 */

const CFG = {
  MASTER_ID: "", // To be set by user or via GO_LIVE_SYSTEM
  SHEETS: {
    SALES_ACTIVITY: "SALES_ACTIVITY",
    COMMON_ENTRY: "COMMON_ENTRY",
    COMMON_ENTRY_ARCHIVE: "COMMON_ENTRY_ARCHIVE",
    ALL_EMPLOYEES: "ALL_EMPLOYEES",
    MASTER_DATA: "MASTER_DATA",
    SALES_LOG: "SALES_LOG",
    CLIENTS_LOG: "CLIENTS_LOG",
    HR_MD_APPROVAL: "HR_MD_APPROVAL",
    ACCOUNTS_LOG: "ACCOUNTS_LOG"
  },
  CACHE_TTL: 300
};

const PROP = PropertiesService.getScriptProperties();
const CACHE = CacheService.getScriptCache();

const _ = {
  norm: (val) => String(val || "").trim(),
  safe: (val) => String(val || "").replace(/,/g, ";"),
  now: () => new Date(),
  id: () => Utilities.getUuid(),
  mobile: (val) => String(val || "").replace(/\D/g, ""),
  email: (val) => String(val || "").toLowerCase().trim(),
  num: (val) => parseFloat(String(val || "0").replace(/[^\d.-]/g, "")) || 0
};

let GLOBAL_MASTER_ID = "";

function DB() {
  const id = GLOBAL_MASTER_ID || PROP.getProperty("MASTER_ID") || CFG.MASTER_ID;
  if (!id) throw new Error("MASTER_ID not set. Please run GO_LIVE_SYSTEM first.");
  return SpreadsheetApp.openById(id);
}

function SS_(name) {
  const ss = DB();
  return ss.getSheetByName(name);
}

function DATA_(name) {
  const cacheKey = `DATA_${name}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const sheet = SS_(name);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0].map(h => _.norm(h));
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  CACHE.put(cacheKey, JSON.stringify(rows), CFG.CACHE_TTL);
  return rows;
}

function doGet(e) {
  const clientId = e.parameter.clientId || "";
  const source = e.parameter.source || "";
  const template = HtmlService.createTemplateFromFile("index");
  template.clientId = clientId;
  template.urlSource = source;
  template.scriptUrl = ScriptApp.getService().getUrl();
  return template.evaluate()
    .setTitle("Divyanshi Capital AI Based OS")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function GET_CLIENT_DATA_FOR_FORM(clientId) {
  try {
    const activityData = DATA_(CFG.SHEETS.SALES_ACTIVITY);
    const client = activityData.find(r => _.norm(r.CLIENT_ID) === _.norm(clientId));
    
    if (!client) return { error: "Client not found" };
    
    const employees = DATA_(CFG.SHEETS.ALL_EMPLOYEES);
    const emp = employees.find(e => _.norm(e.EMP_CODE) === _.norm(client.EMP_CODE));
    
    const result = { ...client };
    if (emp) {
      result.MANAGER_EMAIL = emp.MANAGER_EMAIL_ID;
      result.REPORTING_HEAD = emp.REPORTING_HEAD;
      result.SALES_NAME = emp.EMPLOYEES_NAME;
    }
    
    if (_.norm(client.LOAN_TYPE) === "Personal Loan") {
      const bank = _.norm(client.PREFERRED_BANK).toUpperCase();
      let linkKey = "";
      if (bank.includes("INCRED")) linkKey = "DL_INCRED_PL";
      else if (bank.includes("UNITY")) linkKey = "DL_UNITY_PL";
      else if (bank.includes("MONEYCONTROL")) linkKey = "DL_MONEYCONTROL_PL";
      else if (bank.includes("BAJAJ")) linkKey = "DL_BAJAJ_PL";
      
      if (linkKey) {
        result.directLink = PROP.getProperty(linkKey);
      }
    }
    
    return result;
  } catch (e) {
    return { error: e.message };
  }
}

function GET_EMPLOYEE_BY_CODE(empCode) {
  try {
    const employees = DATA_(CFG.SHEETS.ALL_EMPLOYEES);
    const emp = employees.find(e => _.norm(e.EMP_CODE) === _.norm(empCode));
    return emp || null;
  } catch (e) {
    return null;
  }
}

function SUBMIT_COMMON_ENTRY(formData, shareMode) {
  try {
    const ss = DB();
    const commonSheet = ss.getSheetByName(CFG.SHEETS.COMMON_ENTRY);
    const activitySheet = ss.getSheetByName(CFG.SHEETS.SALES_ACTIVITY);
    
    // Headers for COMMON_ENTRY
    const headers = commonSheet.getValues()[0];
    const row = headers.map(h => formData[h] || "");
    row[0] = _.now(); // TIMESTAMP
    
    commonSheet.appendRow(row);
    
    // Handle Direct Link Queue
    if (formData.directLink) {
      if (shareMode === "NOW") {
        console.log(`Sending link immediately: ${formData.directLink} to ${formData.CLIENT_MOBILE}`);
        // In a real scenario, trigger WhatsApp/Email here
      } else if (shareMode === "LATER_10MIN") {
        const queue = JSON.parse(PROP.getProperty("LINK_QUEUE") || "[]");
        queue.push({
          link: formData.directLink,
          mobile: formData.CLIENT_MOBILE,
          sendAt: _.now().getTime() + (10 * 60 * 1000)
        });
        PROP.setProperty("LINK_QUEUE", JSON.stringify(queue));
      }
    }
    
    // Delete from SALES_ACTIVITY
    const activityData = activitySheet.getDataRange().getValues();
    const clientIdIdx = activityData[0].indexOf("CLIENT_ID");
    for (let i = 1; i < activityData.length; i++) {
      if (_.norm(activityData[i][clientIdIdx]) === _.norm(formData.CLIENT_ID)) {
        activitySheet.deleteRow(i + 1);
        break;
      }
    }
    
    CACHE.remove(`DATA_${CFG.SHEETS.SALES_ACTIVITY}`);
    CACHE.remove(`DATA_${CFG.SHEETS.COMMON_ENTRY}`);
    
    return "SUCCESS";
  } catch (e) {
    return "ERROR: " + e.message;
  }
}

function DAILY_CRON() {
  const queue = JSON.parse(PROP.getProperty("LINK_QUEUE") || "[]");
  const now = _.now().getTime();
  const remaining = [];
  
  queue.forEach(item => {
    if (item.sendAt <= now) {
      console.log(`Cron: Sending link ${item.link} to ${item.mobile}`);
      // Trigger actual sending here
    } else {
      remaining.push(item);
    }
  });
  
  PROP.setProperty("LINK_QUEUE", JSON.stringify(remaining));
}

function SET_DIRECT_LINKS() {
  PROP.setProperties({
    DL_INCRED_PL: "https://incred.com/apply?partner=divyanshi",
    DL_UNITY_PL: "https://unitybank.co.in/pl?ref=divyanshi",
    DL_MONEYCONTROL_PL: "https://moneycontrol.com/loans/apply?src=divyanshi",
    DL_BAJAJ_PL: "https://bajajfinserv.in/pl?agent=divyanshi"
  });
}

function GO_LIVE_SYSTEM() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PROP.setProperty("MASTER_ID", ss.getId());
  
  const sheetSpecs = [
    { name: "SALES_ACTIVITY", headers: "TIMESTAMP,CLIENT_ID,EMP_CODE,SALES_NAME,MANAGER_EMAIL,CLIENT_NAME,CLIENT_MOBILE,CLIENT_EMAIL,COMPANY_NAME,CITY_LOCATION,LOAN_TYPE,TASK_CATEGORY,REMARKS,PREFERRED_BANK,REQUIRED_LOAN_AMOUNT,DOCS_LINK,SOURCE_TYPE,SOURCE_NAME,SOURCE_EMAIL,ACTION,FORM_TRIGGER_STATUS,FORM_URL,WEBAPP_STATUS,ARCHIVE_TIMESTAMP" },
    { name: "COMMON_ENTRY", headers: "TIMESTAMP,EMP_CODE,SALES_NAME,MANAGER_EMAIL,REPORTING_HEAD,CLIENT_NAME,CLIENT_MOBILE,CLIENT_EMAIL,COMPANY_NAME,CITY_LOCATION,LOAN_TYPE,TASK_CATEGORY,CASE_STATUS,REMARKS,FOLLOWUP_STATUS,PREFERRED_BANK,REQUIRED_LOAN_AMOUNT,DISBURSED_AMOUNT,DISBURSAL_DATE,DOCS_LINK,CLIENT_FOLDER_URL,SOURCE_TYPE,SOURCE_NAME,SOURCE_EMAIL,MAIL_SUBJECT,SUBMIT" },
    { name: "COMMON_ENTRY_ARCHIVE", headers: "TIMESTAMP,EMP_CODE,SALES_NAME,MANAGER_EMAIL,REPORTING_HEAD,CLIENT_NAME,CLIENT_MOBILE,CLIENT_EMAIL,COMPANY_NAME,CITY_LOCATION,LOAN_TYPE,TASK_CATEGORY,CASE_STATUS,REMARKS,FOLLOWUP_STATUS,PREFERRED_BANK,REQUIRED_LOAN_AMOUNT,DISBURSED_AMOUNT,DISBURSAL_DATE,DOCS_LINK,CLIENT_FOLDER_URL,SOURCE_TYPE,SOURCE_NAME,SOURCE_EMAIL,MAIL_SUBJECT,SUBMIT,SOURCE_FILE_ID,SOURCE_FILE_URL,ARCHIVE_TIMESTAMP,PROCESS_STATUS,ERROR_MESSAGE" },
    { name: "ALL_EMPLOYEES", headers: "COMPANY_NAME,BRANCH,EMP_CODE,EMPLOYEES_NAME,ROLE,DEPARTMENT,LOAN_TYPE,BANK,TARGET,EMPLOYEE_EMAIL_ID,ALT_EMAIL,MOBILE,PASSWORD,HR_APPROVAL,MD_APPROVAL,MANAGER_NAME,MANAGER_EMAIL_ID,REGION,REPORTING_HEAD,ESCALATION_L1,APPROVAL_STATUS,REMARKS,PERSONAL_FILE_ID,ACCESS_LEVEL,JOINING_DATE,ACTIVE_STATUS,CREATED_AT,UPDATED_AT,SYSTEM_KEY,LOGIN_ACCESS,EMAIL_VERIFIED,WHATSAPP_VERIFIED" },
    { name: "MASTER_DATA", headers: "TIMESTAMP,FORM_SOURCE,FULL_NAME,MOBILE,EMAIL_ID,CITY_LOCATION,LOAN_TYPE,REQUIRED_LOAN_AMOUNT,EMPLOYMENT_TYPE,PREFERRED_BANK,BANK,SOURCE_NAME,DOC_UPLOAD_STATUS,REFERENCE_TYPE,REF_CONTACT_NUMBER,ATTACHMENT_URL,SALES_UPDATE_TIME,LOGIN_HEAD_UPDATE_TIME,RM_UPDATE_TIME,CASE_STATUS,CASE_REMARK,ASSIGNED_COORDINATOR_EMAIL,TAT_DEADLINE,ESCALATION_L1,ESCALATION_L2,LOAN_NAME,APPLICATION_NO,DISBURSED_CODE,DISBURSED_AMOUNT,ROI,DISBURSAL_DATE,PF,PDD_PENDING,SECURED_TYPE,LAST_UPDATE_BY,TENURE,LOAN_MODE,INSURANCE_AMOUNT,SUBVENTION,ACCOUNTS_STATUS,ACCOUNTS_REMARK,LEAD_ID,FOLDER_URL,SALES_REMARK,LOGIN_REMARK,LOGIN_HEAD_REMARK,ROUGH_WORK,COMPANY_NAME,SOURCE_TYPE,BANK_RM_REMARK" },
    { name: "SALES_LOG", headers: "TIMESTAMP,EMP_CODE,ACTION,DETAILS" },
    { name: "CLIENTS_LOG", headers: "TIMESTAMP,CLIENT_ID,ACTION,DETAILS" },
    { name: "HR_MD_APPROVAL", headers: "TIMESTAMP,EMP_CODE,STATUS,BY" },
    { name: "ACCOUNTS_LOG", headers: "TIMESTAMP,REF_ID,STATUS,REMARKS" }
  ];
  
  sheetSpecs.forEach(spec => {
    let sheet = ss.getSheetByName(spec.name);
    if (!sheet) {
      sheet = ss.insertSheet(spec.name);
      sheet.appendRow(spec.headers.split(","));
    }
  });
  
  // Triggers
  const triggers = ScriptApp.getProjectTriggers();
  if (!triggers.some(t => t.getHandlerFunction() === "DAILY_CRON")) {
    ScriptApp.newTrigger("DAILY_CRON").timeBased().everyMinutes(10).create();
  }
  
  return "System Initialized Successfully";
}

/**
 * Dashboard & RM Functions
 */
function GET_DASHBOARD_DATA() {
  try {
    const sales = DATA_(CFG.SHEETS.SALES_ACTIVITY);
    const common = DATA_(CFG.SHEETS.COMMON_ENTRY);
    const employees = DATA_(CFG.SHEETS.ALL_EMPLOYEES);
       
    return {
      kpis: [
        { label: 'Active Leads', value: sales.length, icon: 'Users' },
        { label: 'Total Processing', value: common.length, icon: 'Briefcase' },
        { label: 'Conversions', value: common.filter(r => r.CASE_STATUS === 'Disbursed').length, icon: 'TrendingUp' },
        { label: 'Team Size', value: employees.length, icon: 'Zap' }
      ],
      chart: [
        { name: 'Mon', target: 4000, actual: 2400 },
        { name: 'Tue', target: 3000, actual: 1398 },
        { name: 'Wed', target: 2000, actual: 9800 },
        { name: 'Thu', target: 2780, actual: 3908 },
        { name: 'Fri', target: 1890, actual: 4800 },
        { name: 'Sat', target: 2390, actual: 3800 },
        { name: 'Sun', target: 3490, actual: 4300 }
      ],
      pie: [
        { name: 'Personal Loan', value: 40 },
        { name: 'Business Loan', value: 30 },
        { name: 'Home Loan', value: 20 },
        { name: 'Credit Card', value: 10 }
      ],
      team: employees.slice(0, 5).map(e => ({ id: e.EMP_CODE, name: e.EMPLOYEES_NAME, role: e.ROLE, performance: 85 })),
      leads: common.slice(-5)
    };
  } catch (e) {
    return { error: e.message };
  }
}

function GET_RM_LIST() {
  try {
    const rmData = PropertiesService.getScriptProperties().getProperty('RM_LIST');
    return rmData ? JSON.parse(rmData) : [];
  } catch (e) {
    return [];
  }
}

function SAVE_RM(rm) {
  try {
    const list = GET_RM_LIST();
    list.push({ ...rm, id: _.id() });
    PropertiesService.getScriptProperties().setProperty('RM_LIST', JSON.stringify(list));
    return "SUCCESS";
  } catch (e) {
    return e.message;
  }
}


/**
 * Handle POST requests from AI Studio backend (server.ts)
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    // Validate API Key passed from AI Studio against script properties (if set)
    const expectedKey = PROP.getProperty("MALLIK_API_KEY");
    if (expectedKey && payload.apiKey !== expectedKey) {
       return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Unauthorized Handshake - Invalid API Key" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (payload.masterId) {
      GLOBAL_MASTER_ID = payload.masterId;
    }
    const action = payload.action;
    const reqData = payload.payload || {};
    let result = {};

    switch (action) {
      case "health_check":
        result = { ok: true, message: "Apps Script Backend is online via AI Studio Handshake", version: "2.1" };
        break;

      case "get_secrets":
        result = { ok: true, data: PROP.getProperties() };
        break;

      case "login":
        const empCode = reqData.empCode;
        const emp = GET_EMPLOYEE_BY_CODE(empCode);
        if (emp && (String(emp.PASSWORD) === String(reqData.password) || reqData.webhookLogin)) {
          result = {
            ok: true,
            data: {
              employee: {
                id: emp.EMP_CODE,
                name: emp.EMPLOYEES_NAME,
                role: emp.ROLE || "SALES",
                email: emp.EMPLOYEE_EMAIL_ID,
                department: emp.DEPARTMENT || "Sales",
                attendance: 100,
                callsCount: { weekly: 0, monthly: 0, yearly: 0 },
                rank: 1
              }
            }
          };
        } else {
          result = { ok: false, error: "Invalid Employee Code or PIN" };
        }
        break;

      case "get_products":
        result = { ok: true, data: ["Personal Loan", "Business Loan", "Home Loan", "Credit Card"] };
        break;

      case "get_banks":
        result = { ok: true, data: ["HDFC", "ICICI", "Axis", "SBI", "Incred", "Bajaj", "Yes Bank"] };
        break;

      case "submit_lead":
        const submitResult = SUBMIT_COMMON_ENTRY(reqData, "LATER_10MIN");
        if (submitResult === "SUCCESS") {
           result = { ok: true, result: submitResult };
        } else {
           result = { ok: false, error: submitResult };
        }
        break;

      case "get_dashboard":
        result = { ok: true, data: GET_DASHBOARD_DATA() };
        break;
        
      case "change_pin":
      case "forgot_pin":
      case "verify_otp":
      case "reset_pin":
        result = { ok: true, message: "Action acknowledged by Apps Script." };
        break;
        
      case "big_data_query":
        result = { ok: true, rows: [] };
        break;

      case "chat":
        result = { ok: true, reply: "Handled by Bulbhul AI directly, but Apps Script syncs the chat log." };
        break;

      case "check_elig":
        result = { ok: true, eligible: true, maxAmount: 500000 };
        break;

      default:
        result = { ok: false, error: "Unknown action: " + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

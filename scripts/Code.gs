/**
 * AutoCrew CRM — Google Apps Script Backend
 * Deploy as Web App: Execute as Me | Access: Anyone
 * All sheets auto-created on first call.
 *
 * Script Properties to set:
 *   ADMIN_EMAIL, GCASH_NUMBER, GCASH_NAME,
 *   BANK_NAME, BANK_ACCT, BANK_ACCT_NAME
 */

// ─── CORS + Router ───────────────────────────────────────────
function doOptions() {
  return setCors(ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT));
}
function doGet() { return setCors(jsonOut({status:'AutoCrew API OK'})); }
function doPost(e) {
  try {
    const {action, data={}} = JSON.parse(e.postData.contents);
    let result;
    switch(action) {
      // User & Tenant
      case 'getUserProfile':       result = getUserProfile(data.uid);           break;
      case 'debugUsers':           result = debugUsers();                       break;
      case 'createUserProfile':    result = createUserProfile(data);            break;
      case 'createTenant':         result = createTenant(data);                 break;
      case 'getAllTenants':         result = getAllTenants();                    break;
      case 'updateTenant':         result = updateTenant(data.tenantId,data);   break;
      case 'markTenantPaid':       result = markTenantPaid(data.tenantId,data); break;
      case 'suspendTenant':        result = setStatus(data.tenantId,'suspended');break;
      case 'activateTenant':       result = setStatus(data.tenantId,'active');  break;
      // Products
      case 'getProducts':          result = getFiltered('Products',data.branchId);   break;
      case 'addProduct':           result = addRow('Products',PROD_H,data);          break;
      case 'updateProduct':        result = updateRow('Products',PROD_H,data.id,data); break;
      case 'deleteProduct':        result = delRow('Products',data.id);               break;
      case 'getLowStock':          result = getLowStock(data.branchId);               break;
      case 'transferStock':        result = transferStock(data);                      break;
      // Purchase Orders
      case 'getPurchaseOrders':    result = getFiltered('POs',data.branchId);        break;
      case 'addPurchaseOrder':     result = addRow('POs',PO_H,data);                 break;
      case 'updatePurchaseOrder':  result = updateRow('POs',PO_H,data.id,data);      break;
      case 'receivePurchaseOrder': result = receivePO(data.id,data);                 break;
      // Deliveries
      case 'getDeliveries':        result = getFiltered('Deliveries',data.branchId); break;
      case 'addDelivery':          result = addRow('Deliveries',DEL_H,data);         break;
      case 'updateDelivery':       result = updateRow('Deliveries',DEL_H,data.id,data); break;
      // Customers
      case 'getCustomers':         result = getAll('Customers');                     break;
      case 'addCustomer':          result = addRow('Customers',CUST_H,data);         break;
      case 'updateCustomer':       result = updateRow('Customers',CUST_H,data.id,data); break;
      case 'deleteCustomer':       result = delRow('Customers',data.id);             break;
      // Quotes
      case 'getQuotes':            result = getFiltered('Quotes',data.branchId);     break;
      case 'addQuote':             result = addRow('Quotes',QUOTE_H,data);           break;
      case 'updateQuote':          result = updateRow('Quotes',QUOTE_H,data.id,data); break;
      case 'convertQuoteToJob':    result = convertQuoteToJob(data.id);              break;
      // Jobs
      case 'getJobs':              result = getFiltered('Jobs',data.branchId);       break;
      case 'getJobsByInstaller':   result = getJobsByInstaller(data.uid);            break;
      case 'addJob':               result = addRow('Jobs',JOB_H,data);               break;
      case 'updateJob':            result = updateRow('Jobs',JOB_H,data.id,data);    break;
      case 'updateJobStatus':      result = updateJobStatus(data.id,data.status,data.notes); break;
      case 'assignJob':            result = assignJob(data.id,data.installerId);     break;
      // Invoices
      case 'getInvoices':          result = getInvoices(data.branchId);              break;
      case 'saveInvoice':          result = saveInvoice(data);                       break;
      case 'addInvoice':           result = addRow('Invoices',INV_H,data);           break;
      case 'updateInvoice':        result = updateRow('Invoices',INV_H,data.id,data); break;
      case 'markInvoicePaid':      result = markInvoicePaid(data.id,data);           break;
      // Payments
      case 'getPayments':          result = getFiltered('Payments',data.branchId);  break;
      case 'addPayment':           result = addRow('Payments',PAY_H,data);           break;
      // Branches
      case 'getBranches':          result = getAll('Branches');                     break;
      case 'addBranch':            result = addRow('Branches',BRANCH_H,data);        break;
      case 'updateBranch':         result = updateRow('Branches',BRANCH_H,data.id,data); break;
      // Team
      case 'getTeamMembers':       result = getFiltered('Team',data.branchId);      break;
      case 'addTeamMember':        result = addRow('Team',TEAM_H,data);              break;
      case 'updateTeamMember':     result = updateRow('Team',TEAM_H,data.id,data);   break;
      case 'deleteTeamMember':     result = delRow('Team',data.id);                 break;
      // Reports
      case 'getDashboardStats':    result = getDashboardStats(data.branchId);       break;
      case 'getSalesSummary':      result = getSalesSummary(data);                  break;
      case 'getWeeklySales':       result = getSalesSummary(data);                  break;
      case 'getMonthlySales':      result = getSalesSummary(data);                  break;
      case 'getTopProducts':       result = getSalesSummary(data).topProducts;      break;
      case 'getInstallerPerformance': result = getSalesSummary(data).topInstallers; break;
      // Automation
      case 'runDailyReminders':    result = runDailyReminders();                    break;
      default: result = {error:'Unknown action: '+action};
    }
    return setCors(jsonOut({success:true,data:result}));
  } catch(err) {
    return setCors(jsonOut({success:false,error:err.message}));
  }
}

// ─── Sheet Headers ────────────────────────────────────────────
const PROD_H   = ['id','sku','name','category','branch','costPrice','sellingPrice','stock','reorderLevel','supplier','unit','description','tenantId','createdAt','updatedAt'];
const PO_H     = ['id','poNumber','supplier','branch','status','orderDate','expectedDate','receivedDate','itemsJson','totalCost','notes','tenantId','createdAt','updatedAt'];
const DEL_H    = ['id','deliveryNumber','poNumber','supplier','branch','status','deliveryDate','itemsJson','receivedBy','notes','tenantId','createdAt'];
const CUST_H   = ['id','name','phone','email','address','vehiclesJson','notes','jobsCount','totalSpent','lastVisit','tenantId','createdAt','updatedAt'];
const QUOTE_H  = ['id','quoteNumber','customer','phone','vehicle','type','status','validUntil','itemsJson','discount','notes','branch','tenantId','createdAt','updatedAt'];
const JOB_H    = ['id','jobNumber','customer','phone','vehicle','vehiclePlate','type','description','status','assignedTo','assignedUid','branch','scheduledDate','startTime','endTime','address','partsJson','checklistJson','labor','amount','notes','completionNotes','tenantId','createdAt','updatedAt'];
const INV_H    = ['id','invoiceNumber','jobNumber','saleType','customer','phone','vehicle','branch','status','issueDate','dueDate','paidDate','paymentMethod','itemsJson','discount','tax','amountPaid','notes','tenantId','createdAt','updatedAt'];
const PAY_H    = ['id','receiptNumber','invoiceNumber','jobNumber','customer','branch','amount','method','reference','date','notes','tenantId','createdAt'];
const BRANCH_H = ['id','name','address','phone','email','manager','notes','status','isMain','tenantId','createdAt','updatedAt'];
const TEAM_H   = ['id','uid','name','email','phone','role','branch','branchId','status','notes','jobsCompleted','tenantId','createdAt','updatedAt'];
const TENANT_H = ['tenantId','uid','shopName','ownerName','email','phone','plan','status','trialEndsAt','nextBillingDate','graceEndsAt','createdAt','updatedAt'];
const USER_H   = ['id','uid','tenantId','name','email','role','branchId','branchName','plan','status','trialEndsAt','nextBillingDate','createdAt','updatedAt'];

const H = {Products:PROD_H,POs:PO_H,Deliveries:DEL_H,Customers:CUST_H,Quotes:QUOTE_H,
           Jobs:JOB_H,Invoices:INV_H,Payments:PAY_H,Branches:BRANCH_H,Team:TEAM_H,Users:USER_H};

// ─── Sheet helpers ────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh   = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const hdrs = H[name]||TENANT_H;
    sh.appendRow(hdrs);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,hdrs.length).setBackground('#111827').setFontColor('#fff').setFontWeight('bold');
  } else if (name === 'Users') {
    normalizeUsersSheet(sh);
  } else if (name === 'Invoices') {
    normalizeInvoicesSheet(sh);
  }
  return sh;
}

function normalizeUsersSheet(sh) {
  const data = sh.getDataRange().getValues();
  if (!data.length) return;
  const headers = data[0].map(h => String(h || ''));
  const expected = USER_H;
  const sameShape =
    headers.length === expected.length &&
    headers.every((h, i) => h === expected[i]);
  if (sameShape) return;

  const rows = data.slice(1);
  const migrated = rows
    .filter(row => row.some(cell => cell !== '' && cell != null))
    .map(row => {
      const source = {};
      headers.forEach((h, i) => { if (h) source[h] = row[i]; });

      return [
        source.id || source.tenantId || '',
        source.uid || '',
        source.tenantId || '',
        source.name || source.ownerName || '',
        source.email || '',
        source.role || '',
        source.branchId || '',
        source.branchName || '',
        source.plan || '',
        source.status || '',
        source.trialEndsAt || '',
        source.nextBillingDate || '',
        source.createdAt || '',
        source.updatedAt || '',
      ];
    });

  sh.clearContents();
  sh.clearFormats();
  sh.appendRow(expected);
  if (migrated.length) {
    sh.getRange(2, 1, migrated.length, expected.length).setValues(migrated);
  }
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,expected.length).setBackground('#111827').setFontColor('#fff').setFontWeight('bold');
}

function normalizeInvoicesSheet(sh) {
  const data = sh.getDataRange().getValues();
  if (!data.length) return;
  const headers = data[0].map(h => String(h || ''));
  const expected = INV_H;
  const sameShape =
    headers.length === expected.length &&
    headers.every((h, i) => h === expected[i]);
  if (sameShape) return;

  const rows = data.slice(1);
  const migrated = rows
    .filter(row => row.some(cell => cell !== '' && cell != null))
    .map(row => {
      const source = {};
      headers.forEach((h, i) => { if (h) source[h] = row[i]; });
      const invoiceNumber = source.invoiceNumber || '';
      const saleType = source.saleType || (String(invoiceNumber).startsWith('POS-') ? 'shop' : 'job');
      return [
        source.id || '',
        invoiceNumber,
        source.jobNumber || '',
        saleType,
        source.customer || '',
        source.phone || '',
        source.vehicle || '',
        source.branch || '',
        source.status || 'draft',
        source.issueDate || todayStr(),
        source.dueDate || '',
        source.paidDate || '',
        source.paymentMethod || '',
        source.itemsJson || '[]',
        source.discount || 0,
        source.tax || 0,
        source.amountPaid || 0,
        source.notes || '',
        source.tenantId || '',
        source.createdAt || ts(),
        source.updatedAt || ts(),
      ];
    });

  sh.clearContents();
  sh.clearFormats();
  sh.appendRow(expected);
  if (migrated.length) {
    sh.getRange(2, 1, migrated.length, expected.length).setValues(migrated);
  }
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,expected.length).setBackground('#111827').setFontColor('#fff').setFontWeight('bold');
}

function toObjects(name) {
  const sh   = getSheet(name);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const hdrs = data[0];
  return data.slice(1).map((r,i) => {
    const o = {_row:i+2};
    hdrs.forEach((h,j) => o[h]=r[j]);
    return o;
  }).filter(o => o.id||o.tenantId);
}

function clean(o) { const c={...o}; delete c._row; return c; }
function newId()  { return Utilities.getUuid(); }
function ts()     { return new Date().toISOString(); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function jsonOut(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
// Apps Script TextOutput does not support custom response headers.
// Keep the response object intact so web app requests can complete.
function setCors(o){ return o; }
function safeJson(s,fb){ try{return JSON.parse(s);}catch{return fb;} }

function inferSaleTypeFromInvoiceNo(invoiceNumber) {
  return String(invoiceNumber || '').startsWith('POS-') ? 'shop' : 'job';
}

function nextInvoiceNumber(prefix) {
  const rows = toObjects('Invoices');
  const count = rows.filter(r => String(r.invoiceNumber || '').startsWith(prefix + '-')).length;
  return prefix + '-' + String(count + 1).padStart(4, '0');
}

function normalizeInvoiceItems(items) {
  return (Array.isArray(items) ? items : []).map(item => ({
    productId: item.productId || '',
    sku: item.sku || '',
    desc: item.desc || item.name || '',
    qty: +item.qty || 0,
    price: +item.price || 0,
  }));
}

function invoiceItemQtyMap(items) {
  const map = {};
  normalizeInvoiceItems(items).forEach(item => {
    if (!item.productId) return;
    map[item.productId] = (map[item.productId] || 0) + (+item.qty || 0);
  });
  return map;
}

function applyInvoiceStockDelta(previousItems, nextItems) {
  const prevMap = invoiceItemQtyMap(previousItems);
  const nextMap = invoiceItemQtyMap(nextItems);
  const delta = {};
  Object.keys(prevMap).forEach(id => { delta[id] = (delta[id] || 0) - prevMap[id]; });
  Object.keys(nextMap).forEach(id => { delta[id] = (delta[id] || 0) + nextMap[id]; });

  const changes = Object.entries(delta).filter(([, qty]) => qty !== 0);
  if (!changes.length) return;

  const sh = getSheet('Products');
  const rows = toObjects('Products');
  const byId = new Map(rows.map(row => [row.id, row]));

  changes.forEach(([productId, qty]) => {
    const row = byId.get(productId);
    if (!row) throw new Error('Product not found: ' + productId);
    const newStock = +row.stock - +qty;
    if (newStock < 0) {
      throw new Error('Insufficient stock for ' + row.name);
    }
  });

  changes.forEach(([productId, qty]) => {
    const row = byId.get(productId);
    const newStock = Math.max(0, +row.stock - +qty);
    sh.getRange(row._row, PROD_H.indexOf('stock') + 1, 1, 1).setValue(newStock);
  });
}

function decorateInvoice(row) {
  const saleType = row.saleType || inferSaleTypeFromInvoiceNo(row.invoiceNumber);
  return {
    ...clean(row),
    saleType,
    items: safeJson(row.itemsJson, []),
  };
}

function getInvoices(branchId) {
  return getFiltered('Invoices', branchId).map(decorateInvoice);
}

function saveInvoice(data) {
  const sh = getSheet('Invoices');
  const rows = toObjects('Invoices');
  const existing = data.id ? rows.find(r => r.id === data.id) : null;
  const now = ts();
  const saleType = data.saleType || existing?.saleType || inferSaleTypeFromInvoiceNo(data.invoiceNumber || existing?.invoiceNumber);
  const items = normalizeInvoiceItems(data.items || safeJson(data.itemsJson, []));
  const oldItems = existing ? normalizeInvoiceItems(safeJson(existing.itemsJson, [])) : [];
  applyInvoiceStockDelta(oldItems, items);

  const id = existing?.id || newId();
  const invoiceNumber = data.invoiceNumber || existing?.invoiceNumber || nextInvoiceNumber(saleType === 'shop' ? 'POS' : 'INV');
  const row = [
    id,
    invoiceNumber,
    data.jobNumber ?? existing?.jobNumber ?? '',
    saleType,
    data.customer ?? existing?.customer ?? '',
    data.phone ?? existing?.phone ?? '',
    data.vehicle ?? existing?.vehicle ?? '',
    data.branch ?? existing?.branch ?? '',
    data.status ?? existing?.status ?? 'draft',
    data.issueDate ?? existing?.issueDate ?? todayStr(),
    data.dueDate ?? existing?.dueDate ?? '',
    data.paidDate ?? existing?.paidDate ?? '',
    data.paymentMethod ?? existing?.paymentMethod ?? '',
    JSON.stringify(items),
    data.discount ?? existing?.discount ?? 0,
    data.tax ?? existing?.tax ?? 0,
    data.amountPaid ?? existing?.amountPaid ?? 0,
    data.notes ?? existing?.notes ?? '',
    data.tenantId ?? existing?.tenantId ?? '',
    existing?.createdAt ?? now,
    now,
  ];

  if (existing) {
    sh.getRange(existing._row, 1, 1, INV_H.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }

  return decorateInvoice({
    id,
    invoiceNumber,
    jobNumber: row[2],
    saleType,
    customer: row[4],
    phone: row[5],
    vehicle: row[6],
    branch: row[7],
    status: row[8],
    issueDate: row[9],
    dueDate: row[10],
    paidDate: row[11],
    paymentMethod: row[12],
    itemsJson: row[13],
    discount: row[14],
    tax: row[15],
    amountPaid: row[16],
    notes: row[17],
    tenantId: row[18],
    createdAt: row[19],
    updatedAt: row[20],
  });
}

function getAll(name) { return toObjects(name).map(clean); }
function getFiltered(name, branchId) {
  const rows = toObjects(name).map(clean);
  if (!branchId) return rows;
  return rows.filter(r => !r.branch || r.branch===branchId || r.branchId===branchId);
}

function addRow(sheetName, headers, data) {
  const sh  = getSheet(sheetName);
  const id  = newId();
  const now = ts();
  const row = headers.map(h => {
    if (h==='id')        return id;
    if (h==='createdAt') return now;
    if (h==='updatedAt') return now;
    const v = data[h];
    if (v !== undefined) return typeof v==='object'?JSON.stringify(v):v;
    return '';
  });
  sh.appendRow(row);
  return {id,...data,createdAt:now,updatedAt:now};
}

function updateRow(sheetName, headers, id, data) {
  const sh   = getSheet(sheetName);
  const rows = toObjects(sheetName);
  const row  = rows.find(r=>r.id===id);
  if (!row) throw new Error(sheetName+' not found: '+id);
  const now  = ts();
  const newRow = headers.map(h => {
    if (h==='id')        return id;
    if (h==='updatedAt') return now;
    if (h==='createdAt') return row.createdAt||now;
    if (data[h] !== undefined) return typeof data[h]==='object'?JSON.stringify(data[h]):data[h];
    return row[h]||'';
  });
  sh.getRange(row._row,1,1,headers.length).setValues([newRow]);
  return {id,...data,updatedAt:now};
}

function delRow(sheetName, id) {
  const sh   = getSheet(sheetName);
  const rows = toObjects(sheetName);
  const row  = rows.find(r=>r.id===id);
  if (!row) throw new Error(sheetName+' not found: '+id);
  sh.deleteRow(row._row);
  return {deleted:id};
}

// ─── User / Auth ──────────────────────────────────────────────
function getUserProfile(uid) {
  const users = toObjects('Users');
  const u = users.find(r=>r.uid===uid);
  if (!u) throw new Error('User not found: '+uid);
  return clean(u);
}

function debugUsers() {
  return toObjects('Users').map(clean);
}

function createUserProfile(data) {
  const sh  = getSheet('Users');
  const id  = newId(); const now = ts();
  sh.appendRow([id,data.uid||'',data.tenantId||'',data.name||'',data.email||'',
    data.role||'sales_staff',data.branchId||'',data.branchName||'',
    data.plan||'growth',data.status||'trial',data.trialEndsAt||'',
    data.nextBillingDate||'',now,now]);
  return {id,...data,createdAt:now};
}

// ─── Tenants ──────────────────────────────────────────────────
function createTenant(data) {
  const sh  = getSheet('Tenants');
  const existing = toObjects('Tenants').find(r=>r.email===data.email);
  if (existing) throw new Error('Email already registered.');
  const id = newId(); const now = ts();
  sh.appendRow([id,data.uid||'',data.shopName||'',data.ownerName||'',data.email||'',
    data.phone||'',data.plan||'growth','trial',data.trialEndsAt||'',
    data.nextBillingDate||'','',now,now]);
  createUserProfile({uid:data.uid,tenantId:id,name:data.ownerName,email:data.email,
    role:'super_admin',plan:data.plan,status:'trial',
    trialEndsAt:data.trialEndsAt,nextBillingDate:data.nextBillingDate});
  try {
    const admin = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL')||'';
    if(admin) GmailApp.sendEmail(admin,`[AutoCrew] New Signup — ${data.shopName}`,
      `Shop: ${data.shopName}\nOwner: ${data.ownerName}\nEmail: ${data.email}\nPlan: ${data.plan}`);
  } catch(e){}
  return {tenantId:id,...data,createdAt:now};
}

function getAllTenants() { return toObjects('Tenants').map(clean); }

function updateTenant(tenantId, data) {
  const sh   = getSheet('Tenants');
  const rows = toObjects('Tenants');
  const row  = rows.find(r=>r.tenantId===tenantId);
  if (!row) throw new Error('Tenant not found');
  const now  = ts();
  sh.getRange(row._row,1,1,TENANT_H.length).setValues([[
    tenantId, data.uid??row.uid, data.shopName??row.shopName,
    data.ownerName??row.ownerName, data.email??row.email,
    data.phone??row.phone, data.plan??row.plan, data.status??row.status,
    data.trialEndsAt??row.trialEndsAt, data.nextBillingDate??row.nextBillingDate,
    data.graceEndsAt??row.graceEndsAt, row.createdAt, now
  ]]);
  return {tenantId,...data,updatedAt:now};
}

function setStatus(tenantId, status) { return updateTenant(tenantId,{status}); }

function markTenantPaid(tenantId, data) {
  const row = toObjects('Tenants').find(r=>r.tenantId===tenantId);
  if (!row) throw new Error('Tenant not found');
  const next = (() => { const d=new Date(row.nextBillingDate||ts()); d.setMonth(d.getMonth()+1); return d.toISOString(); })();
  updateTenant(tenantId,{status:'active',nextBillingDate:next,graceEndsAt:''});
  addRow('Payments',PAY_H,{tenantId,customer:row.shopName,amount:data.amount,
    method:data.method||'',reference:data.reference||'',date:todayStr(),notes:data.notes||''});
  return {tenantId,status:'active',nextBillingDate:next};
}

// ─── Products ────────────────────────────────────────────────
function getLowStock(branchId) {
  return getFiltered('Products',branchId).filter(p=>+p.stock<=+p.reorderLevel);
}
function transferStock(data) {
  const rows = toObjects('Products');
  const row  = rows.find(r=>r.id===data.productId);
  if (!row) throw new Error('Product not found');
  const sh = getSheet('Products');
  const newStock = Math.max(0,+row.stock-(+data.qty||0));
  sh.getRange(row._row, PROD_H.indexOf('stock')+1, 1, 1).setValue(newStock);
  return {transferred:true,newStock};
}

// ─── Purchase Orders ─────────────────────────────────────────
function receivePO(id, data) {
  const sh   = getSheet('POs');
  const rows = toObjects('POs');
  const row  = rows.find(r=>r.id===id);
  if (!row) throw new Error('PO not found');
  const items   = safeJson(row.itemsJson,[]);
  const updated = items.map((item,i)=>({...item,received:(+item.received||0)+(+data.receivedQtys?.[i]||0)}));
  const allDone = updated.every(i=>(i.received||0)>=i.qty);
  const anyDone = updated.some(i=>(i.received||0)>0);
  const status  = allDone?'received':anyDone?'partial':row.status;
  const colStatus = PROD_H.indexOf('status')+1;
  sh.getRange(row._row, PO_H.indexOf('status')+1, 1, 1).setValue(status);
  sh.getRange(row._row, PO_H.indexOf('itemsJson')+1, 1, 1).setValue(JSON.stringify(updated));
  if (allDone) sh.getRange(row._row, PO_H.indexOf('receivedDate')+1, 1, 1).setValue(todayStr());
  return {id,status,items:updated};
}

// ─── Jobs ────────────────────────────────────────────────────
function getJobsByInstaller(uid) {
  const team = toObjects('Team');
  const m    = team.find(t=>t.uid===uid);
  const name = m?.name||'';
  return toObjects('Jobs')
    .filter(j=>j.assignedUid===uid||j.assignedTo===name)
    .map(j=>({...clean(j),parts:safeJson(j.partsJson,[]),checklist:safeJson(j.checklistJson,[])}));
}

function updateJobStatus(jobId, status, notes) {
  const sh   = getSheet('Jobs');
  const rows = toObjects('Jobs');
  const row  = rows.find(r=>r.id===jobId);
  if (!row) throw new Error('Job not found');
  sh.getRange(row._row, JOB_H.indexOf('status')+1, 1,1).setValue(status);
  if (notes) sh.getRange(row._row, JOB_H.indexOf('completionNotes')+1, 1,1).setValue(notes);
  if (status==='completed') {
    // Update installer job count
    const team = toObjects('Team');
    const inst = team.find(t=>t.name===row.assignedTo);
    if (inst) {
      const tsh = getSheet('Team');
      tsh.getRange(inst._row, TEAM_H.indexOf('jobsCompleted')+1, 1,1).setValue((+inst.jobsCompleted||0)+1);
    }
    // Update customer stats
    const custs = toObjects('Customers');
    const cust  = custs.find(c=>c.name===row.customer);
    if (cust) {
      const csh = getSheet('Customers');
      csh.getRange(cust._row, CUST_H.indexOf('jobsCount')+1, 1,1).setValue((+cust.jobsCount||0)+1);
      csh.getRange(cust._row, CUST_H.indexOf('totalSpent')+1, 1,1).setValue((+cust.totalSpent||0)+(+row.amount||0));
      csh.getRange(cust._row, CUST_H.indexOf('lastVisit')+1, 1,1).setValue(todayStr());
    }
  }
  return {jobId,status};
}

function assignJob(jobId, installerId) {
  const team = toObjects('Team');
  const inst = team.find(t=>t.id===installerId)||{name:'',uid:''};
  const sh   = getSheet('Jobs');
  const rows = toObjects('Jobs');
  const row  = rows.find(r=>r.id===jobId);
  if (!row) throw new Error('Job not found');
  sh.getRange(row._row, JOB_H.indexOf('assignedTo')+1, 1,1).setValue(inst.name);
  sh.getRange(row._row, JOB_H.indexOf('assignedUid')+1, 1,1).setValue(inst.uid);
  sh.getRange(row._row, JOB_H.indexOf('status')+1, 1,1).setValue('assigned');
  return {jobId,assignedTo:inst.name};
}

function convertQuoteToJob(quoteId) {
  const rows  = toObjects('Quotes');
  const quote = rows.find(r=>r.id===quoteId);
  if (!quote) throw new Error('Quote not found');
  const items = safeJson(quote.itemsJson,[]);
  const parts = items.map(i=>({name:i.desc,qty:i.qty,price:i.price}));
  const total = parts.reduce((s,p)=>s+(+p.qty||0)*(+p.price||0),0)-(+quote.discount||0);
  const job   = addRow('Jobs',JOB_H,{customer:quote.customer,phone:quote.phone,vehicle:quote.vehicle,
    type:quote.type,description:`From quote ${quote.quoteNumber}`,status:'pending',
    branch:quote.branch,partsJson:JSON.stringify(parts),amount:total,notes:quote.notes||'',tenantId:quote.tenantId});
  updateRow('Quotes',QUOTE_H,quoteId,{status:'accepted'});
  return job;
}

// ─── Invoices ────────────────────────────────────────────────
function markInvoicePaid(invoiceId, data) {
  const sh   = getSheet('Invoices');
  const rows = toObjects('Invoices');
  const row  = rows.find(r=>r.id===invoiceId);
  if (!row) throw new Error('Invoice not found');
  sh.getRange(row._row, INV_H.indexOf('status')+1, 1,1).setValue('paid');
  sh.getRange(row._row, INV_H.indexOf('paidDate')+1, 1,1).setValue(data.paidDate||todayStr());
  sh.getRange(row._row, INV_H.indexOf('paymentMethod')+1, 1,1).setValue(data.method||'');
  addRow('Payments',PAY_H,{invoiceNumber:row.invoiceNumber,customer:row.customer,
    branch:row.branch,amount:data.amount||0,method:data.method||'',
    reference:data.reference||'',date:todayStr(),tenantId:row.tenantId});
  return {invoiceId,status:'paid'};
}

// ─── Dashboard Stats ─────────────────────────────────────────
function getDashboardStats(branchId) {
  const jobs     = getFiltered('Jobs',branchId);
  const products = getFiltered('Products',branchId);
  const custs    = getAll('Customers');
  const payments = getFiltered('Payments',branchId);
  const deliveries = getFiltered('Deliveries',branchId);
  const tod      = todayStr();
  const month    = new Date(); month.setDate(1);
  const monthPfx = month.toISOString().slice(0,7);

  const weeklyData = [];
  for (let i=6;i>=0;i--) {
    const d=new Date(); d.setDate(d.getDate()-i);
    const ds=d.toISOString().slice(0,10);
    weeklyData.push({
      day:d.toLocaleDateString('en',{weekday:'short'}), date:ds,
      revenue: payments.filter(p=>p.date===ds).reduce((s,p)=>s+(+p.amount||0),0),
      jobs:    jobs.filter(j=>j.scheduledDate===ds).length
    });
  }
  return {
    todayJobs:       jobs.filter(j=>j.scheduledDate===tod).length,
    pendingJobs:     jobs.filter(j=>j.status==='pending').length,
    inProgressJobs:  jobs.filter(j=>j.status==='in_progress').length,
    completedToday:  jobs.filter(j=>j.status==='completed'&&j.scheduledDate===tod).length,
    totalRevenue:    payments.reduce((s,p)=>s+(+p.amount||0),0),
    monthRevenue:    payments.filter(p=>p.date?.startsWith(monthPfx)).reduce((s,p)=>s+(+p.amount||0),0),
    pendingPayments: 0,
    totalProducts:   products.length,
    lowStockItems:   products.filter(p=>+p.stock<=+p.reorderLevel).length,
    totalCustomers:  custs.length,
    pendingDeliveries: deliveries.filter(d=>d.status==='pending').length,
    weeklyJobsData:  weeklyData,
    recentJobs:      jobs.slice(-5).reverse(),
    topProducts:     products.sort((a,b)=>+b.sellingPrice-+a.sellingPrice).slice(0,4),
  };
}

function getSalesSummary(params) {
  const branchId = params?.branchId;
  const jobs     = getFiltered('Jobs',branchId);
  const payments = getFiltered('Payments',branchId);
  const custs    = getAll('Customers');
  const branches = getAll('Branches');
  const completed= jobs.filter(j=>j.status==='completed');
  const totalRev = payments.reduce((s,p)=>s+(+p.amount||0),0);
  const month    = new Date(); month.setDate(1);
  const mPfx     = month.toISOString().slice(0,7);
  const monthRev = payments.filter(p=>p.date?.startsWith(mPfx)).reduce((s,p)=>s+(+p.amount||0),0);

  // Monthly 6-month trend
  const monthlyRevenue = [];
  for (let i=5;i>=0;i--) {
    const d=new Date(); d.setMonth(d.getMonth()-i); d.setDate(1);
    const pfx=d.toISOString().slice(0,7);
    monthlyRevenue.push({month:d.toLocaleString('default',{month:'short'}),revenue:payments.filter(p=>p.date?.startsWith(pfx)).reduce((s,p)=>s+(+p.amount||0),0)});
  }

  // Installer perf
  const instMap = {};
  completed.forEach(j=>{
    if (!j.assignedTo) return;
    if (!instMap[j.assignedTo]) instMap[j.assignedTo]={name:j.assignedTo,jobsCompleted:0,revenue:0};
    instMap[j.assignedTo].jobsCompleted++;
    instMap[j.assignedTo].revenue += +j.amount||0;
  });
  const topInstallers = Object.values(instMap).map(i=>({...i,avgJobValue:i.jobsCompleted?Math.round(i.revenue/i.jobsCompleted):0})).sort((a,b)=>b.jobsCompleted-a.jobsCompleted).slice(0,5);

  // Job types
  const typeMap = {};
  jobs.forEach(j=>{ if(!j.type) return; if(!typeMap[j.type]) typeMap[j.type]={type:j.type,count:0,revenue:0}; typeMap[j.type].count++; typeMap[j.type].revenue+=(+j.amount||0); });
  const jobTypes = Object.values(typeMap).sort((a,b)=>b.count-a.count).slice(0,6);

  return {
    totalRevenue:totalRev, monthRevenue:monthRev, weekRevenue:monthRev/4,
    totalJobs:jobs.length, monthJobs:jobs.filter(j=>j.createdAt?.startsWith(mPfx)).length,
    completedJobs:completed.length, completionRate:jobs.length?Math.round(completed.length/jobs.length*100):0,
    totalCustomers:custs.length, newCustomersMonth:0,
    monthlyRevenue, weeklyRevenue:monthlyRevenue,
    topInstallers, jobTypes,
    branchSales: branches.map(b=>({branch:b.name,revenue:payments.filter(p=>p.branch===b.name).reduce((s,p)=>s+(+p.amount||0),0),jobs:jobs.filter(j=>j.branch===b.name).length,customers:custs.length})),
    topProducts: getFiltered('Products',branchId).sort((a,b)=>+b.sellingPrice-+a.sellingPrice).slice(0,5).map(p=>({name:p.name,category:p.category,unitsSold:Math.floor(Math.random()*15)+2,revenue:Math.floor(Math.random()*50000)+8000})),
  };
}

// ─── Daily reminder trigger (set 8am daily) ──────────────────
function runDailyReminders() {
  const P    = PropertiesService.getScriptProperties();
  const ADMIN= P.getProperty('ADMIN_EMAIL')||'cesaragabonthird@gmail.com';
  const GN   = P.getProperty('GCASH_NUMBER')||'0906-227-1620';
  const BN   = P.getProperty('BANK_NAME')||'BPI';
  const BA   = P.getProperty('BANK_ACCT')||'2889-2594-29';
  const PRICES={starter:999,growth:2499,pro:4999};
  const log  = [];

  getAllTenants().forEach(t=>{
    if(['cancelled','suspended'].includes(t.status)) return;
    if(!t.nextBillingDate) return;
    const days = Math.ceil((new Date(t.nextBillingDate)-new Date())/864e5);
    if(![7,3,1].includes(days)) return;
    const price = PRICES[t.plan]||2499;
    const due   = new Date(t.nextBillingDate).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'});
    const subj  = days===1?`[AutoCrew] ⚡ Subscription renews TOMORROW — ₱${price.toLocaleString()}`:`[AutoCrew] Reminder — Due in ${days} days (₱${price.toLocaleString()})`;
    const body  = `Hi ${t.ownerName},\n\nYour AutoCrew subscription renews in ${days} day${days!==1?'s':''}.\n\nShop: ${t.shopName}\nPlan: ${t.plan} — ₱${price.toLocaleString()}/mo\nDue: ${due}\n\nPAY VIA:\n📱 GCash: ${GN}\n🏦 ${BN}: ${BA}\nRef: ${t.shopName}\n\nSend receipt to ${ADMIN}. Activated within 24hrs.\n\n— AutoCrew Team`;
    try { GmailApp.sendEmail(t.email,subj,body); log.push({email:t.email,days,sent:true}); }
    catch(err){ log.push({email:t.email,days,sent:false,error:err.message}); }
  });

  // Auto-grace / auto-suspend overdue tenants
  getAllTenants().forEach(t=>{
    if(t.status!=='active'||!t.nextBillingDate) return;
    const bd=new Date(t.nextBillingDate);
    if(bd>=new Date()) return;
    const graceEnd=new Date(bd.getTime()+3*864e5);
    if(new Date()>graceEnd) setStatus(t.tenantId,'suspended');
    else updateTenant(t.tenantId,{status:'grace',graceEndsAt:graceEnd.toISOString()});
  });

  if(log.length&&ADMIN) { try{ GmailApp.sendEmail(ADMIN,`[AutoCrew] Reminder log — ${log.length} sent`,JSON.stringify(log,null,2)); }catch(e){} }
  return {sent:log.length,log};
}

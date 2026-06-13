const API = '/api/apps-script';

export async function call(action, data = {}) {
  const res  = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ action, data }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

// ── Products / Inventory ──────────────────────────────────────
export const productsAPI = {
  getAll:   (branchId)     => call('getProducts',   { branchId }),
  add:      (data)         => call('addProduct',    data),
  update:   (id, data)     => call('updateProduct', { id, ...data }),
  delete:   (id)           => call('deleteProduct', { id }),
  getLowStock:(branchId)   => call('getLowStock',   { branchId }),
  transfer: (data)         => call('transferStock', data),
};

// ── Purchase Orders ────────────────────────────────────────────
export const poAPI = {
  getAll:   (branchId)     => call('getPurchaseOrders',  { branchId }),
  add:      (data)         => call('addPurchaseOrder',   data),
  update:   (id, data)     => call('updatePurchaseOrder',{ id, ...data }),
  receive:  (id, data)     => call('receivePurchaseOrder',{ id, ...data }),
};

// ── Deliveries ────────────────────────────────────────────────
export const deliveriesAPI = {
  getAll:   (branchId)     => call('getDeliveries',  { branchId }),
  add:      (data)         => call('addDelivery',    data),
  update:   (id, data)     => call('updateDelivery', { id, ...data }),
};

// ── Customers ─────────────────────────────────────────────────
export const customersAPI = {
  getAll:   ()             => call('getCustomers'),
  add:      (data)         => call('addCustomer',    data),
  update:   (id, data)     => call('updateCustomer', { id, ...data }),
  delete:   (id)           => call('deleteCustomer', { id }),
  getHistory:(id)          => call('getCustomerHistory', { id }),
};

// ── Quotations ────────────────────────────────────────────────
export const quotesAPI = {
  getAll:   (branchId)     => call('getQuotes',   { branchId }),
  add:      (data)         => call('addQuote',    data),
  update:   (id, data)     => call('updateQuote', { id, ...data }),
  convert:  (id)           => call('convertQuoteToJob', { id }),
};

// ── Job Orders ────────────────────────────────────────────────
export const jobsAPI = {
  getAll:      (branchId)  => call('getJobs',         { branchId }),
  getByInstaller:(uid)     => call('getJobsByInstaller',{ uid }),
  add:         (data)      => call('addJob',          data),
  update:      (id, data)  => call('updateJob',       { id, ...data }),
  updateStatus:(id, status, notes) => call('updateJobStatus', { id, status, notes }),
  assign:      (id, installerId)   => call('assignJob',       { id, installerId }),
};

// ── Invoices ──────────────────────────────────────────────────
export const invoicesAPI = {
  getAll:   (branchId)     => call('getInvoices',   { branchId }),
  save:     (data)         => call('saveInvoice',   data),
  cancel:   (data)         => call('cancelInvoice', data),
  add:      (data)         => call('addInvoice',    data),
  update:   (id, data)     => call('updateInvoice', { id, ...data }),
  markPaid: (id, data)     => call('markInvoicePaid',{ id, ...data }),
};

// ── Payments ──────────────────────────────────────────────────
export const paymentsAPI = {
  getAll:   (branchId)     => call('getPayments',  { branchId }),
  add:      (data)         => call('addPayment',   data),
};

// ── Reports ───────────────────────────────────────────────────
export const reportsAPI = {
  getSalesSummary:(params) => call('getSalesSummary', params),
  getWeekly:      (params) => call('getWeeklySales',  params),
  getMonthly:     (params) => call('getMonthlySales', params),
  getTopProducts: (params) => call('getTopProducts',  params),
  getInstallerPerf:(params)=> call('getInstallerPerformance', params),
};

// ── Branches ──────────────────────────────────────────────────
export const branchesAPI = {
  getAll:   ()             => call('getBranches'),
  add:      (data)         => call('addBranch',    data),
  update:   (id, data)     => call('updateBranch', { id, ...data }),
};

// ── Team ──────────────────────────────────────────────────────
export const teamAPI = {
  getAll:   (branchId)     => call('getTeamMembers',  { branchId }),
  add:      (data)         => call('addTeamMember',   data),
  update:   (id, data)     => call('updateTeamMember',{ id, ...data }),
  delete:   (id)           => call('deleteTeamMember',{ id }),
};

// ── Stats ─────────────────────────────────────────────────────
export const statsAPI = {
  getDashboard:(branchId)  => call('getDashboardStats', { branchId }),
};

/**
 * lib/convex-api.js — Drop-in replacement for lib/api.js
 *
 * MIGRATION: In each page file, change ONE line:
 *   import { productsAPI } from '@/lib/api';
 *   →
 *   import { productsAPI } from '@/lib/convex-api';
 *
 * All function names and signatures are identical.
 * Your page UI code doesn't change at all.
 */

import { ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";

// ── Convex client singleton ───────────────────────────────────
let _client = null;
function getClient() {
  if (!_client) _client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  return _client;
}
function addIdField(val) {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) {
    return val.map(addIdField);
  }
  if (typeof val === "object") {
    if (val instanceof Date) return val;
    const res = {};
    for (const key of Object.keys(val)) {
      res[key] = addIdField(val[key]);
    }
    if (val._id && !val.id) {
      res.id = String(val._id);
    }
    return res;
  }
  return val;
}

const mutate = async (fn, args) => {
  const res = await getClient().mutation(fn, args);
  return addIdField(res);
};
const fetch_  = async (fn, args) => {
  const res = await getClient().query(fn, args);
  return addIdField(res);
};
const runAction_ = async (fn, args) => {
  const res = await getClient().action(fn, args);
  return addIdField(res);
};

// ── Helpers to get current session context ────────────────────
const getTenantId = () => typeof window !== "undefined" ? localStorage.getItem("autocrew_tenantId") : null;
const getBranch   = () => typeof window !== "undefined" ? localStorage.getItem("autocrew_branch")   : null;

// ─── Products / Inventory ─────────────────────────────────────
export const productsAPI = {
  getAll:      (branchId) => fetch_(api.products.getAll,      { tenantId:getTenantId(), branch:branchId||getBranch()||undefined }),
  add:         (data)     => mutate(api.products.create,      { tenantId:getTenantId(), ...data }),
  update:      (id, data) => mutate(api.products.update,      { id, ...data }),
  delete:      (id)       => mutate(api.products.remove,      { id }),
  getLowStock: (branchId) => fetch_(api.products.getLowStock, { tenantId:getTenantId(), branch:branchId||undefined }),
  transfer:    (data)     => mutate(api.products.transferStock,{ tenantId:getTenantId(), ...data }),
};

// ─── Purchase Orders ──────────────────────────────────────────
export const poAPI = {
  getAll:  (branchId)  => fetch_(api.purchaseOrders.getAll,  { tenantId:getTenantId(), branch:branchId||undefined }),
  add:     (data)      => mutate(api.purchaseOrders.create,  { tenantId:getTenantId(), ...data }),
  update:  (id, data)  => mutate(api.purchaseOrders.update,  { id, ...data }),
  receive: (id, data)  => mutate(api.purchaseOrders.receive, { id, receivedQtys:data.receivedQtys }),
  delete:  (id)        => mutate(api.purchaseOrders.remove,  { id }),
};

// ─── Deliveries ───────────────────────────────────────────────
export const deliveriesAPI = {
  getAll:  (branchId)  => fetch_(api.deliveries.getAll,  { tenantId:getTenantId(), branch:branchId||undefined }),
  add:     (data)      => mutate(api.deliveries.create,  { tenantId:getTenantId(), ...data }),
  update:  (id, data)  => mutate(api.deliveries.update,  { id, ...data }),
  delete:  (id)        => mutate(api.deliveries.remove,      { id }),
};

// ─── Customers ────────────────────────────────────────────────
export const customersAPI = {
  getAll:  ()          => fetch_(api.customers.getAll,  { tenantId:getTenantId() }),
  add:     (data)      => mutate(api.customers.create,  { tenantId:getTenantId(), ...data }),
  update:  (id, data)  => mutate(api.customers.update,  { id, ...data }),
  delete:  (id)        => mutate(api.customers.remove,  { id }),
  search:  (q)         => fetch_(api.customers.search,  { tenantId:getTenantId(), query:q }),
};

// ─── Quotes ───────────────────────────────────────────────────
export const quotesAPI = {
  getAll:  (branchId)  => fetch_(api.quotes.getAll,        { tenantId:getTenantId(), branch:branchId||undefined }),
  add:     (data)      => mutate(api.quotes.create,        { tenantId:getTenantId(), ...data }),
  update:  (id, data)  => mutate(api.quotes.update,        { id, ...data }),
  convert: (id, jobNo) => mutate(api.quotes.convertToJob,  { id, jobNumber:jobNo }),
  delete:  (id)        => mutate(api.quotes.remove,        { id }),
};

// ─── Job Orders ───────────────────────────────────────────────
export const jobsAPI = {
  getAll:          (branchId)       => fetch_(api.jobs.getAll,          { tenantId:getTenantId(), branch:branchId||undefined }),
  getByInstaller:  (uid)            => fetch_(api.jobs.getByInstaller,  { tenantId:getTenantId(), assignedClerkId:uid }), // Maps installer uid -> assignedClerkId
  getByDate:       (date)           => fetch_(api.jobs.getByDate,       { tenantId:getTenantId(), date }),
  add:             (data)           => mutate(api.jobs.create,          { tenantId:getTenantId(), ...data }),
  update:          (id, data)       => mutate(api.jobs.update,          { id, ...data }),
  updateStatus:    (id, status, notes) => mutate(api.jobs.updateStatus, { id, status, completionNotes:notes }),
  assign:          (id, to, uid)    => mutate(api.jobs.assign,          { id, assignedTo:to, assignedClerkId:uid }), // Maps installer uid -> assignedClerkId
  updateChecklist: (id, checklist)  => mutate(api.jobs.updateChecklist, { id, checklist }),
  delete:          (id)             => mutate(api.jobs.remove,          { id }),
  backfill:        ()               => mutate(api.jobs.backfillCustomers, { tenantId:getTenantId() }),
};

// Helper to strip non-database fields and clean items array for invoices
const cleanInvoiceData = (data) => {
  const { id, branchId, saleType, productQuery, _id, _creationTime, tenantId, status, ...fields } = data;
  const cleanItems = (fields.items || []).map(item => ({
    desc: item.desc || item.name || '',
    qty: Number(item.qty) || 0,
    price: Number(item.price) || 0,
    productId: item.productId || undefined,
    sku: item.sku || undefined,
  }));
  return {
    ...fields,
    items: cleanItems,
    ...(status ? { status } : {}),
  };
};

// ─── Invoices ─────────────────────────────────────────────────
export const invoicesAPI = {
  getAll:   (branchId)  => fetch_(api.invoices.getAll,   { tenantId:getTenantId(), branch:branchId||undefined }),
  add:      (data)      => mutate(api.invoices.create,   { tenantId:getTenantId(), ...cleanInvoiceData(data) }),
  update:   (id, data)  => mutate(api.invoices.update,   { id, ...cleanInvoiceData(data) }),
  markPaid: (id, data)  => mutate(api.invoices.markPaid, { id, ...data, receiptNumber:`REC-${Date.now()}` }),
  save:     (data)      => {
    const cleaned = cleanInvoiceData(data);
    if (data.id || data._id) {
      return mutate(api.invoices.update, { id: data.id || data._id, ...cleaned });
    }
    return mutate(api.invoices.create, { tenantId:getTenantId(), ...cleaned });
  },
  cancel:   (data)      => mutate(api.invoices.cancel, { id: data.id || data._id }),
};

// ─── Payments ─────────────────────────────────────────────────
export const paymentsAPI = {
  getAll: (branchId) => fetch_(api.payments.getAll, { tenantId:getTenantId(), branch:branchId||undefined }),
  add:    (data)     => mutate(api.payments.create, { tenantId:getTenantId(), ...data }),
  getSubscriptionPayments: (clerkId) => fetch_(api.payments.getSubscriptionPayments, { clerkId }),
};

// ─── Reports ──────────────────────────────────────────────────
export const reportsAPI = {
  getDashboard:       (branchId) => fetch_(api.reports.getDashboardStats, { tenantId:getTenantId(), branch:branchId||undefined }),
  getSalesSummary:    (params)   => fetch_(api.reports.getSalesSummary,   { tenantId:getTenantId(), branch:params?.branchId||undefined }),
  getWeekly:          (params)   => fetch_(api.reports.getSalesSummary,   { tenantId:getTenantId(), branch:params?.branchId||undefined }),
  getMonthly:         (params)   => fetch_(api.reports.getSalesSummary,   { tenantId:getTenantId(), branch:params?.branchId||undefined }),
  getTopProducts:     (params)   => fetch_(api.reports.getSalesSummary,   { tenantId:getTenantId(), branch:params?.branchId||undefined }),
  getInstallerPerf:   (params)   => fetch_(api.reports.getSalesSummary,   { tenantId:getTenantId(), branch:params?.branchId||undefined }),
};

// ─── Branches ─────────────────────────────────────────────────
export const branchesAPI = {
  getAll:  ()          => fetch_(api.branches.getAll,  { tenantId:getTenantId() }),
  add:     (data)      => mutate(api.branches.create,  { tenantId:getTenantId(), ...data }),
  update:  (id, data)  => mutate(api.branches.update,  { id, ...data }),
  delete:  (id)        => mutate(api.branches.remove,  { id }),
};

// ─── Team ─────────────────────────────────────────────────────
export const teamAPI = {
  getAll:  (branchId)  => fetch_(api.users.getByTenant, { tenantId:getTenantId(), branchId:branchId||undefined }),
  add:     (data)      => mutate(api.users.create,      { tenantId:getTenantId(), ...data }),
  update:  (id, data)  => mutate(api.users.update,      { id, ...data }),
  delete:  (id)        => mutate(api.users.remove,      { id }),
};

// ─── Stats ────────────────────────────────────────────────────
export const statsAPI = {
  getDashboard: (branchId) => fetch_(api.reports.getDashboardStats, { tenantId:getTenantId(), branch:branchId||undefined }),
};

// ─── Payroll ──────────────────────────────────────────────────
export const payrollAPI = {
  getEmployees:    (branchId) => fetch_(api.payroll.getEmployees,    { tenantId:getTenantId(), branch:branchId||undefined }),
  addEmployee:     (data)     => mutate(api.payroll.addEmployee,     { tenantId:getTenantId(), ...data }),
  updateEmployee:  (id, data) => mutate(api.payroll.updateEmployee,  { id, ...data }),
  getAttendance:   (params)   => fetch_(api.payroll.getAttendance,   { tenantId:getTenantId(), ...params }),
  logAttendance:   (data)     => mutate(api.payroll.logAttendance,   { tenantId:getTenantId(), ...data }),
  getAdvances:     (params)   => fetch_(api.payroll.getAdvances,     { tenantId:getTenantId(), ...params }),
  addAdvance:      (data)     => mutate(api.payroll.addAdvance,      { tenantId:getTenantId(), ...data }),
  updateAdvance:   (id, data) => mutate(api.payroll.updateAdvance,   { id, ...data }),
  getPayrollRuns:  (params)   => fetch_(api.payroll.getPayrollRuns,  { tenantId:getTenantId() }),
  savePayrollRun:  (data)     => mutate(api.payroll.savePayrollRun,  { tenantId:getTenantId(), ...data }),
  getPayslips:     (params)   => fetch_(api.payroll.getPayslips,     { ...params }),
  getMyPayslips:   (empId)    => fetch_(api.payroll.getMyPayslips,   { tenantId:getTenantId(), payrollEmployeeId:empId }),
  getSettings:     ()         => fetch_(api.payroll.getSettings,     { tenantId:getTenantId() }),
  saveSettings:    (data)     => mutate(api.payroll.saveSettings,    { tenantId:getTenantId(), settings:data }),
  deleteEmployee:  (id)        => mutate(api.payroll.removeEmployee,  { id }),
  getBranchEmployeesForKiosk: (branch) => fetch_(api.payroll.getBranchEmployeesForKiosk, { tenantId:getTenantId(), branch }),
  clockInOutWithPin: (data) => mutate(api.payroll.clockInOutWithPin, { tenantId:getTenantId(), ...data }),
  clockInOutSelfService: (data) => mutate(api.payroll.clockInOutSelfService, { tenantId:getTenantId(), ...data }),
};

// ─── Tenant ───────────────────────────────────────────────────
export const tenantAPI = {
  getByUid:  (uid)           => fetch_(api.tenants.getByUid, { uid }),
  create:    (data)          => mutate(api.tenants.create,   data),
  update:    (tenantId, data)=> mutate(api.tenants.update,   { tenantId, ...data }),
  markPaid:  (tenantId, data)=> mutate(api.tenants.markPaid, { tenantId, ...data }),
  suspend:   (tenantId)      => mutate(api.tenants.suspend,  { tenantId }),
  activate:  (tenantId)      => mutate(api.tenants.activate, { tenantId }),
  getAll:    (clerkId)       => fetch_(api.tenants.getAll,   { clerkId }),
};

// ─── Reminders ────────────────────────────────────────────────
export const remindersAPI = {
  triggerDaily: (clerkId) => runAction_(api.reminders.triggerDailyReminders, { clerkId }),
};

// ─── Plans ────────────────────────────────────────────────────
export const plansAPI = {
  getAll: () => fetch_(api.plans.getList, {}),
  update: (id, fields) => mutate(api.plans.update, { id, ...fields }),
  seed:   () => mutate(api.plans.seed, {}),
};

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
const mutate = (fn, args) => getClient().mutation(fn, args);
const fetch_  = (fn, args) => getClient().query(fn, args);

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
};

// ─── Deliveries ───────────────────────────────────────────────
export const deliveriesAPI = {
  getAll:  (branchId)  => fetch_(api.deliveries.getAll,  { tenantId:getTenantId(), branch:branchId||undefined }),
  add:     (data)      => mutate(api.deliveries.create,  { tenantId:getTenantId(), ...data }),
  update:  (id, data)  => mutate(api.deliveries.update,  { id, ...data }),
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
  getByInstaller:  (uid)            => fetch_(api.jobs.getByInstaller,  { tenantId:getTenantId(), assignedUid:uid }),
  getByDate:       (date)           => fetch_(api.jobs.getByDate,       { tenantId:getTenantId(), date }),
  add:             (data)           => mutate(api.jobs.create,          { tenantId:getTenantId(), ...data }),
  update:          (id, data)       => mutate(api.jobs.update,          { id, ...data }),
  updateStatus:    (id, status, notes) => mutate(api.jobs.updateStatus, { id, status, completionNotes:notes }),
  assign:          (id, to, uid)    => mutate(api.jobs.assign,          { id, assignedTo:to, assignedUid:uid }),
  updateChecklist: (id, checklist)  => mutate(api.jobs.updateChecklist, { id, checklist }),
  delete:          (id)             => mutate(api.jobs.remove,          { id }),
};

// ─── Invoices ─────────────────────────────────────────────────
export const invoicesAPI = {
  getAll:   (branchId)  => fetch_(api.invoices.getAll,   { tenantId:getTenantId(), branch:branchId||undefined }),
  add:      (data)      => mutate(api.invoices.create,   { tenantId:getTenantId(), ...data }),
  update:   (id, data)  => mutate(api.invoices.update,   { id, ...data }),
  markPaid: (id, data)  => mutate(api.invoices.markPaid, { id, ...data, receiptNumber:`REC-${Date.now()}` }),
};

// ─── Payments ─────────────────────────────────────────────────
export const paymentsAPI = {
  getAll: (branchId) => fetch_(api.payments.getAll, { tenantId:getTenantId(), branch:branchId||undefined }),
  add:    (data)     => mutate(api.payments.create, { tenantId:getTenantId(), ...data }),
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
};

// ─── Tenant ───────────────────────────────────────────────────
export const tenantAPI = {
  getByUid:  (uid)           => fetch_(api.tenants.getByUid, { uid }),
  create:    (data)          => mutate(api.tenants.create,   data),
  update:    (tenantId, data)=> mutate(api.tenants.update,   { tenantId, ...data }),
  markPaid:  (tenantId, data)=> mutate(api.tenants.markPaid, { tenantId, ...data }),
  suspend:   (tenantId)      => mutate(api.tenants.suspend,  { tenantId }),
  activate:  (tenantId)      => mutate(api.tenants.activate, { tenantId }),
  getAll:    ()              => fetch_(api.tenants.getAll,   {}),
};

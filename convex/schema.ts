import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * AutoCrew CRM — Convex Schema (Clerk version)
 * Key change from Firebase version:
 *   users table uses clerkId instead of uid/firebase uid
 */
export default defineSchema({

  // ── Tenants ─────────────────────────────────────────────────
  tenants: defineTable({
    clerkId:         v.string(),   // Clerk user ID of the owner
    shopName:        v.string(),
    ownerName:       v.string(),
    email:           v.string(),
    phone:           v.string(),
    plan:            v.string(),
    status:          v.string(),
    trialEndsAt:     v.string(),
    nextBillingDate: v.string(),
    graceEndsAt:     v.optional(v.string()),
  })
  .index('by_clerkId', ['clerkId'])
  .index('by_email',   ['email'])
  .index('by_status',  ['status']),

  // ── Plans ────────────────────────────────────────────────────
  plans: defineTable({
    id:            v.string(), // e.g. 'starter', 'growth', 'pro'
    name:          v.string(),
    priceMonthly:  v.number(),
    maxBranches:   v.union(v.number(), v.null()),
    maxInstallers: v.union(v.number(), v.null()),
    maxProducts:   v.union(v.number(), v.null()),
    maxTeam:       v.optional(v.union(v.number(), v.null())),
    features:      v.array(v.string()),
    color:         v.string(),
    popular:       v.optional(v.boolean()),
  })
  .index('by_planId', ['id']),

  // ── Users ────────────────────────────────────────────────────
  users: defineTable({
    clerkId:    v.optional(v.string()),       // Clerk user ID (replaces Firebase uid)
    tenantId:   v.optional(v.id('tenants')),
    name:       v.string(),
    email:      v.string(),
    phone:      v.optional(v.string()),
    imageUrl:   v.optional(v.string()),  // from Clerk profile picture
    role:       v.string(),
    branchId:   v.optional(v.string()),
    branchName: v.optional(v.string()),
    status:     v.string(),
  })
  .index('by_clerkId',  ['clerkId'])
  .index('by_tenantId', ['tenantId'])
  .index('by_role',     ['tenantId', 'role'])
  .index('by_email',    ['email']),

  // ── Branches ─────────────────────────────────────────────────
  branches: defineTable({
    tenantId:       v.id('tenants'),
    name:           v.string(),
    address:        v.optional(v.string()),
    phone:          v.optional(v.string()),
    email:          v.optional(v.string()),
    manager:        v.optional(v.string()),
    notes:          v.optional(v.string()),
    status:         v.string(),
    isMain:         v.boolean(),
    latitude:       v.optional(v.number()),
    longitude:      v.optional(v.number()),
    geofenceRadius: v.optional(v.number()),
  })
  .index('by_tenantId', ['tenantId']),

  // ── Products ─────────────────────────────────────────────────
  products: defineTable({
    tenantId:     v.id('tenants'),
    sku:          v.string(),
    name:         v.string(),
    category:     v.string(),
    branch:       v.string(),
    costPrice:    v.number(),
    sellingPrice: v.number(),
    stock:        v.number(),
    reorderLevel: v.number(),
    supplier:     v.optional(v.string()),
    unit:         v.string(),
    description:  v.optional(v.string()),
  })
  .index('by_tenantId',        ['tenantId'])
  .index('by_tenantId_branch', ['tenantId', 'branch'])
  .index('by_sku',             ['tenantId', 'sku']),

  // ── Transfers ────────────────────────────────────────────────
  transfers: defineTable({
    tenantId:    v.id('tenants'),
    productId:   v.id('products'),
    productName: v.string(),
    fromBranch:  v.string(),
    toBranch:    v.string(),
    qty:         v.number(),
    notes:       v.optional(v.string()),
    date:        v.string(),
  })
  .index('by_tenantId', ['tenantId']),

  // ── Purchase Orders ──────────────────────────────────────────
  purchaseOrders: defineTable({
    tenantId:     v.id('tenants'),
    poNumber:     v.string(),
    supplier:     v.string(),
    branch:       v.string(),
    status:       v.string(),
    orderDate:    v.string(),
    expectedDate: v.optional(v.string()),
    receivedDate: v.optional(v.string()),
    items:        v.array(v.object({
      name:       v.string(),
      qty:        v.number(),
      unitCost:   v.number(),
      received:   v.optional(v.number()),
      sku:        v.optional(v.string()),
    })),
    totalCost:    v.number(),
    notes:        v.optional(v.string()),
  })
  .index('by_tenantId',        ['tenantId'])
  .index('by_tenantId_branch', ['tenantId', 'branch']),

  // ── Deliveries ───────────────────────────────────────────────
  deliveries: defineTable({
    tenantId:       v.id('tenants'),
    deliveryNumber: v.string(),
    poNumber:       v.optional(v.string()),
    supplier:       v.string(),
    branch:         v.string(),
    status:         v.string(),
    deliveryDate:   v.string(),
    items:          v.array(v.object({
      name:         v.string(),
      qtyExpected:  v.number(),
      qtyReceived:  v.number(),
      condition:    v.optional(v.string()),
    })),
    receivedBy:     v.optional(v.string()),
    notes:          v.optional(v.string()),
  })
  .index('by_tenantId',        ['tenantId'])
  .index('by_tenantId_branch', ['tenantId', 'branch']),

  // ── Customers ────────────────────────────────────────────────
  customers: defineTable({
    tenantId:  v.id('tenants'),
    name:      v.string(),
    phone:     v.string(),
    email:     v.optional(v.string()),
    address:   v.optional(v.string()),
    vehicles:  v.array(v.object({
      make:    v.string(),
      model:   v.string(),
      year:    v.number(),
      color:   v.optional(v.string()),
      plate:   v.optional(v.string()),
    })),
    notes:      v.optional(v.string()),
    jobsCount:  v.number(),
    totalSpent: v.number(),
    lastVisit:  v.optional(v.string()),
  })
  .index('by_tenantId', ['tenantId'])
  .searchIndex('search_name', { searchField: 'name', filterFields: ['tenantId'] }),

  // ── Quotes ───────────────────────────────────────────────────
  quotes: defineTable({
    tenantId:    v.id('tenants'),
    quoteNumber: v.string(),
    customerId:  v.optional(v.id('customers')),
    customer:    v.string(),
    phone:       v.optional(v.string()),
    vehicle:     v.optional(v.string()),
    type:        v.optional(v.string()),
    status:      v.string(),
    validUntil:  v.optional(v.string()),
    items:       v.array(v.object({ desc:v.string(), qty:v.number(), price:v.number() })),
    discount:    v.number(),
    notes:       v.optional(v.string()),
    branch:      v.optional(v.string()),
  })
  .index('by_tenantId',        ['tenantId'])
  .index('by_tenantId_branch', ['tenantId', 'branch']),

  // ── Jobs ─────────────────────────────────────────────────────
  jobs: defineTable({
    tenantId:        v.id('tenants'),
    jobNumber:       v.string(),
    customerId:      v.optional(v.id('customers')),
    customer:        v.string(),
    phone:           v.optional(v.string()),
    vehicle:         v.optional(v.string()),
    vehiclePlate:    v.optional(v.string()),
    type:            v.string(),
    description:     v.optional(v.string()),
    status:          v.string(),
    assignedTo:      v.optional(v.string()),
    assignedClerkId: v.optional(v.string()),   // Clerk ID instead of Firebase uid
    branch:          v.string(),
    scheduledDate:   v.optional(v.string()),
    startTime:       v.optional(v.string()),
    endTime:         v.optional(v.string()),
    address:         v.optional(v.string()),
    parts:           v.array(v.object({
      name:          v.string(),
      qty:           v.number(),
      price:         v.number(),
      sku:           v.optional(v.string()),
      checked:       v.optional(v.boolean()),
    })),
    checklist:       v.optional(v.array(v.object({
      id:            v.string(),
      label:         v.string(),
      done:          v.boolean(),
    }))),
    labor:           v.number(),
    amount:          v.number(),
    notes:           v.optional(v.string()),
    completionNotes: v.optional(v.string()),
  })
  .index('by_tenantId',           ['tenantId'])
  .index('by_tenantId_branch',    ['tenantId', 'branch'])
  .index('by_tenantId_status',    ['tenantId', 'status'])
  .index('by_assignedClerkId',    ['tenantId', 'assignedClerkId'])
  .index('by_scheduledDate',      ['tenantId', 'scheduledDate']),

  // ── Invoices ─────────────────────────────────────────────────
  invoices: defineTable({
    tenantId:      v.id('tenants'),
    invoiceNumber: v.string(),
    jobId:         v.optional(v.id('jobs')),
    jobNumber:     v.optional(v.string()),
    customerId:    v.optional(v.id('customers')),
    customer:      v.string(),
    phone:         v.optional(v.string()),
    vehicle:       v.optional(v.string()),
    branch:        v.string(),
    status:        v.string(),
    issueDate:     v.string(),
    dueDate:       v.string(),
    paidDate:      v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    items:         v.array(v.object({
      desc: v.string(),
      qty: v.number(),
      price: v.number(),
      productId: v.optional(v.string()),
      sku: v.optional(v.string()),
    })),
    discount:      v.number(),
    tax:           v.number(),
    amountPaid:    v.number(),
    notes:         v.optional(v.string()),
  })
  .index('by_tenantId',        ['tenantId'])
  .index('by_tenantId_branch', ['tenantId', 'branch']),

  // ── Payments ─────────────────────────────────────────────────
  payments: defineTable({
    tenantId:      v.id('tenants'),
    receiptNumber: v.string(),
    invoiceId:     v.optional(v.id('invoices')),
    invoiceNumber: v.optional(v.string()),
    jobId:         v.optional(v.id('jobs')),
    jobNumber:     v.optional(v.string()),
    customer:      v.string(),
    branch:        v.string(),
    amount:        v.number(),
    method:        v.string(),
    reference:     v.optional(v.string()),
    date:          v.string(),
    notes:         v.optional(v.string()),
  })
  .index('by_tenantId',        ['tenantId'])
  .index('by_tenantId_branch', ['tenantId', 'branch'])
  .index('by_date',            ['tenantId', 'date']),

  // ── Payroll Employees ────────────────────────────────────────
  payrollEmployees: defineTable({
    tenantId:           v.id('tenants'),
    clerkId:            v.optional(v.string()),  // linked Clerk user
    employeeId:         v.string(),
    name:               v.string(),
    email:              v.string(),
    phone:              v.optional(v.string()),
    role:               v.string(),
    branch:             v.string(),
    department:         v.string(),
    employmentType:     v.string(),
    payType:            v.string(),
    basicSalary:        v.number(),
    dailyRate:          v.number(),
    hourlyRate:         v.number(),
    commissionRate:     v.number(),
    allowances:         v.array(v.object({ name:v.string(), amount:v.number(), taxable:v.boolean() })),
    isSSSExempt:        v.boolean(),
    isPhilHealthExempt: v.boolean(),
    isPagIbigExempt:    v.boolean(),
    isTaxExempt:        v.boolean(),
    hireDate:           v.optional(v.string()),
    status:             v.string(),
    pin:                v.optional(v.string()),
  })
  .index('by_tenantId',        ['tenantId'])
  .index('by_tenantId_branch', ['tenantId', 'branch'])
  .index('by_clerkId',         ['clerkId']),

  // ── Attendance ───────────────────────────────────────────────
  attendance: defineTable({
    tenantId:            v.id('tenants'),
    employeeId:          v.string(),
    payrollEmployeeId:   v.id('payrollEmployees'),
    date:                v.string(),
    status:              v.string(),
    timeIn:              v.optional(v.string()),
    timeOut:             v.optional(v.string()),
    otHoursRegular:      v.number(),
    otHoursRestDay:      v.number(),
    otHoursHoliday:      v.number(),
    nightDiffHours:      v.number(),
    lateMinutes:         v.number(),
    undertimeMinutes:    v.number(),
    branch:              v.string(),
    notes:               v.optional(v.string()),
  })
  .index('by_tenantId',      ['tenantId'])
  .index('by_employee_date', ['payrollEmployeeId', 'date']),

  // ── Cash Advances ────────────────────────────────────────────
  cashAdvances: defineTable({
    tenantId:          v.id('tenants'),
    payrollEmployeeId: v.id('payrollEmployees'),
    employeeId:        v.string(),
    employeeName:      v.string(),
    amount:            v.number(),
    purpose:           v.string(),
    status:            v.string(),
    requestDate:       v.string(),
    approvedDate:      v.optional(v.string()),
    amortization:      v.number(),
    remainingBalance:  v.number(),
    deductFrom:        v.optional(v.string()),
    months:            v.number(),
    notes:             v.optional(v.string()),
  })
  .index('by_tenantId',          ['tenantId'])
  .index('by_payrollEmployeeId', ['payrollEmployeeId'])
  .index('by_status',            ['tenantId', 'status']),

  // ── Payroll Runs ─────────────────────────────────────────────
  payrollRuns: defineTable({
    tenantId:        v.id('tenants'),
    period:          v.string(),
    periodId:        v.string(),
    periodStart:     v.string(),
    periodEnd:       v.string(),
    employees:       v.number(),
    grossPay:        v.number(),
    netPay:          v.number(),
    totalSSS:        v.number(),
    totalPhilHealth: v.number(),
    totalPagIbig:    v.number(),
    totalTax:        v.number(),
    totalDeductions: v.number(),
    status:          v.string(),
    date:            v.string(),
    notes:           v.optional(v.string()),
  })
  .index('by_tenantId', ['tenantId']),

  // ── Payslips ─────────────────────────────────────────────────
  payslips: defineTable({
    tenantId:          v.id('tenants'),
    runId:             v.id('payrollRuns'),
    payslipId:         v.string(),
    payrollEmployeeId: v.id('payrollEmployees'),
    employeeId:        v.string(),
    employeeName:      v.string(),
    period:            v.string(),
    payDate:           v.string(),
    earnings:          v.array(v.object({ label:v.string(), amount:v.number() })),
    deductions:        v.array(v.object({ label:v.string(), amount:v.number() })),
    grossPay:          v.number(),
    totalDeductions:   v.number(),
    netPay:            v.number(),
    sssEE:             v.number(),
    phEE:              v.number(),
    piEE:              v.number(),
    withholdingTax:    v.number(),
    ytdGross:          v.number(),
    ytdTax:            v.number(),
    status:            v.string(),
  })
  .index('by_tenantId',          ['tenantId'])
  .index('by_runId',             ['runId'])
  .index('by_payrollEmployeeId', ['payrollEmployeeId']),

  // ── Payroll Settings ─────────────────────────────────────────
  payrollSettings: defineTable({
    tenantId:     v.id('tenants'),
    settingsJson: v.string(),
  })
  .index('by_tenantId', ['tenantId']),

});

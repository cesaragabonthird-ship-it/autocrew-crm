import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const EMP_ARGS = {
  tenantId:           v.id("tenants"),
  clerkId:            v.optional(v.string()), // Changed from userId: v.optional(v.id("users"))
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
};

// ── Payroll Employees ─────────────────────────────────────────
export const getEmployees = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const all = await ctx.db.query("payrollEmployees").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    return branch ? all.filter(e => e.branch === branch) : all;
  },
});

export const addEmployee = mutation({
  args: EMP_ARGS,
  handler: async (ctx, args) => {
    return await ctx.db.insert("payrollEmployees", args);
  },
});

export const updateEmployee = mutation({
  args: { id: v.id("payrollEmployees"), ...Object.fromEntries(Object.entries(EMP_ARGS).filter(([k])=>k!=="tenantId").map(([k,v])=>[k,v])) },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

// ── Attendance ────────────────────────────────────────────────
export const getAttendance = query({
  args: {
    tenantId:          v.id("tenants"),
    payrollEmployeeId: v.optional(v.id("payrollEmployees")),
    month:             v.optional(v.string()),
    branch:            v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, payrollEmployeeId, month, branch }) => {
    if (payrollEmployeeId) {
      return await ctx.db.query("attendance").withIndex("by_employee_date", q => q.eq("payrollEmployeeId", payrollEmployeeId)).collect();
    }
    const all = await ctx.db.query("attendance").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    if (month) return all.filter(a => a.date.startsWith(month));
    if (branch) return all.filter(a => a.branch === branch);
    return all;
  },
});

export const logAttendance = mutation({
  args: {
    tenantId:          v.id("tenants"),
    payrollEmployeeId: v.id("payrollEmployees"),
    employeeId:        v.string(),
    date:              v.string(),
    status:            v.string(),
    timeIn:            v.optional(v.string()),
    timeOut:           v.optional(v.string()),
    otHoursRegular:    v.number(),
    otHoursRestDay:    v.number(),
    otHoursHoliday:    v.number(),
    nightDiffHours:    v.number(),
    lateMinutes:       v.number(),
    undertimeMinutes:  v.number(),
    branch:            v.string(),
    notes:             v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Upsert — check existing record for this employee + date
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_employee_date", q => q.eq("payrollEmployeeId", args.payrollEmployeeId).eq("date", args.date))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("attendance", args);
  },
});

// ── Cash Advances ─────────────────────────────────────────────
export const getAdvances = query({
  args: { tenantId: v.id("tenants"), payrollEmployeeId: v.optional(v.id("payrollEmployees")), status: v.optional(v.string()) },
  handler: async (ctx, { tenantId, payrollEmployeeId, status }) => {
    if (payrollEmployeeId) {
      return await ctx.db.query("cashAdvances").withIndex("by_payrollEmployeeId", q => q.eq("payrollEmployeeId", payrollEmployeeId)).collect();
    }
    if (status) {
      return await ctx.db.query("cashAdvances").withIndex("by_status", q => q.eq("tenantId", tenantId).eq("status", status)).collect();
    }
    return await ctx.db.query("cashAdvances").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
  },
});

export const addAdvance = mutation({
  args: {
    tenantId:          v.id("tenants"),
    payrollEmployeeId: v.id("payrollEmployees"),
    employeeId:        v.string(),
    employeeName:      v.string(),
    amount:            v.number(),
    purpose:           v.string(),
    amortization:      v.number(),
    months:            v.number(),
    deductFrom:        v.optional(v.string()),
    notes:             v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cashAdvances", {
      ...args,
      status:           "pending",
      requestDate:      new Date().toISOString().slice(0,10),
      remainingBalance: args.amount,
    });
  },
});

export const updateAdvance = mutation({
  args: {
    id:               v.id("cashAdvances"),
    status:           v.optional(v.string()),
    approvedDate:     v.optional(v.string()),
    remainingBalance: v.optional(v.number()),
    deductFrom:       v.optional(v.string()),
    notes:            v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

// ── Payroll Runs ──────────────────────────────────────────────
export const getPayrollRuns = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db.query("payrollRuns").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
  },
});

export const savePayrollRun = mutation({
  args: {
    tenantId:        v.id("tenants"),
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
    date:            v.string(),
    notes:           v.optional(v.string()),
    lines:           v.array(v.object({
      payrollEmployeeId: v.id("payrollEmployees"),
      employeeId:    v.string(),
      name:          v.string(),
      grossPay:      v.number(),
      netPay:        v.number(),
      basicPay:      v.number(),
      overtimePay:   v.number(),
      commission:    v.number(),
      allowances:    v.number(),
      sss:           v.number(),
      philhealth:    v.number(),
      pagibig:       v.number(),
      withholdingTax:v.number(),
      cashAdvanceDeduction: v.number(),
      tardinessDeduction:   v.number(),
      totalDeductions: v.number(),
    })),
  },
  handler: async (ctx, { lines, ...runData }) => {
    const runId = await ctx.db.insert("payrollRuns", { ...runData, status: "finalized" });

    // Create individual payslips
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      await ctx.db.insert("payslips", {
        tenantId:          runData.tenantId,
        runId,
        payslipId:         `PS-${runData.periodId}-${String(i+1).padStart(3,"0")}`,
        payrollEmployeeId: line.payrollEmployeeId,
        employeeId:        line.employeeId,
        employeeName:      line.name,
        period:            runData.period,
        payDate:           runData.date,
        earnings: [
          { label:"Basic Pay",   amount: line.basicPay      },
          { label:"Overtime",    amount: line.overtimePay   },
          { label:"Commission",  amount: line.commission     },
          { label:"Allowances",  amount: line.allowances    },
        ].filter(e => e.amount > 0),
        deductions: [
          { label:"SSS",              amount: line.sss               },
          { label:"PhilHealth",       amount: line.philhealth         },
          { label:"Pag-IBIG",         amount: line.pagibig            },
          { label:"Withholding Tax",  amount: line.withholdingTax     },
          { label:"Cash Advance",     amount: line.cashAdvanceDeduction },
          { label:"Tardiness",        amount: line.tardinessDeduction  },
        ].filter(d => d.amount > 0),
        grossPay:        line.grossPay,
        totalDeductions: line.totalDeductions,
        netPay:          line.netPay,
        sssEE:           line.sss,
        phEE:            line.philhealth,
        piEE:            line.pagibig,
        withholdingTax:  line.withholdingTax,
        ytdGross:        0, // computed separately
        ytdTax:          0,
        status:          "finalized",
      });

      // Deduct cash advances
      if (line.cashAdvanceDeduction > 0) {
        const advances = await ctx.db
          .query("cashAdvances")
          .withIndex("by_payrollEmployeeId", q => q.eq("payrollEmployeeId", line.payrollEmployeeId))
          .collect();
        for (const adv of advances.filter(a => a.status === "approved" && a.remainingBalance > 0)) {
          const deduct = Math.min(adv.amortization, adv.remainingBalance);
          const newBal = Math.max(0, adv.remainingBalance - deduct);
          await ctx.db.patch(adv._id, {
            remainingBalance: newBal,
            status: newBal <= 0 ? "paid" : "approved",
          });
        }
      }
    }

    return runId;
  },
});

// ── Payslips ──────────────────────────────────────────────────
export const getPayslips = query({
  args: { runId: v.id("payrollRuns") },
  handler: async (ctx, { runId }) => {
    return await ctx.db.query("payslips").withIndex("by_runId", q => q.eq("runId", runId)).collect();
  },
});

export const getMyPayslips = query({
  args: { tenantId: v.id("tenants"), payrollEmployeeId: v.id("payrollEmployees") },
  handler: async (ctx, { tenantId, payrollEmployeeId }) => {
    return await ctx.db
      .query("payslips")
      .withIndex("by_payrollEmployeeId", q => q.eq("payrollEmployeeId", payrollEmployeeId))
      .order("desc")
      .collect();
  },
});

// ── Settings ──────────────────────────────────────────────────
export const getSettings = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const row = await ctx.db.query("payrollSettings").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).unique();
    return row ? JSON.parse(row.settingsJson) : null;
  },
});

export const saveSettings = mutation({
  args: { tenantId: v.id("tenants"), settings: v.any() },
  handler: async (ctx, { tenantId, settings }) => {
    const existing = await ctx.db.query("payrollSettings").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).unique();
    const json = JSON.stringify(settings);
    if (existing) { await ctx.db.patch(existing._id, { settingsJson: json }); return existing._id; }
    return await ctx.db.insert("payrollSettings", { tenantId, settingsJson: json });
  },
});

export const removeEmployee = mutation({
  args: { id: v.id("payrollEmployees") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});

export const cleanDuplicateEmployees = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const all = await ctx.db.query("payrollEmployees").collect();
    console.log("ALL EMPLOYEES:", all.length);
    const seen = new Map();
    const toDelete = [];
    for (const emp of all) {
      const key = `${emp.email.toLowerCase()}`;
      if (seen.has(key)) {
        toDelete.push(emp._id);
      } else {
        seen.set(key, emp);
      }
    }
    for (const id of toDelete) {
      await ctx.db.delete(id);
    }
    return toDelete.length;
  },
});

// ── Kiosk & Self-Service Portal APIs ──────────────────────────────
export const getBranchEmployeesForKiosk = query({
  args: { tenantId: v.id("tenants"), branch: v.string() },
  handler: async (ctx, { tenantId, branch }) => {
    const all = await ctx.db
      .query("payrollEmployees")
      .withIndex("by_tenantId_branch", q => q.eq("tenantId", tenantId).eq("branch", branch))
      .collect();
    return all
      .filter(e => e.status === "active")
      .map(e => ({
        id: e._id,
        employeeId: e.employeeId,
        name: e.name,
        role: e.role,
        branch: e.branch,
        hasPin: !!e.pin,
      }));
  },
});

async function executeClockInOut(
  ctx: any,
  emp: any,
  tenantId: any,
  payrollEmployeeId: any,
  date: string,
  timeStr: string
) {
  const existing = await ctx.db
    .query("attendance")
    .withIndex("by_employee_date", (q: any) => q.eq("payrollEmployeeId", payrollEmployeeId).eq("date", date))
    .unique();

  if (existing && ["absent", "leave"].includes(existing.status)) {
    throw new Error(`Cannot record time for today. Status is marked as ${existing.status.toUpperCase()}.`);
  }

  const [h, m] = timeStr.split(":").map(Number);
  const currMinutes = h * 60 + m;

  // Time In Flow: no log exists yet, or timeIn is empty
  if (!existing || !existing.timeIn) {
    const lateMinutes = Math.max(0, currMinutes - 480); // 8:00 AM shift start (480 minutes)
    const status = lateMinutes > 0 ? "late" : "present";

    if (existing) {
      await ctx.db.patch(existing._id, {
        status,
        timeIn: timeStr,
        lateMinutes,
      });
      return { action: "Time In", time: timeStr, status };
    } else {
      await ctx.db.insert("attendance", {
        tenantId,
        employeeId: emp.employeeId,
        payrollEmployeeId,
        date,
        status,
        timeIn: timeStr,
        otHoursRegular: 0,
        otHoursRestDay: 0,
        otHoursHoliday: 0,
        nightDiffHours: 0,
        lateMinutes,
        undertimeMinutes: 0,
        branch: emp.branch,
      });
      return { action: "Time In", time: timeStr, status };
    }
  }

  // Time Out Flow: log exists and timeIn is recorded
  if (existing.timeOut) {
    throw new Error("Already timed out for today.");
  }

  const [inH, inM] = existing.timeIn.split(":").map(Number);
  const inMinutes = inH * 60 + inM;
  let totalMinutes = currMinutes - inMinutes;
  if (totalMinutes < 0) totalMinutes = 0;

  // Deduct 1 hour (60 minutes) for lunch if shift exceeds 5 hours
  if (totalMinutes > 300) {
    totalMinutes -= 60;
  }

  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0) {
    // Sunday: All work hours counted as Rest Day OT
    const otHoursRestDay = Math.round((totalMinutes / 60) * 100) / 100;
    await ctx.db.patch(existing._id, {
      timeOut: timeStr,
      otHoursRestDay,
      undertimeMinutes: 0,
    });
    return { action: "Time Out", time: timeStr, otHoursRestDay };
  } else {
    // Weekday / Saturday: Standard 8-hour regular shift (480 mins)
    if (totalMinutes > 480) {
      const otHoursRegular = Math.round(((totalMinutes - 480) / 60) * 100) / 100;
      await ctx.db.patch(existing._id, {
        timeOut: timeStr,
        otHoursRegular,
        undertimeMinutes: 0,
      });
      return { action: "Time Out", time: timeStr, otHoursRegular };
    } else {
      const undertimeMinutes = 480 - totalMinutes;
      await ctx.db.patch(existing._id, {
        timeOut: timeStr,
        otHoursRegular: 0,
        undertimeMinutes,
      });
      return { action: "Time Out", time: timeStr, undertimeMinutes };
    }
  }
}

export const clockInOutWithPin = mutation({
  args: {
    tenantId:          v.id("tenants"),
    payrollEmployeeId: v.id("payrollEmployees"),
    pin:               v.string(),
    date:              v.string(),
    timeStr:           v.string(),
  },
  handler: async (ctx, { tenantId, payrollEmployeeId, pin, date, timeStr }) => {
    const emp = await ctx.db.get(payrollEmployeeId);
    if (!emp) throw new Error("Employee not found");
    if (!emp.pin) {
      throw new Error("PIN code not configured for this employee. Please contact your manager.");
    }
    if (emp.pin !== pin) {
      throw new Error("Incorrect PIN code.");
    }
    return await executeClockInOut(ctx, emp, tenantId, payrollEmployeeId, date, timeStr);
  },
});

export const clockInOutSelfService = mutation({
  args: {
    tenantId:          v.id("tenants"),
    payrollEmployeeId: v.id("payrollEmployees"),
    date:              v.string(),
    timeStr:           v.string(),
  },
  handler: async (ctx, { tenantId, payrollEmployeeId, date, timeStr }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const emp = await ctx.db.get(payrollEmployeeId);
    if (!emp) throw new Error("Employee not found");

    if (emp.clerkId !== identity.subject) {
      throw new Error("Unauthorized check-in attempt.");
    }

    return await executeClockInOut(ctx, emp, tenantId, payrollEmployeeId, date, timeStr);
  },
});

export const resetTodayAttendanceForTest = mutation({
  args: { nameOrEmail: v.string(), date: v.string() },
  handler: async (ctx, { nameOrEmail, date }) => {
    const all = await ctx.db.query("payrollEmployees").collect();
    const emp = all.find(e => 
      e.email.toLowerCase() === nameOrEmail.toLowerCase() ||
      e.name.toLowerCase() === nameOrEmail.toLowerCase()
    );
    if (!emp) throw new Error("Employee not found");
    const log = await ctx.db
      .query("attendance")
      .filter(q => q.and(
        q.eq(q.field("payrollEmployeeId"), emp._id),
        q.eq(q.field("date"), date)
      ))
      .first();
    if (log) {
      await ctx.db.delete(log._id);
      return `Deleted today's attendance record for ${emp.name} successfully`;
    }
    return `No attendance record found for today for ${emp.name}`;
  }
});


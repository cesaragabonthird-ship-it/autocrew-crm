import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled jobs — replaces Apps Script daily trigger.
 * runDailyReminders fires every day at 8am Philippine time (UTC+8 = midnight UTC).
 */
const crons = cronJobs();

crons.daily(
  "daily-payment-reminders",
  { hourUTC: 0, minuteUTC: 0 },   // 8am PHT = 00:00 UTC
  internal.reminders.runDailyReminders,
);

export default crons;

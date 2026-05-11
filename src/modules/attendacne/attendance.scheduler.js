import cron from "node-cron";
import { format, subDays } from "date-fns";
import { processAttendance } from "./attendance.service.js";

/**
 * Nightly attendance processing scheduler.
 * Runs every day at midnight (00:00) server time.
 * Processes yesterday's ATT_LOG → HR_ATTENDANCE.
 *
 * Schedule: "0 0 * * *" = At 00:00 every day
 *
 * TODO: Make cron schedule configurable via environment variable
 *       e.g. process.env.ATT_CRON_SCHEDULE || "0 0 * * *"
 */


const schedule = process.env.ATT_CRON_SCHEDULE || "0 0 * * *";
export const startAttendanceScheduler = () => {
    console.log(`[Scheduler] Running with schedule: ${schedule}`);

  cron.schedule(schedule, async () => {
    // Process yesterday's data by default (most common use case)
    // const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const yesterday = "2026-04-28";

    console.log(`[Scheduler] Nightly attendance run started for: ${yesterday}`);

    try {
      const result = await processAttendance(yesterday, yesterday);
      console.log(`[Scheduler] ✅ Done — ${result.updatedRows} records processed`);
    } catch (err) {
      console.error(`[Scheduler] ❌ Failed:`, err.message);
      // TODO: Send failure alert email/notification to admin when
      //       notification/email service is available
    }
  }, {
    timezone: "Asia/Dhaka", // TODO: Move to env variable — process.env.TZ
  });
};
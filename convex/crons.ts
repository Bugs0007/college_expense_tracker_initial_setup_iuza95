import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Schedule to run, for example, every 6 hours.
// Adjust the interval as needed, but be mindful of resource usage
// if this were calling real APIs or intensive scraping.
crons.interval(
  "check product prices",
  { hours: 6 }, // Placeholder: check prices every 6 hours
  internal.priceTracker.checkAllTrackedItems // We'll create this action next
  // No arguments needed for the top-level cron action usually
);

export default crons;

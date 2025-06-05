import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
// import { Id } from "./_generated/dataModel"; // Not strictly needed for this file

export const getUserSettings = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return settings;
  },
});

export const updateUserBudget = mutation({
  args: { totalBudget: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, { totalBudget: args.totalBudget });
    } else {
      await ctx.db.insert("userSettings", { userId, totalBudget: args.totalBudget });
    }
    return { success: true };
  },
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  expenses: defineTable({
    userId: v.id("users"),
    name: v.string(),
    amount: v.number(),
    category: v.string(),
    date: v.string(), // ISO string date
    isPurchased: v.boolean(),
    eventId: v.optional(v.id("events")),
  }).index("by_userId", ["userId"]),

  cartItems: defineTable({
    userId: v.id("users"),
    name: v.string(),
    estimatedPrice: v.optional(v.number()),
    quantity: v.number(),
    foundPrice: v.optional(v.string()), // AI Price suggestion
    // Fields for Price Tracking
    productUrl: v.optional(v.string()),
    desiredPrice: v.optional(v.number()),
    currentPrice: v.optional(v.number()),
    priceCheckStatus: v.optional(v.string()), // e.g., "TRACKING", "BELOW_DESIRED", "ERROR", "MANUAL_CHECK_NEEDED"
    lastChecked: v.optional(v.number()), // Timestamp
  })
  .index("by_userId", ["userId"])
  .index("by_productUrl", ["productUrl"]),

  events: defineTable({
    name: v.string(),
    budget: v.number(),
    organizerId: v.id("users"),
  }).index("by_organizerId", ["organizerId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    totalBudget: v.optional(v.number()),
  }).index("by_userId", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

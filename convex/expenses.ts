import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api"; // For calling cart mutations

export const addExpense = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    category: v.string(),
    date: v.string(),
    isPurchased: v.boolean(),
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    return await ctx.db.insert("expenses", { ...args, userId });
  },
});

export const listExpenses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return []; 
    }
    return await ctx.db
      .query("expenses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listUnpurchasedExpenses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isPurchased"), false))
      .order("desc")
      .collect();
    return expenses;
  },
});

export const deleteExpense = mutation({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.userId !== userId) {
      throw new Error("Expense not found or user not authorized");
    }
    await ctx.db.delete(args.expenseId);
  },
});

export const updateExpensePurchasedStatus = mutation({
  args: { expenseId: v.id("expenses"), isPurchased: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.userId !== userId) {
      throw new Error("Expense not found or user not authorized");
    }
    await ctx.db.patch(args.expenseId, { isPurchased: args.isPurchased });
  },
});

export const moveExpenseToCart = mutation({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const expense = await ctx.db.get(args.expenseId);
    if (!expense || expense.userId !== userId) {
      throw new Error("Expense not found or user not authorized to modify it.");
    }

    if (expense.isPurchased) {
      throw new Error("Cannot move a purchased expense to cart.");
    }

    // Add to cart
    // Assuming quantity 1 by default when moving from expenses
    await ctx.db.insert("cartItems", {
      userId: userId,
      name: expense.name,
      estimatedPrice: expense.amount, // Expense amount becomes estimated price
      quantity: 1, 
      // foundPrice will be undefined initially
    });

    // Delete from expenses
    await ctx.db.delete(expense._id);

    return { success: true, cartItemName: expense.name };
  },
});

export const batchAddExpenses = internalMutation({
  args: {
    expenses: v.array(
      v.object({
        name: v.string(),
        amount: v.number(),
        category: v.string(),
        date: v.string(), 
        isPurchased: v.boolean(),
        eventId: v.optional(v.id("events")),
      })
    ),
    userId: v.id("users"), 
  },
  handler: async (ctx, args) => {
    for (const expense of args.expenses) {
      await ctx.db.insert("expenses", { ...expense, userId: args.userId });
    }
  },
});

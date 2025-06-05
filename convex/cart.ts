import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const addCartItem = mutation({
  args: {
    name: v.string(),
    estimatedPrice: v.optional(v.number()),
    quantity: v.number(),
    productUrl: v.optional(v.string()), 
    desiredPrice: v.optional(v.number()), 
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    
    let status: string | undefined = undefined;
    if (args.productUrl && args.desiredPrice !== undefined) {
      status = "TRACKING"; 
    }

    return await ctx.db.insert("cartItems", { 
      userId,
      name: args.name,
      estimatedPrice: args.estimatedPrice,
      quantity: args.quantity,
      productUrl: args.productUrl,
      desiredPrice: args.desiredPrice,
      priceCheckStatus: status,
     });
  },
});

export const updateCartItemTracking = mutation({
  args: {
    cartItemId: v.id("cartItems"),
    productUrl: v.optional(v.string()),
    desiredPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem || cartItem.userId !== userId) {
      throw new Error("Cart item not found or user not authorized");
    }

    let status = cartItem.priceCheckStatus;
    if (args.productUrl && args.desiredPrice !== undefined) {
      status = "TRACKING";
    } else if (!args.productUrl || args.desiredPrice === undefined) {
      status = undefined; 
    }
    
    await ctx.db.patch(args.cartItemId, {
      productUrl: args.productUrl,
      desiredPrice: args.desiredPrice,
      priceCheckStatus: status,
      currentPrice: undefined, 
      lastChecked: undefined,  
    });
    return { success: true };
  }
});

export const listCartItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    return await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const removeCartItem = mutation({
  args: { cartItemId: v.id("cartItems") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem || cartItem.userId !== userId) {
      throw new Error("Cart item not found or user not authorized");
    }
    await ctx.db.delete(args.cartItemId);
  },
});

// AI Price Suggestion (remains internal to cart logic)
export const updateCartItemPriceSuggestion = internalMutation({
  args: { cartItemId: v.id("cartItems"), suggestion: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cartItemId, { foundPrice: args.suggestion });
  },
});

// Price Tracking Details Update (moved from priceTracker.ts)
export const updateCartItemPriceDetails = internalMutation({
  args: {
    cartItemId: v.id("cartItems"),
    currentPrice: v.union(v.number(), v.null()),
    priceCheckStatus: v.string(),
    lastChecked: v.number(),
  },
  handler: async (ctx, args) => {
    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem) {
      console.error(`[PriceTracker] Cart item ${args.cartItemId} not found in internal mutation.`);
      return;
    }

    let finalStatus = args.priceCheckStatus;
    if (args.currentPrice !== null && cartItem.desiredPrice !== undefined && args.currentPrice <= cartItem.desiredPrice) {
      finalStatus = "BELOW_DESIRED";
    } else if (args.currentPrice !== null) {
      finalStatus = "TRACKING_UPDATED"; 
    } else if (args.priceCheckStatus === "ERROR_FETCHING"){
      finalStatus = "ERROR_FETCHING";
    } else {
      finalStatus = cartItem.priceCheckStatus === "TRACKING" ? "ERROR_FETCHING" : args.priceCheckStatus;
    }

    await ctx.db.patch(args.cartItemId, {
      currentPrice: args.currentPrice === null ? undefined : args.currentPrice,
      priceCheckStatus: finalStatus,
      lastChecked: args.lastChecked,
    });
    // console.log(`[PriceTracker] Updated cart item ${args.cartItemId} with price: ${args.currentPrice}, status: ${finalStatus}`); // Reduce noise
  },
});


// Internal query for the cron job to get items that need price checking
export const getItemsForPriceTracking = internalQuery({
  handler: async (ctx) => {
    const items = await ctx.db
      .query("cartItems")
      .collect();
    
    return items.filter(item => 
        item.productUrl && 
        (item.priceCheckStatus === "TRACKING" || 
         item.priceCheckStatus === "TRACKING_UPDATED" || 
         item.priceCheckStatus === "ERROR_FETCHING" || 
         item.priceCheckStatus === undefined) 
    );
  }
});

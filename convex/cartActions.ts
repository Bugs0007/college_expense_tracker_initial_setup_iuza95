"use node"; 
import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api"; 
import { Id } from "./_generated/dataModel";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const findBestPricesForItem = action({
  args: { cartItemId: v.id("cartItems"), itemName: v.string() },
  handler: async (ctx, args) => {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using the available model
        messages: [
          {
            role: "system",
            content:
              "You are a helpful shopping assistant. For the given item, provide a concise suggestion on how to find the best price, focusing on checking Amazon and Flipkart. If possible, mention any common deal patterns or specific sections to check on these sites for the item type. For example: 'Check Amazon's daily deals or Flipkart's Big Billion Days for electronics. Compare prices between sellers.' or 'For books, look at used options on Amazon or compare with Flipkart's listed price during sale events.' Keep the suggestion to 1-2 sentences.",
          },
          {
            role: "user",
            content: `Where can I find the best price for "${args.itemName}", specifically on Amazon or Flipkart?`,
          },
        ],
        max_tokens: 70, // Increased slightly for potentially more specific advice
      });
      const suggestion =
        completion.choices[0]?.message?.content?.trim() ??
        "Could not fetch a specific suggestion for Amazon/Flipkart at this time. Try checking both sites directly.";
      
      await ctx.runMutation(internal.cart.updateCartItemPriceSuggestion, {
        cartItemId: args.cartItemId,
        suggestion: suggestion,
      });
      return suggestion;
    } catch (error) {
      console.error("Error fetching price suggestion from OpenAI:", error);
      await ctx.runMutation(internal.cart.updateCartItemPriceSuggestion, {
        cartItemId: args.cartItemId,
        suggestion: "Error fetching suggestion. Please check Amazon/Flipkart manually.",
      });
      return "Error fetching suggestion. Please check Amazon/Flipkart manually.";
    }
  },
});

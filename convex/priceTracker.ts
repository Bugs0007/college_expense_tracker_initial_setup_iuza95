"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Helper function to fetch and parse price using ScraperAPI
async function fetchRealPrice(productUrl: string): Promise<number | null> {
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  if (!scraperApiKey) {
    console.error("[PriceTracker] SCRAPER_API_KEY is not set in environment variables.");
    return null;
  }

  const encodedProductUrl = encodeURIComponent(productUrl);
  const scraperUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodedProductUrl}&country_code=in`; // Targeting India

  try {
    console.log(`[PriceTracker] Fetching URL via ScraperAPI: ${productUrl}`);
    const response = await fetch(scraperUrl);
    if (!response.ok) {
      console.error(`[PriceTracker] ScraperAPI request failed for ${productUrl} with status: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`[PriceTracker] ScraperAPI error body: ${errorBody}`);
      return null;
    }

    const html = await response.text();
    // *** For debugging: Full HTML logging is now ENABLED. Be aware this can be very verbose! ***
    console.log(`[PriceTracker] Full HTML received for ${productUrl}:\\n`, html);

    let price: string | null = null;

    if (productUrl.includes("amazon.in")) {
      const amazonRegexes = [
        /<span[^>]*class="a-price-whole"[^>]*>([\d,]+)<\/span>\s*<span[^>]*class="a-price-fraction"[^>]*>(\d+)<\/span>/i,
        /<span[^>]*class="a-offscreen"[^>]*>₹\s*([\d,]+(?:\.\d{2})?)<\/span>/i,
        /id="priceblock_ourprice"[^>]*>₹\s*([\d,]+(?:\.\d{2})?)</i,
        /id="priceblock_dealprice"[^>]*>₹\s*([\d,]+(?:\.\d{2})?)</i,
        /<span[^>]*data-a-size="xl"[^>]*>\s*<span[^>]*class="a-price-symbol"[^>]*>₹<\/span>\s*<span[^>]*class="a-price-whole"[^>]*>([\d,]+(?:\.\d{0,2})?)<\/span>\s*<\/span>/i,
      ];

      for (const regex of amazonRegexes) {
        const match = html.match(regex);
        if (match) {
          if (regex.source.includes("a-price-whole") && regex.source.includes("a-price-fraction") && match[1] && match[2]) {
            price = `${match[1]}.${match[2]}`;
            break;
          } else if (match[1]) {
            price = match[1];
            break;
          }
        }
      }
      if (price) console.log(`[PriceTracker] Amazon price string found: ${price}`);
    } else if (productUrl.includes("flipkart.com")) {
      const flipkartRegex = /<div[^>]*class="_30jeq3 _16Jk6d"[^>]*>₹\s*([\d,]+(?:\.\d{2})?)<\/div>/i;
      const match = html.match(flipkartRegex);
      if (match && match[1]) {
        price = match[1];
        console.log(`[PriceTracker] Flipkart price string found: ${price}`);
      }
    }

    if (price) {
      const cleanedPrice = price.replace(/,/g, "");
      const numericPrice = parseFloat(cleanedPrice);
      if (!isNaN(numericPrice)) {
        console.log(`[PriceTracker] Parsed price for ${productUrl}: ${numericPrice}`);
        return numericPrice;
      } else {
        console.warn(`[PriceTracker] Could not parse price string "${price}" to number for ${productUrl}`);
      }
    } else {
      console.warn(`[PriceTracker] Price pattern not found in HTML for ${productUrl}. Check HTML structure if ScraperAPI call was successful.`);
    }
  } catch (error) {
    console.error(`[PriceTracker] Error fetching or parsing price for ${productUrl}:`, error);
  }
  return null;
}

export const checkPriceAndUpdate = action({
  args: { cartItemId: v.id("cartItems"), productUrl: v.string() },
  handler: async (ctx, args) => {
    let currentPrice: number | null = null;
    let status: string;

    try {
      currentPrice = await fetchRealPrice(args.productUrl);
      if (currentPrice !== null) {
        status = "PRICE_UPDATED";
      } else {
        status = "ERROR_FETCHING_OR_PARSING";
        // console.warn already exists in fetchRealPrice
      }
    } catch (error) {
      console.error(`[PriceTracker] Error in checkPriceAndUpdate action for ${args.productUrl}:`, error);
      status = "ERROR_ACTION_FAILED";
    }

    await ctx.runMutation(internal.cart.updateCartItemPriceDetails, {
      cartItemId: args.cartItemId,
      currentPrice: currentPrice,
      priceCheckStatus: status,
      lastChecked: Date.now(),
    });

    return { success: true, status, currentPrice };
  },
});

export const checkAllTrackedItems = internalAction({
  handler: async (ctx) => {
    console.log("[PriceTracker Cron] Starting job to check all tracked items.");
    const itemsToTrack = await ctx.runQuery(internal.cart.getItemsForPriceTracking) as { _id: Id<"cartItems">, name: string, productUrl?: string }[];

    if (!itemsToTrack || itemsToTrack.length === 0) {
      console.log("[PriceTracker Cron] No items currently marked for price tracking.");
      return;
    }

    console.log(`[PriceTracker Cron] Found ${itemsToTrack.length} items to check.`);

    for (const item of itemsToTrack) {
      if (item.productUrl) {
        try {
          await ctx.runAction(api.priceTracker.checkPriceAndUpdate, {
            cartItemId: item._id,
            productUrl: item.productUrl,
          });
        } catch (error) {
          console.error(`[PriceTracker Cron] Error processing item ${item._id} (${item.name}):`, error);
           await ctx.runMutation(internal.cart.updateCartItemPriceDetails, {
            cartItemId: item._id,
            currentPrice: null,
            priceCheckStatus: "ERROR_CRON_PROCESSING",
            lastChecked: Date.now(),
          });
        }
      }
    }
    console.log("[PriceTracker Cron] Finished checking all tracked items.");
  },
});

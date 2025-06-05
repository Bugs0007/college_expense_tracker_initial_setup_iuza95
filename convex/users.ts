import { internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getAuthenticatedUserId = internalQuery({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // This case should ideally be handled by the calling action
      // if a user ID is strictly required for its operation.
      // Returning null or throwing an error here depends on how actions
      // using this query are designed to handle unauthenticated scenarios.
      // For processCsv, it throws an error if userId is null.
      return null; 
    }
    return userId;
  },
});

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as cart from "../cart.js";
import type * as cartActions from "../cartActions.js";
import type * as crons from "../crons.js";
import type * as expenses from "../expenses.js";
import type * as fileActions from "../fileActions.js";
import type * as http from "../http.js";
import type * as priceTracker from "../priceTracker.js";
import type * as router from "../router.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cart: typeof cart;
  cartActions: typeof cartActions;
  crons: typeof crons;
  expenses: typeof expenses;
  fileActions: typeof fileActions;
  http: typeof http;
  priceTracker: typeof priceTracker;
  router: typeof router;
  settings: typeof settings;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

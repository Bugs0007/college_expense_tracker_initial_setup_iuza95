import { Authenticated, Unauthenticated, useQuery, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import React, { useState } from "react";
import ExpensesComponent from "./ExpensesComponent";
import CartComponent from "./CartComponent";
import ExpenseGraphsComponent from "./ExpenseGraphsComponent";

// Helper to format currency for header display
const formatCurrencyForHeader = (amount?: number | null) => {
  if (amount === undefined || amount === null) return "";
  return `Budget: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function App() {
  const { isLoading: authLoading } = useConvexAuth();
  const userSettings = useQuery(api.settings.getUserSettings); // Fetch settings for header

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p className="mt-4 text-lg">Loading Authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-indigo-600 text-white shadow-md">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">College Expense Tracker</h2>
          <div className="flex items-center space-x-4">
            <Authenticated>
              {userSettings && userSettings.totalBudget !== undefined && (
                <span className="text-sm">
                  {formatCurrencyForHeader(userSettings.totalBudget)}
                </span>
              )}
            </Authenticated>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 sm:p-8">
        <Authenticated>
          <Content />
        </Authenticated>
        <Unauthenticated>
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-lg text-center">
              <h1 className="text-4xl font-bold text-indigo-600 mb-6">Welcome!</h1>
              <p className="text-lg text-slate-600 mb-8">
                Sign in to track your college expenses and find the best deals.
              </p>
              <SignInForm />
            </div>
          </div>
        </Unauthenticated>
      </main>
      <Toaster richColors />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [activeTab, setActiveTab] = useState<"expenses" | "cart" | "graphs">("expenses"); // Removed "settings"

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
         <p className="ml-3 text-slate-500">Loading user data...</p>
      </div>
    );
  }
  
  if (loggedInUser === null) {
     return (
      <div className="text-center py-10">
        <p className="text-red-500">Error: User not found. Please try signing in again.</p>
      </div>
     );
  }

  return (
    <div className="bg-white p-6 sm:p-8 shadow-xl rounded-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-indigo-700 mb-2">
          Hello, {loggedInUser?.name ?? loggedInUser?.email ?? "Tracker"}!
        </h1>
        <p className="text-slate-500">Manage your finances effectively.</p>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex space-x-1 sm:space-x-4 -mb-px flex-wrap">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`py-3 px-2 sm:px-4 font-medium text-sm border-b-2
              ${activeTab === "expenses"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab("cart")}
            className={`py-3 px-2 sm:px-4 font-medium text-sm border-b-2
              ${activeTab === "cart"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
          >
            Shopping Cart
          </button>
          <button
            onClick={() => setActiveTab("graphs")}
            className={`py-3 px-2 sm:px-4 font-medium text-sm border-b-2
              ${activeTab === "graphs"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
          >
            Graphs & Budget
          </button>
        </nav>
      </div>

      {activeTab === "expenses" && <ExpensesComponent />}
      {activeTab === "cart" && <CartComponent />}
      {activeTab === "graphs" && <ExpenseGraphsComponent />}
    </div>
  );
}

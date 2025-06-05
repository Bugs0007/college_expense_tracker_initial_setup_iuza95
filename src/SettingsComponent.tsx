import React, { useState, useEffect, FormEvent } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { toast } from 'sonner';

export default function SettingsComponent() {
  const userSettings = useQuery(api.settings.getUserSettings);
  const updateUserBudgetMutation = useMutation(api.settings.updateUserBudget);

  const [budgetInput, setBudgetInput] = useState<string>("");

  useEffect(() => {
    if (userSettings !== undefined && userSettings?.totalBudget !== undefined) {
      setBudgetInput(userSettings.totalBudget.toString());
    } else if (userSettings === null || (userSettings && userSettings.totalBudget === undefined)) {
      setBudgetInput(""); // Clear if no budget set or settings don't exist / budget is undefined
    }
  }, [userSettings]);

  const handleSaveBudget = async (e: FormEvent) => {
    e.preventDefault();
    const newBudget = budgetInput === "" ? undefined : parseFloat(budgetInput);
    if (budgetInput !== "" && (isNaN(newBudget!) || newBudget! < 0)) {
      toast.error("Please enter a valid positive number for the budget, or leave it empty.");
      return;
    }
    try {
      toast.loading("Saving budget...");
      await updateUserBudgetMutation({ totalBudget: newBudget });
      toast.dismiss();
      toast.success("Budget updated successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to update budget. " + (error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveBudget} className="p-6 bg-slate-50 rounded-lg shadow space-y-4">
        <h3 className="text-xl font-semibold text-slate-700 mb-4">Manage Budget</h3>
        <div>
          <label htmlFor="totalBudget" className="block text-sm font-medium text-slate-700">
            Total Budget (₹)
          </label>
          <input
            id="totalBudget"
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            placeholder="e.g., 50000"
            min="0"
            step="any"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">Leave empty to remove the budget.</p>
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save Budget
        </button>
      </form>

      {userSettings?.totalBudget !== undefined && (
        <div className="p-4 bg-indigo-50 rounded-lg">
          <p className="text-md font-medium text-indigo-700">
            Current Total Budget: ₹{userSettings.totalBudget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  );
}

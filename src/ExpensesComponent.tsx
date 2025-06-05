import React, { useState, FormEvent, ChangeEvent } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface Expense {
  _id: Id<"expenses">;
  _creationTime: number;
  userId: Id<"users">;
  name: string;
  amount: number;
  category: string;
  date: string; // ISO string date
  isPurchased: boolean;
  eventId?: Id<"events">;
}

export default function ExpensesComponent() {
  const expenses = useQuery(api.expenses.listExpenses) || [];
  const addExpense = useMutation(api.expenses.addExpense);
  const deleteExpense = useMutation(api.expenses.deleteExpense);
  const updatePurchaseStatus = useMutation(api.expenses.updateExpensePurchasedStatus);
  const processCsv = useAction(api.fileActions.processCsvFile);
  const moveExpenseToCartMutation = useMutation(api.expenses.moveExpenseToCart);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isUploading, setIsUploading] = useState(false);

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !category || !date) {
      toast.error("Please fill in all fields.");
      return;
    }
    try {
      await addExpense({
        name,
        amount: parseFloat(amount),
        category,
        date,
        isPurchased: false,
      });
      setName("");
      setAmount("");
      setCategory("");
      setDate(new Date().toISOString().split("T")[0]);
      toast.success("Expense added successfully!");
    } catch (error) {
      toast.error("Failed to add expense. " + (error as Error).message);
      console.error(error);
    }
  };

  const handleDeleteExpense = async (expenseId: Id<"expenses">) => {
    try {
      await deleteExpense({ expenseId });
      toast.success("Expense deleted.");
    } catch (error) {
      toast.error("Failed to delete expense. " + (error as Error).message);
    }
  };
  
  const handleTogglePurchased = async (expense: Expense) => {
    try {
      await updatePurchaseStatus({ expenseId: expense._id, isPurchased: !expense.isPurchased });
      toast.success(`Expense marked as ${!expense.isPurchased ? "purchased" : "unpurchased"}.`);
    } catch (error) {
      toast.error("Failed to update expense status. " + (error as Error).message);
    }
  };

  const handleMoveToCart = async (expenseId: Id<"expenses">) => {
    toast.loading("Moving item to cart...");
    try {
      const result = await moveExpenseToCartMutation({ expenseId });
      toast.dismiss();
      if (result.success) {
        toast.success(`"${result.cartItemName}" moved to shopping cart.`);
      } else {
        toast.error("Failed to move item to cart.");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to move item to cart. " + (error as Error).message);
      console.error("Move to cart error:", error);
    }
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error("No file selected.");
      return;
    }

    setIsUploading(true);
    toast.loading("Processing CSV file...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target?.result as string;
      if (!csvContent) {
        toast.error("Could not read file content.");
        setIsUploading(false);
        toast.dismiss();
        return;
      }
      try {
        const result = await processCsv({ csvContent });
        toast.dismiss();
        toast.success(result || "CSV processed successfully!");
      } catch (error) {
        toast.dismiss();
        toast.error("Failed to process CSV: " + (error as Error).message);
        console.error("CSV processing error:", error);
      } finally {
        setIsUploading(false);
        if (event.target) {
          event.target.value = "";
        }
      }
    };
    reader.onerror = () => {
      toast.dismiss();
      toast.error("Failed to read file.");
      setIsUploading(false);
       if (event.target) {
          event.target.value = "";
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddExpense} className="p-6 bg-slate-50 rounded-lg shadow space-y-4">
        <h3 className="text-xl font-semibold text-slate-700 mb-4">Add New Expense</h3>
        <div>
          <label htmlFor="expenseName" className="block text-sm font-medium text-slate-700">Name</label>
          <input
            id="expenseName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Textbooks"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="expenseAmount" className="block text-sm font-medium text-slate-700">Amount (₹)</label>
          <input
            id="expenseAmount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 10000.00"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="expenseCategory" className="block text-sm font-medium text-slate-700">Category</label>
          <input
            id="expenseCategory"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Academics"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="expenseDate" className="block text-sm font-medium text-slate-700">Date</label>
          <input
            id="expenseDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Expense
        </button>
      </form>

      <div className="p-6 bg-slate-50 rounded-lg shadow space-y-4">
        <h3 className="text-xl font-semibold text-slate-700 mb-2">Import Expenses from CSV</h3>
        <p className="text-sm text-slate-600 mb-3">
          CSV file should have headers: <code>name</code>, <code>amount</code>, <code>category</code>, <code>date</code>, <code>isPurchased</code> (true/false).
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          disabled={isUploading}
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100
            disabled:opacity-50"
        />
        {isUploading && <p className="text-sm text-indigo-600 mt-2">Uploading and processing, please wait...</p>}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-slate-700 mb-4">Your Expenses</h3>
        {expenses.length === 0 ? (
          <p className="text-slate-500">No expenses recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {expenses.map((expense) => (
              <li key={expense._id} className="p-4 bg-white shadow rounded-lg flex flex-wrap justify-between items-center gap-2">
                <div className="flex-grow">
                  <p className={`font-semibold ${expense.isPurchased ? 'line-through text-slate-400' : 'text-slate-800'}`}>{expense.name}</p>
                  <p className={`text-sm ${expense.isPurchased ? 'text-slate-400' : 'text-slate-600'}`}>
                    ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - {expense.category} on {new Date(expense.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                   <button
                    onClick={() => handleTogglePurchased(expense)}
                    className={`px-3 py-1 text-xs font-medium rounded-full
                      ${expense.isPurchased 
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    {expense.isPurchased ? 'Unpurchase' : 'Purchase'}
                  </button>
                  {!expense.isPurchased && (
                    <button
                      onClick={() => handleMoveToCart(expense._id)}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Move to Cart
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteExpense(expense._id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

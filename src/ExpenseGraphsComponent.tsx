import React, { useState, useEffect, FormEvent } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from "../convex/_generated/dataModel";
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale, 
} from 'chart.js';
import 'chartjs-adapter-date-fns'; 
import { toast } from 'sonner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale, 
  Title,
  Tooltip,
  Legend
);

interface Expense {
  _id: Id<"expenses">;
  _creationTime: number;
  userId: Id<"users">;
  name: string;
  amount: number;
  category: string;
  date: string; 
  isPurchased: boolean;
  eventId?: Id<"events">;
}

// Helper to format currency
const formatCurrency = (amount?: number | null, defaultVal: string = "N/A") => {
  if (amount === undefined || amount === null) return defaultVal;
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ExpenseGraphsComponent() {
  const expenses = useQuery(api.expenses.listExpenses) || [];
  const userSettings = useQuery(api.settings.getUserSettings);
  const updateUserBudgetMutation = useMutation(api.settings.updateUserBudget);

  const [budgetInput, setBudgetInput] = useState<string>("");

  useEffect(() => {
    if (userSettings !== undefined && userSettings?.totalBudget !== undefined) {
      setBudgetInput(userSettings.totalBudget.toString());
    } else if (userSettings === null || (userSettings && userSettings.totalBudget === undefined)) {
      setBudgetInput("");
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

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalBudget = userSettings?.totalBudget;
  const remainingBudget = totalBudget !== undefined ? totalBudget - totalExpenses : undefined;

  // Data for Expenses by Category Pie Chart
  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
  const categoryLabels = Object.keys(expensesByCategory);
  const categoryData = Object.values(expensesByCategory);
  const pieData = {
    labels: categoryLabels,
    datasets: [
      {
        label: 'Expenses by Category (₹)',
        data: categoryData,
        backgroundColor: ['rgba(255, 99, 132, 0.7)','rgba(54, 162, 235, 0.7)','rgba(255, 206, 86, 0.7)','rgba(75, 192, 192, 0.7)','rgba(153, 102, 255, 0.7)','rgba(255, 159, 64, 0.7)','rgba(199, 199, 199, 0.7)','rgba(83, 102, 255, 0.7)',],
        borderColor: ['rgba(255, 99, 132, 1)','rgba(54, 162, 235, 1)','rgba(255, 206, 86, 1)','rgba(75, 192, 192, 1)','rgba(153, 102, 255, 1)','rgba(255, 159, 64, 1)','rgba(199, 199, 199, 1)','rgba(83, 102, 255, 1)',],
        borderWidth: 1,
      },
    ],
  };
  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (context: any) => `${context.label}: ${formatCurrency(context.parsed)}` } } } };

  // Data for Expenses Over Time Line Chart
  const expensesOverTime = expenses.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(expense => ({ x: new Date(expense.date), y: expense.amount }));
  const lineData = { datasets: [{ label: 'Expenses Over Time (₹)', data: expensesOverTime, fill: false, borderColor: 'rgb(75, 192, 192)', tension: 0.1, },], };
  const lineOptions = { scales: { x: { type: 'time' as const, time: { unit: 'month' as const, tooltipFormat: 'MMM yyyy' as const, }, title: { display: true, text: 'Date' as const, }, }, y: { title: { display: true, text: 'Amount (₹)' as const, }, beginAtZero: true, ticks: { callback: (value: string | number) => formatCurrency(Number(value), '') } } }, responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (context: any) => `${context.dataset.label || ''}: ${formatCurrency(context.parsed.y)}` } } } };
  
  // Data for Purchased vs. Pending Bar Chart
  const purchasedStatusData = expenses.reduce((acc, expense) => {
    if (expense.isPurchased) {
      acc.purchased += expense.amount;
    } else {
      acc.pending += expense.amount;
    }
    return acc;
  }, { purchased: 0, pending: 0 });
  const purchasedBarData = { labels: ['Purchased', 'Pending'], datasets: [{ label: 'Total Amount (₹)', data: [purchasedStatusData.purchased, purchasedStatusData.pending], backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 159, 64, 0.7)'], borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 159, 64, 1)'], borderWidth: 1, },], };
  const purchasedBarOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const, }, title: { display: true, text: 'Purchased vs. Pending Expenses (₹)', }, tooltip: { callbacks: { label: (context: any) => `${context.dataset.label || ''}: ${formatCurrency(context.parsed.y)}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (value: string | number) => formatCurrency(Number(value),'') } } } };

  // Data for Budget vs. Expenses Bar Chart
  const budgetVsExpensesData = {
    labels: ['Total Budget', 'Total Expenses'],
    datasets: [
      {
        label: 'Amount (₹)',
        data: [totalBudget ?? 0, totalExpenses],
        backgroundColor: [
          totalBudget === undefined ? 'rgba(200, 200, 200, 0.7)' : 'rgba(54, 162, 235, 0.7)', // Grey if no budget
          'rgba(255, 99, 132, 0.7)',
        ],
        borderColor: [
          totalBudget === undefined ? 'rgba(200, 200, 200, 1)' : 'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  const budgetVsExpensesOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Budget vs. Expenses (₹)' }, tooltip: { callbacks: { label: (context: any) => `${context.label}: ${formatCurrency(context.parsed.y)}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (value: string | number) => formatCurrency(Number(value),'') } } } };


  if (userSettings === undefined && expenses === undefined) {
    return <div className="flex justify-center items-center py-10">Loading data...</div>;
  }

  return (
    <div className="space-y-10 py-8">
      {/* Budget Management Form */}
      <form onSubmit={handleSaveBudget} className="p-6 bg-slate-50 rounded-lg shadow space-y-4">
        <h3 className="text-xl font-semibold text-slate-700 mb-1">Manage Budget</h3>
        <p className="text-sm text-slate-500 mb-3">Set your total budget here. This will be used for tracking against your expenses.</p>
        <div>
          <label htmlFor="totalBudget" className="block text-sm font-medium text-slate-700">
            Total Budget (₹)
          </label>
          <input id="totalBudget" type="number" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="e.g., 50000" min="0" step="any"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          <p className="mt-1 text-xs text-slate-500">Leave empty or set to 0 to remove the budget.</p>
        </div>
        <button type="submit" className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Save Budget
        </button>
      </form>

      {/* Budget Summary Text */}
      <div className="p-4 bg-indigo-50 rounded-lg shadow">
        <h4 className="text-lg font-semibold text-indigo-700 mb-2">Budget Overview</h4>
        <p className="text-md">Current Total Budget: <span className="font-medium">{formatCurrency(totalBudget, 'Not Set')}</span></p>
        <p className="text-md">Total Expenses: <span className="font-medium">{formatCurrency(totalExpenses)}</span></p>
        {totalBudget !== undefined && (
          <p className={`text-md ${remainingBudget !== undefined && remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
            Remaining Budget: <span className="font-medium">{formatCurrency(remainingBudget)}</span>
          </p>
        )}
         {totalBudget === undefined && <p className="text-sm text-slate-500 mt-1">Set a budget to see your remaining amount.</p>}
      </div>
      
      {expenses.length === 0 && totalBudget === undefined && (
         <p className="text-slate-500 text-center py-10">No expense data and no budget set. Add expenses or set a budget to see graphs.</p>
      )}

      {/* Budget vs. Expenses Chart */}
      {(expenses.length > 0 || totalBudget !== undefined) && (
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold text-slate-700 mb-4 text-center">Budget vs. Expenses</h3>
          <div style={{ height: '300px' }}>
            <Bar data={budgetVsExpensesData} options={budgetVsExpensesOptions} />
          </div>
           {totalBudget === undefined && <p className="text-center text-sm text-slate-500 mt-2">Budget not set. The 'Total Budget' bar will appear once a budget is saved.</p>}
        </div>
      )}

      {expenses.length > 0 && (
        <>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold text-slate-700 mb-4 text-center">Expenses by Category</h3>
            <div style={{ height: '400px', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold text-slate-700 mb-4 text-center">Expenses Over Time</h3>
            <div style={{ height: '400px' }}>
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold text-slate-700 mb-4 text-center">Purchased vs. Pending Expenses</h3>
            <div style={{ height: '400px' }}>
              <Bar data={purchasedBarData} options={purchasedBarOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

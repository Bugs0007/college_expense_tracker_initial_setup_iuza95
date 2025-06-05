import React, { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface CartItem {
  _id: Id<"cartItems">;
  _creationTime: number;
  userId: Id<"users">;
  name: string;
  estimatedPrice?: number;
  quantity: number;
  foundPrice?: string; // AI suggestion
  productUrl?: string;
  desiredPrice?: number;
  currentPrice?: number;
  priceCheckStatus?: string;
  lastChecked?: number;
}

// Helper to format date/time
const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString();
};

// Helper to format currency
const formatCurrency = (amount?: number | null) => { // Allow null
  if (amount === undefined || amount === null) return "N/A";
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CartComponent() {
  const cartItems = useQuery(api.cart.listCartItems) || [];
  const addCartItemMutation = useMutation(api.cart.addCartItem);
  const removeCartItemMutation = useMutation(api.cart.removeCartItem);
  const updateCartItemTrackingMutation = useMutation(api.cart.updateCartItemTracking);
  const findPricesAction = useAction(api.cartActions.findBestPricesForItem);
  const checkPriceAction = useAction(api.priceTracker.checkPriceAndUpdate);

  const [itemName, setItemName] = useState("");
  const [itemEstPrice, setItemEstPrice] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemProductUrl, setItemProductUrl] = useState("");
  const [itemDesiredPrice, setItemDesiredPrice] = useState("");

  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editDesiredPrice, setEditDesiredPrice] = useState("");
  
  const [findingAiPriceFor, setFindingAiPriceFor] = useState<Id<"cartItems"> | null>(null);
  const [checkingLivePriceFor, setCheckingLivePriceFor] = useState<Id<"cartItems"> | null>(null);


  useEffect(() => {
    if (editingItem) {
      setEditUrl(editingItem.productUrl || "");
      setEditDesiredPrice(editingItem.desiredPrice?.toString() || "");
    } else {
      setEditUrl("");
      setEditDesiredPrice("");
    }
  }, [editingItem]);

  const handleAddCartItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemQuantity) {
      toast.error("Please provide item name and quantity.");
      return;
    }
    try {
      await addCartItemMutation({
        name: itemName,
        estimatedPrice: itemEstPrice ? parseFloat(itemEstPrice) : undefined,
        quantity: parseInt(itemQuantity, 10),
        productUrl: itemProductUrl || undefined,
        desiredPrice: itemDesiredPrice ? parseFloat(itemDesiredPrice) : undefined,
      });
      setItemName("");
      setItemEstPrice("");
      setItemQuantity("1");
      setItemProductUrl("");
      setItemDesiredPrice("");
      toast.success("Item added to cart!");
    } catch (error) {
      toast.error("Failed to add item. " + (error as Error).message);
    }
  };

  const handleRemoveCartItem = async (cartItemId: Id<"cartItems">) => {
    try {
      await removeCartItemMutation({ cartItemId });
      toast.success("Item removed from cart.");
    } catch (error) {
      toast.error("Failed to remove item. " + (error as Error).message);
    }
  };

  const handleFindAiPrices = async (item: CartItem) => {
    setFindingAiPriceFor(item._id);
    toast.loading(`Getting AI price suggestion for ${item.name}...`);
    try {
      const suggestion = await findPricesAction({ cartItemId: item._id, itemName: item.name });
      toast.dismiss(); 
      if (suggestion && !suggestion.toLowerCase().includes("error")) {
        toast.success(`AI suggestion updated for ${item.name}.`);
      } else {
        toast.warning(`Could not retrieve a new AI suggestion for ${item.name}.`);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(`Failed to get AI suggestion for ${item.name}. ` + (error as Error).message);
    } finally {
      setFindingAiPriceFor(null);
    }
  };

  const handleCheckLivePrice = async (item: CartItem) => {
    if (!item.productUrl) {
      toast.error("Product URL is missing for this item.");
      return;
    }
    setCheckingLivePriceFor(item._id);
    toast.loading(`Checking live price for ${item.name}... (This is a placeholder)`);
    try {
      // The result from checkPriceAction can have currentPrice as number | null
      const result = await checkPriceAction({ cartItemId: item._id, productUrl: item.productUrl });
      toast.dismiss();
      if (result.success) {
        toast.success(`Price check for ${item.name} complete. Status: ${result.status}. Current Price: ${formatCurrency(result.currentPrice)}`);
      } else {
        toast.error(`Price check failed for ${item.name}.`);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(`Failed to check price for ${item.name}. ` + (error as Error).message);
    } finally {
      setCheckingLivePriceFor(null);
    }
  };
  
  const handleSaveTrackingDetails = async () => {
    if (!editingItem) return;
    toast.loading("Saving tracking details...");
    try {
      await updateCartItemTrackingMutation({
        cartItemId: editingItem._id,
        productUrl: editUrl || undefined,
        desiredPrice: editDesiredPrice ? parseFloat(editDesiredPrice) : undefined,
      });
      toast.dismiss();
      toast.success("Tracking details updated!");
      setEditingItem(null);
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to update tracking details. " + (error as Error).message);
    }
  };


  return (
    <div className="space-y-6">
      <form onSubmit={handleAddCartItem} className="p-6 bg-slate-50 rounded-lg shadow space-y-4">
        <h3 className="text-xl font-semibold text-slate-700 mb-4">Add Item to Cart</h3>
        <div>
          <label htmlFor="itemName" className="block text-sm font-medium text-slate-700">Item Name*</label>
          <input id="itemName" type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Laptop Stand" required
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="itemQuantity" className="block text-sm font-medium text-slate-700">Quantity*</label>
            <input id="itemQuantity" type="number" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)} min="1" required
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="itemEstPrice" className="block text-sm font-medium text-slate-700">Estimated Price (₹)</label>
            <input id="itemEstPrice" type="number" value={itemEstPrice} onChange={(e) => setItemEstPrice(e.target.value)} placeholder="e.g., 2000.00"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
        <div>
          <label htmlFor="itemProductUrl" className="block text-sm font-medium text-slate-700">Product URL (Amazon/Flipkart for tracking)</label>
          <input id="itemProductUrl" type="url" value={itemProductUrl} onChange={(e) => setItemProductUrl(e.target.value)} placeholder="https://www.amazon.in/..."
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="itemDesiredPrice" className="block text-sm font-medium text-slate-700">Desired Price (₹ for tracking)</label>
          <input id="itemDesiredPrice" type="number" value={itemDesiredPrice} onChange={(e) => setItemDesiredPrice(e.target.value)} placeholder="e.g., 1800.00"
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <button type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Add to Cart
        </button>
      </form>

      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Edit Tracking for: {editingItem.name}</h3>
            <div>
              <label htmlFor="editUrl" className="block text-sm font-medium text-slate-700">Product URL</label>
              <input type="url" id="editUrl" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} 
                     className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="editDesiredPrice" className="block text-sm font-medium text-slate-700">Desired Price (₹)</label>
              <input type="number" id="editDesiredPrice" value={editDesiredPrice} onChange={(e) => setEditDesiredPrice(e.target.value)}
                     className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md">Cancel</button>
              <button onClick={handleSaveTrackingDetails} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-slate-700 mb-4">Your Shopping Cart</h3>
        {cartItems.length === 0 ? (
          <p className="text-slate-500">Your cart is empty.</p>
        ) : (
          <ul className="space-y-4">
            {cartItems.map((item) => (
              <li key={item._id} className="p-4 bg-white shadow rounded-lg space-y-3">
                <div className="flex flex-wrap justify-between items-start gap-x-4 gap-y-2">
                  <div className="flex-grow">
                    <p className="font-semibold text-slate-800">{item.name} (Qty: {item.quantity})</p>
                    {item.estimatedPrice !== undefined && (
                      <p className="text-sm text-slate-500">Est. Price: {formatCurrency(item.estimatedPrice)}</p>
                    )}
                    {item.foundPrice && (
                       <p className="text-sm text-purple-600 mt-1">AI Suggestion: {item.foundPrice}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button onClick={() => handleFindAiPrices(item)} disabled={findingAiPriceFor === item._id}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 whitespace-nowrap">
                      {findingAiPriceFor === item._id ? "Suggesting..." : "AI Suggestion"}
                    </button>
                    <button onClick={() => handleRemoveCartItem(item._id)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                      Remove
                    </button>
                  </div>
                </div>

                {/* Price Tracking Section */}
                <div className="mt-2 pt-3 border-t border-slate-200 space-y-2">
                  <p className="text-sm font-medium text-slate-600">Price Tracking:</p>
                  {item.productUrl ? (
                    <>
                      <p className="text-xs text-slate-500 truncate">URL: <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{item.productUrl}</a></p>
                      <p className="text-xs text-slate-500">Desired Price: {item.desiredPrice !== undefined ? formatCurrency(item.desiredPrice) : "Not set"}</p>
                      <p className="text-xs text-slate-500">
                        Current Price: {formatCurrency(item.currentPrice)}
                        {item.priceCheckStatus === "BELOW_DESIRED" && <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Below Desired!</span>}
                      </p>
                      <p className="text-xs text-slate-500">Status: <span className="font-medium">{item.priceCheckStatus || "Not Tracking"}</span> (Last: {formatTimestamp(item.lastChecked)})</p>
                      <div className="flex space-x-2 mt-1">
                        <button onClick={() => setEditingItem(item)} className="px-2 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700">Edit Tracking</button>
                        <button onClick={() => handleCheckLivePrice(item)} disabled={checkingLivePriceFor === item._id}
                          className="px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">
                          {checkingLivePriceFor === item._id ? "Checking..." : "Check Price Now"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => setEditingItem(item)} className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200">
                      Add Tracking Details
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

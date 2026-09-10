"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type ShopInventoryItem } from "./supabase";

export interface CartItem {
  item: ShopInventoryItem;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: ShopInventoryItem, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotalInRupees: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "fixgrid_parts_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error("Failed to save cart to localStorage", e);
      }
    }
  }, [items, isLoaded]);

  const addToCart = (item: ShopInventoryItem, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, item.quantity || 99);
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: newQty } : i));
      } else {
        return [...prev, { item, quantity: Math.min(quantity, item.quantity || 99) }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.item.id === itemId) {
          const maxAllowed = i.item.quantity || 99;
          return { ...i, quantity: Math.min(quantity, maxAllowed) };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const subtotalInRupees = items.reduce((sum, i) => {
    const priceRupees = i.item.unit_price ? Math.round(i.item.unit_price / 100) : 0;
    return sum + priceRupees * i.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotalInRupees,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

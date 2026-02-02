/**
 * FilterStore - Reactive state management using Proxy
 * Requirements: 43.10, 43.11
 * 
 * Provides a lightweight reactive state store for filter management
 * with automatic subscriber notifications on state changes.
 */

import React from 'react';

type Subscriber<T> = (state: T) => void;

export class FilterStore<T extends Record<string, any>> {
  private state: T;
  private subscribers: Set<Subscriber<T>> = new Set();
  private proxy: T;

  constructor(initialState: T) {
    this.state = { ...initialState };
    
    // Create a Proxy to intercept property changes
    this.proxy = new Proxy(this.state, {
      set: (target, property, value) => {
        const oldValue = target[property as keyof T];
        
        // Only notify if value actually changed
        if (oldValue !== value) {
          target[property as keyof T] = value;
          this.notifySubscribers();
        }
        
        return true;
      },
      
      get: (target, property) => {
        return target[property as keyof T];
      }
    });
  }

  /**
   * Get the reactive proxy object
   */
  getState(): T {
    return this.proxy;
  }

  /**
   * Get a snapshot of the current state (non-reactive)
   */
  getSnapshot(): T {
    return { ...this.state };
  }

  /**
   * Update multiple properties at once
   */
  setState(updates: Partial<T>): void {
    let hasChanges = false;
    
    for (const [key, value] of Object.entries(updates)) {
      if (this.state[key as keyof T] !== value) {
        this.state[key as keyof T] = value as T[keyof T];
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.notifySubscribers();
    }
  }

  /**
   * Reset state to initial values
   */
  reset(initialState: T): void {
    this.state = { ...initialState };
    this.notifySubscribers();
  }

  /**
   * Subscribe to state changes
   * Returns an unsubscribe function
   */
  subscribe(callback: Subscriber<T>): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    const snapshot = this.getSnapshot();
    this.subscribers.forEach(callback => callback(snapshot));
  }

  /**
   * Get the number of active subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

/**
 * React hook for using FilterStore in components
 */
export function useFilterStore<T extends Record<string, any>>(
  store: FilterStore<T>
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = React.useState<T>(store.getSnapshot());

  React.useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, [store]);

  const updateState = React.useCallback(
    (updates: Partial<T>) => {
      store.setState(updates);
    },
    [store]
  );

  return [state, updateState];
}

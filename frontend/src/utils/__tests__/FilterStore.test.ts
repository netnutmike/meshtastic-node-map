/**
 * FilterStore Tests
 * Tests for reactive state management using Proxy
 * Requirements: 43.10, 43.11
 */

import { FilterStore } from '../FilterStore';

describe('FilterStore', () => {
  interface TestState {
    search: string;
    page: number;
    filters: {
      status: string;
      type: string;
    };
  }

  const initialState: TestState = {
    search: '',
    page: 1,
    filters: {
      status: 'all',
      type: 'all'
    }
  };

  describe('Initialization', () => {
    it('should initialize with provided state', () => {
      const store = new FilterStore(initialState);
      const state = store.getSnapshot();

      expect(state).toEqual(initialState);
      expect(state).not.toBe(initialState); // Should be a copy
    });

    it('should create a reactive proxy', () => {
      const store = new FilterStore(initialState);
      const proxy = store.getState();

      expect(proxy).toBeDefined();
      expect(proxy.search).toBe('');
      expect(proxy.page).toBe(1);
    });
  });

  describe('State Updates', () => {
    it('should update state through proxy', () => {
      const store = new FilterStore(initialState);
      const proxy = store.getState();

      proxy.search = 'test';
      proxy.page = 2;

      const snapshot = store.getSnapshot();
      expect(snapshot.search).toBe('test');
      expect(snapshot.page).toBe(2);
    });

    it('should update state through setState', () => {
      const store = new FilterStore(initialState);

      store.setState({
        search: 'updated',
        page: 3
      });

      const snapshot = store.getSnapshot();
      expect(snapshot.search).toBe('updated');
      expect(snapshot.page).toBe(3);
    });

    it('should not notify subscribers if value does not change', () => {
      const store = new FilterStore(initialState);
      const callback = jest.fn();
      store.subscribe(callback);

      const proxy = store.getState();
      proxy.search = '';  // Same value

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle nested object updates', () => {
      const store = new FilterStore(initialState);
      const proxy = store.getState();

      proxy.filters = { status: 'active', type: 'user' };

      const snapshot = store.getSnapshot();
      expect(snapshot.filters.status).toBe('active');
      expect(snapshot.filters.type).toBe('user');
    });
  });

  describe('Subscriber Notifications', () => {
    it('should notify subscribers on state change', () => {
      const store = new FilterStore(initialState);
      const callback = jest.fn();
      store.subscribe(callback);

      const proxy = store.getState();
      proxy.search = 'test';

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' })
      );
    });

    it('should notify all subscribers', () => {
      const store = new FilterStore(initialState);
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      store.subscribe(callback1);
      store.subscribe(callback2);
      store.subscribe(callback3);

      const proxy = store.getState();
      proxy.page = 5;

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it('should notify subscribers on setState', () => {
      const store = new FilterStore(initialState);
      const callback = jest.fn();
      store.subscribe(callback);

      store.setState({ search: 'new search', page: 10 });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'new search',
          page: 10
        })
      );
    });

    it('should not notify after unsubscribe', () => {
      const store = new FilterStore(initialState);
      const callback = jest.fn();
      const unsubscribe = store.subscribe(callback);

      const proxy = store.getState();
      proxy.search = 'test1';
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      proxy.search = 'test2';
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should handle multiple subscribe/unsubscribe cycles', () => {
      const store = new FilterStore(initialState);
      const callback = jest.fn();

      const unsub1 = store.subscribe(callback);
      store.setState({ page: 2 });
      expect(callback).toHaveBeenCalledTimes(1);

      unsub1();
      store.setState({ page: 3 });
      expect(callback).toHaveBeenCalledTimes(1);

      const unsub2 = store.subscribe(callback);
      store.setState({ page: 4 });
      expect(callback).toHaveBeenCalledTimes(2);

      unsub2();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset state to new initial values', () => {
      const store = new FilterStore(initialState);
      const proxy = store.getState();

      proxy.search = 'modified';
      proxy.page = 10;

      const newInitial: TestState = {
        search: 'reset',
        page: 1,
        filters: { status: 'inactive', type: 'admin' }
      };

      store.reset(newInitial);

      const snapshot = store.getSnapshot();
      expect(snapshot).toEqual(newInitial);
    });

    it('should notify subscribers on reset', () => {
      const store = new FilterStore(initialState);
      const callback = jest.fn();
      store.subscribe(callback);

      store.reset({ ...initialState, search: 'reset' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'reset' })
      );
    });
  });

  describe('Subscriber Management', () => {
    it('should track subscriber count', () => {
      const store = new FilterStore(initialState);

      expect(store.getSubscriberCount()).toBe(0);

      const unsub1 = store.subscribe(() => {});
      expect(store.getSubscriberCount()).toBe(1);

      const unsub2 = store.subscribe(() => {});
      expect(store.getSubscriberCount()).toBe(2);

      unsub1();
      expect(store.getSubscriberCount()).toBe(1);

      unsub2();
      expect(store.getSubscriberCount()).toBe(0);
    });
  });

  describe('Snapshot Isolation', () => {
    it('should return independent snapshots', () => {
      const store = new FilterStore(initialState);

      const snapshot1 = store.getSnapshot();
      const snapshot2 = store.getSnapshot();

      expect(snapshot1).toEqual(snapshot2);
      expect(snapshot1).not.toBe(snapshot2);

      snapshot1.search = 'modified';
      expect(snapshot2.search).toBe('');
    });

    it('should not affect store when modifying snapshot', () => {
      const store = new FilterStore(initialState);
      const snapshot = store.getSnapshot();

      snapshot.search = 'modified';
      snapshot.page = 99;

      const newSnapshot = store.getSnapshot();
      expect(newSnapshot.search).toBe('');
      expect(newSnapshot.page).toBe(1);
    });
  });

  describe('setState Optimization', () => {
    it('should not notify if no changes in setState', () => {
      const store = new FilterStore(initialState);
      const callback = jest.fn();
      store.subscribe(callback);

      store.setState({ search: '', page: 1 }); // Same values

      expect(callback).not.toHaveBeenCalled();
    });

    it('should notify only once for multiple changes in setState', () => {
      const store = new FilterStore(initialState);
      const callback = jest.fn();
      store.subscribe(callback);

      store.setState({
        search: 'new',
        page: 5
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

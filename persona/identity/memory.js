class StateManager {
  constructor(initialState = {}) {
    // Initialize state from a property on the window object if it exists,
    // otherwise use the provided initialState. This allows state to
    // potentially persist across script reloads within the same page
    // load, but not across full page navigations (for that, you'd use
    // localStorage or sessionStorage).
    this.state = window.__PERSISTENT_STATE__ || initialState;
    this.listeners = {}; // key: [callback, ...]

    // Attach this instance to the window object
    // You can choose a more unique or namespaced key if needed
    window.__PERSISTENT_STATE_MANAGER__ = this;
    window.__PERSISTENT_STATE__ = this.state; // Keep the actual state object updated on window
  }

  // Log helper
  _log(action, key, value, oldValue) {
    // console.debug(`[State] ${action.toUpperCase()} →`, { key, value, oldValue });
  }

  /**
   * Retrieves the value of a specific state key.
   * @param {string} key - The key of the state to retrieve.
   * @returns {*} The value associated with the key, or undefined if not found.
   */
  get(key) {
    const value = this.state[key];
    this._log('get', key, value);
    return value;
  }

  /**
   * Sets the value for a given state key and notifies any listeners.
   * @param {string} key - The key to set.
   * @param {*} value - The new value for the key.
   */
  set(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;
    this._log('set', key, value, oldValue);

    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => {
        try {
          cb(value, oldValue);
        } catch (err) {
          console.warn(`[State] listener for "${key}" threw:`, err);
        }
      });
    }
  }

  /**
   * Toggles a boolean state value. If the key doesn't exist, it will be set to true.
   * @param {string} key - The key of the boolean state to toggle.
   * @returns {boolean} The new boolean value.
   */
  toggle(key) {
    const newValue = !this.state[key];
    this.set(key, newValue);
    return newValue;
  }

  /**
   * Removes a key-value pair from the state and notifies listeners.
   * @param {string} key - The key to remove.
   */
  remove(key) {
    const oldValue = this.state[key];
    if (key in this.state) {
      delete this.state[key];
      this._log('remove', key, undefined, oldValue);
      if (this.listeners[key]) {
        this.listeners[key].forEach(cb => {
          try {
            cb(undefined, oldValue); // Notify listeners that the value is now undefined
          } catch (err) {
            console.warn(`[State] remove listener for "${key}" threw:`, err);
          }
        });
      }
    } else {
      console.debug(`[State] remove skipped (not found): "${key}"`);
    }
  }

  /**
   * Returns a copy of the entire state object.
   * @returns {object} A shallow copy of the current state.
   */
  getAll() {
    this._log('getAll', '*', { ...this.state });
    return { ...this.state };
  }

  /**
   * Subscribes a callback function to changes for a specific state key.
   * The callback will receive the new value and the old value as arguments.
   * @param {string} key - The state key to subscribe to.
   * @param {function(newValue: *, oldValue: *): void} callback - The function to call when the state changes.
   * @returns {function(): void} An unsubscribe function to stop listening.
   */
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
    this._log('subscribe', key, callback.toString());

    // Return an unsubscribe function specific to this subscription
    return () => {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
      this._log('unsubscribe', key, callback.toString());
    };
  }
}
window.$STATE = new StateManager();

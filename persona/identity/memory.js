// Or is this conciousness??
const StateManager = (() => {
  const state = {};         // actual state values
  const listeners = {};     // key: [callback, ...]

  // Log helper
  const log = (action, key, value, oldValue) => {
    // console.debug(`[State] ${action.toUpperCase()} →`, { key, value, oldValue });
  };

  const get = (key) => {
    const value = state[key];
    log('get', key, value);
    return value;
  };

  const set = (key, value) => {
    const oldValue = state[key];
    state[key] = value;
    log('set', key, value, oldValue);

    if (listeners[key]) {
      listeners[key].forEach(cb => {
        try {
          cb(value, oldValue);
        } catch (err) {
          console.warn(`[State] listener for "${key}" threw:`, err);
        }
      });
    }
  };

  const toggle = (key) => {
    const newValue = !state[key];
    set(key, newValue);
    return newValue;
  };

  const remove = (key) => {
    const oldValue = state[key];
    if (key in state) {
      delete state[key];
      log('remove', key, undefined, oldValue);
      if (listeners[key]) {
        listeners[key].forEach(cb => {
          try {
            cb(undefined, oldValue);
          } catch (err) {
            console.warn(`[State] remove listener for "${key}" threw:`, err);
          }
        });
      }
    } else {
      console.debug(`[State] remove skipped (not found): "${key}"`);
    }
  };

  const getAll = () => {
    log('getAll', '*', { ...state });
    return { ...state };
  };

  const subscribe = (key, callback) => {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(callback);
    log('subscribe', key, callback.toString());

    // Return unsubscribe function
    return () => {
      listeners[key] = listeners[key].filter(cb => cb !== callback);
      log('unsubscribe', key, callback.toString());
    };
  };

  return { get, set, toggle, remove, getAll, subscribe };
})();

window.$STATE = StateManager;

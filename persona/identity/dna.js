const STORAGE_KEY = 'personasync_v1.0_STORAGE';

// Use chrome.storage.local if available, else fallback to localStorage
const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage?.local;

const saveData = async (data) => {
  if (isChromeExtension) {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }
};

const loadData = async () => {
  if (isChromeExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (result[STORAGE_KEY]) {
          // console.log('success retrieving from chrome.storage: ', result[STORAGE_KEY]);
          resolve(result[STORAGE_KEY]);
        } else {
          resolve({});
        }
      });
    });
  } else {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        // console.log('success retrieving from localStorage: ', JSON.parse(data));
        return JSON.parse(data);
      } else {
        return {};
      }
    } catch (e) {
      console.warn('localStorage load failed', e);
      return {};
    }
  }
};

window.saveData = saveData;
window.loadData = loadData;

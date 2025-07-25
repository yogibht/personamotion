const STORAGE_KEY = 'personasync_v1.0_STORAGE';

// For testing purposes only
const saveData = async (data) => {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
};

const loadData = async () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result[STORAGE_KEY]) {
        console.log('success retrieving: ', result[STORAGE_KEY]);
        resolve(result[STORAGE_KEY]);
      } else {
        resolve({});
      }
    });
  });
}

window.saveData = saveData;
window.loadData = loadData;

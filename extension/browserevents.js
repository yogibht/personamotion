// Fired when extension is first installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed or updated:", details);
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('configurator/welcome.html') });
  }
});

// Fired when a new tab is created
chrome.tabs.onCreated.addListener((tab) => {
  console.log("New tab created:", tab);
});

// Fired when a tab is updated (e.g. URL change, loading)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log("Tab updated:", tabId, changeInfo, tab);
});

// Fired when a tab is removed (closed)
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log("Tab closed:", tabId);
});

// Fired when the active tab in a window changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log("Tab activated:", activeInfo);
});

// Fired when the user switches between windows
chrome.windows.onFocusChanged.addListener((windowId) => {
  console.log("Window focus changed:", windowId);
});

// Fired when a message is received from a content script or other part
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);
  sendResponse({ status: "ok" });
  return true; // keep the message channel open for async
});



// Scripting Examples
// Manifest V3 (Chrome)
// chrome.scripting.executeScript({...});

// Manifest V2 (Chrome/Firefox)
// chrome.tabs.executeScript(tabId, {file: 'script.js'});

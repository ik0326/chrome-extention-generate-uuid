// background.js - service worker
// Handles keyboard command -> generate UUID -> send to active tab, and save history

/**
 * Web標準の crypto.randomUUID() を使用してUUID v4を生成
 * (最新のブラウザ、Deno、Node.js >= 16で利用可能)
 * @returns {string} UUID v4
 */
function uuidv4() {
  return crypto.randomUUID();
}

async function saveHistory(uuid) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["uuidHistory"], (data) => {
      const list = data.uuidHistory || [];
      list.unshift(uuid);
      const newList = list.slice(0, 20);
      chrome.storage.sync.set({ uuidHistory: newList }, resolve);
    });
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "insert_uuid") {
    const uuid = uuidv4();

    // Try to send message to active tab
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "insert_uuid", uuid });
      }
    } catch (e) {
      // ignore
    }

    // Save to history
    saveHistory(uuid).catch(() => { });
  }
});

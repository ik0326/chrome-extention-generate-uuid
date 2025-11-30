// background.js - service worker
// Handles keyboard command -> generate UUID -> send to active tab, and save history

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
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

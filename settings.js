const themeSelect = document.getElementById("themeSelect");
const autoGenToggle = document.getElementById("autoGenToggle");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const openShortcutsBtn = document.getElementById("openShortcutsBtn");
const versionLabel = document.getElementById("versionLabel");

// load saved settings
chrome.storage.sync.get(["theme", "autoGenerateOnCopy"], (data) => {
  themeSelect.value = data.theme || "system"; // デフォルトは system
  autoGenToggle.checked = !!data.autoGenerateOnCopy;
});

// save theme change
themeSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ theme: themeSelect.value }, () => {
    alert("Theme saved. Reopen popup to see changes.");
  });
});

// save auto generate toggle
autoGenToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ autoGenerateOnCopy: autoGenToggle.checked });
});

// clear history
clearHistoryBtn.addEventListener("click", () => {
  if (!confirm("Clear UUID history? This cannot be undone.")) return;
  chrome.storage.sync.set({ uuidHistory: [] }, () => {
    alert("History cleared.");
  });
});

// open chrome shortcuts
openShortcutsBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

// show extension version
chrome.runtime.getManifest && (versionLabel.textContent = `v${chrome.runtime.getManifest().version}`);

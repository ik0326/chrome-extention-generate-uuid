// UUID generator
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// DOM
const uuidBox = document.getElementById("uuidBox");
const regenBtn = document.getElementById("regenBtn");
const copyBtn = document.getElementById("copyBtn");
const insertBtn = document.getElementById("insertBtn");
const historyList = document.getElementById("historyList");
const settingsBtn = document.getElementById("settingsBtn");
const shortcutsBtn = document.getElementById("shortcutsBtn");
const shortcutLabel = document.getElementById("shortcutLabel");
const autoGenLabel = document.getElementById("autoGenLabel");

let currentUUID = "";

// --- Storage helpers ---
function saveHistory(uuid) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["uuidHistory"], (data) => {
      const list = data.uuidHistory || [];
      list.unshift(uuid);
      const newList = list.slice(0, 20);
      chrome.storage.sync.set({ uuidHistory: newList }, () => resolve(newList));
    });
  });
}

function loadHistoryToUI() {
  chrome.storage.sync.get(["uuidHistory"], (data) => {
    const list = data.uuidHistory || [];
    historyList.innerHTML = "";
    if (list.length === 0) {
      historyList.innerHTML = `<div class="small" style="padding:8px;color:var(--muted)">No history yet</div>`;
      return;
    }
    list.forEach((uuid) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div style="flex:1;word-break:break-all">${uuid}</div>
        <div style="display:flex;gap:6px;">
          <button title="Copy" data-uuid="${uuid}" class="hist-copy">Copy</button>
        </div>
      `;
      historyList.appendChild(div);
    });

    // attach copy handlers
    Array.from(historyList.querySelectorAll(".hist-copy")).forEach(b => {
      b.addEventListener("click", async (e) => {
        const u = e.currentTarget.getAttribute("data-uuid");
        try {
          await navigator.clipboard.writeText(u);
          e.currentTarget.textContent = "Copied!";
          setTimeout(() => (e.currentTarget.textContent = "Copy"), 1000);
        } catch (err) { console.error(err); }
      });
    });
  });
}

// --- Generate / Regenerate ---
async function regenerate() {
  currentUUID = uuidv4();
  uuidBox.textContent = currentUUID;
  await saveHistory(currentUUID);
  loadHistoryToUI();
}

// --- Button events ---
regenBtn.addEventListener("click", () => { regenerate(); });

copyBtn.addEventListener("click", async () => {
  if (!currentUUID) return;
  try {
    await navigator.clipboard.writeText(currentUUID);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1200);

    // Auto generate on copy
    chrome.storage.sync.get(["autoGenerateOnCopy"], (data) => {
      if (data.autoGenerateOnCopy) regenerate();
    });
  } catch (err) { console.error(err); }
});

insertBtn.addEventListener("click", async () => {
  if (!currentUUID) return;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || !tabs[0]) return;
  chrome.tabs.sendMessage(tabs[0].id, { type: "insert_uuid", uuid: currentUUID });
  insertBtn.textContent = "Inserted!";
  setTimeout(() => (insertBtn.textContent = "Insert"), 1200);
});

shortcutsBtn.addEventListener("click", () => { chrome.tabs.create({ url: "chrome://extensions/shortcuts" }); });
settingsBtn.addEventListener("click", () => {
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  else chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
});

// --- Theme ---
function applyTheme(theme) {
  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.body.dataset.theme = isDark ? "dark" : "light";

    // Listen for OS theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
      document.body.dataset.theme = e.matches ? "dark" : "light";
    });
  } else {
    document.body.dataset.theme = theme;
  }
}

// --- Initialization ---
(async function init() {
  await regenerate();
  loadHistoryToUI();

  chrome.storage.sync.get(["autoGenerateOnCopy", "theme"], (data) => {
    autoGenLabel.textContent = `AutoGen on Copy: ${data.autoGenerateOnCopy ? "ON" : "OFF"}`;
    applyTheme(data.theme || "system"); // デフォルト system
  });

  // show OS default shortcut
  chrome.runtime.getPlatformInfo((info) => {
    let defaultKey = "";
    if (info.os === "mac") defaultKey = "⌘ + Shift + U";
    else if (info.os === "win") defaultKey = "Ctrl + Shift + U";
    else defaultKey = "Ctrl + Shift + U";
    shortcutLabel.textContent = `Default Shortcut: ${defaultKey}`;
  });
})();

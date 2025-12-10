// UUID generator
/**
 * Web標準の crypto.randomUUID() を使用してUUID v4を生成
 * (最新のブラウザ、Deno、Node.js >= 16で利用可能)
 * @returns {string} UUID v4
 */
function uuidv4() {
  return crypto.randomUUID();
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

// 💡 NEW: Multiple generation DOM elements
const tabSingle = document.getElementById("tabSingle");
const tabMultiple = document.getElementById("tabMultiple");
const singlePane = document.getElementById("single-pane");
const multiplePane = document.getElementById("multiple-pane");
const countInput = document.getElementById("countInput");
const multiRegenBtn = document.getElementById("multiRegenBtn");
const multiCopyAllBtn = document.getElementById("multiCopyAllBtn");
const multiList = document.getElementById("multiList");

let currentUUID = "";
let currentMultiUUIDs = []; // 💡 NEW: Array to hold multiple generated UUIDs

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
      historyList.innerHTML = `<div class="small" style="padding:4px; text-align:center;">No history yet.</div>`;
      return;
    }

    list.forEach((uuid) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div style="flex:1; word-break: break-all;">${uuid}</div>
        <button data-uuid="${uuid}" class="btn-copy-history" style="padding:6px 8px; font-size:12px; border-radius:6px; background:var(--panel); border:1px solid rgba(255,255,255,0.08); color:var(--text);">Copy</button>
      `;
      historyList.appendChild(div);
    });

    // Add event listener for history copy buttons
    document.querySelectorAll(".btn-copy-history").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const uuidToCopy = e.currentTarget.dataset.uuid;

        // エラー抑制のため、e.currentTargetを明示的に取得
        const targetButton = e.currentTarget;

        try {
          await navigator.clipboard.writeText(uuidToCopy);

          // ボタンフィードバックの追加と、TypeError対策のためのnullチェック
          if (targetButton) {
            targetButton.textContent = "Copied!";

            setTimeout(() => {
              // setTimeout内でも要素の存在を再確認
              if (targetButton) {
                targetButton.textContent = "Copy";
              }
            }, 200);
          }

        } catch (err) {
          console.error("履歴コピー中にエラーが発生しました:", err);
          // エラーが発生した場合も、可能であれば元に戻す
          if (targetButton) {
            targetButton.textContent = "Error";
            setTimeout(() => {
              if (targetButton) {
                targetButton.textContent = "Copy";
              }
            }, 200);
          }
        }
      });
    });
  });
}

// --- Generate / Regenerate ---
async function regenerate() {
  currentUUID = uuidv4();
  uuidBox.textContent = currentUUID;
}

// 💡 --- Multiple Generate Functions ---
function generateMultiple(count) {
  const list = [];
  // Ensure we don't generate too many (e.g., limit to 100 for performance/UI)
  const safeCount = Math.min(Math.max(1, count), 100);

  for (let i = 0; i < safeCount; i++) {
    list.push(uuidv4());
  }
  currentMultiUUIDs = list;
  renderMultiList(list);
}

function renderMultiList(list) {
  multiList.innerHTML = "";
  if (list.length === 0) {
    multiList.innerHTML = `<div class="small" style="padding:4px; text-align:center;">Press Generate to create UUIDs</div>`;
    return;
  }

  // Create a document fragment to efficiently append elements
  const fragment = document.createDocumentFragment();

  list.forEach((uuid) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div style="flex:1;">${uuid}</div>
    `;
    fragment.appendChild(div);
  });

  multiList.appendChild(fragment);
}


// --- Button events ---
regenBtn.addEventListener("click", () => {
  regenerate();
});

copyBtn.addEventListener("click", async () => {
  if (!currentUUID) return;
  try {
    await navigator.clipboard.writeText(currentUUID);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 300);

    // Get setting and auto-generate new UUID
    chrome.storage.sync.get(["autoGenerateOnCopy"], (data) => {
      // 💡 修正箇所: 設定が未保存の場合 (undefined) は true をデフォルトとして使用する
      const isAutoGenOn = data.autoGenerateOnCopy === undefined ? true : !!data.autoGenerateOnCopy;

      if (isAutoGenOn) {
        regenerate();
      }
    });

    // Save to history
    await saveHistory(currentUUID);
    loadHistoryToUI();

  } catch (err) {
    console.error(err);
  }
});

insertBtn.addEventListener("click", async () => {
  if (!currentUUID) return;

  // 1. アクティブなタブにUUIDを挿入するメッセージを送信
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || !tabs[0]) return;

  // 【変更点】挿入するUUIDを変数に保持
  const uuidToInsert = currentUUID;

  chrome.tabs.sendMessage(tabs[0].id, { type: "insert_uuid", uuid: uuidToInsert });

  // 2. UIフィードバックの更新
  insertBtn.textContent = "Inserted!";
  setTimeout(() => (insertBtn.textContent = "Insert"), 300);

  // 3. 挿入に使ったUUIDを履歴に保存し、リストを更新
  //    (コピーボタンのイベントで二重保存されるのを防ぐため、この処理は残す)
  await saveHistory(uuidToInsert);
  loadHistoryToUI();

  // 4. 次の操作のためにUUIDを生成（コピーボタンがこれを保存する）
  regenerate();
});

shortcutsBtn.addEventListener("click", () => { chrome.tabs.create({ url: "chrome://extensions/shortcuts" }); });
settingsBtn.addEventListener("click", () => {
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  else chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
});

// 💡 NEW: Multiple Generate Button
multiRegenBtn.addEventListener("click", () => {
  const count = parseInt(countInput.value, 10);
  if (count > 0) {
    generateMultiple(count);
  } else {
    // Optionally alert user or set minimum
    countInput.value = 1;
    generateMultiple(1);
  }
});

// 💡 NEW: Multiple Copy All Button
multiCopyAllBtn.addEventListener("click", async () => {
  if (currentMultiUUIDs.length === 0) return;

  // UUIDs are joined by newline character
  const textToCopy = currentMultiUUIDs.join("\n");

  try {
    await navigator.clipboard.writeText(textToCopy);
    multiCopyAllBtn.textContent = "Copied All!";
    setTimeout(() => (multiCopyAllBtn.textContent = "Copy All"), 1200);
  } catch (err) {
    console.error(err);
  }
});

// 💡 --- Tab Switching Logic ---
function switchTab(activeTabId, activePaneId) {
  // Deactivate all tab buttons and panes
  [tabSingle, tabMultiple].forEach(btn => btn.classList.remove('active'));
  [singlePane, multiplePane].forEach(pane => pane.classList.remove('active'));

  // Set the active tab and pane
  document.getElementById(activeTabId).classList.add('active');
  document.getElementById(activePaneId).classList.add('active');
}

tabSingle.addEventListener("click", () => switchTab('tabSingle', 'single-pane'));
tabMultiple.addEventListener("click", () => switchTab('tabMultiple', 'multiple-pane'));


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
  // 複数生成リストの初期化
  renderMultiList([]);

  chrome.storage.sync.get(["autoGenerateOnCopy", "theme"], (data) => {
    // AutoGenのデフォルトをtrueに設定 (以前の修正)
    const isAutoGenOn = data.autoGenerateOnCopy === undefined ? true : !!data.autoGenerateOnCopy;

    autoGenLabel.textContent = `AutoGen on Copy: ${isAutoGenOn ? "ON" : "OFF"}`;
    // テーマのデフォルトをdarkに設定 (以前の修正)
    applyTheme(data.theme || "dark");
  });

  // 💡 修正箇所: 現在アクティブなショートカットキーを表示
  chrome.commands.getAll((commands) => {
    const insertCommand = commands.find(c => c.name === "insert_uuid");
    let keyDisplay = "—"; // ショートカットが未設定の場合の表示

    if (insertCommand && insertCommand.shortcut) {
      keyDisplay = insertCommand.shortcut;
    }

    // キーボードショートカット設定ページへのリンクを含める
    shortcutLabel.innerHTML = `Current Shortcut: ${keyDisplay}`;
  });
})();

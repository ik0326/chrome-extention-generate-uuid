// background.js - service worker

/**
 * Web標準の crypto.randomUUID() を使用してUUID v4を生成
 * @returns {string} UUID v4
 */
function uuidv4() {
  return crypto.randomUUID();
}

/**
 * 生成されたUUIDをストレージに保存する（履歴として20件まで）
 * @param {string} uuid - 保存するUUID
 * @returns {Promise<void>}
 */
async function saveHistory(uuid) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["uuidHistory"], (data) => {
      const list = data.uuidHistory || [];
      list.unshift(uuid);
      // 履歴を最新20件に制限
      const newList = list.slice(0, 20);
      chrome.storage.sync.set({ uuidHistory: newList }, resolve);
    });
  });
}


/**
 * chrome.tabs.sendMessage を Promise ベースで実行し、
 * エラー発生時（受信側がない場合など）に Promise を reject させる
 * @param {number} tabId - メッセージを送信するタブID
 * @param {object} message - 送信するメッセージオブジェクト
 * @returns {Promise<any>} 受信側からの応答、またはエラー
 */
function sendMessagePromise(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      // 接続エラーやその他のランタイムエラーをチェック
      if (chrome.runtime.lastError) {
        // エラーが存在する場合、Promiseを拒否する
        return reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
}


// キーボードコマンドリスナー
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "insert_uuid") {
    const uuid = uuidv4();

    // アクティブなタブにメッセージを送信し、エラーを捕捉
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs && tabs[0] && tabs[0].id !== chrome.tabs.TAB_ID_NONE) {
        // Promise化した sendMessage を await で実行
        await sendMessagePromise(tabs[0].id, { type: "insert_uuid", uuid });
        // メッセージが成功した場合の処理（ここでは特になし）
      }

    } catch (error) {
      // 接続エラー (Receiving end does not exist) がここで捕捉されます。
      // コンテンツスクリプトがないページでコマンドを実行した場合など、
      // 正常なケースとしてエラーを無視またはログ出力します。
      console.warn("UUID送信中に接続エラーが発生しました:", error.message);
    }

    // Historyへの保存はメッセージ送信とは独立して実行し、エラーを捕捉
    await saveHistory(uuid).catch((e) => {
      console.error("履歴の保存中にエラーが発生しました:", e);
    });
  }
});

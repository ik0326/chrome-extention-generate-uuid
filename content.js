// content.js
// Listens to messages from background/popup and inserts UUID into focused element

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // メッセージの形式を確認
  if (msg && msg.type === "insert_uuid" && typeof msg.uuid === "string") {

    let isInsertable = false;
    let insertionSuccessful = false;

    try {
      const el = document.activeElement;

      // 1. アクティブ要素がない場合はすぐに応答を返す
      if (!el) {
        sendResponse({ status: "failed", message: "No active element is focused." });
        return;
      }

      // 要素のタイプをチェック
      const tag = el.tagName;
      const isInputOrTextarea = tag === "INPUT" || tag === "TEXTAREA";
      const isEditable = el.isContentEditable;

      // --- 2. ContentEditable要素の処理 ---
      if (isEditable) {
        // execCommand はリッチテキスト編集で最も信頼性が高い
        document.execCommand("insertText", false, msg.uuid);
        isInsertable = true;
        insertionSuccessful = true;
      }

      // --- 3. 標準の input/textarea の処理 ---
      else if (isInputOrTextarea) {
        isInsertable = true;

        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const value = el.value || "";

        // UUIDを現在のカーソル位置に挿入
        el.value = value.substring(0, start) + msg.uuid + value.substring(end);

        // カーソルを挿入されたUUIDの直後に移動
        el.selectionStart = el.selectionEnd = start + msg.uuid.length;

        // イベントを発火させ、外部フレームワーク（React, Vueなど）に値の変更を検知させる
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));

        insertionSuccessful = true;
      }

      // 4. 処理の完了応答
      if (insertionSuccessful) {
        sendResponse({ status: "success", message: "UUID inserted." });
      } else if (isInsertable) {
        // ここには到達しないはずだが、念のため成功として扱う
        sendResponse({ status: "success", message: "Insertion handled (e.g., execCommand called)." });
      } else {
        // アクティブ要素はあるが、UUIDを挿入できない要素だった場合
        sendResponse({ status: "failed", message: "Active element is not a supported input type." });
      }

    } catch (e) {
      // 5. 挿入処理中に予期せぬエラーが発生した場合の応答
      console.error("UUID Generator content insertion error:", e);
      sendResponse({ status: "error", message: `Insertion failed: ${e.message}` });
    }
  }
});

// content.js
// Listens to messages from background/popup and inserts UUID into focused element

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "insert_uuid" && typeof msg.uuid === "string") {
    try {
      const el = document.activeElement;
      if (!el) return;

      // contentEditable
      if (el.isContentEditable) {
        // Use insertText command for best compatibility
        document.execCommand("insertText", false, msg.uuid);
        return;
      }

      // input / textarea
      const tag = el.tagName || "";
      if (tag === "INPUT" || tag === "TEXTAREA") {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const value = el.value || "";
        el.value = value.substring(0, start) + msg.uuid + value.substring(end);
        // move cursor after inserted uuid
        el.selectionStart = el.selectionEnd = start + msg.uuid.length;
        // dispatch input event so frameworks detect change
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch (e) {
      // ignore insertion errors silently
      console.error("UUID Inserter content insertion error:", e);
    }
  }
});

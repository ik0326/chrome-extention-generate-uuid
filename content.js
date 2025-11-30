// content.js
// Listens to messages from background/popup and inserts UUID into focused element

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "insert_uuid" && typeof msg.uuid === "string") {
    try {
      const el = document.activeElement;
      if (!el) return;

      // Check if element is a textarea, input, or contentEditable
      const tag = el.tagName;
      const isInputOrTextarea = tag === "INPUT" || tag === "TEXTAREA";
      const isEditable = el.isContentEditable;

      // --- 1. Use document.execCommand for contentEditable and general compatibility ---
      // This is the most reliable way for rich text editors (like in Google Sheets)
      if (isEditable) {
        // Use insertText command for best compatibility
        document.execCommand("insertText", false, msg.uuid);
        return;
      }

      // --- 2. Standard input/textarea handling ---
      if (isInputOrTextarea) {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const value = el.value || "";

        // Insert the UUID into the current value
        el.value = value.substring(0, start) + msg.uuid + value.substring(end);

        // Move cursor after inserted uuid
        el.selectionStart = el.selectionEnd = start + msg.uuid.length;

        // Dispatch input and change events so frameworks detect change
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true })); // Added change event
      }
    } catch (e) {
      // ignore insertion errors silently
      console.error("UUID Generator content insertion error:", e);
    }
  }
});

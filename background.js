/**
 * Background Service Worker
 * Updates badge count when items change.
 */

importScripts("read-it-later.js");

chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[ReadItLater.STORAGE_KEY]) {
    updateBadge();
  }
});

async function updateBadge() {
  const { unread } = await ReadItLater.getCount();
  const text = unread > 0 ? unread.toString() : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#4A90D9" });
}

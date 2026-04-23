/**
 * Read It Later - Core Storage Logic
 * Handles saving, loading, deleting, and managing reading list items.
 */

const ReadItLater = {
  STORAGE_KEY: "readItLaterItems",

  async getAll() {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || [];
  },

  async save(item) {
    const items = await this.getAll();
    const existing = items.find((i) => i.url === item.url);
    if (existing) {
      return { success: false, reason: "already_saved" };
    }

    const newItem = {
      id: Date.now().toString(),
      title: item.title || "Untitled",
      url: item.url,
      favicon: item.favicon || "",
      savedAt: new Date().toISOString(),
      isRead: false,
    };

    items.unshift(newItem);
    await chrome.storage.local.set({ [this.STORAGE_KEY]: items });
    return { success: true, item: newItem };
  },

  async remove(id) {
    const items = await this.getAll();
    const filtered = items.filter((item) => item.id !== id);
    await chrome.storage.local.set({ [this.STORAGE_KEY]: filtered });
  },

  async toggleRead(id) {
    const items = await this.getAll();
    const item = items.find((i) => i.id === id);
    if (item) {
      item.isRead = !item.isRead;
      await chrome.storage.local.set({ [this.STORAGE_KEY]: items });
    }
    return item;
  },

  async clearAll() {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: [] });
  },

  async getCount() {
    const items = await this.getAll();
    return {
      total: items.length,
      unread: items.filter((i) => !i.isRead).length,
    };
  },
};

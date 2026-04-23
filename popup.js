document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveBtn");
  const searchInput = document.getElementById("searchInput");
  const itemList = document.getElementById("itemList");
  const emptyState = document.getElementById("emptyState");
  const notification = document.getElementById("notification");
  const itemCount = document.getElementById("itemCount");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const filterBtns = document.querySelectorAll(".filter-btn");

  let currentFilter = "all";

  // Initialize
  renderList();

  // Save current page
  saveBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.url) {
        showNotification("無法取得頁面資訊", "error");
        return;
      }

      // Block saving chrome:// and edge:// internal pages
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("about:")
      ) {
        showNotification("無法儲存瀏覽器內部頁面", "warning");
        return;
      }

      const result = await ReadItLater.save({
        title: tab.title,
        url: tab.url,
        favicon: tab.favIconUrl || "",
      });

      if (result.success) {
        showNotification("已儲存！", "success");
        renderList();
      } else if (result.reason === "already_saved") {
        showNotification("此頁面已經儲存過了", "warning");
      }
    } catch (err) {
      showNotification("儲存失敗，請重試", "error");
    }
  });

  // Search
  searchInput.addEventListener("input", () => {
    renderList();
  });

  // Filter buttons
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });

  // Clear all
  clearAllBtn.addEventListener("click", async () => {
    const count = (await ReadItLater.getAll()).length;
    if (count === 0) return;

    if (confirm(`確定要清除全部 ${count} 個項目嗎？`)) {
      await ReadItLater.clearAll();
      renderList();
      showNotification("已清除全部項目", "success");
    }
  });

  // Render the list
  async function renderList() {
    let items = await ReadItLater.getAll();
    const query = searchInput.value.trim().toLowerCase();

    // Apply search filter
    if (query) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.url.toLowerCase().includes(query)
      );
    }

    // Apply read/unread filter
    if (currentFilter === "unread") {
      items = items.filter((item) => !item.isRead);
    } else if (currentFilter === "read") {
      items = items.filter((item) => item.isRead);
    }

    // Update count
    const allItems = await ReadItLater.getAll();
    const unreadCount = allItems.filter((i) => !i.isRead).length;
    itemCount.textContent = `${allItems.length} 個項目（${unreadCount} 未讀）`;

    // Toggle empty state
    if (items.length === 0) {
      itemList.classList.add("hidden");
      emptyState.classList.remove("hidden");
    } else {
      itemList.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }

    // Render items
    itemList.innerHTML = items.map((item) => createItemHTML(item)).join("");

    // Bind item events
    bindItemEvents();
  }

  function createItemHTML(item) {
    const date = new Date(item.savedAt);
    const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;

    const faviconHTML = item.favicon
      ? `<img class="item-favicon" src="${escapeAttr(item.favicon)}" alt="">`
      : `<div class="item-favicon" style="background:#ddd;display:flex;align-items:center;justify-content:center;font-size:10px;">🔗</div>`;

    return `
      <div class="item ${item.isRead ? "read" : ""}" data-id="${escapeAttr(item.id)}">
        ${faviconHTML}
        <div class="item-content">
          <a class="item-title" href="${escapeAttr(item.url)}" title="${escapeAttr(item.title)}" data-action="open">${escapeHTML(item.title)}</a>
          <div class="item-meta">${escapeHTML(dateStr)} · ${escapeHTML(getDomain(item.url))}</div>
        </div>
        <div class="item-actions">
          <button class="icon-btn" data-action="toggle" title="${item.isRead ? "標為未讀" : "標為已讀"}">${item.isRead ? "📖" : "✅"}</button>
          <button class="icon-btn" data-action="delete" title="刪除">🗑️</button>
        </div>
      </div>
    `;
  }

  function bindItemEvents() {
    // Handle favicon load errors
    itemList.querySelectorAll('img.item-favicon').forEach((img) => {
      img.addEventListener("error", () => {
        img.style.display = "none";
      });
    });

    // Open links
    itemList.querySelectorAll('[data-action="open"]').forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: el.href });
      });
    });

    // Toggle read
    itemList.querySelectorAll('[data-action="toggle"]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest(".item").dataset.id;
        await ReadItLater.toggleRead(id);
        renderList();
      });
    });

    // Delete
    itemList.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest(".item").dataset.id;
        await ReadItLater.remove(id);
        renderList();
        showNotification("已刪除", "success");
      });
    });
  }

  // Notification
  function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    setTimeout(() => {
      notification.classList.add("hidden");
    }, 2000);
  }

  // Helpers
  function getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
});

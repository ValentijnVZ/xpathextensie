let submenuIds = [];

// Maak root menu bij installatie
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-xpath-root",
    title: "Copy XPath",
    contexts: ["all"]
  });
});

// Update submenu-items bij rechterklik
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type === "update-xpath-menu" && sender.tab?.id) {
    const tabId = sender.tab.id;

    // Haal XPaths van content script
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getLastElementXPaths()
    });

    const xpaths = results[0].result || [];

    // Verwijder alleen oude submenu-items
    for (const id of submenuIds) {
      chrome.contextMenus.remove(id);
    }
    submenuIds = [];

    // Voeg nieuwe submenu-items toe
    xpaths.forEach((x, idx) => {
      const id = `xpath-${idx}`;
      chrome.contextMenus.create({
        id,
        parentId: "copy-xpath-root",
        title: x.xpath, // toon de volledige XPath
        contexts: ["all"]
      });
      submenuIds.push(id);
    });
  }
});

// Kopieer XPath naar clipboard bij klikken
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId.startsWith("xpath-")) {
    const idx = parseInt(info.menuItemId.split("-")[1]);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getLastElementXPaths()
    });

    const xpaths = results[0].result || [];
    if (xpaths[idx]) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => navigator.clipboard.writeText(text),
        args: [xpaths[idx].xpath]
      });
    }
  }
});

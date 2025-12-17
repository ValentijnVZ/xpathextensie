// ...existing code...
let submenuIds = [];

// Maak root menu bij installatie
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-xpath-root",
    title: "Copy XPath",
    contexts: ["all"]
  });
});

// Update submenu-items op verzoek (v.b. vanuit content script)
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type === "update-xpath-menu" && sender.tab?.id) {
    const tabId = sender.tab.id;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.getLastElementXPaths()
      });
      const xpaths = results?.[0]?.result || [];

      // Verwijder oude submenu-items
      for (const id of submenuIds) {
        try { chrome.contextMenus.remove(id); } catch (e) { /* ignore */ }
      }
      submenuIds = [];

      // Voeg nieuwe submenu-items toe
      xpaths.forEach((x, idx) => {
        const id = `xpath-${idx}`;
        chrome.contextMenus.create({
          id,
          parentId: "copy-xpath-root",
          title: x.xpath,
          contexts: ["all"]
        });
        submenuIds.push(id);
      });
    } catch (e) {
      console.error("Fout bij update-xpath-menu:", e);
    }
  }
});

// NIEUW: update menu direct wanneer het contextmenu wordt geopend
chrome.contextMenus.onShown.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (!info.menuIds || !info.menuIds.includes("copy-xpath-root")) return;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getLastElementXPaths()
    });
    const xpaths = results?.[0]?.result || [];

    for (const id of submenuIds) {
      try { chrome.contextMenus.remove(id); } catch (e) { /* ignore */ }
    }
    submenuIds = [];

    xpaths.forEach((x, idx) => {
      const id = `xpath-${idx}`;
      chrome.contextMenus.create({
        id,
        parentId: "copy-xpath-root",
        title: x.xpath,
        contexts: ["all"]
      });
      submenuIds.push(id);
    });

    // Zorg dat Chrome het menu ververst zodat nieuwe items zichtbaar zijn
    try { chrome.contextMenus.refresh(); } catch (e) { /* refresh niet ondersteund? */ }
  } catch (e) {
    console.error("Fout bij onShown update:", e);
  }
});

// Kopieer XPath naar clipboard bij klikken
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (!info.menuItemId || !info.menuItemId.startsWith("xpath-")) return;

  const idx = parseInt(info.menuItemId.split("-")[1]);
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getLastElementXPaths()
    });
    const xpaths = results?.[0]?.result || [];
    if (xpaths[idx]) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => navigator.clipboard.writeText(text),
        args: [xpaths[idx].xpath]
      });
    }
  } catch (e) {
    console.error("Fout bij copy-to-clipboard:", e);
  }
});
// ...existing code...

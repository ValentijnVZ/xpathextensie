// background.js

let submenuIds = [];
let lastFrameId = 0;

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
  console.log("[XPath BG] message ontvangen:", msg, "frameId:", sender.frameId);

  if (msg.type === "update-xpath-menu" && sender.tab?.id) {
    const tabId = sender.tab.id;
    lastFrameId = sender.frameId ?? 0;

    const results = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [lastFrameId] },
      func: () => window.getLastElementXPaths()
    });

    const xpaths = results[0]?.result || [];
    console.log("[XPath BG] xpaths gevonden:", xpaths.length, xpaths);

    // Verwijder oude submenu-items
    for (const id of submenuIds) {
      try { chrome.contextMenus.remove(id); } catch (e) {}
    }
    submenuIds = [];

    // Voeg nieuwe submenu-items toe
    xpaths.forEach((x, idx) => {
      const id = `xpath-${idx}`;
      chrome.contextMenus.create({
        id,
        parentId: "copy-xpath-root",
        title: x.xpath.length > 60 ? x.xpath.slice(0, 57) + "…" : x.xpath,
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
      target: { tabId: tab.id, frameIds: [lastFrameId] },
      func: () => window.getLastElementXPaths()
    });

    const xpaths = results[0]?.result || [];
    if (xpaths[idx]) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [lastFrameId] },
        func: (text) => navigator.clipboard.writeText(text),
        args: [xpaths[idx].xpath]
      });
    }
  }
});
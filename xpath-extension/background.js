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
    const frameId = sender.frameId ?? 0; // frameId van het content script dat het bericht stuurde

    // Haal XPaths van content script (in het juiste frame)
    const results = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      func: () => window.getLastElementXPaths()
    });

    const xpaths = results[0].result || [];

    // Haal iframe id op als we niet in het main frame zitten
    let iframeId = null;
    if (frameId !== 0) {
      const iframeResults = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        func: () => {
          // Probeer het iframe-element in de parent te vinden via frameElement
          try {
            const fe = window.frameElement;
            return fe ? (fe.getAttribute("id") || fe.getAttribute("name") || null) : null;
          } catch (e) {
            return null; // cross-origin frameElement is niet toegankelijk
          }
        }
      });
      iframeId = iframeResults[0].result ?? null;
    }

    // Verwijder alleen oude submenu-items
    for (const id of submenuIds) {
      chrome.contextMenus.remove(id);
    }
    submenuIds = [];

    // Voeg nieuwe submenu-items toe
    xpaths.forEach((x, idx) => {
      const id = `xpath-${frameId}-${idx}`; // frameId in het id zodat het uniek blijft
      const iframePrefix = iframeId ? `[iframe#${iframeId}] ` : (frameId !== 0 ? `[iframe frameId:${frameId}] ` : "");
      chrome.contextMenus.create({
        id,
        parentId: "copy-xpath-root",
        title: `${iframePrefix}${x.xpath}`,
        contexts: ["all"]
      });
      submenuIds.push(id);
    });

    // Sla frameId op voor gebruik bij klikken
    chrome.storage.session.set({ lastFrameId: frameId });
  }
});

// Kopieer XPath naar clipboard bij klikken
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId.startsWith("xpath-")) {
    // Haal frameId en idx uit het menu-item id (formaat: xpath-{frameId}-{idx})
    const parts = info.menuItemId.split("-");
    const frameId = parseInt(parts[1]);
    const idx = parseInt(parts[2]);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frameId] },
      func: () => window.getLastElementXPaths()
    });

    const xpaths = results[0].result || [];
    if (xpaths[idx]) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frameId] },
        func: (text) => navigator.clipboard.writeText(text),
        args: [xpaths[idx].xpath]
      });
    }
  }
});
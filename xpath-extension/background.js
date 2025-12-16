chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-xpath-root",
    title: "Copy XPath",
    contexts: ["all"]
  });
});

// Klik op "Copy XPath" → submenu-items toevoegen
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "copy-xpath-root") {
    if (!tab.id) return;

    // Haal XPaths van content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getLastElementXPaths()
    });

    const xpaths = results[0].result || [];

    // Verwijder oude submenu-items
    chrome.contextMenus.removeAll(() => {
      // Hermaak root
      chrome.contextMenus.create({
        id: "copy-xpath-root",
        title: "Copy XPath",
        contexts: ["all"]
      });

      // Voeg submenu-items toe
      xpaths.forEach((x, idx) => {
        chrome.contextMenus.create({
          id: `xpath-${idx}`,
          parentId: "copy-xpath-root",
          title: x.label,
          contexts: ["all"]
        });
      });
    });
  } else if (info.menuItemId.startsWith("xpath-") && tab.id) {
    // Kopieer de geselecteerde XPath
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

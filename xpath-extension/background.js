chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-xpath-root",
    title: "Copy XPath",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "copy-xpath-root") {
    // Haal XPaths van content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getLastElementXPaths()
    });

    const xpaths = results[0].result || [];

    // Verwijder oude submenu-items en hermaak root
    chrome.contextMenus.removeAll(() => {
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
  } else if (info.menuItemId.startsWith("xpath-")) {
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

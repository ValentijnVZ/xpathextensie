let submenuIds = [];

// Root menu bij installatie
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-xpath-root",
    title: "Copy XPath",
    contexts: ["all"]
  });
});

// Verwijder helper: alle submenu's
function clearSubmenus() {
  for (const id of submenuIds) {
    try {
      chrome.contextMenus.remove(id);
    } catch (e) {
      // negeren als item al weg is
    }
  }
  submenuIds = [];
}

// Bouw submenu's uit XPaths
async function buildSubmenus(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.getLastElementXPaths()
  });

  const xpaths = results?.[0]?.result || [];

  clearSubmenus();

  xpaths.forEach((x, idx) => {
    const id = `xpath-${idx}`;
    // Let op: titel kan lang zijn, desnoods inkorten
    const title = x.xpath.length > 120 ? x.xpath.slice(0, 117) + "..." : x.xpath;

    chrome.contextMenus.create({
      id,
      parentId: "copy-xpath-root",
      title,
      contexts: ["all"]
    });

    submenuIds.push(id);
  });
}

// Dynamische update precies bij tonen
chrome.contextMenus.onShown.addListener(async (info, tab) => {
  if (!tab?.id) return;

  await buildSubmenus(tab.id);

  // Forceer redraw zodat nieuwe items direct zichtbaar zijn
  chrome.contextMenus.refresh();
});

// Kopieer XPath naar clipboard bij klikken
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId.startsWith("xpath-")) {
    const idx = parseInt(info.menuItemId.split("-")[1], 10);
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
  }
});

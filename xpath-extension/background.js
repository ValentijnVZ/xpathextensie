let submenuIds = [];

// Helper om root menu te maken
function createRootMenu() {
  chrome.contextMenus.create({
    id: "copy-xpath-root",
    title: "Copy XPath",
    contexts: ["all"]
  }, () => {
    if (chrome.runtime.lastError) {
      // negeren als het al bestaat
    }
  });
}

// Root menu bij installatie en bij opstart
chrome.runtime.onInstalled.addListener(() => {
  createRootMenu();
});
chrome.runtime.onStartup.addListener(() => {
  createRootMenu();
});

// Verwijder alle submenu’s
function clearSubmenus() {
  for (const id of submenuIds) {
    try {
      chrome.contextMenus.remove(id);
    } catch (e) {}
  }
  submenuIds = [];
}

// Bouw submenu’s uit XPaths
async function buildSubmenus(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.getLastElementXPaths()
  });

  const xpaths = results?.[0]?.result || [];
  clearSubmenus();

  xpaths.forEach((x, idx) => {
    const id = `xpath-${idx}`;
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

// Dynamische update bij tonen van menu
chrome.contextMenus.onShown.addListener(async (info, tab) => {
  if (!tab?.id) return;
  createRootMenu(); // zorg dat root er altijd is
  await buildSubmenus(tab.id);
  chrome.contextMenus.refresh(); // forceer redraw
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
;

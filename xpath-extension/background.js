let submenuIds = [];

function createRootMenu() {
  chrome.contextMenus.create({
    id: "copy-xpath-root",
    title: "Copy XPath",
    contexts: ["all"]
  }, () => {
    // duplicate id is oké; we negeren de fout
  });
}

function clearSubmenus() {
  for (const id of submenuIds) {
    try { chrome.contextMenus.remove(id); } catch {}
  }
  submenuIds = [];
}

async function buildSubmenus(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      try { return window.getLastElementXPaths?.() || []; }
      catch { return []; }
    }
  });
  const xpaths = results?.[0]?.result || [];
  clearSubmenus();
  xpaths.forEach((x, idx) => {
    const id = `xpath-${idx}`;
    const title = typeof x?.xpath === "string"
      ? (x.xpath.length > 120 ? x.xpath.slice(0, 117) + "..." : x.xpath)
      : String(x?.xpath || "");
    chrome.contextMenus.create({
      id,
      parentId: "copy-xpath-root",
      title: title || "(leeg)",
      contexts: ["all"]
    });
    submenuIds.push(id);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createRootMenu();
});
chrome.runtime.onStartup.addListener(() => {
  createRootMenu();
});

// Zorg dat het menu er is zodra de SW start
createRootMenu();

chrome.contextMenus.onShown.addListener(async (info, tab) => {
  if (!tab?.id) return;
  createRootMenu();
  await buildSubmenus(tab.id);
  try { chrome.contextMenus.refresh(); } catch {}
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId.startsWith("xpath-")) {
    const idx = parseInt(info.menuItemId.split("-")[1], 10);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try { return window.getLastElementXPaths?.() || []; }
        catch { return []; }
      }
    });
    const xpaths = results?.[0]?.result || [];
    const text = xpaths[idx]?.xpath;
    if (typeof text === "string" && text.length) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (t) => navigator.clipboard.writeText(t),
        args: [text]
      });
    }
  }
});

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
    const frameId = sender.frameId ?? 0;

    try {
      // Haal XPaths op uit het juiste frame
      const results = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        func: () => window.getLastElementXPaths?.() || []
      });

      const xpaths = results?.[0]?.result || [];

      // Oude submenu-items verwijderen
      for (const id of submenuIds) {
        try {
          await chrome.contextMenus.remove(id);
        } catch (e) {
          // negeren als item al weg is
        }
      }
      submenuIds = [];

      // Nieuwe submenu-items toevoegen
      xpaths.forEach((x, idx) => {
        const id = `xpath-${frameId}-${idx}`;

        chrome.contextMenus.create({
          id,
          parentId: "copy-xpath-root",
          title: x.fullXpath || x.xpath || `XPath ${idx + 1}`,
          contexts: ["all"]
        });

        submenuIds.push(id);
      });

      // FrameId opslaan voor debugging / later gebruik
      await chrome.storage.session.set({ lastFrameId: frameId });
    } catch (err) {
      console.error("Fout bij updaten van XPath menu:", err);
    }
  }
});

// Kopieer XPath + iframe context naar clipboard bij klikken
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (!String(info.menuItemId).startsWith("xpath-")) return;

  try {
    // formaat: xpath-{frameId}-{idx}
    const parts = String(info.menuItemId).split("-");
    const frameId = parseInt(parts[1], 10);
    const idx = parseInt(parts[2], 10);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frameId] },
      func: () => window.getLastElementXPaths?.() || []
    });

    const xpaths = results?.[0]?.result || [];
    const selected = xpaths[idx];

    if (!selected) return;

    const textToCopy =
`FRAME_CHAIN: ${selected.frameChainXpath || ""}
ELEMENT_XPATH: ${selected.xpath || ""}
FULL_XPATH: ${selected.fullXpath || selected.xpath || ""}`;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frameId] },
      func: async (text) => {
        await navigator.clipboard.writeText(text);
      },
      args: [textToCopy]
    });

    console.log("Gekopieerd:", textToCopy);
  } catch (err) {
    console.error("Fout bij kopiëren van XPath:", err);
  }
});
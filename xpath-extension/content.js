// content.js

let lastElement = null;
let lastHovered = null;

document.addEventListener("mouseover", (e) => {
  lastHovered = e.target;
}, true);

document.addEventListener("contextmenu", (e) => {
  lastElement = lastHovered || e.target;
  console.log("[XPath] contextmenu op:", lastElement);

  chrome.runtime.sendMessage({ type: "update-xpath-menu" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("[XPath] sendMessage error:", chrome.runtime.lastError.message);
    } else {
      console.log("[XPath] message verstuurd, response:", response);
    }
  });
}, true);

window.getLastElementXPaths = function () {
  if (!lastElement) return [];

  const xpaths = generateXPaths(lastElement);

  const containingIframe = getContainingIframe();
  if (containingIframe) {
    const iframeXPath = getIframeXPath(containingIframe);
    return xpaths.map(x => ({
      label: x.label,
      xpath: `xpath=${iframeXPath} >>> xpath=${x.xpath}`
    }));
  }

  return xpaths;
};
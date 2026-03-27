// content.js

let lastElement = null;

document.addEventListener("mouseover", (e) => {
  lastElement = e.target;
  chrome.runtime.sendMessage({ type: "update-xpath-menu" });
});

window.getLastElementXPaths = () => {
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
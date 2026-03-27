let lastElement = null;

document.addEventListener("contextmenu", (e) => {
  lastElement = e.target;
}, true);

window.getLastElementXPaths = function () {
  if (!lastElement) return [];

  const xpaths = generateXPaths(lastElement);

  // Check of dit script in een iframe draait
  const containingIframe = getContainingIframe();
  if (containingIframe) {
    const iframeXPath = getIframeXPath(containingIframe);
    // Prefix elke xpath met de iframe xpath
    return xpaths.map(x => ({
      label: x.label,
      xpath: `xpath=${iframeXPath} >>> xpath=${x.xpath}`
    }));
  }

  return xpaths;
};
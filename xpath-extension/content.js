let lastElement = null;

document.addEventListener("mouseover", e => {
  lastElement = e.target;

  // Stuur een bericht naar background om menu te updaten
  chrome.runtime.sendMessage({ type: "update-xpath-menu" });
});

window.getLastElementXPaths = () => {
  if (!lastElement) return [];
  return generateXPaths(lastElement); // xpath.js
};

let lastElement = null;

document.addEventListener("contextmenu", e => {
  lastElement = e.target;
  // Geen message meer nodig; onShown in background regelt de update
});

window.getLastElementXPaths = () => {
  if (!lastElement) return [];
  return generateXPaths(lastElement); // uit xpath.js
};

let lastElement = null;

document.addEventListener("mouseover", e => {
  lastElement = e.target;

  chrome.runtime.sendMessage({
    type: "update-xpath-menu"
  });
});

window.getLastElementXPaths = () => {
  if (!lastElement) return [];
  return generateXPaths(lastElement);
};
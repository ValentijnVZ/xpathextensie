const ATTR_PRIORITY = [
  "id",
  "data-testid",
  "data-test",
  "data-cy",
  "name",
  "aria-label",
  "title",
  "placeholder",
  "href",
  "src",
  "type",
  "role",
  "class"
];

function escapeXPathValue(value) {
  if (!value) return "";
  if (value.includes('"') && value.includes("'")) {
    return `concat("${value.replace(/"/g, '",\'"\',"')}")`;
  } else if (value.includes('"')) {
    return `'${value}'`;
  } else {
    return `"${value}"`;
  }
}

function generateXPaths(el) {
  if (!el) return [];
  const tag = el.tagName.toLowerCase();
  const xpaths = [];

  // 1️⃣ Attribuut-gebaseerd (TOP PRIORITEIT)
  for (const attr of ATTR_PRIORITY) {
    if (el.getAttribute(attr)) {
      xpaths.push({
        label: `@${attr}`,
        xpath: `//${tag}[@${attr}=${escapeXPathValue(el.getAttribute(attr))}]`
      });
    }
  }

  // 2️⃣ Tekst-gebaseerd (buttons, links, labels)
  const text = el.innerText?.trim();
  if (
    text &&
    text.length > 0 &&
    text.length <= 60 &&
    ["button", "a", "label", "span"].includes(tag)
  ) {
    xpaths.push({
      label: "text",
      xpath: `//${tag}[normalize-space(.)=${escapeXPathValue(text)}]`
    });
  }

  // 3️⃣ Relatief t.o.v. stabiele parent (WRAPPERS)
  const stableParent = findStableParent(el);
  if (stableParent && stableParent !== el) {
    const parentXPath = generateParentXPath(stableParent);
    const selector = tag === "div" || tag === "section" || tag === "li" || tag === "article"
      ? `.${tag}` 
      : tag;
    if (text && text.length <= 60) {
      xpaths.push({
        label: "relative-parent",
        xpath: `${parentXPath}//${tag}[normalize-space(.)=${escapeXPathValue(text)}]`
      });
    }
    for (const attr of ATTR_PRIORITY) {
      if (el.getAttribute(attr)) {
        xpaths.push({
          label: `relative-${attr}`,
          xpath: `${parentXPath}//${tag}[@${attr}=${escapeXPathValue(el.getAttribute(attr))}]`
        });
      }
    }
  }

  // 4️⃣ Structurele fallback (absolute / semi-absolute)
  xpaths.push({
    label: "fallback",
    xpath: getAbsoluteXPath(el)
  });

  return xpaths;
}

// Zoek stabiele parent (id, data-*, role)
function findStableParent(el) {
  let parent = el.parentElement;
  while (parent) {
    for (const attr of ATTR_PRIORITY) {
      if (parent.getAttribute(attr)) return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

// Genereer XPath van parent
function generateParentXPath(el) {
  if (!el) return "";
  let path = "";
  while (el && el.nodeType === 1) {
    let index = 1;
    let sibling = el.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === el.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    const tag = el.tagName.toLowerCase();
    path = `/${tag}[${index}]` + path;
    if (el.getAttribute("id")) {
      path = `//${tag}[@id=${escapeXPathValue(el.getAttribute("id"))}]` + path;
      break; // stop bij id
    }
    el = el.parentElement;
  }
  return path || "/";
}

// Absolute XPath fallback
function getAbsoluteXPath(el) {
  if (!el) return "";
  const parts = [];
  while (el && el.nodeType === 1) {
    let index = 1;
    let sibling = el.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === el.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    const tag = el.tagName.toLowerCase();
    parts.unshift(`${tag}[${index}]`);
    el = el.parentElement;
  }
  return "/" + parts.join("/");
}

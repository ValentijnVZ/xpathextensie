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

// Genereer combinaties van attributen: name+class en aria-label+class
function generateAttributeCombinations(el) {
  const xpaths = [];
  const tag = el.tagName.toLowerCase();

  const combinations = [
    ["name", "class"],
    ["aria-label", "class"]
  ];

  combinations.forEach((attrs) => {
    const parts = [];
    const labelParts = [];
    attrs.forEach(attr => {
      const val = el.getAttribute(attr);
      if (val) {
        parts.push(`@${attr}=${escapeXPathValue(val)}`);
        labelParts.push(`@${attr}`);
      }
    });
    if (parts.length === attrs.length) { // alleen volledige combinaties
      xpaths.push({
        label: labelParts.join(" + "),
        xpath: `//${tag}[${parts.join(" and ")}]`
      });
    }
  });

  return xpaths;
}

function generateXPaths(el) {
  if (!el) return [];
  const tag = el.tagName.toLowerCase();
  const xpaths = [];

  // 1️⃣ Attribuut-gebaseerd (enkele attributen)
  for (const attr of ATTR_PRIORITY) {
    const val = el.getAttribute(attr);
    if (val) {
      xpaths.push({
        label: `@${attr}`,
        xpath: `//${tag}[@${attr}=${escapeXPathValue(val)}]`
      });
    }
  }

  // 2️⃣ Tekst-gebaseerd (buttons, links, labels)
  const text = el.innerText?.trim();
  if (text && text.length > 0 && text.length <= 60 && ["button","a","label","span"].includes(tag)) {
    xpaths.push({
      label: "text",
      xpath: `//${tag}[normalize-space(.)=${escapeXPathValue(text)}]`
    });
  }

  // 3️⃣ Twee combinaties van attributen
  const combos = generateAttributeCombinations(el);
  xpaths.push(...combos);

  // 4️⃣ Structurele fallback (absolute / semi-absolute)
  xpaths.push({
    label: "fallback",
    xpath: getAbsoluteXPath(el)
  });

  return xpaths;
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

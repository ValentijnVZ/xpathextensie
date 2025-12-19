// ============================
// xpath.js
// ============================

const ATTR_PRIORITY = [
  "id", "data-testid", "data-test", "data-cy",
  "name", "aria-label", "title", "placeholder",
  "href", "src", "type", "role", "class"
];

// Escape waarde voor XPath
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

// Combinaties van attributen
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
    if (parts.length === attrs.length) {
      xpaths.push({
        label: labelParts.join(" + "),
        xpath: `//${tag}[${parts.join(" and ")}]`
      });
    }
  });

  return xpaths;
}

// Absolute XPath
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

// ============================
// Universele XPath generator
// ============================
function generateXPaths(el) {
  if (!el) return [];
  const tag = el.tagName.toLowerCase();
  const xpaths = [];
  const text = el.innerText?.trim();

  // 1️⃣ Attribuut-gebaseerd
  for (const attr of ATTR_PRIORITY.concat(["value"])) {
    const val = el.getAttribute(attr);
    if (val) {
      xpaths.push({
        label: `@${attr}`,
        xpath: `//${tag}[@${attr}=${escapeXPathValue(val)}]`
      });
    }
  }

  // 2️⃣ Tekst-gebaseerd
  if (text && text.length > 0 && text.length <= 100) {
    xpaths.push({
      label: "text",
      xpath: `//${tag}[normalize-space(.)=${escapeXPathValue(text)}]`
    });
  }

  // 3️⃣ Combinaties van attributen
  const combos = generateAttributeCombinations(el);
  xpaths.push(...combos);

  // 4️⃣ Speciale gevallen

  // <a> element met href + title
  if (tag === "a") {
    const href = el.getAttribute("href");
    const title = el.getAttribute("title");
    if (href && title) {
      xpaths.push({
        label: "special-a",
        xpath: `//a[@href=${escapeXPathValue(href)} and @title=${escapeXPathValue(title)}]`
      });
    }
  }

  // <input type="submit"> element
  if (tag === "input" && el.type === "submit") {
    const value = el.getAttribute("value") || "";
    xpaths.push({
      label: "submit-button",
      xpath: `//input[@type='submit' and @value=${escapeXPathValue(value)}]`
    });
  }

  // <input type="search"> element
  if (tag === "input" && el.type === "search") {
    const cls = el.getAttribute("class");
    const title = el.getAttribute("title");
    xpaths.push({
      label: "search-input",
      xpath: `//input[@type='search'${cls ? ` and @class=${escapeXPathValue(cls)}` : ""}${title ? ` and @title=${escapeXPathValue(title)}` : ""}]`
    });

    // Container-based robust XPath (div contains class field)
    let parent = el.parentElement;
    while (parent) {
      const parentClass = parent.getAttribute("class");
      if (parentClass && parentClass.includes("field")) {
        xpaths.push({
          label: "container-div-field",
          xpath: `//div[contains(@class,'field')]//input[@type='search']`
        });
        break;
      }
      parent = parent.parentElement;
    }
  }

  // 5️⃣ Algemeen type+value XPath voor alle inputs
  if (tag === "input") {
    const val = el.getAttribute("value");
    if (val) {
      xpaths.push({
        label: "type-value",
        xpath: `//input[@type='${el.type}' and @value=${escapeXPathValue(val)}]`
      });
    }
  }

  // 6️⃣ <label> element met tekst
  if (tag === "label" && text) {
    xpaths.push({
      label: "label-text",
      xpath: `//label[normalize-space(text())=${escapeXPathValue(text)}]`
    });
  }

  // 7️⃣ Universele wrapper/ancestor XPaths
  let ancestor = el.parentElement;
  while (ancestor) {
    const cls = ancestor.getAttribute("class");
    const ancTag = ancestor.tagName.toLowerCase();
    if (cls) {
      xpaths.push({
        label: `ancestor-${ancTag}-class`,
        xpath: `//${ancTag}[contains(@class,${escapeXPathValue(cls)})]//${tag}${text ? `[normalize-space(.)=${escapeXPathValue(text)}]` : ""}`
      });
    } else {
      xpaths.push({
        label: `ancestor-${ancTag}`,
        xpath: `//${ancTag}//${tag}${text ? `[normalize-space(.)=${escapeXPathValue(text)}]` : ""}`
      });
    }
    ancestor = ancestor.parentElement;
  }

  // 8️⃣ Combinatie van attributen + tekst
  const attrCombo = [];
  for (const attr of ["id","name","aria-label","title"]) {
    const val = el.getAttribute(attr);
    if (val) attrCombo.push(`@${attr}=${escapeXPathValue(val)}`);
  }
  if (attrCombo.length && text) {
    xpaths.push({
      label: "attr+text",
      xpath: `//${tag}[${attrCombo.join(" and ")} and normalize-space(.)=${escapeXPathValue(text)}]`
    });
  }

  // 9️⃣ Structurele fallback (absolute XPath)
  xpaths.push({
    label: "fallback",
    xpath: getAbsoluteXPath(el)
  });

  return xpaths;
}

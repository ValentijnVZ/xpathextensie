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

// Test of XPath een element vindt
function testXPath(xpath) {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return !!result.singleNodeValue;
  } catch (e) {
    return false;
  }
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

// Combinaties van attributen
function generateAttributeCombinations(el) {
  const xpaths = [];
  const tag = el.tagName.toLowerCase();
  const combinations = [
    ["name", "class"],
    ["aria-label", "class"]
  ];

  combinations.forEach(attrs => {
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

  if (tag === "input" && el.type === "submit") {
    const value = el.getAttribute("value") || "";
    xpaths.push({
      label: "submit-button",
      xpath: `//input[@type='submit' and @value=${escapeXPathValue(value)}]`
    });
  }

  if (tag === "input" && el.type === "search") {
    const cls = el.getAttribute("class");
    const title = el.getAttribute("title");
    xpaths.push({
      label: "search-input",
      xpath: `//input[@type='search'${cls ? ` and @class=${escapeXPathValue(cls)}` : ""}${title ? ` and @title=${escapeXPathValue(title)}` : ""}]`
    });

    // Container-div wrapper max 2 niveaus omhoog
    let parent = el.parentElement;
    let levelsUp = 0;
    while (parent && levelsUp < 3) { // max 2-3 divs omhoog
      const parentClass = parent.getAttribute("class");
      if (parent && parent.tagName.toLowerCase() === "div" && parentClass) {
        xpaths.push({
          label: "container-div-field",
          xpath: `//div[contains(@class,'${parentClass}')]//input[@type='search']`
        });
        break;
      }
      parent = parent.parentElement;
      levelsUp++;
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

  // 7️⃣ Universele wrapper-div XPaths (max 2 niveaus, alleen div met class)
  let ancestor = el.parentElement;
  let divLevels = 0;
  while (ancestor && divLevels < 3) { // max 2 divs omhoog
    const ancTag = ancestor.tagName.toLowerCase();
    const cls = ancestor.getAttribute("class");
    if (ancTag === "div" && cls) {
      xpaths.push({
        label: `ancestor-div-class`,
        xpath: `//div[contains(@class,${escapeXPathValue(cls)})]//${tag}${text ? `[normalize-space(.)=${escapeXPathValue(text)}]` : ""}`
      });
      divLevels++;
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

  // ✅ Filter XPaths die niet werken + geen html/body + divs moeten contain class hebben
  return xpaths.filter(x => {
    if (!testXPath(x.xpath)) return false;
    if (x.xpath.startsWith("/html") || x.xpath.startsWith("/body")) return false;
    if (x.xpath.includes("//div") && !/contains\(@class/.test(x.xpath)) return false;
    return true;
  });
}

// ============================
// xpath.js (EXTENSION SAFE & GENERIC WRAPPER SUPPORT)
// ============================

const ATTR_PRIORITY = [
  "id", "data-testid", "data-test", "data-cy",
  "name", "aria-label", "title", "placeholder",
  "href", "src", "type", "role", "class",
  "aria-controls", "aria-expanded", "aria-hidden"
];

// ============================
// Escape waarde voor XPath
// ============================
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

// ============================
// Check of XPath werkt (Inspect)
// ============================
function xpathWorks(xpath) {
  try {
    const res = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    return res.snapshotLength > 0;
  } catch {
    return false;
  }
}

// ============================
// Veilige tekst (GEEN containers)
// ============================
function safeText(el) {
  if (!el) return "";
  const txt = el.textContent.replace(/\s+/g, " ").trim();
  if (txt.length < 2 || txt.length > 100) return "";
  if (el.children.length > 0 && el.tagName.toLowerCase() !== "span") return "";
  return txt;
}

// ============================
// Absolute XPath (fallback)
// ============================
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
    parts.unshift(`${el.tagName.toLowerCase()}[${index}]`);
    el = el.parentElement;
  }
  return "/" + parts.join("/");
}

// ============================
// Attribuut combinaties
// ============================
function generateAttributeCombinations(el) {
  const xpaths = [];
  const tag = el.tagName.toLowerCase();

  const combinations = [
    ["name", "class"],
    ["aria-label", "class"]
  ];

  combinations.forEach(attrs => {
    const parts = [];
    attrs.forEach(attr => {
      const val = el.getAttribute(attr);
      if (val) {
        parts.push(
          attr === "class"
            ? `contains(@class,${escapeXPathValue(val.split(" ")[0])})`
            : `@${attr}=${escapeXPathValue(val)}`
        );
      }
    });

    if (parts.length === attrs.length) {
      const xp = `//${tag}[${parts.join(" and ")}]`;
      if (xpathWorks(xp)) {
        xpaths.push({ label: attrs.join("+"), xpath: xp });
      }
    }
  });

  return xpaths;
}

// ============================
// Wrapper-div support (generiek)
// ============================
function generateWrapperXPaths(el) {
  const xpaths = [];
  if (el.tagName.toLowerCase() !== "div") return xpaths;

  // Wrapper als meerdere belangrijke child elementen aanwezig zijn
  const importantChildren = el.querySelectorAll("div,h2,h3,span,p,address,a");
  if (importantChildren.length > 1) {
    const cls = el.getAttribute("class");
    let xp;
    if (cls) {
      xp = `//div[contains(@class,${escapeXPathValue(cls.split(" ")[0])})]`;
    } else {
      xp = getAbsoluteXPath(el);
    }

    if (xpathWorks(xp)) xpaths.push({ label: "wrapper-div", xpath: xp });

    // Child-items binnen wrapper
    importantChildren.forEach(child => {
      const childText = safeText(child);
      if (childText) {
        const childXP = `${xp}//*[contains(normalize-space(.),${escapeXPathValue(childText)})]`;
        if (xpathWorks(childXP)) xpaths.push({ label: "wrapper-child-text", xpath: childXP });
      }
    });
  }

  return xpaths;
}

// ============================
// Universele XPath generator
// ============================
function generateXPaths(el) {
  if (!el || el.nodeType !== 1) return [];

  const tag = el.tagName.toLowerCase();
  const xpaths = [];
  const text = safeText(el);

  // 1️⃣ Attribuut-gebaseerd
  for (const attr of ATTR_PRIORITY.concat(["value"])) {
    const val = el.getAttribute(attr);
    if (!val) continue;

    const xp =
      attr === "class"
        ? `//${tag}[contains(@class,${escapeXPathValue(val.split(" ")[0])})]`
        : `//${tag}[@${attr}=${escapeXPathValue(val)}]`;

    if (xpathWorks(xp)) {
      xpaths.push({ label: `@${attr}`, xpath: xp });
    }
  }

  // 2️⃣ Tekst-gebaseerd
  if (text) {
    const xp = `//${tag}[contains(normalize-space(.),${escapeXPathValue(text)})]`;
    if (xpathWorks(xp)) xpaths.push({ label: "text", xpath: xp });
  }

  // 3️⃣ Attribuut combinaties
  xpaths.push(...generateAttributeCombinations(el));

  // 4️⃣ Speciale gevallen
  if (tag === "a") {
    const href = el.getAttribute("href");
    if (href) {
      const xp = `//a[@href=${escapeXPathValue(href)}]`;
      if (xpathWorks(xp)) xpaths.push({ label: "link-href", xpath: xp });
    }

    const childSpan = el.querySelector("span");
    if (childSpan) {
      const spanText = safeText(childSpan);
      if (spanText) {
        const xp = `//a[@href=${escapeXPathValue(href)}]//span[contains(normalize-space(.),${escapeXPathValue(spanText)})]`;
        if (xpathWorks(xp)) xpaths.push({ label: "a+span-text", xpath: xp });
      }
    }
  }

  if (tag === "input" && el.type === "submit") {
    const val = el.getAttribute("value");
    if (val) {
      const xp = `//input[@type='submit' and @value=${escapeXPathValue(val)}]`;
      if (xpathWorks(xp)) xpaths.push({ label: "submit", xpath: xp });
    }
  }

  // 5️⃣ Parent → child (GEEN div/div duplicates)
  const parent = el.parentElement;
  if (parent && parent.tagName !== el.tagName) {
    const cls = parent.getAttribute("class");
    if (cls) {
      const xp = `//${parent.tagName.toLowerCase()}[contains(@class,${escapeXPathValue(cls.split(" ")[0])})]//${tag}`;
      if (xpathWorks(xp)) xpaths.push({ label: "parent-child", xpath: xp });
    }
  }

  // 6️⃣ Wrapper-divs generiek
  xpaths.push(...generateWrapperXPaths(el));

  // 7️⃣ Absolute fallback
  const abs = getAbsoluteXPath(el);
  if (xpathWorks(abs)) {
    xpaths.push({ label: "absolute", xpath: abs });
  }

  // Duplicaten verwijderen
  const seen = new Set();
  return xpaths.filter(x => {
    if (seen.has(x.xpath)) return false;
    seen.add(x.xpath);
    return true;
  });
}

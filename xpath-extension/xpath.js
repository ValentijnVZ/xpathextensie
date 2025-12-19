// ============================
// xpath.js
// ============================

const ATTR_PRIORITY = [
  "id", "data-testid", "data-test", "data-cy",
  "name", "aria-label", "title", "placeholder",
  "href", "src", "type", "role", "class"
];

// ============================
// Helpers
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

// ❌ instabiele / layout classes
const BAD_CLASS_REGEX =
  /(col-|row-|grid|layout|container-|wrapper-|header|footer|main|section|nav|aside|__|\d)/i;

function isStableClass(cls) {
  if (!cls) return false;
  if (cls.length < 4) return false;
  return !BAD_CLASS_REGEX.test(cls);
}

function getBestStableClass(classAttr) {
  if (!classAttr) return null;
  return classAttr
    .split(/\s+/)
    .find(cls => isStableClass(cls)) || null;
}

// ============================
// Attribute combinaties
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
      if (val) parts.push(`@${attr}=${escapeXPathValue(val)}`);
    });

    if (parts.length === attrs.length) {
      xpaths.push({
        label: "attr-combo",
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
  const text = el.innerText?.trim();
  const xpaths = [];

  // 1️⃣ Enkel attribuut (sterkste)
  for (const attr of ATTR_PRIORITY) {
    const val = el.getAttribute(attr);
    if (val) {
      xpaths.push({
        label: `@${attr}`,
        xpath: `//${tag}[@${attr}=${escapeXPathValue(val)}]`
      });
    }
  }

  // 2️⃣ Tekst-gebaseerd
  if (text && text.length <= 100) {
    xpaths.push({
      label: "text",
      xpath: `//${tag}[normalize-space(.)=${escapeXPathValue(text)}]`
    });
  }

  // 3️⃣ Attribuut combinaties
  xpaths.push(...generateAttributeCombinations(el));

  // 4️⃣ Speciale types
  if (tag === "a") {
    const href = el.getAttribute("href");
    if (href) {
      xpaths.push({
        label: "link-href",
        xpath: `//a[@href=${escapeXPathValue(href)}]`
      });
    }
  }

  if (tag === "input" && el.type) {
    xpaths.push({
      label: "input-type",
      xpath: `//input[@type='${el.type}']`
    });
  }

  // ============================
  // 5️⃣ ROBUSTE DIV-WRAPPERS (max 5)
  // ============================

  const divXPaths = [];
  const seenClasses = new Set();
  let parent = el.parentElement;

  while (parent && divXPaths.length < 5) {
    if (parent.tagName.toLowerCase() === "div") {
      const stableClass = getBestStableClass(parent.getAttribute("class"));

      if (stableClass && !seenClasses.has(stableClass)) {
        seenClasses.add(stableClass);

        divXPaths.push({
          label: "div-wrapper",
          xpath: `//div[contains(@class,${escapeXPathValue(stableClass)})]//${tag}${
            text ? `[normalize-space(.)=${escapeXPathValue(text)}]` : ""
          }`
        });
      }
    }
    parent = parent.parentElement;
  }

  xpaths.push(...divXPaths);

  // ============================
  // 6️⃣ Combinatie van attributen + tekst  ✅ (BEHOUDEN)
  // ============================

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

  // ❌ GEEN fallback meer

  return xpaths;
}

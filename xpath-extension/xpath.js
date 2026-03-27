const ATTR_PRIORITY = [
  "id", "data-testid", "data-test", "data-cy",
  "name", "aria-label", "title", "placeholder",
  "href", "src", "type", "role", "class"
];

// Laatst aangeklikt element bewaren
let lastElement = null;

// Escape waarde voor XPath
function escapeXPathValue(value) {
  if (value == null) return '""';
  value = String(value);

  if (value.includes('"') && value.includes("'")) {
    const parts = value.split('"');
    return `concat(${parts.map((part, i) =>
      i === parts.length - 1
        ? `"${part}"`
        : `"${part}", '"', `
    ).join("")})`;
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

// Maak zo goed mogelijke XPath voor iframe-element zelf
function buildIframeSelector(frameEl) {
  if (!frameEl) {
    return {
      xpath: "//iframe",
      meta: {
        tag: "iframe",
        id: null,
        name: null,
        title: null,
        src: null,
        selectorType: "fallback"
      }
    };
  }

  const tag = frameEl.tagName.toLowerCase();
  const id = frameEl.getAttribute("id");
  const name = frameEl.getAttribute("name");
  const title = frameEl.getAttribute("title");
  const src = frameEl.getAttribute("src");

  if (id) {
    return {
      xpath: `//${tag}[@id=${escapeXPathValue(id)}]`,
      meta: { tag, id, name, title, src, selectorType: "id" }
    };
  }

  if (name) {
    return {
      xpath: `//${tag}[@name=${escapeXPathValue(name)}]`,
      meta: { tag, id, name, title, src, selectorType: "name" }
    };
  }

  if (title) {
    return {
      xpath: `//${tag}[@title=${escapeXPathValue(title)}]`,
      meta: { tag, id, name, title, src, selectorType: "title" }
    };
  }

  if (src) {
    return {
      xpath: `//${tag}[@src=${escapeXPathValue(src)}]`,
      meta: { tag, id, name, title, src, selectorType: "src" }
    };
  }

  return {
    xpath: getAbsoluteXPath(frameEl),
    meta: {
      tag,
      id,
      name,
      title,
      src,
      selectorType: "absolute"
    }
  };
}

// Haal complete iframe-chain op: top -> current frame
function getFrameChainContext() {
  const chain = [];

  try {
    let currentWindow = window;

    while (currentWindow !== currentWindow.top) {
      let frameEl = null;

      try {
        frameEl = currentWindow.frameElement;
      } catch (e) {
        frameEl = null;
      }

      if (!frameEl) {
        chain.unshift({
          xpath: "//iframe",
          meta: {
            tag: "iframe",
            id: null,
            name: null,
            title: null,
            src: null,
            selectorType: "unknown"
          }
        });
        break;
      }

      chain.unshift(buildIframeSelector(frameEl));

      try {
        currentWindow = currentWindow.parent;
      } catch (e) {
        break;
      }
    }
  } catch (e) {
    // negeren
  }

  return chain;
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

// Universele XPath generator
function generateXPaths(el) {
  if (!el || el.nodeType !== 1) return [];

  const tag = el.tagName.toLowerCase();
  const xpaths = [];
  const text = el.innerText?.trim();

  // 1. Attribuut-gebaseerd
  for (const attr of ATTR_PRIORITY.concat(["value"])) {
    const val = el.getAttribute(attr);
    if (val) {
      xpaths.push({
        label: `@${attr}`,
        xpath: `//${tag}[@${attr}=${escapeXPathValue(val)}]`
      });
    }
  }

  // 2. Tekst-gebaseerd
  if (text && text.length > 0 && text.length <= 100) {
    xpaths.push({
      label: "text",
      xpath: `//${tag}[normalize-space(.)=${escapeXPathValue(text)}]`
    });
  }

  // 3. Attribuut combinaties
  xpaths.push(...generateAttributeCombinations(el));

  // 4. Speciale gevallen
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

    let parent = el.parentElement;
    let levelsUp = 0;

    while (parent && levelsUp < 3) {
      const parentClass = parent.getAttribute("class");
      if (parent.tagName.toLowerCase() === "div" && parentClass) {
        xpaths.push({
          label: "container-div-field",
          xpath: `//div[contains(@class,${escapeXPathValue(parentClass)})]//input[@type='search']`
        });
        break;
      }
      parent = parent.parentElement;
      levelsUp++;
    }
  }

  // 5. Algemeen type+value voor input
  if (tag === "input") {
    const val = el.getAttribute("value");
    if (val) {
      xpaths.push({
        label: "type-value",
        xpath: `//input[@type=${escapeXPathValue(el.type)} and @value=${escapeXPathValue(val)}]`
      });
    }
  }

  // 6. Label op tekst
  if (tag === "label" && text) {
    xpaths.push({
      label: "label-text",
      xpath: `//label[normalize-space(text())=${escapeXPathValue(text)}]`
    });
  }

  // 7. Wrapper divs
  let ancestor = el.parentElement;
  let divLevels = 0;

  while (ancestor && divLevels < 3) {
    const ancTag = ancestor.tagName.toLowerCase();
    const cls = ancestor.getAttribute("class");

    if (ancTag === "div" && cls) {
      xpaths.push({
        label: "ancestor-div-class",
        xpath: `//div[contains(@class,${escapeXPathValue(cls)})]//${tag}${text ? `[normalize-space(.)=${escapeXPathValue(text)}]` : ""}`
      });
      divLevels++;
    }

    ancestor = ancestor.parentElement;
  }

  // 8. Attributen + tekst
  const attrCombo = [];
  for (const attr of ["id", "name", "aria-label", "title"]) {
    const val = el.getAttribute(attr);
    if (val) attrCombo.push(`@${attr}=${escapeXPathValue(val)}`);
  }

  if (attrCombo.length && text) {
    xpaths.push({
      label: "attr+text",
      xpath: `//${tag}[${attrCombo.join(" and ")} and normalize-space(.)=${escapeXPathValue(text)}]`
    });
  }

  // 9. Absolute fallback
  xpaths.push({
    label: "fallback",
    xpath: getAbsoluteXPath(el)
  });

  // Filter alleen geldige XPaths
  const validXPaths = xpaths.filter(x => {
    if (!x?.xpath) return false;
    if (!testXPath(x.xpath)) return false;
    if (x.xpath.startsWith("/html") || x.xpath.startsWith("/body")) return false;
    if (x.xpath.includes("//div") && !/contains\(@class/.test(x.xpath) && !x.xpath.startsWith("/")) return false;
    return true;
  });

  // Frame chain ophalen
  const frameChain = getFrameChainContext();
  const frameChainXpath = frameChain.map(f => f.xpath).join(" => ");
  const frameMeta = frameChain.map(f => f.meta);

  // Resultaat uitbreiden met frame info
  return validXPaths.map(x => {
    const fullXpath = frameChainXpath
      ? `${frameChainXpath} => ${x.xpath}`
      : x.xpath;

    return {
      ...x,
      frameChain,
      frameMeta,
      frameChainXpath,
      fullXpath
    };
  });
}

// Globale functie voor background script
window.getLastElementXPaths = function () {
  if (!lastElement) return [];
  return generateXPaths(lastElement);
};

// Onthoud laatst aangeklikt / context-menu element
document.addEventListener("contextmenu", (event) => {
  lastElement = event.target;
  chrome.runtime.sendMessage({ type: "update-xpath-menu" });
}, true);
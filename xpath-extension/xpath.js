const ATTR_PRIORITY = [
  "id", "data-testid", "data-test", "data-cy",
  "name", "aria-label", "title", "placeholder",
  "href", "src", "type", "role", "class"
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

function generateAttributeCombinations(el) {
  const xpaths = [];
  const tag = el.tagName.toLowerCase();
  const combinations = [["name", "class"], ["aria-label", "class"]];
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

function generateXPaths(el) {
  if (!el) return [];
  const tag = el.tagName.toLowerCase();
  const xpaths = [];

  for (const attr of ATTR_PRIORITY.concat(["value"])) {
    const val = el.getAttribute(attr);
    if (val) {
      xpaths.push({
        label: `@${attr}`,
        xpath: `//${tag}[@${attr}=${escapeXPathValue(val)}]`
      });
    }
  }

  const text = el.innerText?.trim();
  if (text && text.length > 0 && text.length <= 60 && ["button","a","label","span"].includes(tag)) {
    xpaths.push({
      label: "text",
      xpath: `//${tag}[normalize-space(.)=${escapeXPathValue(text)}]`
    });
  }

  xpaths.push(...generateAttributeCombinations(el));

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

  if (tag === "input") {
    const val = el.getAttribute("value");
    if (val) {
      xpaths.push({
        label: "type-value",
        xpath: `//input[@type='${el.type}' and @value=${escapeXPathValue(val)}]`
      });
    }
  }

  if (tag === "label" && text) {
    xpaths.push({
      label: "label-text",
      xpath: `//label[normalize-space(text())=${escapeXPathValue(text)}]`
    });
  }

  xpaths.push({
    label: "fallback",
    xpath: getAbsoluteXPath(el)
  });

  return xpaths;
}

/**
 * Makes admin-authored HTML content safe & useful for display:
 *  - Converts inline/block Markdown (**bold**, # heading, *italic*, `code`, [x](url))
 *    to HTML automatically — no toolbar needed.
 *  - Auto-links bare URLs (http/https/www...) that aren't already inside an <a>.
 *  - Forces every <a> to open in a new tab with safe rel attributes.
 * Runs in the browser via DOMParser (falls back to the raw html on the server).
 */
const HEADING_TAG = { 1: "h2", 2: "h3", 3: "h4", 4: "h4" };

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Convert inline Markdown tokens in a plain string into HTML.
function inlineMarkdown(text) {
  let s = escapeHtml(text);
  // Convert links FIRST and stash them as opaque tokens so the following
  // bold/italic/code passes cannot corrupt URLs that contain '_' or '*'
  // (e.g. https://site/apply_online_form would otherwise get an <em> injected
  // into its href and break the link).
  const store = [];
  const stash = (html) => {
    const token = `\uE000L${store.length}\uE001`;
    store.push(html);
    return token;
  };
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, label, url) => stash(`<a href="${url}">${label}</a>`)); // [label](url)
  s = s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>"); // **bold**
  s = s.replace(/__([^_]+?)__/g, "<strong>$1</strong>"); // __bold__
  s = s.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>"); // *italic*
  s = s.replace(/(^|[^_\w])_(?!\s)([^_]+?)_(?![_\w])/g, "$1<em>$2</em>"); // _italic_
  s = s.replace(/`([^`]+?)`/g, "<code>$1</code>"); // `code`
  s = s.replace(/\uE000L(\d+)\uE001/g, (m, i) => store[Number(i)]); // restore links
  return s;
}

function hasInlineMd(text) {
  return /\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\//.test(text);
}

const _slugify = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "sec";

const _tocNorm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// Turn a scraped "Table of Contents" block into WORKING in-page links that
// smooth-scroll to the matching section heading. Runs for vacancy + blog HTML.
function buildTableOfContents(root, doc) {
  // 1) Give every section heading a stable id (used as scroll target).
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const used = new Set();
  headings.forEach((h) => {
    let id = h.id || _slugify(h.textContent);
    let base = id, n = 2;
    while (used.has(id) || (doc.getElementById && doc.getElementById(id) && doc.getElementById(id) !== h)) {
      id = `${base}-${n++}`;
    }
    h.id = id;
    used.add(id);
  });

  // Resolve a scroll target for a TOC label — first try headings, then any
  // short bold/paragraph label that matches.
  const findTarget = (labelNorm) => {
    if (!labelNorm) return null;
    let hit = headings.find((h) => {
      const hn = _tocNorm(h.textContent);
      return hn && (hn.includes(labelNorm) || labelNorm.includes(hn));
    });
    if (hit) return hit;
    const els = Array.from(root.querySelectorAll("strong, b, p, td, li"));
    hit = els.find((el) => {
      const t = (el.textContent || "").trim();
      if (t.length > 60) return false;
      const hn = _tocNorm(t);
      return hn && (hn === labelNorm || hn.startsWith(labelNorm) || labelNorm.startsWith(hn));
    });
    if (hit) {
      if (!hit.id) {
        let id = _slugify(hit.textContent), base = id, n = 2;
        while (used.has(id)) id = `${base}-${n++}`;
        hit.id = id; used.add(id);
      }
      return hit;
    }
    return null;
  };

  // 2) Collect ALL "Table of Contents" source blocks in the content — scraped
  // articles sometimes carry more than one (e.g. an anchor list + a plain
  // "Table Of Contents" heading followed by a space-separated label line).
  const TOC_HINT = /overview|important dates|eligibility|how to apply|selection|age limit|vacanc/i;
  const SECTION_WORDS = ["overview", "important date", "vacanc", "eligibil", "salary", "fee", "age limit", "selection", "how to apply", "instruction", "link"];
  const looksLikeTocList = (el) => {
    if (!el) return false;
    const low = (el.textContent || "").toLowerCase();
    if (low.length > 900) return false;
    return SECTION_WORDS.filter((w) => low.includes(w)).length >= 4;
  };

  const sources = [];
  for (const el of Array.from(root.querySelectorAll("p, div, ul, ol, nav, section, aside, h1, h2, h3, h4, h5, h6, details, summary"))) {
    if (!el.isConnected) continue;
    const t = (el.textContent || "").trim();
    const low = t.toLowerCase();
    const pipes = (t.match(/\|/g) || []).length;
    const startsToc = /^[\s▼▲►▸▾▿◂◃‣·•\-]*table\s+of\s+contents/i.test(low) && low.length < 900;
    const isPipeList = pipes >= 3 && TOC_HINT.test(low) && low.length < 900;
    if (!startsToc && !isPipeList) continue;
    // Skip if an already-collected source contains this one (avoid nesting dupes)
    if (sources.some((s) => s.contains(el) || el.contains(s))) {
      // keep the outermost: if the new el contains an existing source, replace it
      for (let i = sources.length - 1; i >= 0; i--) {
        if (el.contains(sources[i]) && el !== sources[i]) sources.splice(i, 1);
      }
      if (sources.some((s) => s.contains(el))) continue;
    }
    sources.push(el);
  }
  if (sources.length === 0) return;

  // 3) Parse the best set of labels from the sources.
  const parseLabels = (text) => {
    const raw = (text || "").replace(/^[\s▼▲►▸▾▿◂◃‣·•\-]*table\s+of\s+contents\s*:?/i, "").trim();
    if (!raw) return [];
    let parts;
    if (/\|/.test(raw)) parts = raw.split(/\s*\|\s*/);
    else if (/\n/.test(raw)) parts = raw.split(/\n+/);
    else return []; // single space-separated blob — can't split multiword labels
    return parts.map((s) => s.trim()).filter((s) => s && s.length <= 40);
  };

  let labels = [];
  const listSiblings = []; // heading-form sources' following label lines to remove
  for (const src of sources) {
    const own = parseLabels(src.textContent);
    if (own.length > labels.length) labels = own;
    // A "Table Of Contents" heading often has the labels in the next sibling.
    if (/^[\s▼▲►▸▾▿◂◃‣·•\-]*table\s+of\s+contents/i.test((src.textContent || "").trim().toLowerCase())) {
      const next = src.nextElementSibling;
      if (next && looksLikeTocList(next)) {
        listSiblings.push(next);
        const sib = parseLabels(next.textContent);
        if (sib.length > labels.length) labels = sib;
      }
    }
  }

  // Fallback: derive labels from the actual section headings in the content.
  if (labels.length < 2) {
    labels = headings
      .filter((h) => {
        const low = (h.textContent || "").toLowerCase();
        return SECTION_WORDS.some((w) => low.includes(w));
      })
      .map((h) => (h.textContent || "").trim())
      .filter((t) => t && t.length <= 40);
  }
  if (labels.length < 2) return;

  // 4) Build a styled nav of working links (plain text when a section can't be
  // located, so nothing ever looks broken).
  const nav = doc.createElement("nav");
  nav.className = "post-toc";
  const title = doc.createElement("div");
  title.className = "post-toc-title";
  title.textContent = "Table of Contents";
  nav.appendChild(title);
  const ul = doc.createElement("ul");
  ul.className = "post-toc-list";
  let linkCount = 0;
  const seenLabel = new Set();
  labels.forEach((label) => {
    const key = _tocNorm(label);
    if (!key || seenLabel.has(key)) return;
    seenLabel.add(key);
    const li = doc.createElement("li");
    const target = findTarget(key);
    if (target) {
      const a = doc.createElement("a");
      a.setAttribute("href", `#${target.id}`);
      a.className = "post-toc-link";
      a.textContent = label;
      li.appendChild(a);
      linkCount++;
    } else {
      li.textContent = label;
    }
    ul.appendChild(li);
  });
  nav.appendChild(ul);
  if (linkCount === 0) return;

  // 5) Insert the working nav in place of the first source, then remove every
  // other original TOC block (and heading-follow label lines) so no duplicate
  // raw "Table Of Contents" text remains.
  const first = sources[0];
  first.replaceWith(nav);
  sources.slice(1).forEach((s) => { if (s.isConnected) s.remove(); });
  listSiblings.forEach((s) => { if (s.isConnected && !s.closest(".post-toc")) s.remove(); });
}

// Convert Markdown embedded in the parsed HTML DOM (block headings + inline).
function applyMarkdown(root, doc) {
  // Block-level headings: a P/DIV line OR a bare text-node line whose text
  // starts with #, ##, ### ... (contentEditable often leaves the first line
  // as a bare text node, so we must handle both cases).
  const headingRe = /^\s*(#{1,4})\s+(.+?)\s*$/;
  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === 1 && ["P", "DIV"].includes(node.tagName) && !node.querySelector("*")) {
      const m = node.textContent.match(headingRe);
      if (!m) return;
      const h = doc.createElement(HEADING_TAG[m[1].length] || "h4");
      h.innerHTML = inlineMarkdown(m[2]);
      node.replaceWith(h);
    } else if (node.nodeType === 3) {
      const m = node.nodeValue.match(headingRe);
      if (!m) return;
      const h = doc.createElement(HEADING_TAG[m[1].length] || "h4");
      h.innerHTML = inlineMarkdown(m[2]);
      node.replaceWith(h);
    }
  });

  // Inline Markdown on remaining plain text nodes.
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const p = node.parentElement;
    if (!p || p.closest("a, code, pre, strong, em, h1, h2, h3, h4")) return;
    const text = node.nodeValue;
    if (!text || !hasInlineMd(text)) return;
    const html = inlineMarkdown(text);
    if (html === escapeHtml(text)) return;
    const span = doc.createElement("span");
    span.innerHTML = html;
    node.replaceWith(...Array.from(span.childNodes));
  });
}

// Convert a plain markdown-ish text (with newlines, "# heading", "**bold**",
// "* bullet" lines and bare URLs) into block HTML. Used for the AI-generated
// Hindi content so headings render bold/highlighted and links become clickable.
export function mdBlocksToHtml(text) {
  if (!text) return "";
  const lines = String(text).split(/\r?\n/);
  const out = [];
  let listBuf = [];
  let tableBuf = [];
  const flushList = () => {
    if (listBuf.length) {
      out.push("<ul>" + listBuf.map((li) => `<li>${li}</li>`).join("") + "</ul>");
      listBuf = [];
    }
  };
  const splitRow = (line) => line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
  const isSep = (cells) => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, "")));
  const flushTable = () => {
    if (!tableBuf.length) return;
    const rows = tableBuf.map(splitRow);
    tableBuf = [];
    // Not a real table (needs a header + at least one row) → render as paragraphs.
    if (rows.length < 2) {
      rows.forEach((r) => out.push(`<p>${r.join(" ")}</p>`));
      return;
    }
    const header = rows[0];
    const body = rows.slice(1).filter((r) => !isSep(r));
    let html = '<div class="table-wrap"><table><thead><tr>' +
      header.map((c) => `<th>${c}</th>`).join("") + "</tr></thead><tbody>";
    body.forEach((r) => { html += "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>"; });
    html += "</tbody></table></div>";
    out.push(html);
  };
  for (const raw of lines) {
    const line = raw.trim();
    // A markdown table row has 2+ pipe characters.
    const isTableRow = (line.match(/\|/g) || []).length >= 2;
    if (isTableRow) { flushList(); tableBuf.push(line); continue; }
    flushTable();
    if (!line) { flushList(); continue; }
    const bullet = line.match(/^(?:[*\-•·]|\d+[.)])\s+(.*)$/);
    if (bullet) { listBuf.push(bullet[1]); continue; }
    flushList();
    out.push(`<p>${line}</p>`);
  }
  flushList();
  flushTable();
  return out.join("");
}

// Full pipeline: markdown text -> block HTML -> enhanced (headings, bold, links).
export function renderRichText(text) {
  return enhanceHtml(mdBlocksToHtml(text));
}


// Bold the protected English technical/official terms wherever they appear in
// the content (Hindi or English) so they visually stand out — e.g. Apply Online,
// Registration Link, Official Notification PDF, Official Website, PDF, Result...
const KEY_TERMS = [
  "Official Notification PDF", "Notification PDF", "Registration Link", "Apply Online",
  "Apply Link", "Official Website", "Online Form", "Admit Card", "Answer Key",
  "Start Date", "Last Date", "Syllabus", "Result", "PDF",
];
const KEY_TERMS_RE = new RegExp(
  "\\b(" + KEY_TERMS.map((t) => t.replace(/ /g, "\\s+")).join("|") + ")\\b",
  "g"
);

function boldKeyTerms(root, doc) {
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const p = node.parentElement;
    if (!p || p.closest("a, code, pre, strong, b, h1, h2, h3, h4, table, thead, tbody, tr, td, th")) return;
    const text = node.nodeValue;
    if (!text) return;
    KEY_TERMS_RE.lastIndex = 0;
    if (!KEY_TERMS_RE.test(text)) return;
    KEY_TERMS_RE.lastIndex = 0;
    const frag = doc.createDocumentFragment();
    let last = 0, m;
    while ((m = KEY_TERMS_RE.exec(text))) {
      const before = text.slice(last, m.index);
      if (before) frag.appendChild(doc.createTextNode(before));
      const strong = doc.createElement("strong");
      strong.textContent = m[0];
      frag.appendChild(strong);
      last = m.index + m[0].length;
    }
    const after = text.slice(last);
    if (after) frag.appendChild(doc.createTextNode(after));
    node.parentNode.replaceChild(frag, node);
  });
}

export function enhanceHtml(html) {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;
  try {
    const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
    const root = doc.getElementById("__root");
    if (!root) return html;

    // 0) Markdown → HTML (bold / headings / italic / code / links).
    applyMarkdown(root, doc);

    // 0a) Turn a scraped "Table of Contents" into working in-page links.
    buildTableOfContents(root, doc);

    // 0b) Strip baked-in inline text colours/backgrounds so the site theme
    // controls contrast. Scraped/pasted content often carries dark inline
    // colours that become invisible in dark mode.
    root.querySelectorAll("[style]").forEach((el) => {
      el.style.removeProperty("color");
      el.style.removeProperty("background");
      el.style.removeProperty("background-color");
      if (!el.getAttribute("style") || !el.getAttribute("style").trim()) {
        el.removeAttribute("style");
      }
    });
    root.querySelectorAll("font[color]").forEach((el) => el.removeAttribute("color"));
    root.querySelectorAll("font[bgcolor]").forEach((el) => el.removeAttribute("bgcolor"));

    const urlRe = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:)"'!?\]])/gi;

    // 1) Linkify bare URLs inside plain text nodes only.
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      // Skip text already inside an anchor.
      if (node.parentElement && node.parentElement.closest("a")) return;
      const text = node.nodeValue;
      if (!text || !urlRe.test(text)) return;
      urlRe.lastIndex = 0;

      const frag = doc.createDocumentFragment();
      let last = 0;
      let m;
      while ((m = urlRe.exec(text))) {
        const before = text.slice(last, m.index);
        if (before) frag.appendChild(doc.createTextNode(before));
        const raw = m[0];
        const a = doc.createElement("a");
        a.href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        a.textContent = raw;
        frag.appendChild(a);
        last = m.index + raw.length;
      }
      const after = text.slice(last);
      if (after) frag.appendChild(doc.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
    });

    // 2) Make external anchors open safely in a new tab — but leave in-page
    // (#id) TOC links alone so they smooth-scroll within the post.
    root.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("#")) return; // in-page TOC link — keep default behaviour
      if (href && !/^https?:\/\//i.test(href) && !href.startsWith("/")) {
        a.setAttribute("href", `https://${href}`);
      }
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer nofollow");
    });

    // 3) Bold the protected English technical/official terms so they stand out.
    boldKeyTerms(root, doc);

    return root.innerHTML;
  } catch {
    return html;
  }
}

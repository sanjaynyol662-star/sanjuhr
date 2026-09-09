import { useEffect } from "react";

/**
 * Injects an admin-supplied raw HTML snippet (verification meta tags, custom
 * <meta>/<link>/<script> tags, etc.) into <head>. Elements are recreated so
 * that verification <meta> and <script> tags actually take effect, and are
 * removed on unmount / when the snippet changes.
 */
const RawHead = ({ html }) => {
  useEffect(() => {
    if (!html || !html.trim()) return undefined;
    const container = document.createElement("div");
    container.innerHTML = html;
    const appended = [];
    Array.from(container.childNodes)
      .filter((n) => n.nodeType === 1)
      .forEach((node) => {
        const el = document.createElement(node.tagName);
        for (const attr of node.attributes) el.setAttribute(attr.name, attr.value);
        if (node.textContent) el.textContent = node.textContent;
        el.setAttribute("data-rawhead", "1");
        document.head.appendChild(el);
        appended.push(el);
      });
    return () => appended.forEach((el) => el.remove());
  }, [html]);
  return null;
};

export default RawHead;

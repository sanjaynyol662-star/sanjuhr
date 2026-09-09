/** Rank Math style live SEO score for job/blog forms. */
export const computeSeoScore = ({ seo_title = "", seo_description = "", focus_keyword = "" }) => {
  let score = 0;
  const checks = [];
  const kw = (focus_keyword || "").trim().toLowerCase();
  const inTitle = !!kw && seo_title.toLowerCase().includes(kw);
  const inDesc = !!kw && seo_description.toLowerCase().includes(kw);
  const tl = seo_title.length;
  const dl = seo_description.length;

  if (inTitle) { score += 25; checks.push({ ok: true, label: "Focus Keyword title mein hai" }); }
  else checks.push({ ok: false, label: "Focus Keyword title mein nahi hai" });

  if (inDesc) { score += 25; checks.push({ ok: true, label: "Focus Keyword description mein hai" }); }
  else checks.push({ ok: false, label: "Focus Keyword description mein nahi hai" });

  if (tl >= 50 && tl <= 60) { score += 25; checks.push({ ok: true, label: `Title length perfect (${tl} chars)` }); }
  else if (tl >= 30) { score += 12; checks.push({ ok: false, label: `Title ${tl} chars — ideal 50-60` }); }
  else checks.push({ ok: false, label: `Title bahut chhota hai (${tl} chars)` });

  if (dl >= 120 && dl <= 160) { score += 25; checks.push({ ok: true, label: `Description length perfect (${dl} chars)` }); }
  else if (dl >= 80) { score += 12; checks.push({ ok: false, label: `Description ${dl} chars — ideal 120-160` }); }
  else checks.push({ ok: false, label: `Description bahut chhoti hai (${dl} chars)` });

  return { score, checks };
};

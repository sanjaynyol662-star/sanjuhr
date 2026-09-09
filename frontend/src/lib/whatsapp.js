export const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029Va4Owji5Ui2bLEktCl1C";

/** Mirrors backend build_whatsapp_summary — used for live previews before save. */
export const buildWhatsAppSummary = (v = {}, siteUrl = "https://hrdigitalservices.in") => {
  const title = (v.post_name || v.title || "[Job Name]").trim();
  const fromText = String(v.post_name || v.title || "").match(/(\d[\d,]*)\s*(post|vacan|seat)/i);
  const posts = v.structured?.total_posts || fromText?.[1] || "Notification देखें";
  const qual = v.qualification || "As per notification";
  const last = v.last_date_text || "जल्द ही घोषित";
  const link = v.id ? `${siteUrl}/vacancies/${v.id}` : v.apply_url || siteUrl;
  return (
    `🔥 ${title} 🔥\n` +
    `✅ कुल पद: ${posts}\n` +
    `✅ योग्यता: ${qual}\n` +
    `📅 आखरी तारीख: ${last}\n` +
    `👇 लिंक: ${link}`
  );
};

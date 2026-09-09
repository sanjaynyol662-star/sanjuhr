import React, { useEffect, useState } from "react";
import { FaBell } from "react-icons/fa";
import { toast } from "sonner";

/**
 * Push-notification subscribe button.
 * Asks the browser for notification permission directly, then hands over to
 * the Webpushr SDK (if its site key is configured) so the subscription is
 * created; otherwise still confirms the permission so the button always responds.
 */
const PushSubscribeButton = ({ lang = "hi", className = "" }) => {
  const hi = lang === "hi";
  const [permission, setPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof Notification !== "undefined" && Notification.permission !== permission) {
        setPermission(Notification.permission);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [permission]);

  if (permission === "unsupported") return null;

  if (permission === "granted") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 ${className}`} data-testid="push-subscribe-status">
        <FaBell /> {hi ? "Push Alerts ON ✓" : "Push Alerts ON ✓"}
      </span>
    );
  }

  const subscribe = async () => {
    if (busy) return;
    if (permission === "denied") {
      toast.error(hi ? "Browser ne notifications block kiye hain — address bar ke 🔒 icon se Notifications 'Allow' karein." : "Notifications are blocked — allow them from the lock icon in the address bar.");
      return;
    }
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        try {
          const wbtn = document.getElementById("webpushr-subscription-button");
          if (wbtn) wbtn.click();
          else if (window.webpushr) window.webpushr("subscribe");
        } catch { /* SDK not configured — permission itself is granted */ }
        toast.success(hi ? "Push Alerts ON — nayi bharti aate hi notification milegi." : "Push alerts enabled — you'll be notified about new vacancies.");
      } else if (result === "denied") {
        toast.error(hi ? "Aapne notifications block kar diye. Browser settings se Allow karein." : "Notifications were blocked. Allow them in browser settings.");
      }
    } catch (e) {
      toast.error(hi ? "Notification permission nahi mil paayi. Dobara try karein." : "Could not request notification permission. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={busy}
      className={`inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold px-4 py-2 rounded-full transition disabled:opacity-60 ${className}`}
      data-testid="push-subscribe-button"
      title={permission === "denied"
        ? (hi ? "Browser settings mein notifications allow karein" : "Enable notifications in browser site settings")
        : (hi ? "Nayi bharti ki push notification paayein" : "Get push notifications for new vacancies")}
    >
      <FaBell className={permission === "denied" ? "opacity-50" : "animate-pulse"} />
      {permission === "denied"
        ? (hi ? "Push Blocked — Settings देखें" : "Push Blocked — see Settings")
        : (hi ? "Push Alerts पाएँ" : "Get Push Alerts")}
    </button>
  );
};

export default PushSubscribeButton;

import React, { forwardRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Megaphone,
  GraduationCap,
  CalendarDays,
  Briefcase,
  MapPin,
  FileText,
  CheckCircle2,
  Globe,
  Star,
  Landmark,
  Users,
  Facebook,
  Send,
  Youtube,
  MessageCircle,
  Smartphone,
  MoveUpLeft,
  Phone,
} from "lucide-react";
import { SITE_NAME, SITE_TAGLINE, SITE_DOMAIN, SITE_BASE_URL } from "./config";

/*
  Pixel-perfect shareable job poster.
  - `shopName` replaces the big header title. If empty -> falls back to SITE_NAME.
  - QR always points to the ORIGINAL vacancy URL (no shop name).
  - Rendered at a fixed 620px base width; export at higher scale for crisp PNG.
*/

const InfoCard = ({ Icon, iconBg, label, labelColor, value, note }) => (
  <div
    style={{
      flex: 1,
      background: "#ffffff",
      border: "1px solid #e6e9f2",
      borderRadius: 14,
      padding: "14px 8px 12px",
      textAlign: "center",
      boxShadow: "0 4px 10px rgba(20,32,77,0.06)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}
  >
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
        boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
      }}
    >
      <Icon size={24} color="#ffffff" strokeWidth={2.2} />
    </div>
    <div
      style={{
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: 0.3,
        color: labelColor,
        textTransform: "uppercase",
        marginBottom: 5,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: 12.5,
        lineHeight: 1.25,
        color: "#1f2a44",
      }}
    >
      {value}
    </div>
    {note && (
      <div
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: 10.5,
          color: "#6b7280",
          marginTop: 3,
        }}
      >
        ({note})
      </div>
    )}
  </div>
);

const Poster = forwardRef(({ shopName, vacancy, logo, contact, accentColor }, ref) => {
  // `accentColor` (e.g. "#12307a" navy default) recolors every brand-primary
  // element in the poster — header band, deadline pill, QR frame, footer strip,
  // and the shop-contact accents. Fallback to the classic navy.
  const brand = accentColor || "#12307a";
  // A slightly darker sibling of brand for gradient depth. `color-mix` is CSS Colors 5
  // (supported in every modern engine). No JS math needed.
  const brandDark = `color-mix(in srgb, ${brand} 55%, black)`;
  const brandGradient = `linear-gradient(135deg, ${brand} 0%, ${brand} 55%, ${brandDark} 100%)`;
  const title = (shopName && shopName.trim()) || SITE_NAME;
  const qrUrl = `${SITE_BASE_URL}/vacancies/${vacancy.id}`;

  return (
    <div
      ref={ref}
      style={{
        width: 620,
        background: "#eef1f8",
        border: "3px solid #14204d",
        borderRadius: 10,
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
        color: "#14204d",
        position: "relative",
      }}
    >
      {/* ===== HEADER ===== */}
      <div
        style={{
          background: brandGradient,
          padding: "16px 18px 14px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          position: "relative",
        }}
      >
        {/* Logo badge */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "0 34px 34px 0",
            marginLeft: -18,
            padding: "10px 22px 10px 22px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          {logo ? (
            <img
              src={logo}
              alt="logo"
              crossOrigin="anonymous"
              style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 6 }}
            />
          ) : (
            <>
              <GraduationCap size={22} color={brand} strokeWidth={2.5} />
              <span
                style={{
                  fontFamily: "'Anton', sans-serif",
                  fontSize: 34,
                  color: brand,
                  lineHeight: 1,
                  letterSpacing: -1,
                }}
              >
                HR
              </span>
            </>
          )}
        </div>
        {/* Title */}
        <div style={{ flex: 1, textAlign: "center", paddingRight: 6 }}>
          <div
            style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: title.length > 30 ? 24 : title.length > 22 ? 30 : 40,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            <Star size={12} color="#ffd60a" fill="#ffd60a" />
            <span
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: "#ffd60a",
                letterSpacing: 0.3,
              }}
            >
              {SITE_TAGLINE}
            </span>
            <Star size={12} color="#ffd60a" fill="#ffd60a" />
          </div>
          {contact && contact.trim().length >= 4 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
                background: "#25d366",
                borderRadius: 20,
                padding: "3px 12px",
              }}
            >
              <Phone size={13} color="#ffffff" fill="#ffffff" />
              <span
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#ffffff",
                  letterSpacing: 0.4,
                }}
              >
                {contact.trim()}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Yellow divider */}
      <div style={{ height: 5, background: "#ffcc00" }} />

      {/* ===== MAIN ===== */}
      <div style={{ padding: "16px 18px 4px", position: "relative" }}>
        {/* Megaphone + New Job Update + court illustration */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flexShrink: 0, marginTop: 30 }}>
            <Megaphone size={62} color="#e11d2a" strokeWidth={2} style={{ transform: "rotate(-8deg)" }} />
          </div>
          <div style={{ flex: 1 }}>
            {/* NEW JOB UPDATE banner */}
            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(90deg,#e11d2a,#b3121d)",
                color: "#fff",
                fontFamily: "'Anton', sans-serif",
                fontSize: 26,
                letterSpacing: 1,
                padding: "6px 20px 6px 16px",
                clipPath: "polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%)",
                paddingRight: 34,
                boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
              }}
            >
              NEW JOB UPDATE
            </div>
            {/* Job title (auto-sizes with length) */}
            {(() => {
              const t = String(vacancy.jobTitle || "");
              const size = t.length > 60 ? 22 : t.length > 40 ? 26 : t.length > 26 ? 32 : 38;
              return (
                <div
                  style={{
                    fontFamily: "'Anton', sans-serif",
                    fontSize: size,
                    color: brand,
                    lineHeight: 1.05,
                    marginTop: 8,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {t}
                </div>
              );
            })()}
          </div>
          <div style={{ flexShrink: 0, marginTop: 4 }}>
            <Landmark size={82} color="#9aa3b8" strokeWidth={1.4} />
          </div>
        </div>

        {/* Organization bar + Total posts */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 12, marginTop: 10 }}>
          <div
            style={{
              flex: 1,
              background: brand,
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "2px solid #ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Landmark size={22} color="#ffffff" />
            </div>
            {(() => {
              const org = String(vacancy.organization || "");
              const size = org.length > 40 ? 15 : org.length > 26 ? 18 : 22;
              return (
                <span
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: size,
                    color: "#ffffff",
                    lineHeight: 1.15,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {org}
                </span>
              );
            })()}
          </div>
          <div
            style={{
              width: 150,
              background: "linear-gradient(135deg,#e11d2a,#b3121d)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "6px 10px",
            }}
          >
            <Users size={30} color="#ffffff" strokeWidth={2.2} />
            <div style={{ textAlign: "center", lineHeight: 1 }}>
              <div
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "#fff",
                }}
              >
                TOTAL POSTS
              </div>
              <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 30, color: "#fff" }}>
                {vacancy.totalPosts}
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <InfoCard
            Icon={GraduationCap}
            iconBg="#16a34a"
            label="Qualification"
            labelColor="#16a34a"
            value={vacancy.qualification}
          />
          <InfoCard
            Icon={CalendarDays}
            iconBg={brand}
            label="Last Date"
            labelColor={brand}
            value={vacancy.lastDate}
            note={vacancy.lastDateNote}
          />
          <InfoCard
            Icon={Briefcase}
            iconBg="#f97316"
            label="Job Type"
            labelColor="#f97316"
            value={vacancy.jobType}
          />
          <InfoCard
            Icon={MapPin}
            iconBg="#2563eb"
            label="Location"
            labelColor="#2563eb"
            value={vacancy.location}
          />
          <InfoCard
            Icon={FileText}
            iconBg="#db2777"
            label="Selection Process"
            labelColor="#db2777"
            value={vacancy.selectionProcess}
          />
        </div>

        {/* Highlights + QR */}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          {/* Left column */}
          <div style={{ flex: 1.05, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                background: brand,
                color: "#fff",
                borderRadius: "8px 20px 8px 8px",
                padding: "7px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: 0.5,
              }}
            >
              <Star size={16} color="#ffd60a" fill="#ffd60a" />
              IMPORTANT HIGHLIGHTS
            </div>
            <div style={{ padding: "10px 4px 0 2px" }}>
              {vacancy.highlights.map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <CheckCircle2 size={17} color="#2563eb" fill="#dbeafe" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#1f2a44" }}>{h}</span>
                </div>
              ))}
            </div>
            {/* Website box */}
            <div
              style={{
                marginTop: 8,
                border: `2px solid ${brand}`,
                borderRadius: 12,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Globe size={40} color={brand} strokeWidth={2} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1f2a44" }}>
                  For More Details Visit
                </div>
                <div
                  style={{
                    fontFamily: "'Anton', sans-serif",
                    fontSize: 24,
                    color: brand,
                    lineHeight: 1.1,
                  }}
                >
                  {SITE_DOMAIN}
                </div>
              </div>
            </div>
          </div>

          {/* Right column - QR */}
          <div style={{ flex: 0.95, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                background: brand,
                color: "#fff",
                borderRadius: "20px 8px 8px 8px",
                padding: "7px 14px",
                textAlign: "center",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: 0.4,
              }}
            >
              SCAN QR CODE FOR FULL DETAILS
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <div
                style={{
                  background: "#fff",
                  border: `2px solid ${brand}`,
                  borderRadius: 10,
                  padding: 8,
                  flexShrink: 0,
                }}
              >
                <QRCodeCanvas value={qrUrl} size={132} level="M" includeMargin={false} />
              </div>
              <div style={{ textAlign: "center" }}>
                <MoveUpLeft size={26} color={brand} strokeWidth={2.5} />
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: 18,
                    color: brand,
                    lineHeight: 1.1,
                    marginTop: 2,
                  }}
                >
                  Scan to View Vacancy Details
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingLeft: 6 }}>
              <Smartphone size={30} color={brand} strokeWidth={2} />
              <span
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600,
                  fontSize: 16,
                  color: brand,
                }}
              >
                Easy Access Save &amp; Share
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== WhatsApp share banner ===== */}
      <div
        style={{
          margin: "14px 18px 12px",
          background: brandGradient,
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "#25d366",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MessageCircle size={26} color="#fff" fill="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff" }}>
            SHARE THIS OPPORTUNITY
          </div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: "#ffd60a" }}>
            WITH YOUR FRIENDS &amp; JOB SEEKERS
          </div>
        </div>
        <div
          style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 24,
            color: "#ffd60a",
            lineHeight: 1.05,
            textAlign: "right",
            maxWidth: 180,
          }}
        >
          Your Share Can Change Someone's Future
        </div>
      </div>

      {/* ===== Footer ===== */}
      <div
        style={{
          background: "#fff",
          borderTop: "2px solid #e6e9f2",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: brand }}>
          Jobs • Vacancies • Admit Card • Results • Updates
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: "#1f2a44" }}>
            Follow Us:
          </span>
          {[
            { Icon: Facebook, bg: "#1877f2" },
            { Icon: Send, bg: "#229ed9" },
            { Icon: MessageCircle, bg: "#25d366" },
            { Icon: Youtube, bg: "#ff0000" },
          ].map(({ Icon, bg }, i) => (
            <div
              key={i}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={15} color="#fff" fill="#fff" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

Poster.displayName = "Poster";
export default Poster;

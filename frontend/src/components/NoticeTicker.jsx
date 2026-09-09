import React, { useEffect, useState } from "react";
import Marquee from "react-fast-marquee";
import api from "@/lib/api";
import { useI18n } from "@/context/I18nContext";
import { FaBullhorn } from "react-icons/fa";

const NoticeTicker = () => {
  const { lang } = useI18n();
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/notices").then(r => setItems(r.data)).catch(() => setItems([]));
  }, []);
  if (!items.length) return null;
  return (
    <div className="news-strip" data-testid="notice-ticker">
      <div className="max-w-7xl mx-auto px-4 flex items-stretch">
        <span className="news-tag">
          <FaBullhorn /> {lang === "hi" ? "ताज़ा सूचनाएँ" : "Latest News"}
        </span>
        <div className="flex-1 flex items-center overflow-hidden">
          <Marquee pauseOnHover gradient={false} speed={45}>
            {items.map((n, i) => (
              <span key={n.id || i} className="news-item font-hindi">
                {lang === "hi" ? n.title_hi : n.title_en}
                {n.type === "important" && <span className="new-badge">NEW</span>}
                <span className="mx-4 text-orange-400">|</span>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </div>
  );
};

export default NoticeTicker;

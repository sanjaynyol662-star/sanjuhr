import React from "react";
import { useI18n } from "@/context/I18nContext";

const IMAGES = [
  "https://images.unsplash.com/photo-1655300256335-beef51a914fe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHw0fHxyb29mdG9wJTIwc29sYXIlMjBwYW5lbHMlMjBob21lfGVufDB8fHx8MTc4NTM4NzQzNHww&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1660330589257-813305a4a383?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwzfHxyb29mdG9wJTIwc29sYXIlMjBwYW5lbHMlMjBob21lfGVufDB8fHx8MTc4NTM4NzQzNHww&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxidXNpbmVzcyUyMGxvYW4lMjBwYXBlciUyMGhhbmRzaGFrZXxlbnwwfHx8fDE3ODUzODc0MzR8MA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1609252509027-3928a66302fd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxydXJhbCUyMGluZGlhJTIwZmFybWVyJTIwd29ya2luZ3xlbnwwfHx8fDE3ODUzODc0NDV8MA&ixlib=rb-4.1.0&q=85",
];

const Gallery = () => {
  const { lang } = useI18n();
  return (
    <div className="max-w-7xl mx-auto px-4 py-12" data-testid="gallery-page">
      <div className="section-eyebrow">Gallery</div>
      <h1 className="section-title !text-3xl">{lang === "hi" ? "फ़ोटो गैलरी" : "Photo Gallery"}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {[...IMAGES, ...IMAGES].map((src, i) => (
          <div key={i} className="rounded-2xl overflow-hidden aspect-square group cursor-pointer border border-white/10 relative" data-testid={`gallery-item-${i}`}>
            <img src={src} alt={`gallery-${i}`} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/60 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;

import React, { useEffect, useState, useCallback } from "react";
import { BACKEND_URL } from "@/lib/api";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const HeroCarousel = () => {
  const [slides, setSlides] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/slides`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setSlides(d))
      .catch(() => {});
  }, []);

  const next = useCallback(() => setIdx((i) => (slides.length ? (i + 1) % slides.length : 0)), [slides.length]);
  const prev = () => setIdx((i) => (slides.length ? (i - 1 + slides.length) % slides.length : 0));

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [slides.length, next]);

  if (!slides.length) return null;
  const s = slides[idx];

  const Inner = (
    <>
      {/* Blurred backdrop fills the frame; the real image shows fully (no crop). */}
      <img src={`${BACKEND_URL}${s.image_url}`} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40" />
      <img src={`${BACKEND_URL}${s.image_url}`} alt={s.title || "slide"} className="absolute inset-0 w-full h-full object-contain" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      {(s.title || s.subtitle) && (
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
          {s.title && <h2 className="text-white font-extrabold text-xl md:text-3xl leading-tight drop-shadow" data-testid="carousel-title">{s.title}</h2>}
          {s.subtitle && <p className="text-white/90 text-sm md:text-base mt-1 max-w-2xl drop-shadow">{s.subtitle}</p>}
        </div>
      )}
    </>
  );

  return (
    <div className="relative mb-6 rounded-2xl overflow-hidden border border-emerald-400/20 h-52 sm:h-64 md:h-80" data-testid="hero-carousel">
      {s.link ? (
        <a href={s.link} target="_blank" rel="noreferrer" className="block absolute inset-0" data-testid="carousel-link">{Inner}</a>
      ) : Inner}
      {slides.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white z-10" data-testid="carousel-prev"><FaChevronLeft /></button>
          <button onClick={next} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white z-10" data-testid="carousel-next"><FaChevronRight /></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`} className={`h-2 rounded-full transition-all ${i === idx ? "bg-white w-5" : "bg-white/50 w-2"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroCarousel;

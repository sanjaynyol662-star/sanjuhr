/**
 * Predefined image size presets for admin uploads + a client-side
 * cover-crop resizer so the uploaded file matches the chosen dimensions.
 */
export const IMAGE_PRESETS = [
  { id: "banner", label: "Banner", w: 1200, h: 400, note: "Wide homepage slider" },
  { id: "wide", label: "Wide Banner", w: 1600, h: 500, note: "Extra-wide / hero" },
  { id: "landscape", label: "Landscape", w: 1280, h: 720, note: "16:9 photo" },
  { id: "square", label: "Square", w: 800, h: 800, note: "1:1 logo / post" },
  { id: "portrait", label: "Portrait", w: 600, h: 900, note: "2:3 poster" },
];

export const getPreset = (id) =>
  IMAGE_PRESETS.find((p) => p.id === id) || IMAGE_PRESETS[0];

/**
 * Resize + center-crop (cover) an image File to exactly w×h, returning a
 * JPEG Blob. Keeps the subject centred and fills the whole frame.
 */
export function cropImageToSize(file, w, h, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        const scale = Math.max(w / img.width, h / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const dx = (w - nw) / 2;
        const dy = (h - nh) / 2;
        ctx.drawImage(img, dx, dy, nw, nh);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("resize failed"))),
          "image/jpeg",
          quality
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("invalid image"));
    };
    img.src = url;
  });
}

/**
 * Resize an image File to FIT within w×h while preserving its original aspect
 * ratio — the whole image is kept (no cropping, no letterbox padding). The
 * output canvas matches the scaled image's own dimensions, so displaying it
 * with `object-contain` shows the complete, uncropped picture.
 */
export function fitImageToSize(file, w, h, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        // Only downscale; never upscale beyond the source resolution.
        const scale = Math.min(w / img.width, h / img.height, 1);
        const nw = Math.max(1, Math.round(img.width * scale));
        const nh = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = nw;
        canvas.height = nh;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, nw, nh);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("resize failed"))),
          "image/jpeg",
          quality
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("invalid image"));
    };
    img.src = url;
  });
}

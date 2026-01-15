// src/components/ImageCarousel.tsx
import React, { useMemo, useState } from "react";

type Props = {
  images: string[]; // siempre array (aunque sea 1)
  alt: string;
  ratio?: number; // opcional: ej 16/9, 4/3, etc.
  rounded?: number; // px
};

export function ImageCarousel({ images, alt, ratio, rounded = 14 }: Props) {
  const safeImages = useMemo(() => (Array.isArray(images) ? images.filter(Boolean) : []), [images]);
  const [index, setIndex] = useState(0);

  if (!safeImages.length) return null;

  const hasMany = safeImages.length > 1;

  const prev = () => setIndex((i) => (i === 0 ? safeImages.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === safeImages.length - 1 ? 0 : i + 1));

  const frameStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    borderRadius: rounded,
    background: "rgba(15, 23, 42, 0.04)",
    border: "1px solid rgba(15, 23, 42, 0.08)",
  };

  // Si no pasas ratio, se adapta a la imagen (auto height). Si pasas ratio, fija un “marco” responsivo.
  const ratioBoxStyle: React.CSSProperties | undefined = ratio
    ? { width: "100%", aspectRatio: String(ratio), position: "relative" }
    : undefined;

  const imgStyle: React.CSSProperties = ratio
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }
    : {
        width: "100%",
        height: "auto",
        display: "block",
      };

  return (
    <div style={frameStyle}>
      <div style={ratioBoxStyle}>
        <img src={safeImages[index]} alt={alt} loading="lazy" style={imgStyle} />
      </div>

      {hasMany && (
        <>
          <button type="button" onClick={prev} aria-label="Anterior" style={leftArrowStyle}>
            ‹
          </button>
          <button type="button" onClick={next} aria-label="Siguiente" style={rightArrowStyle}>
            ›
          </button>

          <div style={dotsWrapStyle} aria-hidden="true">
            {safeImages.map((_, i) => (
              <span
                key={i}
                style={{
                  ...dotStyle,
                  opacity: i === index ? 1 : 0.35,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const arrowBase: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  background: "rgba(2, 6, 23, 0.55)",
  color: "#fff",
  border: "none",
  width: 36,
  height: 36,
  borderRadius: 999,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 20,
  lineHeight: 1,
  userSelect: "none",
};

const leftArrowStyle: React.CSSProperties = { ...arrowBase, left: 10 };
const rightArrowStyle: React.CSSProperties = { ...arrowBase, right: 10 };

const dotsWrapStyle: React.CSSProperties = {
  position: "absolute",
  left: 12,
  right: 12,
  bottom: 10,
  display: "flex",
  gap: 6,
  justifyContent: "center",
};

const dotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  background: "rgba(255,255,255,0.95)",
};

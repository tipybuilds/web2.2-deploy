// App.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";

/* =========================================================
   CONFIG
========================================================= */
// Ctrl+F: resolveProductGalleryImages
type ResolveGalleryOptions = {
  maxNumbered?: number;       // cuántas fotos numeradas buscar (01..max)
  includeHero?: boolean;      // incluir hero.jpg al inicio
  extensions?: string[];      // extensiones soportadas
  timeoutMs?: number;         // timeout por imagen
  cacheBust?: boolean;        // evita “fantasmas” en dev (recomendado true en StackBlitz)
};

function resolveProductGalleryImages(
  publicFolder: string,
  opts: ResolveGalleryOptions = {}
): Promise<string[]> {
  const {
    maxNumbered = 12,
    includeHero = true,
    extensions = ["jpg", "jpeg", "png", "webp"],
    timeoutMs = 2500,
    cacheBust = true,
  } = opts;

  // Normaliza: "img/productos/x" -> "/img/productos/x"
  const base = (publicFolder.startsWith("/") ? publicFolder : `/${publicFolder}`)
    .replace(/\/+$/, "");

  const candidates: string[] = [];

  // Hero primero
  if (includeHero) {
    for (const ext of extensions) candidates.push(`${base}/hero.${ext}`);
  }

  // 01..maxNumbered
  for (let i = 1; i <= maxNumbered; i++) {
    const nn = String(i).padStart(2, "0");
    for (const ext of extensions) candidates.push(`${base}/${nn}.${ext}`);
  }

  const uniqCandidates = Array.from(new Set(candidates));

  const probe = (src: string) =>
    new Promise<string | null>((resolve) => {
      const img = new Image();
      let done = false;

      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        resolve(ok ? src : null);
      };

      const t = window.setTimeout(() => finish(false), timeoutMs);

      img.onload = () => {
        window.clearTimeout(t);
        finish(true);
      };
      img.onerror = () => {
        window.clearTimeout(t);
        finish(false);
      };

      if (!cacheBust) {
        img.src = src;
        return;
      }

      const bust = `__v=${Date.now()}`;
      img.src = src.includes("?") ? `${src}&${bust}` : `${src}?${bust}`;
    });

  return Promise.all(uniqCandidates.map(probe)).then((found) => {
    return found.filter((x): x is string => Boolean(x));
  });
}

const BRAND = {
  primary: "#343E75",
  secondary: "#2389C9",
  surface: "#D2E4EE",
  ink: "#0B1220",
  muted: "#64748b",
  bg: "#F3F4F6", // fondo general
  panel: "#FFFFFF", // cajas
  line: "rgba(15, 23, 42, 0.08)", // bordes
  // ✅ tu footer lo usa; si no existe rompe.
  lineSoft: "rgba(15, 23, 42, 0.08)",
};

const HEADER_H = 64;

// ✅ PREMISA OFICIAL UI
const UI_SCALE = 0.8;

// ✅ Este es el ancho visual que tú quieres ver en pantalla
const CONTAINER_MAX = 2048;

// ✅ Compensación: como todo está escalado, el maxWidth real debe ser mayor
const CONTAINER_MAX_SCALED = Math.round(CONTAINER_MAX / UI_SCALE);

// WhatsApp
const WHATSAPP_PHONE_E164 = "+56968160062";

// Film
const MERCADOLIBRE_FILM_URL = "https://www.mercadolibre.cl/";

// Maps (solo landing Acuícola)
const MITILICULTURA_MAPS_URL =
  "https://www.google.com/maps?rlz=1C5CHFA_enCL1035CL1035&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIGCAEQRRg8MgYIAhBFGDwyBggDEEUYPDIGCAQQRRhB0gEHODkyajBqN6gCALACAA&um=1&ie=UTF-8&fb=1&gl=cl&sa=X&geocode=KStJtgUAFyKWMW9SiiF6XN9R&daddr=5700000+Castro,+Los+Lagos";

// Email destino
const SALES_EMAIL = "martin@tipytown.cl";

/* =========================================================
   I18N (ES/EN)
========================================================= */
type Lang = "es" | "en";
type Bilingual = { es: string; en: string };

const LangCtx = createContext<{ lang: Lang; toggleLang: () => void } | null>(
  null
);

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",          // ✅ obliga layout a altura completa
        display: "flex",
        flexDirection: "column",
        background: BRAND.bg,
      }}
    >
      {/* Header (si ya lo renderizas fuera, elimina esta sección) */}
      {/* <SiteHeader /> */}

      <main style={{ flex: "1 1 auto" }}>
        {children}
      </main>

      {/* ✅ footer siempre abajo */}
      <div style={{ marginTop: "auto" }}>
        <SiteFooter />
      </div>
    </div>
  );
}

function ProductGallery({
  publicFolder,
  alt,
  maxNumbered = 6,
  includeHero = false,
  maxH = 420,
}: {
  publicFolder: string;
  alt: string;
  maxNumbered?: number;
  includeHero?: boolean;
  maxH?: number;
}) {
  const [imgs, setImgs] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [idx, setIdx] = React.useState(0);

  // ✅ Lightbox (expansible)
  const [open, setOpen] = React.useState(false);

  // ✅ Medimos la proporción real de la imagen (para que el frame se vea armónico)
  const [aspect, setAspect] = React.useState<number | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setIdx(0);
    setOpen(false);
    setAspect(null);

    resolveProductGalleryImages(publicFolder, {
      maxNumbered,
      includeHero,
      extensions: ["jpg", "jpeg", "png", "webp"],
      timeoutMs: 3000,
      cacheBust: true,
    })
      .then((list) => {
        if (!alive) return;
        setImgs(list);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setImgs([]);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [publicFolder, maxNumbered, includeHero]);

  const total = imgs.length;
  const canNav = total > 1;

  const prev = React.useCallback(() => {
    setIdx((v) => (total ? (v - 1 + total) % total : 0));
  }, [total]);

  const next = React.useCallback(() => {
    setIdx((v) => (total ? (v + 1) % total : 0));
  }, [total]);

  // ✅ Cada vez que cambia la imagen activa, recalculamos aspect ratio real
  React.useEffect(() => {
    const src = imgs[idx];
    if (!src) {
      setAspect(null);
      return;
    }

    let cancelled = false;
    const im = new Image();
    im.onload = () => {
      if (cancelled) return;
      const w = im.naturalWidth || 0;
      const h = im.naturalHeight || 0;
      if (w > 0 && h > 0) setAspect(w / h);
      else setAspect(null);
    };
    im.onerror = () => {
      if (cancelled) return;
      setAspect(null);
    };
    im.src = src;

    return () => {
      cancelled = true;
    };
  }, [imgs, idx]);

  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next]);

  const shellStyle: React.CSSProperties = {
    width: "100%",
    border: `1px solid ${BRAND.line}`,
    borderRadius: 16,
    background: "#fff",
    overflow: "hidden",
    boxShadow: "0 10px 26px rgba(2, 6, 23, 0.06)",
  };

  const topBarStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 10,
    borderBottom: `1px solid ${BRAND.line}`,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(6px)",
  };

  const chipStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(15, 23, 42, 0.72)",
    background: "rgba(15, 23, 42, 0.06)",
    border: `1px solid ${BRAND.line}`,
    borderRadius: 999,
    padding: "6px 10px",
  };

  const btnBase: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 12,
    border: `1px solid rgba(2, 6, 23, 0.10)`,
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: BRAND.primary,
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(52, 62, 117, 0.25)",
  };

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    background: "rgba(15, 23, 42, 0.05)",
    color: "rgba(15, 23, 42, 0.35)",
    cursor: "not-allowed",
  };

  /**
   * ✅ FIX: Frame que se adapta dinámicamente a la altura del texto
   * - Usa la altura pasada desde ProductDetail (textHeight)
   * - Mantiene aspect ratio cuando es posible
   * - Altura mínima de seguridad
   */
  const mediaFrameStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(15, 23, 42, 0.03)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // ✅ Usa la altura exacta del texto, con mínimo de seguridad
    height: Math.max(maxH, 300),
    // Si tenemos aspect ratio, respetarlo solo si no rompe la altura objetivo
    aspectRatio: aspect && maxH < 500 ? `${aspect}` : undefined,
  };

  if (loading) {
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <div style={chipStyle}>…</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={btnDisabled}>←</div>
            <div style={btnDisabled}>→</div>
          </div>
        </div>
        <div style={{ padding: 16, color: "rgba(15, 23, 42, 0.70)", fontWeight: 800 }}>
          Cargando imágenes…
        </div>
      </div>
    );
  }

  if (!total) {
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <div style={chipStyle}>0/0</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={btnDisabled}>←</div>
            <div style={btnDisabled}>→</div>
          </div>
        </div>
        <div style={{ padding: 16, color: "rgba(15, 23, 42, 0.70)", fontWeight: 800 }}>
          No se encontraron imágenes en: <code>{publicFolder}</code>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <div style={chipStyle}>
            {idx + 1}/{total}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={prev} disabled={!canNav} style={canNav ? btnActive : btnDisabled}>
              ← <span style={{ opacity: 0.95 }}>Anterior</span>
            </button>

            <button type="button" onClick={next} disabled={!canNav} style={canNav ? btnActive : btnDisabled}>
              <span style={{ opacity: 0.95 }}>Siguiente</span> →
            </button>
          </div>
        </div>

        {/* ✅ Vista que se adapta a la altura del texto */}
        <div style={mediaFrameStyle}>
          <img
            src={imgs[idx]}
            alt={alt}
            loading="eager"
            decoding="async"
            onClick={() => setOpen(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover", // ✅ llena el frame completamente
              display: "block",
              cursor: "zoom-in",
            }}
          />
        </div>
      </div>

      {/* ✅ Lightbox sin cambios */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(2, 6, 23, 0.78)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(96vw, 1600px)",
              height: "min(92vh, 920px)",
              borderRadius: 16,
              overflow: "hidden",
              background: "#0b1220",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                padding: 10,
                background: "rgba(255,255,255,0.06)",
                borderBottom: "1px solid rgba(255,255,255,0.10)",
                flex: "0 0 auto",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.78)", fontWeight: 900, fontSize: 13 }}>
                {idx + 1}/{total}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={prev} disabled={!canNav} style={canNav ? btnActive : btnDisabled}>
                  ← Anterior
                </button>
                <button type="button" onClick={next} disabled={!canNav} style={canNav ? btnActive : btnDisabled}>
                  Siguiente →
                </button>
                <button type="button" onClick={() => setOpen(false)} style={btnActive}>
                  Cerrar ✕
                </button>
              </div>
            </div>

            <div
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0b1220",
                padding: 12,
              }}
            >
              <img
                src={imgs[idx]}
                alt={alt}
                style={{
                  width: "auto",
                  height: "auto",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}




function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved =
      (typeof window !== "undefined" &&
        (window.localStorage.getItem("tt_lang") as Lang | null)) ||
      null;
    return saved === "en" ? "en" : "es";
  });

  const toggleLang = () => {
    setLang((p) => {
      const next: Lang = p === "es" ? "en" : "es";
      if (typeof window !== "undefined") window.localStorage.setItem("tt_lang", next);
      return next;
    });
  };

  return <LangCtx.Provider value={{ lang, toggleLang }}>{children}</LangCtx.Provider>;
}

function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

function pick(b: Bilingual, lang: Lang) {
  return lang === "en" ? b.en : b.es;
}

const UI = {
  brandTagline: {
    es: "Soluciones productivas para acuicultura, agro, packaging y logística.",
    en: "Operational solutions for aquaculture, agriculture, packaging, and logistics.",
  },
  homeCtaSales: { es: "Hablar con ventas", en: "Talk to Sales" },
  

  divisionsLabel: { es: "", en: "" },
  divisionsHeadline: {
    es: "Capacidades enfocadas en continuidad operacional",
    en: "Capabilities built for operational continuity",
  },

  stat1Title: { es: "+50 años de experiencia", en: "50+ years of experience" },
  stat1Desc: { es: "Industria, operación y consistencia.", en: "Industry, operations, and consistency." },
  stat2Title: { es: "Fabricación en Chile", en: "Made in Chile" },
  stat2Desc: { es: "Control de proceso y especificación clara.", en: "Process control and clear specification." },
  stat3Title: { es: "Logística integrada", en: "Integrated logistics" },
  stat3Desc: { es: "Respuesta rápida y foco operativo.", en: "Fast response and operational focus." },

  navAcuicola: { es: "Acuícola", en: "Aquaculture" },
  navAgro: { es: "Agro", en: "Agriculture" },
  navPackaging: { es: "Packaging", en: "Packaging" },
  navTransporte: { es: "Transporte", en: "Logistics" },
  navCalidad: { es: "Calidad", en: "Quality" },
  navNosotros: { es: "Nosotros", en: "About" },

  btnWhatsApp: { es: "WhatsApp", en: "WhatsApp" },
  btnContacto: { es: "Contacto", en: "Contact" },
  btnContactar: { es: "Contactar", en: "Contact" },
  btnComprarML: { es: "Comprar en Mercado Libre", en: "Buy on Mercado Libre" },
  btnVisitanos: { es: "Visítanos", en: "Visit us" },

  calidadTitle1: { es: "Calidad verificable.", en: "Verifiable quality." },
  calidadTitle2: { es: "Control y evidencia.", en: "Control and evidence." },
  calidadIntro: {
    es: "Estándares, control y documentación. Certificados, fichas técnicas y respaldos se publican por producto.",
    en: "Standards, control, and documentation. Certificates, datasheets, and supporting evidence are published per product.",
  },
  calidadBtn: { es: "Solicitar información", en: "Request information" },
  calidadPrincipios: { es: "Principios", en: "Principles" },
  calidadPrincipiosText: {
    es: "La calidad se ejecuta en operación y se respalda con evidencia. Esto reduce fricción comercial y aumenta confianza.",
    en: "Quality is executed in operations and backed by evidence. This reduces commercial friction and increases trust.",
  },
  calidadProceso: { es: "Proceso de calidad", en: "Quality process" },
  calidadProcesoText: {
    es: "Flujo simple, auditable y diseñado para continuidad operacional.",
    en: "A simple, auditable flow designed for operational continuity.",
  },

  nosotrosTitle: { es: "Nosotros", en: "About" },

  nosotrosP1: {
    es: "Somos un partner operativo para industrias que no pueden fallar.",
    en: "We are an operational partner for industries that cannot afford to fail.",
  },
  
  nosotrosP2: {
    es: "Trabajamos con foco en continuidad, claridad y cumplimiento.",
    en: "We operate with a focus on continuity, clarity, and execution.",
  },
  
  nosotrosP3: {
    es: "Calidad en materiales, procesos y entregas. Los detalles hacen la diferencia.",
    en: "Quality in materials, processes, and deliveries. Details make the difference.",
  

  },
  nosotrosBtn: { es: "Hablemos", en: "Let’s talk" },
  nosotrosBlockTitle: { es: "Operación, infraestructura y control", en: "Operations, infrastructure, and control" },
  nosotrosBlockText: {
    es: "Somos un equipo industrial orientado a continuidad: operamos con procesos claros, control en terreno y foco en cumplir lo acordado. Trabajamos con tecnología de punta, obsesionados con la calidad y los buenos resultados.",
    en: "We are an industrial team built for continuity: clear processes, field control, and a commitment to deliver what’s agreed. We back it with verifiable evidence.",
  },
  nosotrosGallery: { es: "", en: "" },
  nosotrosHint: { es: "", en: "" },

  contactoTitle: { es: "Contacto", en: "Contact" },
  contactoIntro: {
    es: "Envíanos tu requerimiento indicando división, producto, volumen estimado y destino. Respondemos con una propuesta clara y concreta.",
    en: "Send your request including division, product, estimated volume, and destination. We respond with a clear, concrete proposal.",
  },
  contactoWABoxTitle: { es: "WhatsApp directo", en: "Direct WhatsApp" },
  contactoWABoxText: { es: "Para cotización rápida, escríbenos directamente.", en: "For a quick quote, message us directly." },
  contactoWATemplate: { es: "Mensaje sugerido", en: "Suggested message" },
  contactoWAOpen: { es: "Abrir WhatsApp", en: "Open WhatsApp" },

  contactoSalesBoxTitle: { es: "Ventas", en: "Sales" },
  contactoSalesBoxText: {
    es: "Contacto directo para proyectos, volúmenes y acuerdos comerciales.",
    en: "Direct contact for projects, volumes, and commercial agreements.",
  },
  contactoEmailBtn: { es: "Escribir email", en: "Write email" },

  modalEmailTitle: { es: "Escribir email", en: "Write email" },

  formName: { es: "Nombre *", en: "Name *" },
  formCompany: { es: "Empresa", en: "Company" },
  formEmail: { es: "Email *", en: "Email *" },
  formPhone: { es: "Teléfono", en: "Phone" },
  formDivision: { es: "División", en: "Division" },
  formProduct: { es: "Producto", en: "Product" },
  formVolume: { es: "Volumen estimado", en: "Estimated volume" },
  formDestination: { es: "Destino", en: "Destination" },
  formMessage: { es: "Mensaje *", en: "Message *" },

  formSelect: { es: "Seleccionar", en: "Select" },
  formCancel: { es: "Cancelar", en: "Cancel" },
  formSend: { es: "Enviar email", en: "Send email" },

  mailtoHint: {
    es: "Esto abre tu cliente de correo con el mensaje prellenado (mailto). Si después quieres envío real desde web (sin cliente), se agrega backend.",
    en: "This opens your email client with a prefilled message (mailto). If you want in-app sending later (no email client), we can add a backend.",
  },

  notFoundTitle: { es: "Página no encontrada", en: "Page not found" },
  notFoundText: { es: "La ruta no existe.", en: "That route doesn’t exist." },
  notFoundBtn: { es: "Ir al inicio", en: "Go home" },
};

function buildWhatsAppPrefill(lang: Lang) {
  return lang === "en"
    ? "Hi, I’d like to request a quote from Tipy Town.\nDivision:\nProduct:\nEstimated volume:\nDestination:"
    : "Hola, quiero cotizar un producto de Tipy Town.\nDivisión:\nProducto:\nVolumen estimado:\nDestino:";
}

/* =========================================================
   IMAGES: conventions for /public
   - Product hero:  /images/divisions/{division}/products/{slug}/hero.jpg
   - Product gallery: /images/divisions/{division}/products/{slug}/01.jpg, 02.jpg, ...
   - Division hero (optional): /images/divisions/{division}/hero.jpg
========================================================= */

function buildProductHeroSrc(divisionKey: string, productSlug: string) {
  return `/images/divisions/${divisionKey}/products/${productSlug}/hero.jpg`;
}

function buildProductGallerySrcs(divisionKey: string, productSlug: string, maxCount: number) {
  const base = `/images/divisions/${divisionKey}/products/${productSlug}`;
  return Array.from({ length: maxCount }, (_, i) => `${base}/${String(i + 1).padStart(2, "0")}.jpg`);
}

function buildDivisionHeroSrc(divisionKey: string) {
  return `/images/divisions/${divisionKey}/hero.jpg`;
}





/* =========================================================
   RESPONSIVE
========================================================= */
const BP = { sm: 720, md: 980, lg: 1200 };

function useMediaQuery(query: string) {
  const get = () =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false;

  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    if ("addEventListener" in mql) mql.addEventListener("change", onChange);
    else (mql as any).addListener(onChange);

    setMatches(mql.matches);

    return () => {
      if ("removeEventListener" in mql) mql.removeEventListener("change", onChange);
      else (mql as any).removeListener(onChange);
    };
  }, [query]);

  return matches;
}

function useBreakpoints() {
  const isSm = useMediaQuery(`(max-width: ${BP.sm}px)`);
  const isMd = useMediaQuery(`(max-width: ${BP.md}px)`);
  const isLg = useMediaQuery(`(max-width: ${BP.lg}px)`);
  const isXl = useMediaQuery(`(min-width: 1600px)`);
  return { isSm, isMd, isLg, isXl };
}

function containerStyle(): React.CSSProperties {
  return {
    width: "100%",
   maxWidth: CONTAINER_MAX_SCALED,
    marginInline: "auto",
    paddingInline: "clamp(16px, 3vw, 48px)",
    boxSizing: "border-box",
  };
}

function sectionPad(top = 54, bottom = 52): React.CSSProperties {
  return {
    paddingTop: `clamp(18px, 3vw, ${top}px)`,
    paddingBottom: `clamp(18px, 3vw, ${bottom}px)`,
  };
}

function twoColGrid(isMd: boolean, isXl: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isMd ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
    gap: isMd ? 18 : isXl ? 56 : 40,
    alignItems: "start",
  };
}

function responsiveAutoGrid(minColPx: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${minColPx}px, 1fr))`,
    gap: 18,
    alignItems: "stretch",
  };
}

/* =========================================================
   TEXT HELPERS (PÁRRAFOS)
========================================================= */

function buildCardFirstImageCandidates(dir: string) {
  // Normaliza: sin trailing slash
  const base = (dir || "").replace(/\/+$/, "");

  if (!base) return [];

  // Cards: SOLO 01 (y fallback 1), sin hero jamás.
  // Orden: primero lo más probable en tu repo.
  const names = [
    "01.jpg",
    "01.jpeg",
    "01.png",
    "01.webp",
    "1.jpg",
    "1.jpeg",
    "1.png",
    "1.webp",
  ];

  return names.map((n) => `${base}/${n}`);
}


function toParagraphs(text: string): string[] {
  const raw = String(text || "").trim();
  if (!raw) return [];

  // Si ya viene con párrafos separados, respeta.
  if (/\n\s*\n/.test(raw)) {
    return raw
      .split(/\n\s*\n/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Si viene como bloque, intenta separar cada ~2 frases.
  const sentences = raw
    .split(/(?<=[.!?])\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 2) return [raw];

  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    out.push([sentences[i], sentences[i + 1]].filter(Boolean).join(" "));
  }
  return out;
}

function ModalBasic({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(2,6,23,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          background: "white",
          borderRadius: 20,
          border: `1px solid ${BRAND.line}`,
          boxShadow: "0 24px 80px rgba(2,6,23,0.35)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${BRAND.line}`,
            background: "#F8FAFC",
          }}
        >
          <strong>{title}</strong>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: `1px solid ${BRAND.line}`,
              background: "white",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

function inputBase(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${BRAND.line}`,
    fontSize: 14,
  };
}

function labelBase(): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 6,
    color: BRAND.muted,
  };
}

/* =========================================================
   TYPES
========================================================= */
type Product = {
  key: string;
  datasheetUrl?: string;

  name: Bilingual;

  // 🔧 CAMBIO CLAVE: ahora es opcional
  short?: Bilingual;

  descriptionText?: Bilingual;
  descriptionPlaceholder: Bilingual;

  imageLabel: Bilingual;

  // Carpeta que contiene 01.jpg, 02.jpg, etc.
  imageDir?: string;

  // Cantidad de imágenes 01..N
  imageCount?: number;

  // Hero específico si existe
  heroSrc?: string;

  badges?: Bilingual[];

  primaryAction?: { label: Bilingual; href?: string; to?: string };
  secondaryAction?: { label: Bilingual; href?: string; to?: string };

  clickable?: boolean;
  cardMaxWidth?: number;
  cardVariant?: "default" | "wide-compact";

  // Escape hatch para no volver a romper build por datos nuevos
  [extra: string]: any;
};

type Division = {
  key: "acuicola" | "agro" | "packaging" | "transporte";
  navLabel: Bilingual;
  pageTitle: Bilingual;
  intro: Bilingual;

  heroImageLabel: Bilingual;

  // ✅ NUEVO: hero real
  heroImageSrc?: string;

  productsTitle: Bilingual;
  products: Product[];
  layout?: "grid3" | "grid2" | "single";
};

/* =========================================================
   SCROLL CHECK (Calidad)
========================================================= */
function useInViewOnce(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) setSeen(true);
      },
      { threshold: 0.35, ...options }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [seen, options]);

  return { ref, seen };
}

function GreenCheck({ show }: { show: boolean }) {
  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const transition = prefersReduced
    ? "none"
    : "opacity 220ms ease, transform 220ms ease, background 220ms ease";

  return (
    <div
      aria-hidden="true"
      style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        border: `1px solid ${BRAND.line}`,
        background: show ? "rgba(22,163,74,0.10)" : "white",
        display: "grid",
        placeItems: "center",
        transform: show ? "scale(1)" : "scale(0.88)",
        opacity: show ? 1 : 0,
        transition,
        flex: "0 0 auto",
      }}
    >
      <span
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: "#16a34a",
          transform: show ? "translateY(0)" : "translateY(2px)",
          transition: prefersReduced ? "none" : "transform 220ms ease",
        }}
      >
        ✓
      </span>
    </div>
  );
}

function QualityStepRow({
  step,
}: {
  step: { n: string; t: Bilingual; d: Bilingual };
}) {
  const { ref, seen } = useInViewOnce();
  const { lang } = useLang();
  const { isMd } = useBreakpoints();

  const stepTitleSize = isMd ? 16 : 17; // antes 14
  const stepDescSize = isMd ? 16 : 17;  // antes 14

  return (
    <div
      ref={ref}
      style={{
        border: `1px solid ${BRAND.line}`,
        borderRadius: 18,
        padding: 14,
        background: "white",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
        <div
          style={{
            minWidth: 44,
            height: 44,
            borderRadius: 14,
            background: BRAND.primary,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {step.n}
        </div>

        <div style={{ paddingTop: 2, minWidth: 0 }}>
          <div style={{ fontSize: stepTitleSize, fontWeight: 900, color: BRAND.primary }}>
            {pick(step.t, lang)}
          </div>

          <div style={{ marginTop: 6, fontSize: stepDescSize, lineHeight: 1.75, color: "#334155" }}>
            {pick(step.d, lang)}
          </div>
        </div>
      </div>

      <GreenCheck show={seen} />
    </div>
  );
}

/* =========================================================
   APP
========================================================= */
export default function App() {
  return (
    <LangProvider>
      <AppShell />
    </LangProvider>
  );
}

function AppShell() {
  // ✅ Control global tipo “zoom navegador”
  // 0.80 = como el zoom 80% en Chrome
  // 0.85–0.90 = más conservador
  const UI_SCALE = 0.80;

  return (
    <div
      style={{
        background: BRAND.bg,
        color: BRAND.ink,
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root { height: 100%; width: 100%; }

        html {
          -webkit-text-size-adjust: 100%;
          text-rendering: optimizeLegibility;
        }

        body {
          margin: 0;
          overflow-x: hidden;
          background: ${BRAND.bg};
          color: ${BRAND.ink};
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
          line-height: 1.6;

          /* ✅ Global UI scale (Chrome/Safari/Edge) */
          zoom: ${UI_SCALE};

          /* ✅ Compensación del “zoom” para que no quede margen raro */
          zoom-origin: top center;
        }

        /* ✅ Mantén assets fluidos */
        p { margin: 0; }
        a { color: inherit; }
        button, input, textarea, select { font: inherit; }
        img, video, canvas, svg { max-width: 100%; height: auto; }

        /* ✅ En mobile NO aplicamos scale (si quieres, lo podemos dejar igual)
           Esto evita que en pantallas chicas quede demasiado pequeño */
        @media (max-width: 720px) {
          body { zoom: 1; }
        }
      `}</style>

      <SiteHeader />

      <main id="content" style={{ width: "100%", flex: "1 0 auto" }}>
        <ScrollToTopOnRouteChange />
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/acuicola" element={<DivisionOverview divisionKey="acuicola" />} />
          <Route path="/acuicola/:productKey" element={<ProductDetail divisionKey="acuicola" />} />

          <Route path="/agro" element={<DivisionOverview divisionKey="agro" />} />
          <Route path="/agro/:productKey" element={<ProductDetail divisionKey="agro" />} />

          <Route path="/packaging" element={<DivisionOverview divisionKey="packaging" />} />
          <Route path="/packaging/:productKey" element={<ProductDetail divisionKey="packaging" />} />

          <Route path="/transporte" element={<DivisionOverview divisionKey="transporte" />} />

          <Route path="/calidad" element={<Calidad />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/contacto" element={<Contacto />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <SiteFooter />
    </div>
  );
}



/* =========================================================
   DATA
========================================================= */
function useDivisions(): Division[] {
  return useMemo(
    () => [
      {
        key: "acuicola",
        navLabel: { es: "Acuícola", en: "Aquaculture" },
        pageTitle: { es: "Mitilicultura", en: "Mussel Farming" },
        intro: {
          es: "Más de 15 años fabricando insumos críticos para la mitilicultura, diseñados para operar en condiciones reales de cultivo del sur de Chile.\n\nDesarrollamos soluciones orientadas a continuidad operacional, con foco en rendimiento, control y repetibilidad durante todo el ciclo productivo del chorito.\n\nNuestra experiencia nace en terreno y se traduce en procesos trazables y presencia local, para que el centro de cultivo tenga una variable menos que explicar y una solución más en la que confiar.",
          en: "More than 15 years manufacturing critical inputs for mussel farming, designed to perform under real cultivation conditions in southern Chile.\n\nWe develop purpose-built solutions focused on operational continuity, performance, control, and repeatability throughout the entire mussel production cycle.\n\nOur experience comes from the field and is backed by controlled processes, full traceability, and local presence—so farming operations have one less variable to manage and one more solution they can rely on.",
        },
        heroImageLabel: {
          es: "Foto: centro de cultivo / operación acuícola",
          en: "Photo: farm site / aquaculture operations",
        },

        // ✅ FIX (igual que en Nosotros): hero REAL de la división, no colgado de un producto
        // Requisito: crea este archivo en /public/images/divisions/acuicola/hero.jpg
        heroImageSrc: "/images/divisions/acuicola/hero.jpg",

        productsTitle: { es: "", en: "" },
        layout: "grid3",
        products: [
          {
            key: "manga",
            name: { es: "Manga para cultivo de choritos", en: "Cotton sleeves for mussel farming" },
            short: { es: "Desempeño, consistencia y continuidad operacional.", en: "Performance, consistency, and operational continuity." },
            descriptionPlaceholder: {
              es: "Describe tu necesidad (medidas, volumen y zona).",
              en: "Describe your need (dimensions, volume, and region).",
            },
            descriptionText: {
              es: "Malla de algodón 100% orgánica y biodegradable para la siembra y contención de la semilla de chorito en procesos de mitilicultura, desarrollada y probada en condiciones reales de operación en centros de cultivo.\n\nFabricada a partir de fibras naturales, esta malla entrega una resistencia mecánica controlada, alta uniformidad dimensional y un desempeño confiable durante la etapa crítica de siembra, asegurando una correcta contención de la semilla y un desarrollo inicial homogéneo.\n\nSe ofrece en distintas tallas y medidas según el requerimiento del cliente, permitiendo seleccionar la dimensión adecuada para el tipo de semilla, la densidad de carga y el sistema de cultivo, optimizando la siembra y reduciendo pérdidas operativas desde el inicio del ciclo productivo.\n\nUna vez cumplida su función, la malla se biodegrada de manera natural en el ambiente marino, integrándose al entorno sin afectar la operación ni el desarrollo del cultivo.\n\nDiseñada para asegurar continuidad operacional, eficiencia en la siembra y seguridad en terreno, esta solución combina desempeño técnico con un enfoque productivo y ambiental alineado con las exigencias actuales de la mitilicultura.",

en: "100% organic and biodegradable cotton mesh designed for the seeding and containment of mussel seed in mussel farming operations, developed and tested under real operating conditions at cultivation sites.\n\nManufactured from natural fibers, this mesh provides controlled mechanical strength, high dimensional uniformity, and reliable performance during the critical seeding stage, ensuring proper seed containment and uniform early development.\n\nAvailable in multiple sizes and dimensions according to customer requirements, allowing the selection of the appropriate mesh size based on seed type, loading density, and cultivation system, optimizing seeding efficiency and reducing operational losses from the beginning of the production cycle.\n\nOnce its function is fulfilled, the mesh biodegrades naturally in the marine environment, integrating into the surroundings without affecting operations or crop development.\n\nDesigned to ensure operational continuity, seeding efficiency, and on-site safety, this solution combines technical performance with a productive and environmentally aligned approach that meets the current standards of the mussel farming industry.",
            },
            imageLabel: { es: "Foto: manga de algodón / operación", en: "Photo: cotton sleeves / field operation" },

            imageDir: "/images/divisions/acuicola/products/manga",
            imageCount: 5,
            heroSrc: "/images/divisions/acuicola/products/manga/hero.jpg",

            badges: [{ es: "100% algodón biodegradable", en: "100% biodegradable cotton" }],
          },
          {
            key: "cabo-mussel",
            datasheetUrl: "/fichas/ficha-cabo-mussel-super-loop.pdf",
            name: { es: "Cabo Mussel: Super Loop", en: "Mussel Rope: Super Loop" },
            short: { es: "Probado en agua. Eficiencia continua.", en: "Proven in water. Continuous efficiency." },
            descriptionPlaceholder: {
              es: "El Cabo Mussel Super Loop es nuestro cable de última generación, desarrollado como un sustrato técnico de alto desempeño para maximizar la siembra y la captación de choritos, con resultados comprobados en condiciones reales de cultivo.\n\nSu diseño estructural tipo Super Loop incrementa la superficie efectiva de fijación, favoreciendo una adherencia más eficiente del chorito desde las primeras etapas y una mejor distribución de carga a lo largo de la línea de cultivo.\n\nEste diseño permite reducir pérdidas durante el ciclo productivo, mejorar la estabilidad del sistema y asegurar un desempeño consistente en ambientes marinos exigentes, contribuyendo directamente a la continuidad operacional de los centros de cultivo.\n\nCabo Mussel Super Loop está diseñado para productores que buscan optimizar rendimiento desde la etapa de siembra, combinando innovación técnica, confiabilidad operativa y resultados medibles en terreno.",

en: "Mussel Rope Super Loop is our next-generation rope, developed as a high-performance technical substrate to maximize mussel seeding and spat collection, with proven results under real farming conditions.\n\nIts Super Loop structural design increases the effective attachment surface, promoting more efficient mussel fixation from the earliest stages and improving load distribution along the cultivation line.\n\nThis design helps reduce losses throughout the production cycle, enhances system stability, and ensures consistent performance in demanding marine environments, directly supporting operational continuity at farming sites.\n\nMussel Rope Super Loop is designed for producers focused on optimizing performance from the seeding stage, combining technical innovation, operational reliability, and measurable field results.",

            },
            imageLabel: { es: "Foto: cabo mussel / captación y siembra", en: "Photo: Cabo Mussel / collection & seeding" },

            imageDir: "/images/divisions/acuicola/products/cabo-mussel",
            imageCount: 5,

            badges: [{ es: "Máximo rendimiento", en: "Max performance" }],
          },
          {
            key: "cabo-rafia",
            datasheetUrl: "/fichas/chicote.pdf",
            name: { es: "Cabo Rafia - Chicote", en: 'PP rope — "Chicote"' },
            short: { es: "Calidad industrial y consistencia de amarre.", en: "Industrial quality and consistent tie-off." },
            descriptionPlaceholder: {
              es: `Fabricamos cabo de rafia de polipropileno (PP) 100% virgen, desarrollado para aplicaciones acuícolas que requieren amarre consistente, desempeño mecánico confiable y disponibilidad continua. Es una solución práctica y robusta para faenas donde la estabilidad del insumo es clave para evitar detenciones y pérdidas por variación.

              Nuestro foco está en la consistencia: diámetro controlado, resistencia uniforme y comportamiento repetible en operación. Esto mejora la eficiencia en maniobras, reduce reprocesos y entrega mayor control en tareas de amarre de cuelgas y colectores.
              
              Producto orientado a continuidad operacional y control del riesgo, fabricado bajo estándar industrial.`,
                            en: `We produce 100% virgin polypropylene (PP) raffia rope engineered for aquaculture applications that require consistent tie-off, reliable mechanical performance, and steady availability. It is a practical, robust solution for operations where input stability is critical to avoid downtime and losses driven by variability.
              
              Our focus is consistency: controlled diameter, uniform strength, and repeatable behavior in the field. This improves handling efficiency, reduces rework, and increases control during dropper and collector tie-off tasks.
              
              Built for operational continuity and risk control, manufactured to industrial standards.`,
                          },
            imageLabel: { es: "Foto: cabo rafia / bobinas / bodega", en: "Photo: PP rope / coils / warehouse" },

            imageDir: "/images/divisions/acuicola/products/cabo-rafia",
            imageCount: 5,

            badges: [{ es: "Amarre de cuelgas y colectores", en: "Droppers & collectors tie-off" }],
          },
        ],
      },

      // ===== resto de divisiones (sin cambios) =====
      {
        key: "agro",
        navLabel: { es: "Agro", en: "Agriculture" },
        pageTitle: { es: "Agro: Mallas de fruta", en: "Agriculture: Fruit netting" },
        intro: {
          es: `Desarrollamos mallas para fruta orientadas a líneas de packing exigentes, con foco en consistencia dimensional, resistencia mecánica y disponibilidad confiable durante la temporada.

Ofrecemos alternativas según el estándar operativo y la necesidad comercial, asegurando continuidad operacional y desempeño repetible en cada turno.`,
          en: `We develop fruit netting built for demanding packing operations, focused on dimensional consistency, mechanical strength, and reliable seasonal availability.

We offer alternatives aligned with operational standards and commercial needs, ensuring uptime and repeatable performance.`,
        },
        heroImageLabel: { es: "Foto: packing / fruta / campo", en: "Photo: packing / fruit / field" },
        heroImageSrc: "/images/divisions/agro/hero.jpg",
        productsTitle: { es: "", en: "" },
        layout: "grid2",
        products: [
          {
            key: "biodegradable",
            datasheetUrl: "/fichas/ficha-malla-fruta-algodon.pdf",
            name: { es: "Biodegradable", en: "Biodegradable (Cotton)" },
            short: { es: "Certificación + desempeño ambiental, sin sacrificar operación.", en: "Certified sustainability without sacrificing uptime." },
            descriptionPlaceholder: {
              es: "Malla de fruta de algodón 100% natural y biodegradable, desarrollada para marcas y retailers que buscan soluciones de packaging alineadas con altos estándares ambientales.\n\nUn producto noble y orgánico, con baja huella de carbono y una cadena productiva corta y trazable, que combina sustentabilidad real con un desempeño confiable en procesos de packing y comercialización.",

en: "100% natural and biodegradable cotton fruit netting, developed for brands and retailers seeking packaging solutions aligned with high environmental standards.\n\nA noble, organic product with a low carbon footprint and a short, traceable production chain, combining genuine sustainability with reliable performance in packing and commercialization processes.",
            },
            imageLabel: { es: "Foto: malla biodegradable / fruta / packing", en: "Photo: biodegradable netting / fruit / packing" },

            imageDir: "/images/divisions/agro/products/biodegradable",
            imageCount: 5,

            badges: [{ es: "100% algodón", en: "100% cotton" }],
          },
          {
            key: "polietileno",
            datasheetUrl: "/fichas/ficha-malla-fruta-polietileno.pdf",
            name: { es: "Polietileno", en: "Polyethylene (PE)" },
            short: { es: "Calidad industrial + disponibilidad y respuesta.", en: "Industrial grade with availability and response." },
            descriptionPlaceholder: {
              es: `Fabricamos malla de fruta de polietileno (PE) orientada a procesos intensivos de packing donde la continuidad operacional y la disponibilidad del insumo son críticas.

Esta alternativa prioriza resistencia mecánica, estabilidad en operación y comportamiento consistente turno a turno, reduciendo roturas, detenciones y variabilidad en la línea.

Es la opción adecuada para operaciones de alto volumen, ventanas comerciales ajustadas o escenarios donde se requiere una respuesta rápida y suministro asegurado durante toda la temporada.`,
              en: `We produce polyethylene (PE) fruit netting engineered for high-throughput packing operations where uptime and input availability are critical.

This option prioritizes mechanical strength, operational stability, and consistent behavior shift after shift—reducing breaks, stoppages, and variability on the line.

It is the right choice for high-volume operations, tight commercial windows, or scenarios where fast response and guaranteed supply throughout the season are required.`,
            },
            imageLabel: { es: "Foto: malla PE / operación / packing", en: "Photo: PE netting / operations / packing" },

            imageDir: "/images/divisions/agro/products/polietileno",
            imageCount: 5,

            badges: [{ es: "PE", en: "PE" }],
          },
        ],
      },

      {
        key: "packaging",
        navLabel: { es: "Packaging", en: "Packaging" },
        pageTitle: { es: "Packaging", en: "Packaging" },
        intro: {
          es: `El Film Stretch Transparente Tipy Town está desarrollado para operaciones de embalaje exigentes donde se busca máxima estabilidad con el menor consumo posible. Su resistencia y elasticidad permiten lograr una sujeción firme y consistente, reduciendo roturas, reclamos y pérdidas por embalaje insuficiente.

El formato Pack 6 (3,0 kg por rollo) entrega mayor autonomía por rollo y menos recambios, ideal para operaciones con alta rotación o cuando necesitas mantener ritmo sin detenerte a cambiar rollos constantemente. Es una opción eficiente para bodegas y centros de distribución que buscan continuidad y costo por pallet controlado.

Resultados repetibles, buena tensión y desempeño estable en operación real.`,
              en: `Tipy Town Transparent Stretch Film is engineered for demanding packaging operations aiming for maximum stability with minimal consumption. Its strength and elasticity help achieve firm, consistent containment—reducing breaks, claims, and losses caused by insufficient wrapping.

The 6-pack format (3.0 kg per roll) provides longer runs per roll and fewer changeovers, ideal for high-throughput environments or when you need to keep pace without frequent roll swaps. A strong fit for warehouses and distribution centers that prioritize uptime and controlled cost per pallet.

Repeatable results, consistent tension, and stable performance in real operations.`,
            },
        heroImageLabel: { es: "Foto: pallets / bodega / film stretch", en: "Photo: pallets / warehouse / stretch film" },
        heroImageSrc: "/images/divisions/packaging/hero.jpg",
        productsTitle: { es: "Film Stretch", en: "Stretch Film" },
        layout: "grid2",
        products: [
          {
            key: "film-stretch-1,7kgs",
            name: { es: "Film Stretch Manual — Pack 6 (1,7 kg c/u)", en: "Hand Stretch Film — 6-Pack (1.7 kg each)" },
            short: { es: "Formato estándar para operación diaria.", en: "Standard format for daily operations." },
            descriptionPlaceholder: {
              es: `El Film Stretch Tipy Town es una solución versátil para embalaje manual, diseñada para asegurar, agrupar y proteger productos en una amplia variedad de usos: mudanzas, bodegas, pymes, comercio, e-commerce y operaciones industriales.

Fabricado con resinas de primer nivel y control de proceso, el film ofrece buena elasticidad, tensión uniforme y alta resistencia al rasgado, permitiendo envolver de forma firme y eficiente sin romperse ni perder adherencia durante el uso.

El formato Pack 6 de 1,7 kg por rollo es ideal para trabajos frecuentes y variados. Es fácil de manejar, cómodo para uso prolongado y entrega resultados consistentes tanto en aplicaciones domésticas como comerciales, cuando se busca orden, protección y estabilidad con un consumo controlado.

Disponible en color estándar y con opción de fabricación en otros colores bajo pedido.`,
  en: `Tipy Town Stretch Film is a versatile solution for manual wrapping, designed to secure, bundle, and protect items across a wide range of uses: moving, small warehouses, SMEs, retail, e-commerce, and industrial applications.

Manufactured with premium-grade resins and controlled processes, the film delivers good elasticity, consistent tension, and high tear resistance—allowing firm and efficient wrapping without breaking or losing cling during use.

The 6-pack format with 1.7 kg per roll is ideal for frequent and varied tasks. Easy to handle and comfortable for extended use, it provides consistent results for both domestic and commercial applications where protection, order, and stability are required.

Available in standard color, with custom color manufacturing available upon request.`,
},
            imageLabel: { es: "Foto: film stretch manual", en: "Photo: hand stretch film" },
            imageDir: "/images/divisions/packaging/products/film-stretch-1,7kgs",
            imageCount: 5,
            badges: [{ es: "Pack 6", en: "6-Pack" }, { es: "1,7 kg c/u", en: "1.7 kg each" }],
          },
          {
            key: "film-stretch-3kgs",
            name: { es: "Film Stretch Manual — Pack 6 (3,0 kg c/u)", en: "Hand Stretch Film — 6-Pack (3.0 kg each)" },
            short: { es: "Mayor autonomía por rollo y menos recambios.", en: "Longer runs per roll, fewer changeovers." },
            descriptionPlaceholder: {
              es: `El Film Stretch Tipy Town está diseñado para aplicaciones de embalaje manual donde se requiere mayor autonomía, resistencia y continuidad en el trabajo, sin perder facilidad de uso.

Su combinación de elasticidad controlada, buena memoria y alta resistencia permite asegurar objetos, cargas o conjuntos de productos de forma firme y estable, reduciendo roturas y la necesidad de reaplicar film.

El formato Pack 6 de 3,0 kg por rollo es especialmente adecuado para bodegas, pymes, mudanzas de mayor volumen y operaciones donde se busca disminuir recambios y mantener un ritmo de trabajo constante.

Disponible en color estándar y con opción de fabricación en otros colores bajo pedido.`,
  en: `Tipy Town Stretch Film is designed for manual wrapping applications that require greater autonomy, strength, and uninterrupted workflow, while remaining easy to use.

Its combination of controlled elasticity, strong memory, and high resistance allows items or groups of products to be wrapped firmly and securely, reducing breaks and the need for rewrapping.

The 6-pack format with 3.0 kg per roll is particularly well suited for warehouses, SMEs, larger moving jobs, and operations where fewer changeovers and steady work pace are key.

Available in standard color, with custom color manufacturing available upon request.`,
},
            imageLabel: { es: "Foto: film stretch 3 kg", en: "Photo: 3.0 kg stretch film" },
            imageDir: "/images/divisions/packaging/products/film-stretch-3kgs",
            imageCount: 5,
            badges: [{ es: "Pack 6", en: "6-Pack" }, { es: "3,0 kg c/u", en: "3.0 kg each" }],
          },
        ],
      },

      {
        key: "transporte",
        navLabel: { es: "Transporte", en: "Logistics" },
        pageTitle: { es: "Transporte", en: "Logistics" },
        intro: {
          es: "Servicio de transporte diseñado para operaciones exigentes, con foco en continuidad operacional, cumplimiento de plazos y control en cada etapa del trayecto. Operamos con flota dedicada y planificación anticipada, priorizando la seguridad de la carga, la trazabilidad y la coordinación con el cliente. Nuestra propuesta se basa en confiabilidad operativa, experiencia en rutas complejas y una ejecución consistente que permite a nuestros clientes concentrarse en su negocio sin fricciones logísticas.",
          en: "Transportation services designed for demanding operations, focused on operational continuity, on-time delivery, and control at every stage of the route. We operate with dedicated fleet capacity and advance planning, prioritizing cargo safety, traceability, and close coordination with our clients. Our value proposition is built on operational reliability, experience in complex routes, and consistent execution that allows customers to focus on their core business without logistical friction.",
        },
        heroImageLabel: { es: "Foto: tracto / rampla / ruta", en: "Photo: tractor unit / trailer / route" },
        heroImageSrc: "/images/divisions/transporte/hero.jpg",
        productsTitle: { es: "", en: "" },
        layout: "single",
        products: [
          {
            key: "capacidad",
            name: { es: "Capacidad logística interna", en: "Internal logistics capacity" },
            
            descriptionPlaceholder: {
              es: "Esta división existe para asegurar continuidad operacional en nuestras distintas líneas...",
              en: "This division exists to ensure operational continuity across our business lines...",
            },
            imageLabel: { es: "Foto: tracto / rampla / ruta", en: "Photo: tractor unit / trailer / route" },
            
            imageDir: "/images/divisions/transporte/products/capacidad",
            imageCount: 5,
            clickable: false,
            cardMaxWidth: 1500,
            cardVariant: "wide-compact",
          },
        ],
      },
    ],
    []
  );
}



function findDivision(divisions: Division[], key: Division["key"]) {
  return divisions.find((d) => d.key === key);
}

function findProduct(division: Division, productKey: string) {
  return division.products.find((p) => p.key === productKey);
}

/* =========================================================
   HEADER / FOOTER
========================================================= */
function SiteHeader() {
  const { isMd } = useBreakpoints();
  const { lang, toggleLang } = useLang();

  const btnLangToggle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#F3F4F6",
    color: "#374151",
    fontSize: 15, // +2 (antes 13)
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: HEADER_H,
        background: "#FEFEFE",
        borderBottom: "none",
        display: "flex",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          ...containerStyle(),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* LOGO */}
        <Link
          to="/"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 120,
              height: 36,
              borderRadius: 12,
              overflow: "hidden",
              flexShrink: 0,
              background: "transparent",
              border: "none",
              boxShadow: "none",
              outline: "none",
            }}
          >
            <video
              src="/logo-animado.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "contain",
                background: "transparent",
                border: "none",
                outline: "none",
                boxShadow: "none",
              }}
            />
          </div>

          <div style={{ lineHeight: 1.05 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 0.4,
                color: BRAND.primary,
                whiteSpace: "nowrap",
              }}
            >
              TIPY TOWN
            </div>
          </div>
        </Link>

        {/* NAV */}
        <nav
          aria-label={lang === "en" ? "Primary navigation" : "Navegación principal"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMd ? 10 : 18,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <TopNavLink to="/acuicola" label={pick(UI.navAcuicola, lang)} />
          <TopNavLink to="/agro" label={pick(UI.navAgro, lang)} />
          <TopNavLink to="/packaging" label={pick(UI.navPackaging, lang)} />
          <TopNavLink to="/transporte" label={pick(UI.navTransporte, lang)} />
          <TopNavLink to="/calidad" label={pick(UI.navCalidad, lang)} />
          <TopNavLink to="/nosotros" label={pick(UI.navNosotros, lang)} />

          <div style={{ width: 1, height: 18, background: BRAND.line, margin: "0 6px" }} />

          {/* WhatsApp */}
          <a
            href={getWhatsAppLink(buildWhatsAppPrefill(lang))}
            target="_blank"
            rel="noreferrer"
            style={btnOutlineSm()}
          >
            {pick(UI.btnWhatsApp, lang)}
          </a>

          {/* Contact (CTA principal) */}
          <Link to="/contacto" style={btnPrimarySm()}>
            {pick(UI.btnContacto, lang)}
          </Link>

          {/* ES / EN */}
          <button
            type="button"
            onClick={toggleLang}
            aria-label={lang === "en" ? "Switch to Spanish" : "Cambiar a inglés"}
            style={btnLangToggle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#E5E7EB";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F3F4F6";
            }}
          >
            {lang === "en" ? "ES" : "EN"}
          </button>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  const FOOTER_H = 56; // ALTO FIJO, NO CAMBIA

  return (
    <footer
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: FOOTER_H,
        background: BRAND.panel,
        borderTop: `1px solid ${BRAND.lineSoft}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        zIndex: 100,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: BRAND.muted,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        © 2026 Tipy Town.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <a
          href="/contacto"
          style={{
            fontSize: 12,
            color: BRAND.primary,
            textDecoration: "none",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          Contacto
        </a>

        <a
          href="https://www.linkedin.com"
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${BRAND.lineSoft}`,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: BRAND.muted }}>
            in
          </span>
        </a>
      </div>
    </footer>
  );
}


/* =========================================================
   HOME
========================================================= */
function Home() {
  const divisions = useDivisions();
  const { isSm, isMd, isXl } = useBreakpoints();
  const { lang } = useLang();

  const heroGridStyle: React.CSSProperties = {
    ...twoColGrid(isMd, isXl),
    alignItems: "stretch",
  };

  return (
    <div style={{ width: "100%" }}>
      <section style={{ borderBottom: `1px solid ${BRAND.line}` }}>
        <div style={{ ...containerStyle(), ...sectionPad(64, 52) }}>
          <div style={heroGridStyle}>
            {/* LEFT */}
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  marginTop: 0,
                  fontWeight: 350,
                  letterSpacing: -0.4,
                  lineHeight: 1.06,
                  fontSize: isSm ? 34 : isMd ? 42 : isXl ? 62 : 54,
                  color: BRAND.primary,
                  maxWidth: "none",
                }}
              >
                {pick(UI.brandTagline, lang)}
              </h1>

              <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link to="/contacto" style={{ ...btnPrimaryLg(), minWidth: 220 }}>
                  {pick(UI.homeCtaSales, lang)}
                </Link>
                
            
              </div>

              <div
                style={{
                  marginTop: 22,
                  display: "grid",
                  gridTemplateColumns: isMd ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <StatCard title={pick(UI.stat1Title, lang)} desc={pick(UI.stat1Desc, lang)} />
                <StatCard title={pick(UI.stat2Title, lang)} desc={pick(UI.stat2Desc, lang)} />
                <StatCard title={pick(UI.stat3Title, lang)} desc={pick(UI.stat3Desc, lang)} />
              </div>
            </div>

            {/* RIGHT */}
            <div
              style={{
                alignSelf: "stretch",
                minHeight: 0,
                display: "flex",
              }}
            >
              <div style={{ flex: "1 1 auto", minHeight: 0 }}>
                <FigurePlaceholder
                  title={lang === "en" ? "Image" : "Imagen"}
                  subtitle={lang === "en" ? "Photo: operations / warehouse" : "Foto: operación / bodega"}
                  src="/images/landing/hero.jpg"
                  alt={lang === "en" ? "Tipy Town operations" : "Operación Tipy Town"}
                  fit="cover"
                  minHeight={isMd ? 220 : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIVISIONS */}
      <section id="divisiones">
        <div style={{ ...containerStyle(), ...sectionPad(52, 52) }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 15, letterSpacing: 1.2, textTransform: "uppercase", color: BRAND.muted }}>
                {pick(UI.divisionsLabel, lang)}
              </div>
              <h2 style={{ marginTop: 8, fontSize: 30, fontWeight: 350, color: BRAND.primary, letterSpacing: -0.2 }}>
                {pick(UI.divisionsHeadline, lang)}
              </h2>
            </div>
          </div>

          <div style={{ marginTop: 24, ...responsiveAutoGrid(360) }}>
            {divisions.map((d) => (
              <DivisionCard key={d.key} division={d} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductDetail({ divisionKey }: { divisionKey: Division["key"] }) {
  const divisions = useDivisions();
  const division = findDivision(divisions, divisionKey);
  const { productKey } = useParams();
  const { isMd, isXl } = useBreakpoints();
  const { lang } = useLang();

  // ✅ REF para medir altura del contenido del texto
  const textContentRef = useRef<HTMLDivElement>(null);
  const [textHeight, setTextHeight] = useState<number>(420); // fallback inicial

  if (!division) return <NotFound />;
  if (!productKey) return <NotFound />;

  const product = (division.products || []).find((p) => p.key === productKey);
  if (!product) return <NotFound />;

  const title = pick(product.name, lang);

  const bodyText =
    (product.descriptionText ? pick(product.descriptionText, lang) : "") ||
    pick(product.descriptionPlaceholder, lang);

  const dir = product.imageDir || `/images/divisions/${divisionKey}/products/${product.key}`;
  const count = Math.max(1, Number(product.imageCount ?? 1));

  const heroGridStyle: React.CSSProperties = {
    ...twoColGrid(isMd, isXl),
    alignItems: "start",
    gap: isMd ? 28 : 18,
  };

  const titleSize = isMd ? 34 : isXl ? 52 : 44;
  const detailBodyFont = isMd ? 17 : 18;

  // ✅ Efecto para medir y sincronizar altura del texto
  useEffect(() => {
    const measureTextHeight = () => {
      if (textContentRef.current) {
        const height = textContentRef.current.offsetHeight;
        setTextHeight(height);
      }
    };

    // Medir inmediatamente
    measureTextHeight();

    // Re-medir en resize
    const handleResize = () => measureTextHeight();
    window.addEventListener('resize', handleResize);

    // Re-medir cuando cambie el contenido
    const timer = setTimeout(measureTextHeight, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [bodyText, title, lang, isMd, isXl]); // re-medir cuando cambie contenido

  return (
    <div style={{ width: "100%" }}>
      <section style={{ borderBottom: `1px solid ${BRAND.line}` }}>
        <div style={{ ...containerStyle(), ...sectionPad(44, 26) }}>
          <div style={heroGridStyle}>
            {/* LEFT: texto */}
            <div style={{ minWidth: 0 }}>
              {/* ✅ REF en el contenedor del texto */}
              <div ref={textContentRef}>
                <BackToDivision divisionKey={divisionKey} />

                <h1
                  style={{
                    marginTop: 10,
                    fontSize: titleSize,
                    lineHeight: 1.08,
                    color: BRAND.primary,
                    fontWeight: 350,
                  }}
                >
                  {title}
                </h1>

                <div style={{ marginTop: 12, maxWidth: 760 }}>
                  {toParagraphs(bodyText).map((p, idx) => (
                    <p
                      key={idx}
                      style={{
                        marginTop: idx === 0 ? 0 : 12,
                        fontSize: detailBodyFont,
                        lineHeight: 1.78,
                        color: "#334155",
                      }}
                    >
                      {p}
                    </p>
                  ))}
                </div>

                <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to="/contacto" style={{ ...btnOutlineLg(), minWidth: 180 }}>
                    {pick(UI.btnContactar, lang)}
                  </Link>

                  {product.datasheetUrl ? (
                    <a
                      href={product.datasheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...btnPrimaryLg(), minWidth: 180 }}
                    >
                      {lang === "en" ? "Datasheet" : "Ficha técnica"}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {/* RIGHT: galería que se adapta a la altura del texto */}
            <div style={{ minWidth: 0 }}>
              <ProductGallery 
                publicFolder={dir} 
                alt={title} 
                maxNumbered={count}
                maxH={textHeight} // ✅ Altura dinámica basada en el texto
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


function ProductCardImage({
  candidates,
  alt,
  height = 210,
  rounded = 16,
  fit = "cover",
  borderless = false,
}: {
  candidates: string | string[];
  alt: string;
  height?: number;
  rounded?: number;
  fit?: "cover" | "contain";
  borderless?: boolean;
}) {
  const [src, setSrc] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;

    const list = (Array.isArray(candidates) ? candidates : [candidates]).filter(Boolean);

    const loads = (url: string) =>
      new Promise<boolean>((resolve) => {
        const img = new Image();

        const done = (ok: boolean) => {
          img.onload = null;
          img.onerror = null;
          resolve(ok);
        };

        const t = window.setTimeout(() => done(false), 2500);

        img.onload = () => {
          window.clearTimeout(t);
          done(true);
        };
        img.onerror = () => {
          window.clearTimeout(t);
          done(false);
        };

        img.src = url;
      });

    async function resolveFirstWorking() {
      if (!list.length) {
        if (!cancelled) setSrc("");
        return;
      }

      for (const url of list) {
        const ok = await loads(url);
        if (cancelled) return;
        if (ok) {
          setSrc(url);
          return;
        }
      }

      if (!cancelled) setSrc("");
    }

    resolveFirstWorking();

    return () => {
      cancelled = true;
    };
  }, [candidates]);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: rounded,
        overflow: "hidden",
        background: "rgba(15, 23, 42, 0.04)",
        border: borderless ? "none" : `1px solid ${BRAND.line}`,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            color: "rgba(15, 23, 42, 0.55)",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          Sin imagen
        </div>
      )}
    </div>
  );
}




// Ctrl+F: ProductCard
function ProductCard({
  divisionKey,
  product,
}: {
  divisionKey: Division["key"];
  product: Product;
}) {
  const { lang } = useLang();
  const { isMd } = useBreakpoints();

  const title = pick(product.name, lang);
  const subtitle = product.short ? pick(product.short, lang) : "";
  const tag = product.badges?.[0] ? pick(product.badges[0], lang) : undefined;

  const isClickable = product.clickable !== false;
  const to = `/${divisionKey}/${product.key}`;

  const cardImageCandidates: string[] = (() => {
    const dir = product.imageDir;
    if (!dir) return [];
    return buildProductImageCandidates(dir, 1);
  })();

  // ✅ SOLO para transporte: candidatos múltiples (01.jpg, 02.jpg, 03.jpg...)
  const allImageCandidates: string[][] = (() => {
    if (divisionKey !== "transporte") return [];
    const dir = product.imageDir;
    const count = Math.max(1, Number(product.imageCount ?? 1));
    if (!dir) return [];
    const candidates: string[][] = [];
    for (let i = 1; i <= count; i++) {
      candidates.push(buildProductImageCandidates(dir, i));
    }
    return candidates;
  })();

  const maxW = product.cardMaxWidth ? `${product.cardMaxWidth}px` : undefined;

  // Texto "leyenda" para wide-compact
  const longTextRaw =
    (product.descriptionText ? pick(product.descriptionText, lang) : "") ||
    pick(product.descriptionPlaceholder, lang);

  const legend = (toParagraphs(longTextRaw)[0] || longTextRaw || "").trim();

  // ==========================
  // VARIANTE: WIDE-COMPACT
  // ✅ Transporte: 01.jpg como BANNER real (full-bleed)
  // ==========================
  if (product.cardVariant === "wide-compact") {
    const H = isMd ? 240 : 320;
    const isTransporte = divisionKey === "transporte";

    const wideCardStyle: React.CSSProperties = {
      background: "white",
      border: `1px solid ${BRAND.line}`,
      borderRadius: 22,
      overflow: "hidden",
      boxShadow: "0 8px 26px rgba(15, 23, 42, 0.08)",
      maxWidth: maxW,
      marginInline: product.cardMaxWidth ? "auto" : undefined,
      display: "flex",
      flexDirection: "column",
    };

    const topSectionStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: isMd ? "1fr" : "minmax(0, 0.95fr) minmax(0, 1.05fr)",
      alignItems: "stretch",
    };

    const leftStyle: React.CSSProperties = {
      padding: 18,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    };

    const rightStyle: React.CSSProperties = {
      minWidth: 0,
      display: "flex",
      alignItems: "stretch",
      justifyContent: "stretch",
      borderTop: isMd ? `1px solid ${BRAND.line}` : undefined,
      borderLeft: !isMd ? `1px solid ${BRAND.line}` : undefined,
      background: "#0B1220",
    };

    const headerRow: React.CSSProperties = {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    };

    // ✅ BANNER full-bleed REAL (ocupa el ancho de la pantalla)
    // Nota: el truco 100vw + marginLeft centra y no afecta otras landings porque va gated por isTransporte.
    const bannerWrapStyle: React.CSSProperties = {
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      background: "#0B1220",
      borderRadius: 0,
      overflow: "hidden",
      border: `1px solid ${BRAND.line}`,
      boxShadow: "0 10px 28px rgba(15, 23, 42, 0.10)",
    };

    const bannerInnerStyle: React.CSSProperties = {
      width: "100%",
      height: isMd ? 220 : 360,
      background: "#0B1220",
    };

    const fullBleedImageStyle: React.CSSProperties = {
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      background: "#0B1220",
      overflow: "hidden",
      borderTop: `1px solid ${BRAND.line}`,
    };

    const fullBleedInnerStyle: React.CSSProperties = {
      width: "100%",
      height: isMd ? 220 : 320,
      background: "#0B1220",
    };

    // 01.jpg para banner (solo transporte)
    const bannerCandidates: string[] = isTransporte
      ? (allImageCandidates[0] ?? cardImageCandidates)
      : [];

    const content = (
      <div style={{ width: "100%" }}>
        {/* ✅ SOLO TRANSPORTE: 01.jpg como banner full-bleed */}
        {isTransporte ? (
          <div style={bannerWrapStyle}>
            <div style={bannerInnerStyle}>
              {bannerCandidates.length ? (
                <ProductCardImage
                  candidates={bannerCandidates}
                  alt={`${title} - banner`}
                  height={isMd ? 220 : 360}
                  rounded={0}
                  fit="cover"
                  borderless
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: isMd ? 220 : 360,
                    display: "grid",
                    placeItems: "center",
                    color: "rgba(226,232,240,0.75)",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  Sin imagen
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* CARD de contenido (no full-bleed) */}
        <div style={wideCardStyle}>
          {/* Para transporte: SOLO texto arriba (porque la imagen ya es banner).
              Para otras divisiones: texto + imagen derecha como estaba. */}
          {isTransporte ? (
            <div style={leftStyle}>
              <div style={headerRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2, color: BRAND.ink }}>
                    {title}
                  </div>

                  {subtitle ? (
                    <div style={{ marginTop: 6, color: "rgba(15, 23, 42, 0.75)", fontSize: 14, lineHeight: 1.5 }}>
                      {subtitle}
                    </div>
                  ) : null}
                </div>

                {isClickable ? (
                  <div
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      border: `1px solid ${BRAND.line}`,
                      color: "rgba(15, 23, 42, 0.75)",
                      flex: "0 0 auto",
                      fontWeight: 900,
                    }}
                  >
                    →
                  </div>
                ) : null}
              </div>

              {tag ? (
                <div
                  style={{
                    alignSelf: "flex-start",
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(35, 137, 201, 0.12)",
                    border: "1px solid rgba(35, 137, 201, 0.18)",
                    color: "rgba(15, 23, 42, 0.82)",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {tag}
                </div>
              ) : null}

              {legend ? (
                <div
                  style={{
                    color: "#334155",
                    fontSize: 15,
                    lineHeight: 1.75,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical" as any,
                    WebkitLineClamp: 5 as any,
                    overflow: "hidden",
                  }}
                >
                  {legend}
                </div>
              ) : null}

              {isClickable ? (
                <div style={{ marginTop: "auto", paddingTop: 6 }}>
                  <span style={{ fontSize: 12, color: BRAND.muted, fontWeight: 800 }}>
                    {lang === "en" ? "See details" : "Ver detalle"}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={topSectionStyle}>
              <div style={leftStyle}>
                <div style={headerRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2, color: BRAND.ink }}>
                      {title}
                    </div>

                    {subtitle ? (
                      <div style={{ marginTop: 6, color: "rgba(15, 23, 42, 0.75)", fontSize: 14, lineHeight: 1.5 }}>
                        {subtitle}
                      </div>
                    ) : null}
                  </div>

                  {isClickable ? (
                    <div
                      aria-hidden="true"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        border: `1px solid ${BRAND.line}`,
                        color: "rgba(15, 23, 42, 0.75)",
                        flex: "0 0 auto",
                        fontWeight: 900,
                      }}
                    >
                      →
                    </div>
                  ) : null}
                </div>

                {tag ? (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(35, 137, 201, 0.12)",
                      border: "1px solid rgba(35, 137, 201, 0.18)",
                      color: "rgba(15, 23, 42, 0.82)",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {tag}
                  </div>
                ) : null}

                {legend ? (
                  <div
                    style={{
                      color: "#334155",
                      fontSize: 15,
                      lineHeight: 1.75,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical" as any,
                      WebkitLineClamp: 5 as any,
                      overflow: "hidden",
                    }}
                  >
                    {legend}
                  </div>
                ) : null}

                {isClickable ? (
                  <div style={{ marginTop: "auto", paddingTop: 6 }}>
                    <span style={{ fontSize: 12, color: BRAND.muted, fontWeight: 800 }}>
                      {lang === "en" ? "See details" : "Ver detalle"}
                    </span>
                  </div>
                ) : null}
              </div>

              <div style={rightStyle}>
                {cardImageCandidates.length ? (
                  <ProductCardImage
                    candidates={cardImageCandidates}
                    alt={title}
                    height={H}
                    rounded={0}
                    fit="cover"
                    borderless
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: H,
                      display: "grid",
                      placeItems: "center",
                      color: "rgba(226,232,240,0.75)",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    Sin imagen
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ✅ SOLO TRANSPORTE: 02.jpg, 03.jpg... full-bleed (si existen) */}
        {isTransporte
          ? allImageCandidates.slice(1).map((candidates, index) => (
              <div key={index + 2} style={fullBleedImageStyle}>
                <div style={fullBleedInnerStyle}>
                  {candidates?.length ? (
                    <ProductCardImage
                      candidates={candidates}
                      alt={`${title} - imagen ${index + 2}`}
                      height={isMd ? 220 : 320}
                      rounded={0}
                      fit="cover"
                      borderless
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: isMd ? 220 : 320,
                        display: "grid",
                        placeItems: "center",
                        color: "rgba(226,232,240,0.75)",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      Sin imagen
                    </div>
                  )}
                </div>
              </div>
            ))
          : null}
      </div>
    );

    if (!isClickable) return content;

    return (
      <Link to={to} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {content}
      </Link>
    );
  }

  // ==========================
  // DEFAULT CARD (grid normal)
  // ==========================
  const cardStyle: React.CSSProperties = {
    background: "white",
    border: `1px solid ${BRAND.line}`,
    borderRadius: 18,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 6px 24px rgba(15, 23, 42, 0.06)",
    height: "100%",
    cursor: isClickable ? "pointer" : "default",
    maxWidth: maxW,
    marginInline: product.cardMaxWidth ? "auto" : undefined,
  };

  const headerRow: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  };

  const content = (
    <div style={cardStyle}>
      <div style={headerRow}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2, color: BRAND.ink }}>
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                marginTop: 6,
                color: "rgba(15, 23, 42, 0.75)",
                fontSize: 14,
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical" as any,
                WebkitLineClamp: 2 as any,
                overflow: "hidden",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {isClickable ? (
          <div
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              border: `1px solid ${BRAND.line}`,
              color: "rgba(15, 23, 42, 0.75)",
              flex: "0 0 auto",
              fontWeight: 900,
            }}
          >
            →
          </div>
        ) : null}
      </div>

      {tag ? (
        <div
          style={{
            alignSelf: "flex-start",
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(35, 137, 201, 0.12)",
            border: "1px solid rgba(35, 137, 201, 0.18)",
            color: "rgba(15, 23, 42, 0.82)",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {tag}
        </div>
      ) : null}

      <div style={{ marginTop: 2 }}>
        {cardImageCandidates.length ? (
          <ProductCardImage candidates={cardImageCandidates} alt={title} height={210} rounded={16} fit="cover" />
        ) : (
          <div
            style={{
              width: "100%",
              height: 210,
              borderRadius: 16,
              border: `1px dashed ${BRAND.line}`,
              background: "rgba(15, 23, 42, 0.03)",
              display: "grid",
              placeItems: "center",
              color: "rgba(15, 23, 42, 0.55)",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            Sin imagen
          </div>
        )}
      </div>
    </div>
  );

  if (!isClickable) {
    return <div style={{ height: "100%" }}>{content}</div>;
  }

  return (
    <Link to={to} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      {content}
    </Link>
  );
}


/* =========================================================
   CALIDAD / NOSOTROS / CONTACTO
========================================================= */
function Calidad() {
  const { isMd, isXl } = useBreakpoints();
  const { lang } = useLang();

  const t = (o: { es: string; en: string }) => (lang === "en" ? o.en : o.es);

  const titleSize = isMd ? 34 : isXl ? 52 : 44;

  const principles = [
    {
      title: { es: "Control en proceso", en: "In-process control" },
      desc: {
        es: "Monitoreo de variables críticas durante fabricación para asegurar repetibilidad y estabilidad en operación.",
        en: "Monitoring critical variables during manufacturing to ensure repeatability and stable field performance.",
      },
    },
    {
      title: { es: "Registros auditables", en: "Auditable records" },
      desc: {
        es: "Trazabilidad por lote, fecha, turno y orden. Evidencia disponible frente a auditorías o requerimientos técnicos.",
        en: "Traceability by lot, date, shift, and work order. Evidence available for audits and technical requests.",
      },
    },
    {
      title: { es: "Mejora continua", en: "Continuous improvement" },
      desc: {
        es: "Acciones correctivas basadas en evidencia: ajustes de proceso, estandarización y control de recurrencia.",
        en: "Evidence-based corrective actions: process adjustments, standardization, and recurrence control.",
      },
    },
  ];

  const steps = [
    {
      n: "01",
      t: { es: "Recepción y validación", en: "Receiving & validation" },
      d: {
        es: "Recepción controlada de insumos y/o producto: verificación visual y dimensional, identificación por lote y registro básico de conformidad. Se bloquea lo que no cumpla hasta resolver la causa.",
        en: "Controlled receiving of inputs and/or product: visual and dimensional checks, lot identification, and conformity records. Nonconforming items are held until root cause is addressed.",
      },
    },
    {
      n: "02",
      t: { es: "Control en proceso", en: "In-process control" },
      d: {
        es: "Durante la fabricación se monitorean variables que afectan desempeño: estructura, tensión, consistencia dimensional y estabilidad de salida. Cuando hay desviación, se corrige en línea y se deja evidencia del ajuste.",
        en: "During manufacturing we monitor performance-driving variables: structure, tension, dimensional consistency, and output stability. Deviations are corrected on-line and the adjustment is recorded.",
      },
    },
    {
      n: "03",
      t: { es: "Registro y trazabilidad", en: "Records & traceability" },
      d: {
        es: "Cada partida queda asociada a lote, fecha, turno y orden de producción. Esto permite rastrear condiciones de fabricación, aislar eventos y responder rápido frente a reclamos o auditorías.",
        en: "Each batch is linked to lot, date, shift, and work order. This enables fast root-cause analysis, event isolation, and quick response to claims or audits.",
      },
    },
    {
      n: "04",
      t: { es: "Verificación final", en: "Final verification" },
      d: {
        es: "Chequeo final del producto contra especificación: revisión dimensional/visual y confirmación de criterios críticos. Solo se libera producto conforme; lo no conforme se segrega y se gestiona por causa.",
        en: "Final check against specification: dimensional/visual review and confirmation of critical criteria. Only conforming product is released; nonconforming product is segregated and managed by cause.",
      },
    },
    {
      n: "05",
      t: { es: "Liberación y despacho", en: "Release & dispatch" },
      d: {
        es: "Despacho con respaldo básico: identificación, registro de salida y consistencia de entrega. El objetivo es continuidad operacional del cliente: menos fricción, menos incertidumbre y respuesta rápida si aparece un desvío.",
        en: "Dispatch with basic supporting records: identification, outbound registration, and consistent delivery. The goal is customer uptime: less friction, less uncertainty, and fast response if a deviation appears.",
      },
    },
  ];

  // ✅ +3px SOLO textos largos
  const body18 = isMd ? 17 : 18; // antes 15
  const body17 = isMd ? 16 : 17; // antes 14

  return (
    <div style={{ width: "100%" }}>
      <section style={{ borderBottom: `1px solid ${BRAND.line}` }}>
        <div style={{ ...containerStyle(), ...sectionPad(44, 30) }}>
          <BackToHome />

          <h1
            style={{
              marginTop: 12,
              fontSize: titleSize,
              fontWeight: 350,
              color: BRAND.primary,
              lineHeight: 1.08,
              letterSpacing: -0.2,
              maxWidth: 980,
            }}
          >
            {t({ es: "Calidad verificable.", en: "Verifiable quality." })}
            <br />
            {t({ es: "Control y evidencia.", en: "Control and evidence." })}
          </h1>

          <p
            style={{
              marginTop: 12,
              fontSize: body18,
              lineHeight: 1.78,
              color: "#334155",
              maxWidth: 980,
            }}
          >
            {t({
              es: "La calidad no es un discurso: se ejecuta en la operación y se respalda con evidencia. Nuestro foco es entregar consistencia, trazabilidad y respuesta rápida, reduciendo fricción comercial y protegiendo la continuidad operacional.",
              en: "Quality is not a promise: it’s executed on the floor and backed by evidence. Our focus is consistency, traceability, and fast response—reducing commercial friction and protecting operational continuity.",
            })}
          </p>

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/contacto" style={btnPrimaryLg()}>
              {t({ es: "Solicitar información", en: "Request information" })}
            </Link>
          </div>
        </div>
      </section>

      <section style={{ borderBottom: `1px solid ${BRAND.line}` }}>
        <div style={{ ...containerStyle(), ...sectionPad(26, 36) }}>
          <div style={{ border: `1px solid ${BRAND.line}`, borderRadius: 22, padding: 22, background: "white" }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: BRAND.primary }}>
              {t({ es: "Principios", en: "Principles" })}
            </h2>

            <p style={{ marginTop: 10, fontSize: body17, lineHeight: 1.78, color: "#334155", maxWidth: 980 }}>
              {t({
                es: "Tres reglas simples: medir lo que importa, registrar lo necesario y corregir con evidencia. Esto habilita consistencia y una respuesta rápida cuando el estándar se desvía.",
                en: "Three simple rules: measure what matters, record what’s necessary, and correct with evidence. This enables consistency and fast response when the standard deviates.",
              })}
            </p>

            <div style={{ marginTop: 12, ...responsiveAutoGrid(320) }}>
              {principles.map((p) => (
                <MiniCard key={t(p.title)} title={t(p.title)} desc={t(p.desc)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="proceso" style={{ borderBottom: `1px solid ${BRAND.line}` }}>
        <div style={{ ...containerStyle(), ...sectionPad(26, 46) }}>
          <div style={{ border: `1px solid ${BRAND.line}`, borderRadius: 22, padding: 22, background: "white" }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: BRAND.primary }}>
              {t({ es: "Proceso de calidad", en: "Quality process" })}
            </h2>

            <p style={{ marginTop: 10, fontSize: body17, lineHeight: 1.78, color: "#334155", maxWidth: 980 }}>
              {t({
                es: "Un flujo simple, auditable y orientado a operación: detectar temprano, corregir rápido y dejar trazabilidad suficiente para responder con hechos.",
                en: "A simple, auditable, operations-first flow: detect early, correct fast, and keep sufficient traceability to respond with facts.",
              })}
            </p>

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {steps.map((s) => (
                <QualityStepRow
                  key={s.n}
                  step={{
                    n: s.n,
                    t: s.t,
                    d: s.d,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Nosotros() {
  const { isMd, isXl } = useBreakpoints();
  const { lang } = useLang();

  const titleSize = isMd ? 34 : isXl ? 52 : 44;
  const bodySize = isMd ? 16 : 18;

  return (
    <div style={{ width: "100%" }}>
      {/* HERO */}
      <section
        style={{
          borderBottom: `1px solid ${BRAND.line}`,
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        }}
      >
        <div style={{ ...containerStyle(), ...sectionPad(44, 30) }}>
          <div style={{ ...twoColGrid(isMd, isXl), alignItems: "stretch" }}>
            <div>
              <BackToHome />

              <h1
                style={{
                  marginTop: 10,
                  fontSize: titleSize,
                  fontWeight: 350,
                  color: BRAND.primary,
                  lineHeight: 1.08,
                  letterSpacing: -0.2,
                }}
              >
                {pick(UI.nosotrosTitle, lang)}
              </h1>

              <div style={{ marginTop: 12, maxWidth: 560 }}>
                <p
                  style={{
                    fontSize: bodySize,
                    lineHeight: 1.78,
                    color: "#334155",
                    marginBottom: 12,
                  }}
                >
                  {pick(UI.nosotrosP1, lang)}
                </p>
                <p
                  style={{
                    fontSize: bodySize,
                    lineHeight: 1.78,
                    color: "#334155",
                    marginBottom: 12,
                  }}
                >
                  {pick(UI.nosotrosP2, lang)}
                </p>
                <p
                  style={{
                    fontSize: bodySize,
                    lineHeight: 1.78,
                    color: "#334155",
                    marginBottom: 12,
                  }}
                >
                  {pick(UI.nosotrosP3, lang)}
                </p>
              </div>

              <div style={{ marginTop: 18 }}>
                <Link to="/contacto" style={btnPrimaryLg()}>
                  {pick(UI.nosotrosBtn, lang)}
                </Link>
              </div>
            </div>

            {/* HERO IMAGE */}
            <div style={{ display: "flex" }}>
              <FigurePlaceholder
                title={lang === "en" ? "COMPANY" : "EMPRESA"}
                subtitle={
                  lang === "en"
                    ? "Photo: team / plant / operations"
                    : "Foto: equipo / planta / operación"
                }
                src="/images/about/hero.jpg"
                alt={lang === "en" ? "About Tipy Town" : "Sobre Tipy Town"}
                fit="cover"
                minHeight={isMd ? 320 : 380}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CAROUSEL SECTION */}
      <AboutCarousel
        title={
          lang === "en"
            ? "Operations, infrastructure and control"
            : "Operación, infraestructura y control"
        }
        text={
          lang === "en"
            ? "Industrial team focused on continuity: clear processes, on-site control and delivery discipline."
            : "Equipo industrial orientado a continuidad: procesos claros, control en terreno y foco en cumplir lo acordado."
        }
        images={[
          { src: "/images/about/01.jpg", alt: "Operations 01" },
          { src: "/images/about/02.jpg", alt: "Operations 02" },
          { src: "/images/about/03.jpg", alt: "Operations 03" },
          { src: "/images/about/04.jpg", alt: "Operations 04" },
        ]}
      />
    </div>
  );
}



  


function Contacto() {
  const { lang } = useLang();
  const { isMd } = useBreakpoints();

  const [waText, setWaText] = useState<string>(() => buildWhatsAppPrefill(lang));
  useEffect(() => setWaText(buildWhatsAppPrefill(lang)), [lang]);

  const [chooserOpen, setChooserOpen] = useState(false);

  const COPY = {
    writeEmail: { es: "Escribir email", en: "Write email" },
    chooseTitle: { es: "Elige tu plataforma de correo", en: "Choose your email platform" },
    chooseDesc: {
      es: "Abriremos el redactor en web con el correo listo para enviar.",
      en: "We’ll open the web composer with the email ready to send.",
    },
    openOutlook: { es: "Abrir en Outlook (web)", en: "Open in Outlook (web)" },
    openGmail: { es: "Abrir en Gmail (web)", en: "Open in Gmail (web)" },
    cancel: { es: "Cancelar", en: "Cancel" },
    hint: {
      es: "Si tu correo está bloqueado por políticas, usa la opción alternativa.",
      en: "If your email is restricted by policy, use the alternative option.",
    },
  };

  const to = SALES_EMAIL;
  const subject =
    lang === "en" ? "Tipy Town — Contact request" : "Tipy Town — Solicitud de contacto";
  const body =
    lang === "en"
      ? "Hi,\n\nI’d like to request information or a quote.\n\nDivision:\nProduct:\nEstimated volume:\nDestination:\n\nBest regards,"
      : "Hola,\n\nQuiero solicitar información o una cotización.\n\nDivisión:\nProducto:\nVolumen estimado:\nDestino:\n\nSaludos,";

  const gmailCompose =
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&to=${encodeURIComponent(to)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  const outlookCompose =
    "https://outlook.office.com/mail/deeplink/compose" +
    `?to=${encodeURIComponent(to)}` +
    `&subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  // ✅ +3px SOLO textos largos
  const body18 = isMd ? 17 : 18; // antes 15
  const body17 = isMd ? 16 : 17; // antes 14

  return (
    <div style={{ width: "100%" }}>
      <section>
        <div style={{ ...containerStyle(), ...sectionPad(44, 70) }}>
          <BackToHome />

          <h1
            style={{
              marginTop: 10,
              fontSize: 44,
              fontWeight: 350,
              color: BRAND.primary,
            }}
          >
            {pick(UI.contactoTitle, lang)}
          </h1>

          <p
            style={{
              marginTop: 12,
              fontSize: body18,
              lineHeight: 1.78,
              color: "#334155",
              maxWidth: 720,
            }}
          >
            {pick(UI.contactoIntro, lang)}
          </p>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 18,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                border: `1px solid ${BRAND.line}`,
                borderRadius: 22,
                padding: 20,
                background: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: BRAND.primary }}>
                {pick(UI.contactoWABoxTitle, lang)}
              </h3>

              <p style={{ marginTop: 8, fontSize: body17, lineHeight: 1.7, color: "#334155" }}>
                {pick(UI.contactoWABoxText, lang)}
              </p>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: BRAND.muted, marginBottom: 6 }}>
                  {pick(UI.contactoWATemplate, lang)}
                </div>

                <textarea
                  value={waText}
                  onChange={(e) => setWaText(e.target.value)}
                  rows={7}
                  spellCheck={false}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: `1px solid ${BRAND.line}`,
                    background: "white",
                    color: BRAND.ink,
                    fontSize: body17, // antes 14
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.7,
                  }}
                />
              </div>

              <div style={{ marginTop: "auto", paddingTop: 16 }}>
                <a
                  href={getWhatsAppLink(waText)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...btnPrimaryLg(), width: "100%" }}
                >
                  {pick(UI.contactoWAOpen, lang)}
                </a>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${BRAND.line}`,
                borderRadius: 22,
                padding: 20,
                background: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: BRAND.primary }}>
                {pick(UI.contactoSalesBoxTitle, lang)}
              </h3>

              <p style={{ marginTop: 8, fontSize: body17, lineHeight: 1.7, color: "#334155" }}>
                {pick(UI.contactoSalesBoxText, lang)}
              </p>

              <div style={{ marginTop: 14, fontSize: body17, lineHeight: 1.78 }}>
                <strong>Email</strong>
                <br />
                <a href={`mailto:${SALES_EMAIL}`} style={{ color: BRAND.secondary, textDecoration: "none" }}>
                  {SALES_EMAIL}
                </a>

                <br />
                <br />

                <strong>{lang === "en" ? "Phone" : "Teléfono"}</strong>
                <br />
                <a href="tel:+56968160062" style={{ color: BRAND.secondary, textDecoration: "none" }}>
                  +56 9 6816 0062
                </a>
              </div>

              <div style={{ marginTop: "auto", paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setChooserOpen(true)}
                  style={{ ...btnOutlineLg(), width: "100%" }}
                >
                  {lang === "en" ? COPY.writeEmail.en : COPY.writeEmail.es}
                </button>
              </div>
            </div>
          </div>

          {chooserOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={lang === "en" ? COPY.chooseTitle.en : COPY.chooseTitle.es}
              onClick={() => setChooserOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(2,6,23,0.58)",
                display: "grid",
                placeItems: "center",
                padding: 18,
                zIndex: 80,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(560px, 100%)",
                  borderRadius: 22,
                  background: "white",
                  border: `1px solid ${BRAND.line}`,
                  boxShadow: "0 24px 80px rgba(2,6,23,0.28)",
                  padding: 18,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 950, color: BRAND.primary }}>
                      {lang === "en" ? COPY.chooseTitle.en : COPY.chooseTitle.es}
                    </div>
                    <div style={{ marginTop: 6, fontSize: body17, lineHeight: 1.7, color: "#334155" }}>
                      {lang === "en" ? COPY.chooseDesc.en : COPY.chooseDesc.es}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setChooserOpen(false)}
                    aria-label={lang === "en" ? "Close" : "Cerrar"}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      border: `1px solid ${BRAND.line}`,
                      background: "white",
                      cursor: "pointer",
                      fontWeight: 900,
                      color: BRAND.primary,
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <a
                    href={outlookCompose}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setChooserOpen(false)}
                    style={{
                      ...btnPrimaryLg(),
                      width: "100%",
                      textDecoration: "none",
                      textAlign: "center",
                      display: "inline-block",
                    }}
                  >
                    {lang === "en" ? COPY.openOutlook.en : COPY.openOutlook.es}
                  </a>

                  <a
                    href={gmailCompose}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setChooserOpen(false)}
                    style={{
                      ...btnOutlineLg(),
                      width: "100%",
                      textDecoration: "none",
                      textAlign: "center",
                      display: "inline-block",
                    }}
                  >
                    {lang === "en" ? COPY.openGmail.en : COPY.openGmail.es}
                  </a>

                  <button type="button" onClick={() => setChooserOpen(false)} style={{ ...btnOutlineLg(), width: "100%" }}>
                    {lang === "en" ? COPY.cancel.en : COPY.cancel.es}
                  </button>

                  <div style={{ fontSize: 12, color: BRAND.muted, lineHeight: 1.5 }}>
                    {lang === "en" ? COPY.hint.en : COPY.hint.es}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   UI COMPONENTS
========================================================= */



function TopNavLink({ to, label }: { to: string; label: string }) {
  const activeStyle: React.CSSProperties = {
    color: BRAND.primary,
    fontWeight: 900,
  };

  const baseStyle: React.CSSProperties = {
    textDecoration: "none",
    color: "#0f172a",
    fontSize: 16, // +3 (antes 13)
    fontWeight: 700,
    padding: "10px 10px",
    borderRadius: 12,
    transition: "background 0.2s ease, color 0.2s ease",
  };

  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...baseStyle,
        ...(isActive ? activeStyle : {}),
      })}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(2, 6, 23, 0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </NavLink>
  );
}

function StatCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      style={{
        border: `1px solid ${BRAND.line}`,
        borderRadius: 18,
        padding: 14,
        background: "white",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900, color: BRAND.primary }}>
        {title}
      </div>
      <div style={{ marginTop: 6, fontSize: 16, lineHeight: 1.65, color: "#475569" }}>
        {desc}
      </div>
    </div>
  );
}

function MiniCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      style={{
        border: `1px solid ${BRAND.line}`,
        borderRadius: 18,
        padding: 14,
        background: "white",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 900, color: BRAND.primary }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: "#475569" }}>{desc}</div>
    </div>
  );
}

function DivisionCard({ division }: { division: Division }) {
  const { lang } = useLang();
  const [hover, setHover] = useState(false);

  return (
    <Link
      to={`/${division.key}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        height: "100%",
        display: "block",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onBlur={() => setHover(false)}
    >
      <article
        style={{
          border: `1px solid ${hover ? "#111827" : BRAND.line}`,
          borderRadius: 22,
          background: "white",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          cursor: "pointer",
          transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
          transform: hover ? "translateY(-2px)" : "none",
          boxShadow: hover
            ? "0 18px 42px rgba(15, 23, 42, 0.14)"
            : "0 8px 26px rgba(15, 23, 42, 0.08)",
        }}
      >
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 20, // ⬆ antes 17
              fontWeight: 900,
              color: BRAND.primary,
              letterSpacing: -0.2,
            }}
          >
            {pick(division.navLabel, lang)}
          </h3>

          <div
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              border: `1px solid ${BRAND.line}`,
              color: "rgba(15, 23, 42, 0.75)",
              fontSize: 18,
              fontWeight: 900,
              flex: "0 0 auto",
            }}
          >
            →
          </div>
        </div>

        {/* TEXTO – MISMO LAYOUT, TEXTO CONTROLADO */}
        <p
          style={{
            marginTop: 10,
            fontSize: 17, // ⬆ +3px
            lineHeight: 1.6,
            color: "#334155",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 54,
            maxHeight: 54,
          }}
        >
          {pick(division.intro, lang)}
        </p>

        {/* IMAGEN – EXACTAMENTE IGUAL A ANTES */}
        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <div style={{ width: "100%", height: 160 }}>
            <FigurePlaceholder
              title={lang === "en" ? "Image" : "Imagen"}
              subtitle={pick(division.heroImageLabel, lang)}
              src={division.heroImageSrc}
              alt={pick(division.pageTitle, lang)}
              fit="cover"
              minHeight={160}
            />
          </div>
        </div>
      </article>
    </Link>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Devuelve candidatos en orden para tolerar:
 * - 01.jpg / 1.jpg
 * - .jpg / .png / .webp / .jpeg
 */
 function buildIndexedImageCandidates(dir: string, index1based: number) {
  const i = index1based;
  const p2 = pad2(i);

  const bases = [`${dir}/${p2}`, `${dir}/${i}`];
  const exts = [".jpg", ".jpeg", ".png", ".webp"];

  const out: string[] = [];
  for (const b of bases) for (const e of exts) out.push(`${b}${e}`);
  return out;
}

/** Hero tolerante: hero.jpg / hero.png / hero.webp */
function buildHeroCandidates(dir: string) {
  const base = (dir || "").replace(/\/+$/, "");
  if (!base) return [];
  return [
    `${base}/hero.jpg`,
    `${base}/hero.jpeg`,
    `${base}/hero.png`,
    `${base}/hero.webp`,
  ];
}

function buildProductImageCandidates(dir: string, index1Based: number) {
  const base = (dir || "").replace(/\/+$/, "");
  if (!base) return [];

  const n2 = String(index1Based).padStart(2, "0"); // 01, 02...
  const n1 = String(index1Based);                  // 1, 2...

  // ✅ Producto: SOLO numeradas. NUNCA hero.
  return [
    `${base}/${n2}.jpg`,
    `${base}/${n2}.jpeg`,
    `${base}/${n2}.png`,
    `${base}/${n2}.webp`,
    `${base}/${n1}.jpg`,
    `${base}/${n1}.jpeg`,
    `${base}/${n1}.png`,
    `${base}/${n1}.webp`,
  ];
}



function AboutCarousel({
  title,
  text,
  images,
}: {
  title: string;
  text: string;
  images: { src: string; alt: string }[];
}) {
  const { isMd } = useBreakpoints();
  const [i, setI] = React.useState(0);

  const safeImages = (images || []).filter((x) => x?.src);
  const canNav = safeImages.length > 1;

  // Si cambian las imágenes, resetea índice
  React.useEffect(() => {
    setI(0);
  }, [safeImages.map((x) => x.src).join("|")]);

  const next = () => {
    if (!canNav) return;
    setI((v) => (v + 1) % safeImages.length);
  };

  const prev = () => {
    if (!canNav) return;
    setI((v) => (v - 1 + safeImages.length) % safeImages.length);
  };

  const H = isMd ? 240 : 320;
  const current = safeImages[i] || safeImages[0];

  return (
    <section
      style={{
        width: "100%",
        background: "#F3F4F6",
        borderTop: `1px solid ${BRAND.lineSoft}`,
        borderBottom: `1px solid ${BRAND.lineSoft}`,
      }}
    >
      <div style={{ ...containerStyle(), ...sectionPad(28, 28) }}>
        <div
          style={{
            background: BRAND.panel,
            border: `1px solid ${BRAND.lineSoft}`,
            borderRadius: 22,
            boxShadow: "0 8px 26px rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: isMd ? "1fr" : "minmax(0, 0.95fr) minmax(0, 1.05fr)",
            alignItems: "stretch",
          }}
        >
          {/* LEFT: leyenda */}
          <div style={{ padding: 18, minWidth: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: BRAND.primary,
                lineHeight: 1.15,
              }}
            >
              {title}
            </div>

            <div style={{ marginTop: 10, color: "#334155", fontSize: 15, lineHeight: 1.75, maxWidth: 720 }}>
              {text}
            </div>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {safeImages.length ? (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: "rgba(15, 23, 42, 0.72)",
                    background: "rgba(15, 23, 42, 0.06)",
                    border: `1px solid ${BRAND.lineSoft}`,
                    borderRadius: 999,
                    padding: "6px 10px",
                  }}
                >
                  {i + 1}/{safeImages.length}
                </div>
              ) : null}

              {canNav ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button type="button" onClick={prev} aria-label="Previous" style={carouselNavBtn(false)}>
                    ‹
                  </button>
                  <button type="button" onClick={next} aria-label="Next" style={carouselNavBtn(false)}>
                    ›
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* RIGHT: 1 sola imagen (no se repite) */}
          <div
            style={{
              minWidth: 0,
              borderLeft: !isMd ? `1px solid ${BRAND.lineSoft}` : undefined,
              borderTop: isMd ? `1px solid ${BRAND.lineSoft}` : undefined,
              background: "#0B1220",
              height: H,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {current ? (
              <img
                src={current.src}
                alt={current.alt}
                loading="lazy"
                decoding="async"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, #0B1220 0%, #111827 60%, #0B1220 100%)",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


/** Ctrl+F: carouselNavBtn */
function carouselNavBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 999,
    border: `1px solid ${BRAND.lineSoft}`,
    background: disabled ? "#F8FAFC" : "#FFFFFF",
    color: disabled ? "#94A3B8" : BRAND.primary,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    lineHeight: 1,
    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)",
    userSelect: "none",
  };
}

/** Ctrl+F: carouselImageCard */
function carouselImageCard(desktopH: number, mobileH: number): React.CSSProperties {
  return {
    borderRadius: 18,
    overflow: "hidden",
    border: `1px solid ${BRAND.lineSoft}`,
    background: "#0B1220",
    height: desktopH,
  };
}

/** Ctrl+F: carouselImgStyle */
function carouselImgStyle(): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };
}

/** Ctrl+F: carouselFallback */
function carouselFallback(): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #0B1220 0%, #111827 60%, #0B1220 100%)",
  };
}


function ImageLightbox({
  open,
  src,
  alt,
  onClose,
}: {
  open: boolean;
  src?: string;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.88)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      {/* STOP click bubbling */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: "95vw",
          maxHeight: "95vh",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute",
            top: -14,
            right: -14,
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "none",
            background: "#fff",
            color: "#0B1220",
            fontSize: 20,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          }}
        >
          ×
        </button>

        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: "95vw",
            maxHeight: "95vh",
            objectFit: "contain",
            display: "block",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            background: "#0B1220",
          }}
        />
      </div>
    </div>
  );
}


function FigurePlaceholder({
  title,
  subtitle,
  src,
  alt,
  fit = "cover",
  minHeight,
}: {
  title: string;
  subtitle?: string;
  src?: string | string[]; // ✅ ahora soporta candidatos
  alt?: string;
  fit?: "cover" | "contain";
  minHeight?: number;
}) {
  const candidates = Array.isArray(src) ? src.filter(Boolean) : src ? [src] : [];

  const [i, setI] = React.useState(0);
  const [dead, setDead] = React.useState(false);

  // Si cambia src, resetea
  React.useEffect(() => {
    setI(0);
    setDead(false);
  }, [Array.isArray(src) ? src.join("|") : src]);

  const current = candidates[i];

  const box: React.CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: minHeight ? `${minHeight}px` : undefined,
    borderRadius: 22,
    border: `1px solid ${BRAND.line}`,
    overflow: "hidden",
    background: "#0B1220",
    position: "relative",
  };

  return (
    <div style={box} aria-label={alt || title}>
      {/* Imagen real (sin icono roto / sin texto) */}
      {!dead && current ? (
        <>
          <img
            key={`${i}-${current}`}
            src={current}
            alt="" // ✅ evita texto visible si falla
            aria-hidden="true"
            loading="lazy"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: fit,
              display: "block",
            }}
            onError={() => {
              if (i + 1 < candidates.length) setI((p) => p + 1);
              else setDead(true);
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(2,6,23,0.06) 0%, rgba(2,6,23,0.18) 100%)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : (
        <>
          {/* Placeholder (cuando no hay foto o falló todo) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(2,6,23,0.28) 0%, rgba(2,6,23,0.72) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: 16,
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                width: "100%",
                borderRadius: 16,
                border: "1px dashed rgba(226,232,240,0.28)",
                background: "rgba(226,232,240,0.06)",
                padding: 14,
                maxWidth: 640,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "rgba(226,232,240,0.86)",
                }}
              >
                {title}
              </div>
              {subtitle ? (
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: "rgba(226,232,240,0.78)" }}>
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>

        </>
      )}
    </div>
  );
}

/* =========================================================
   NAV HELPERS
========================================================= */
function BackToHome() {
  const { lang } = useLang();
  return (
    <Link to="/" style={{ ...btnOutlineSm(), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
      ← {lang === "en" ? "Home" : "Inicio"}
    </Link>
  );
}

function BackToDivision({ divisionKey }: { divisionKey: Division["key"] }) {
  const { lang } = useLang();
  return (
    <Link
      to={`/${divisionKey}`}
      style={{ ...btnOutlineSm(), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      ← {lang === "en" ? "Back" : "Volver"}
    </Link>
  );
}

/* =========================================================
   ROUTE UX
========================================================= */
function ScrollToTopOnRouteChange() {
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as any });
  }, [loc.pathname]);
  return null;
}

/* =========================================================
   MODAL
========================================================= */
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(2,6,23,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(860px, 100%)",
          borderRadius: 22,
          background: "white",
          border: `1px solid ${BRAND.line}`,
          boxShadow: "0 20px 60px rgba(2, 6, 23, 0.25)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: `1px solid ${BRAND.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, color: BRAND.primary }}>{title}</div>
          <button type="button" onClick={onClose} style={btnOutlineSm()} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

/* =========================================================
   FORMS
========================================================= */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: BRAND.muted }}>{label}</div>
      {children}
    </label>
  );
}

function formGrid(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
    alignItems: "start",
  };
}

function clamp(lines: number): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical" as any,
    WebkitLineClamp: lines as any,
    overflow: "hidden",
  };
}


function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${BRAND.line}`,
    background: "white",
    color: BRAND.ink,
    fontSize: 14,
    outline: "none",
  };
}

function selectStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    appearance: "none",
    backgroundImage:
      "linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%)",
    backgroundPosition: "calc(100% - 18px) calc(50% - 3px), calc(100% - 12px) calc(50% - 3px)",
    backgroundSize: "6px 6px, 6px 6px",
    backgroundRepeat: "no-repeat",
    paddingRight: 40,
  };
}

function textareaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 140,
    resize: "vertical",
    lineHeight: 1.6,
  };
}

/* =========================================================
   BUTTONS
========================================================= */
function btnBase(): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "1px solid transparent",
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    transition: "transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, opacity 0.16s ease",
    userSelect: "none",
    outline: "none",
  };
}

function btnLangToggle(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#F3F4F6",      // gris claro
    color: "#374151",           // gris texto
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
  };
}

function btnPrimarySm(): React.CSSProperties {
  return {
    ...btnBase(),
    padding: "10px 12px",
    background: BRAND.primary,
    color: "white",
    boxShadow: "0 10px 24px rgba(2, 6, 23, 0.10)",
  };
}

function btnOutlineSm(): React.CSSProperties {
  return {
    ...btnBase(),
    padding: "10px 12px",
    background: "white",
    color: BRAND.primary,
    border: `1px solid ${BRAND.line}`,
  };
}

function btnPrimaryLg(): React.CSSProperties {
  return {
    ...btnBase(),
    padding: "12px 16px",
    background: BRAND.primary,
    color: "white",
    boxShadow: "0 10px 24px rgba(2, 6, 23, 0.10)",
  };
}

function btnOutlineLg(): React.CSSProperties {
  return {
    ...btnBase(),
    padding: "12px 16px",
    background: "white",
    color: BRAND.primary,
    border: `1px solid ${BRAND.line}`,
  };
}

/* =========================================================
   WHATSAPP
========================================================= */
function getWhatsAppLink(text: string) {
  const cleanPhone = WHATSAPP_PHONE_E164.replace(/[^\d+]/g, "");
  const msg = encodeURIComponent(text || "");
  return `https://wa.me/${cleanPhone.replace("+", "")}?text=${msg}`;
}

/* =========================================================
   NOT FOUND
========================================================= */
function NotFound() {
  const { lang } = useLang();
  return (
    <div style={{ ...containerStyle(), ...sectionPad(44, 70) }}>
      <h1 style={{ marginTop: 0, fontSize: 42, fontWeight: 350, color: BRAND.primary }}>
        {pick(UI.notFoundTitle, lang)}
      </h1>
      <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.7, color: "#334155" }}>
        {pick(UI.notFoundText, lang)}
      </p>
      <Link to="/" style={{ ...btnPrimaryLg(), marginTop: 16 }}>
        {pick(UI.notFoundBtn, lang)}
      </Link>
    </div>
  );
}

/* =========================================================
   FIX: Contacto needs divisions list for dropdowns
========================================================= */
function useContactoDivisions() {
  const divisions = useDivisions();
  return divisions;
}

/* =========================================================
   PATCH Contacto: provide divisions/products for selects
   (This relies on the same useDivisions hook above)
========================================================= */
// Re-define variables used earlier in Contacto scope via hoisting safety is NOT possible,
// so we expose helper and use it inside Contacto by referencing it *before* the modal render.
// If you already added `const divisions = useDivisions();` + selectedDivision earlier, remove this block.

/* =========================================================
   NOTE:
   If your TS complains about `divisions` / `selectedDivision` inside Contacto:
   Add these 2 lines near the top of Contacto(), after `const { lang } = useLang();`
   const divisions = useDivisions();
   const selectedDivision = divisions.find(d => pick(d.navLabel, lang) === form.division);
========================================================= */

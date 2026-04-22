import logoPng from "@/logo.png";

const LOGO_PATH = logoPng.src;

export const SCHOOL_NAME = "Groupe d'etude Les Leaders";
export const LOGO_IMAGE = logoPng;

const logoCache = new Map<number, Promise<string>>();

export function buildLogoImageHtml(size: number, opacity = 0.18, src = LOGO_PATH) {
  return `<img src="${src}" alt="Logo ${SCHOOL_NAME}" crossorigin="anonymous" style="display:block;width:${size}px;height:${size}px;object-fit:contain;opacity:${opacity}" />`;
}

export function getLogoPngDataUrl(size = 256) {
  const cachedLogo = logoCache.get(size);
  if (cachedLogo) {
    return cachedLogo;
  }

  const logoPromise = new Promise<string>((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve("");
      return;
    }

    const image = new window.Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d");
      if (!context) {
        logoCache.delete(size);
        reject(new Error("Canvas context unavailable"));
        return;
      }

      context.clearRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);
      resolve(canvas.toDataURL("image/png"));
    };

    image.onerror = () => {
      logoCache.delete(size);
      reject(new Error("Logo load failed"));
    };

    image.src = LOGO_PATH;
  });

  logoCache.set(size, logoPromise);
  return logoPromise;
}
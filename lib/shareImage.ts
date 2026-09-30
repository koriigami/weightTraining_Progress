// Turns the share card (an SVG in the page) into a PNG file, then shares or saves
// it. Everything that needs a browser happens inside a function, so the module is
// safe to import on the server and in tests; buildFontCss and finalizeSvg are pure.
import { CARD_H, CARD_W } from '../components/share/cardTheme';

/**
 * The share sends the picture only. Set it to true to add the text line as well:
 * some apps drop one of the two, or send two messages.
 */
export const SHARE_WITH_TEXT = false;

// ---------------- pure ----------------

/** The card's two fonts as `@font-face` rules with the font files inline (an SVG drawn as an image cannot load files). */
export function buildFontCss(lilitaUri: string, figtreeUri: string): string {
  return [
    `@font-face{font-family:'Levl Display';src:url("${lilitaUri}") format('woff2');}`,
    `@font-face{font-family:'Levl Body';font-weight:300 900;src:url("${figtreeUri}") format('woff2');}`,
  ].join('\n');
}

// The root tag: quoted attribute values may hold a ">".
const ROOT_TAG = /<svg\b(?:"[^"]*"|'[^']*'|[^>"'])*>/;

// Sets one attribute on an opening tag (without its closing bracket): replaced
// where it is, added at the end when not. The space before the name keeps `width`
// from matching `stroke-width`.
function withAttr(open: string, name: string, value: string): string {
  const has = new RegExp(`(\\s)${name}\\s*=\\s*(?:"[^"]*"|'[^']*')`);
  if (has.test(open)) return open.replace(has, (_m, space: string) => `${space}${name}="${value}"`);
  return `${open} ${name}="${value}"`;
}

/**
 * The SVG as a standalone image file: the namespace, the pixel size and the
 * fonts (a `<style>` right after the root tag). The rest of the markup is untouched.
 */
export function finalizeSvg(markup: string, css: string, width: number, height: number): string {
  const match = ROOT_TAG.exec(markup);
  if (!match) return markup;
  const selfClosing = match[0].endsWith('/>');
  let open = match[0].slice(0, selfClosing ? -2 : -1).trimEnd();
  open = withAttr(open, 'xmlns', 'http://www.w3.org/2000/svg');
  open = withAttr(open, 'width', String(width));
  open = withAttr(open, 'height', String(height));
  const style = `<style>${css}</style>`;
  const root = selfClosing ? `${open}>${style}</svg>` : `${open}>${style}`;
  return markup.slice(0, match.index) + root + markup.slice(match.index + match[0].length);
}

// ---------------- fonts ----------------

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('The font could not be read'));
    reader.readAsDataURL(blob);
  });
}

async function fontUri(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`The font ${path} did not load (${res.status})`);
  const blob = await res.blob();
  return blobToDataUri(blob.slice(0, blob.size, 'font/woff2')); // whatever type the server sent, it is a woff2
}

let fontCss: Promise<string> | null = null;

/** The `@font-face` CSS with both fonts inline. Fetched once; a failure is not kept, so a later try can succeed. */
export function cardFontCss(): Promise<string> {
  if (!fontCss) {
    fontCss = Promise.all([fontUri('/fonts/lilita.woff2'), fontUri('/fonts/figtree.woff2')])
      .then(([lilita, figtree]) => buildFontCss(lilita, figtree))
      .catch((e: unknown) => {
        fontCss = null;
        throw e;
      });
  }
  return fontCss;
}

// ---------------- the picture ----------------

/** The card's SVG element as markup. */
export function serializeCard(svg: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(svg);
}

const frames = (n: number): Promise<void> =>
  new Promise((resolve) => {
    const tick = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => tick(left - 1)));
    tick(n);
  });

/**
 * Draws the SVG text on a canvas and returns it as a PNG. Safari needs the image
 * decoded and drawn once before it draws the real thing (else the first draw can
 * come out blank), so there is a throwaway draw and two frames in between.
 * Rejects with an Error when the picture cannot be made, for example a SecurityError.
 */
export async function rasterize(svgText: string, width: number, height: number): Promise<Blob> {
  const warm = document.createElement('canvas');
  const canvas = document.createElement('canvas');
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('The card could not be loaded as an image'));
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    });
    try {
      await img.decode();
    } catch {
      // Some browsers reject decode() for an SVG; onload is enough.
    }
    warm.width = warm.height = 1;
    warm.getContext('2d')?.drawImage(img, 0, 0, 1, 1);
    await frames(2);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas to draw the card on');
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The canvas gave no picture');
    return blob;
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  } finally {
    // Free the canvas memory now (iOS caps the total).
    warm.width = warm.height = 0;
    canvas.width = canvas.height = 0;
  }
}

/** The card as a 1080 x 1350 PNG file. */
export async function makeCardImage(svg: SVGSVGElement, fileName: string): Promise<File> {
  const markup = serializeCard(svg);
  const css = await cardFontCss();
  const blob = await rasterize(finalizeSvg(markup, css, CARD_W, CARD_H), CARD_W, CARD_H);
  return new File([blob], fileName, { type: 'image/png' });
}

// ---------------- share and save ----------------

/** True when the browser can share a picture file (phones, some desktop browsers). */
export function canShareFiles(): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'levl.png', { type: 'image/png' })] })
    );
  } catch {
    return false;
  }
}

/** Downloads the file: a temporary link with the download attribute, clicked. */
export function saveImage(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Not at once: some browsers start the download a moment after the click.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

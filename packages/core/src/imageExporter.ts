import { toPng, toJpeg } from 'html-to-image';

function dataUrlToBlob(dataUrl: string): Blob {
  const commaIdx = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = /data:([^;]+)/.exec(header);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Renders an HTML DOM element as a high-resolution PNG or JPEG Blob.
 */
export async function renderElementToImageBlob(
  element: HTMLElement,
  format: 'png' | 'jpeg' = 'png'
): Promise<Blob> {
  const options = {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
    skipFonts: true,
  };

  const dataUrl =
    format === 'jpeg'
      ? await toJpeg(element, options)
      : await toPng(element, options);

  return dataUrlToBlob(dataUrl);
}

/**
 * Downloads an HTML DOM element as a high-resolution PNG or JPEG image.
 * Uses html-to-image via SVG foreignObject, which natively supports modern CSS
 * including Tailwind v4 color spaces (oklch, rgb, lab, hsl), custom fonts, and crisp rendering.
 * When `saveBlob` is provided, delegates saving to the platform bridge (native dialog on desktop).
 */
export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string,
  format: 'png' | 'jpeg' = 'png',
  saveBlob?: (blob: Blob, suggestedName: string) => Promise<void> | void
): Promise<void> {
  const finalName = filename.endsWith(`.${format}`)
    ? filename
    : `${filename}.${format}`;

  if (saveBlob) {
    const blob = await renderElementToImageBlob(element, format);
    await saveBlob(blob, finalName);
    return;
  }

  const options = {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
    skipFonts: true, // Prevents cross-origin SecurityError when Google Fonts are loaded
  };

  const dataUrl =
    format === 'jpeg'
      ? await toJpeg(element, options)
      : await toPng(element, options);

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


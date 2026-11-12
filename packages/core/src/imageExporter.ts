import { toPng, toJpeg } from 'html-to-image';

/**
 * Downloads an HTML DOM element as a high-resolution PNG or JPEG image.
 * Uses html-to-image via SVG foreignObject, which natively supports modern CSS
 * including Tailwind v4 color spaces (oklch, rgb, lab, hsl), custom fonts, and crisp rendering.
 */
export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<void> {
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
  a.download = filename.endsWith(`.${format}`) ? filename : `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

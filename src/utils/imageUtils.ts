/**
  * Removes data URI scheme prefix (e.g., 'data:image/jpeg;base64,') if present
  */
export function stripBase64Prefix(base64Str: string): string {
  if (!base64Str) return "";
  const commaIndex = base64Str.indexOf(",");
  if (commaIndex !== -1) {
    return base64Str.substring(commaIndex + 1);
  }
  return base64Str;
}

/**
 * Reads a File as Data URL string
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an HTMLImageElement from a Data URL or Blob URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 로드할 수 없습니다."));
    img.src = src;
  });
}

/**
 * Safely converts Canvas to Data URL and Base64 without prefix
 */
export function canvasToBase64(canvas: HTMLCanvasElement, quality = 0.88): { dataUrl: string; base64Clean: string } {
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64Clean = stripBase64Prefix(dataUrl);
  return { dataUrl, base64Clean };
}

/**
 * Converts Canvas to Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.88): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas를 캔버스 변환하지 못했습니다."));
      },
      "image/jpeg",
      quality
    );
  });
}

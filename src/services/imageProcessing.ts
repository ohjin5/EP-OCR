import { CropRect, ImageAdjustOptions } from "../types/inspection";
import { canvasToBase64 } from "../utils/imageUtils";

/**
 * Calculates video crop coordinates based on guide overlay position on video element,
 * accounting for CSS object-fit: cover scaling.
 */
export function calculateVideoCropRect(
  video: HTMLVideoElement,
  overlayRect: { left: number; top: number; width: number; height: number },
  containerRect: { left: number; top: number; width: number; height: number },
  paddingPercent = 0.025 // 2.5% padding around frame
): CropRect {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  if (!videoWidth || !videoHeight) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  // Calculate object-fit: cover actual rendered coordinates
  const containerAspect = containerRect.width / containerRect.height;
  const videoAspect = videoWidth / videoHeight;

  let renderWidth: number;
  let renderHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > containerAspect) {
    // Video is wider than container -> height fits, width cropped
    renderHeight = containerRect.height;
    renderWidth = renderHeight * videoAspect;
    offsetX = (renderWidth - containerRect.width) / 2;
  } else {
    // Video is taller than container -> width fits, height cropped
    renderWidth = containerRect.width;
    renderHeight = renderWidth / videoAspect;
    offsetY = (renderHeight - containerRect.height) / 2;
  }

  // Position of overlay relative to rendered video box
  const relativeLeft = overlayRect.left - containerRect.left + offsetX;
  const relativeTop = overlayRect.top - containerRect.top + offsetY;

  // Convert to 0..1 normalized values relative to full video
  let normX = relativeLeft / renderWidth;
  let normY = relativeTop / renderHeight;
  let normW = overlayRect.width / renderWidth;
  let normH = overlayRect.height / renderHeight;

  // Add padding
  const padW = normW * paddingPercent;
  const padH = normH * paddingPercent;

  normX = Math.max(0, normX - padW);
  normY = Math.max(0, normY - padH);
  normW = Math.min(1 - normX, normW + padW * 2);
  normH = Math.min(1 - normY, normH + padH * 2);

  return {
    x: normX,
    y: normY,
    width: normW,
    height: normH,
  };
}

/**
 * Crops a video element or canvas using normalized coordinates (0..1)
 */
export function cropSourceToCanvas(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  cropRect: CropRect,
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = targetCanvas || document.createElement("canvas");

  const srcWidth = "videoWidth" in source ? source.videoWidth : "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcHeight = "videoHeight" in source ? source.videoHeight : "naturalHeight" in source ? source.naturalHeight : source.height;

  const sx = Math.floor(cropRect.x * srcWidth);
  const sy = Math.floor(cropRect.y * srcHeight);
  const sw = Math.floor(cropRect.width * srcWidth);
  const sh = Math.floor(cropRect.height * srcHeight);

  // Dimension constraints: max 1800px long edge, minimum 1200px if original is larger
  const maxEdge = 1800;
  let destW = sw;
  let destH = sh;

  const currentLongEdge = Math.max(sw, sh);
  if (currentLongEdge > maxEdge) {
    const scale = maxEdge / currentLongEdge;
    destW = Math.round(sw * scale);
    destH = Math.round(sh * scale);
  } else if (currentLongEdge > 1200) {
    // Maintain good size for OCR
    destW = sw;
    destH = sh;
  }

  canvas.width = Math.max(10, destW);
  canvas.height = Math.max(10, destH);

  const ctx = canvas.getContext("2d", { alpha: false });
  if (ctx) {
    // Fill white backdrop for JPEG/clean background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, destW, destH);
  }

  return canvas;
}

/**
 * Applies adjustments (Rotation, Document Mode, Brightness, Contrast, Crop)
 * to an image or canvas, returning a high-quality JPEG Base64 and Canvas.
 */
export async function applyImageAdjustments(
  sourceCanvas: HTMLCanvasElement,
  options: ImageAdjustOptions
): Promise<{ dataUrl: string; base64Clean: string; canvas: HTMLCanvasElement }> {
  let tempCanvas = document.createElement("canvas");
  const rotation = (options.rotation || 0) % 360;

  // 1. Handle rotation
  if (rotation === 90 || rotation === 270) {
    tempCanvas.width = sourceCanvas.height;
    tempCanvas.height = sourceCanvas.width;
  } else {
    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;
  }

  const ctx = tempCanvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas context 생성 실패");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  ctx.save();
  ctx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
  ctx.restore();

  // 2. Handle sub-crop if provided
  if (options.cropRect) {
    const croppedCanvas = document.createElement("canvas");
    const cx = Math.floor(options.cropRect.x * tempCanvas.width);
    const cy = Math.floor(options.cropRect.y * tempCanvas.height);
    const cw = Math.floor(options.cropRect.width * tempCanvas.width);
    const ch = Math.floor(options.cropRect.height * tempCanvas.height);

    croppedCanvas.width = Math.max(10, cw);
    croppedCanvas.height = Math.max(10, ch);

    const cCtx = croppedCanvas.getContext("2d", { alpha: false });
    if (cCtx) {
      cCtx.fillStyle = "#ffffff";
      cCtx.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height);
      cCtx.drawImage(tempCanvas, cx, cy, cw, ch, 0, 0, croppedCanvas.width, croppedCanvas.height);
    }
    tempCanvas = croppedCanvas;
  }

  // 3. Handle document mode & pixel level brightness/contrast adjustment
  const processCtx = tempCanvas.getContext("2d");
  if (processCtx) {
    const imageData = processCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    const b = (options.brightness || 0) * 2.55; // -127 to +127
    const c = options.contrast || 0;
    const factor = (259 * (c + 255)) / (255 * (259 - c));

    for (let i = 0; i < data.length; i += 4) {
      let red = data[i];
      let green = data[i + 1];
      let blue = data[i + 2];

      if (options.documentMode) {
        // High contrast grayscale document enhancement
        const gray = 0.299 * red + 0.587 * green + 0.114 * blue;
        red = gray;
        green = gray;
        blue = gray;

        // Apply adaptive document curve
        red = factor * (red - 128) + 128 + b;
        green = red;
        blue = red;
      } else if (b !== 0 || c !== 0) {
        red = factor * (red - 128) + 128 + b;
        green = factor * (green - 128) + 128 + b;
        blue = factor * (blue - 128) + 128 + b;
      }

      data[i] = Math.min(255, Math.max(0, red));
      data[i + 1] = Math.min(255, Math.max(0, green));
      data[i + 2] = Math.min(255, Math.max(0, blue));
    }

    processCtx.putImageData(imageData, 0, 0);
  }

  const result = canvasToBase64(tempCanvas, 0.88);
  return {
    ...result,
    canvas: tempCanvas,
  };
}

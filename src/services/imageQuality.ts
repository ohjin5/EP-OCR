import { ImageQualityResult } from "../types/inspection";

let prevFrameData: Uint8Array | null = null;

// Thresholds
const BRIGHTNESS_MIN = 55;
const BRIGHTNESS_MAX = 220;
const SHARPNESS_MIN = 12; // Minimum Laplacian variance for sharpness
const MOTION_MAX = 20; // Maximum frame difference for motion
const GLARE_PIXEL_LIMIT = 245;
const GLARE_RATIO_MAX = 0.12;

/**
 * Analyzes image quality on an HTMLCanvasElement (or region)
 */
export function analyzeImageQuality(
  canvas: HTMLCanvasElement,
  cropArea?: { x: number; y: number; width: number; height: number }
): ImageQualityResult {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return createDefaultQualityResult();
  }

  const sx = cropArea ? Math.max(0, cropArea.x) : 0;
  const sy = cropArea ? Math.max(0, cropArea.y) : 0;
  const sw = cropArea ? Math.min(canvas.width - sx, cropArea.width) : canvas.width;
  const sh = cropArea ? Math.min(canvas.height - sy, cropArea.height) : canvas.height;

  if (sw <= 0 || sh <= 0) {
    return createDefaultQualityResult();
  }

  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const data = imageData.data;
  const totalPixels = data.length / 4;

  if (totalPixels === 0) {
    return createDefaultQualityResult();
  }

  let totalBrightness = 0;
  let glarePixelCount = 0;

  // Grayscale buffer for sharpness and motion analysis
  const grayBuffer = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // Standard luminosity formula
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    grayBuffer[i] = lum;

    totalBrightness += lum;
    if (lum >= GLARE_PIXEL_LIMIT) {
      glarePixelCount++;
    }
  }

  const avgBrightness = Math.round(totalBrightness / totalPixels);
  const glareRatio = glarePixelCount / totalPixels;

  // 1. Sharpness calculation (Laplacian variance approximation)
  let sharpness = 0;
  if (sw > 2 && sh > 2) {
    let sumLaplacian = 0;
    let sumLaplacianSq = 0;
    let count = 0;

    // Sample every 2 pixels to keep performance fast
    const step = 2;
    for (let y = 1; y < sh - 1; y += step) {
      for (let x = 1; x < sw - 1; x += step) {
        const idx = y * sw + x;
        const center = grayBuffer[idx];
        const left = grayBuffer[idx - 1];
        const right = grayBuffer[idx + 1];
        const top = grayBuffer[idx - sw];
        const bottom = grayBuffer[idx + sw];

        // 4-neighbor Laplacian operator: [0 1 0; 1 -4 1; 0 1 0]
        const lap = left + right + top + bottom - 4 * center;
        sumLaplacian += lap;
        sumLaplacianSq += lap * lap;
        count++;
      }
    }

    if (count > 0) {
      const meanLap = sumLaplacian / count;
      const variance = sumLaplacianSq / count - meanLap * meanLap;
      sharpness = Math.sqrt(Math.max(0, variance));
    }
  }

  // 2. Motion calculation (comparing with previous frame)
  let motion = 0;
  if (prevFrameData && prevFrameData.length === grayBuffer.length) {
    let diffSum = 0;
    const step = 4;
    let sampledCount = 0;
    for (let i = 0; i < grayBuffer.length; i += step) {
      diffSum += Math.abs(grayBuffer[i] - prevFrameData[i]);
      sampledCount++;
    }
    if (sampledCount > 0) {
      motion = diffSum / sampledCount;
    }
  }
  // Store frame for motion comparison
  prevFrameData = grayBuffer;

  // Flags
  const isTooDark = avgBrightness < BRIGHTNESS_MIN;
  const isTooBright = avgBrightness > BRIGHTNESS_MAX;
  const isBlurry = sharpness < SHARPNESS_MIN;
  const isMoving = motion > MOTION_MAX;
  const hasGlare = glareRatio > GLARE_RATIO_MAX;

  const isReady = !isTooDark && !isTooBright && !isBlurry && !isMoving && !hasGlare;

  // Guidance message
  let guidanceMessage = "촬영 가능";
  let statusLevel: "poor" | "moderate" | "ready" = "ready";

  if (isMoving) {
    guidanceMessage = "카메라를 고정해주세요";
    statusLevel = "poor";
  } else if (hasGlare) {
    guidanceMessage = "빛 반사가 감지되었습니다. 카메라 각도를 조절해 주세요";
    statusLevel = "moderate";
  } else if (isTooDark) {
    guidanceMessage = "화면이 너무 어둡습니다. 밝은 곳에서 촬영해 주세요";
    statusLevel = "poor";
  } else if (isTooBright) {
    guidanceMessage = "화면이 너무 밝습니다";
    statusLevel = "moderate";
  } else if (isBlurry) {
    guidanceMessage = "초점을 맞추는 중입니다. 카메라를 가까이 대어주세요";
    statusLevel = "moderate";
  } else {
    guidanceMessage = "촬영 가능";
    statusLevel = "ready";
  }

  return {
    brightness: avgBrightness,
    sharpness: Math.round(sharpness * 10) / 10,
    motion: Math.round(motion * 10) / 10,
    glareRatio: Math.round(glareRatio * 100) / 100,
    isTooDark,
    isTooBright,
    isBlurry,
    isMoving,
    hasGlare,
    isReady,
    guidanceMessage,
    statusLevel,
  };
}

export function resetQualityState() {
  prevFrameData = null;
}

function createDefaultQualityResult(): ImageQualityResult {
  return {
    brightness: 120,
    sharpness: 20,
    motion: 0,
    glareRatio: 0,
    isTooDark: false,
    isTooBright: false,
    isBlurry: false,
    isMoving: false,
    hasGlare: false,
    isReady: true,
    guidanceMessage: "문서를 프레임 안에 맞춰주세요",
    statusLevel: "moderate",
  };
}

export interface ImageQualityResult {
  brightness: number;
  sharpness: number;
  motion: number;
  glareRatio: number;
  isTooDark: boolean;
  isTooBright: boolean;
  isBlurry: boolean;
  isMoving: boolean;
  hasGlare: boolean;
  isReady: boolean;
  guidanceMessage: string;
  statusLevel: "poor" | "moderate" | "ready";
}

export interface CropRect {
  x: number; // percentage or normalized 0..1 or pixel value
  y: number;
  width: number;
  height: number;
}

export interface ImageAdjustOptions {
  rotation: number; // 0, 90, 180, 270
  documentMode: boolean; // grayscale + adaptive contrast
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
  cropRect?: CropRect; // relative 0..1 inside the current image
}

export interface CapturedImageInfo {
  dataUrl: string; // full base64 data url for preview
  blob: Blob;
  width: number;
  height: number;
  quality: ImageQualityResult;
  cropRectOnVideo?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

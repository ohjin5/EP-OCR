export interface CameraCapabilities {
  hasTorch: boolean;
  hasZoom: boolean;
  minZoom: number;
  maxZoom: number;
  stepZoom: number;
  hasMultipleCameras: boolean;
}

export interface ActiveCameraState {
  stream: MediaStream;
  videoTrack: MediaStreamTrack;
  capabilities: CameraCapabilities;
  currentTorch: boolean;
  currentZoom: number;
}

/**
 * Checks if mediaDevices and getUserMedia are supported in current browser
 */
export function isCameraSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/**
 * Enumerates devices to check if multiple video input devices exist
 */
export async function hasMultipleVideoDevices(): Promise<boolean> {
  if (!navigator.mediaDevices?.enumerateDevices) return false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === "videoinput");
    return videoInputs.length > 1;
  } catch {
    return false;
  }
}

/**
 * Starts camera stream with environment facing mode priority
 */
export async function startCameraStream(
  facingMode: "environment" | "user" = "environment"
): Promise<ActiveCameraState> {
  if (!isCameraSupported()) {
    throw new Error("현재 브라우저에서는 카메라 기능을 지원하지 않습니다.");
  }

  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {
      throw new Error("카메라 비디오 트랙을 찾을 수 없습니다.");
    }

    // Apply continuous autofocus/exposure if supported
    try {
      const trackCaps = videoTrack.getCapabilities?.() as Record<string, unknown> || {};
      const constraintsToApply: MediaTrackConstraints = {};

      if ("focusMode" in trackCaps && Array.isArray(trackCaps.focusMode)) {
        if (trackCaps.focusMode.includes("continuous")) {
          (constraintsToApply as Record<string, unknown>).focusMode = "continuous";
        }
      }
      if ("exposureMode" in trackCaps && Array.isArray(trackCaps.exposureMode)) {
        if (trackCaps.exposureMode.includes("continuous")) {
          (constraintsToApply as Record<string, unknown>).exposureMode = "continuous";
        }
      }

      if (Object.keys(constraintsToApply).length > 0) {
        await videoTrack.applyConstraints({ advanced: [constraintsToApply] });
      }
    } catch {
      // Ignore capability application failures gracefully
    }

    const caps = getVideoTrackCapabilities(videoTrack);
    const hasMultiple = await hasMultipleVideoDevices();

    return {
      stream,
      videoTrack,
      capabilities: {
        ...caps,
        hasMultipleCameras: hasMultiple,
      },
      currentTorch: false,
      currentZoom: 1,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("카메라를 시작하지 못했습니다.");
  }
}

/**
 * Safe camera track capabilities parser
 */
function getVideoTrackCapabilities(track: MediaStreamTrack): CameraCapabilities {
  try {
    const caps = track.getCapabilities?.() as Record<string, unknown> || {};

    const hasTorch = "torch" in caps;
    let minZoom = 1;
    let maxZoom = 1;
    let stepZoom = 0.1;
    let hasZoom = false;

    if ("zoom" in caps && typeof caps.zoom === "object" && caps.zoom !== null) {
      const zoomObj = caps.zoom as { min?: number; max?: number; step?: number };
      minZoom = zoomObj.min || 1;
      maxZoom = zoomObj.max || 1;
      stepZoom = zoomObj.step || 0.1;
      hasZoom = maxZoom > minZoom;
    }

    return {
      hasTorch,
      hasZoom,
      minZoom,
      maxZoom,
      stepZoom,
      hasMultipleCameras: false,
    };
  } catch {
    return {
      hasTorch: false,
      hasZoom: false,
      minZoom: 1,
      maxZoom: 1,
      stepZoom: 0.1,
      hasMultipleCameras: false,
    };
  }
}

/**
 * Toggles torch on video track
 */
export async function setTorchState(track: MediaStreamTrack, enabled: boolean): Promise<boolean> {
  try {
    await track.applyConstraints({
      advanced: [{ torch: enabled } as MediaTrackConstraintSet],
    });
    return enabled;
  } catch (err) {
    console.warn("Torch set failed:", err);
    return false;
  }
}

/**
 * Sets camera zoom
 */
export async function setZoomLevel(track: MediaStreamTrack, zoomLevel: number): Promise<number> {
  try {
    await track.applyConstraints({
      advanced: [{ zoom: zoomLevel } as MediaTrackConstraintSet],
    });
    return zoomLevel;
  } catch {
    return 1;
  }
}

/**
 * Completely stops all media tracks
 */
export function stopCameraStream(stream?: MediaStream | null) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  } catch (err) {
    console.warn("Error stopping camera stream:", err);
  }
}

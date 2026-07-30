export function getKoreanErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message;

    // Camera errors
    if (message.includes("NotAllowedError") || message.includes("Permission denied")) {
      return "카메라 사용 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용하거나 파일 선택 방식을 사용해 주세요.";
    }
    if (message.includes("NotFoundError") || message.includes("DevicesNotFoundError")) {
      return "사용 가능한 카메라 기기를 찾을 수 없습니다.";
    }
    if (message.includes("NotReadableError") || message.includes("TrackStartError")) {
      return "다른 앱에서 카메라를 사용 중이거나 연결에 실패했습니다.";
    }
    if (message.includes("OverconstrainedError")) {
      return "카메라 설정 조건이 기기와 맞지 않습니다.";
    }

    // Network / API errors
    if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
      return "Apps Script API 서버와 통신할 수 없습니다. 네트워크 연결 상태를 확인해 주세요.";
    }
    if (message.includes("timeout") || message.includes("Timeout") || message.includes("시간 초과")) {
      return "요청 시간이 초과되었습니다 (90초). 네트워크 연결 상태를 확인 후 다시 시도해 주세요.";
    }
    if (message.includes("AbortError")) {
      return "요청이 취소되었습니다.";
    }

    return message;
  }

  return "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

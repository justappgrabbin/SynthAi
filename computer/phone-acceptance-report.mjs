const bool = value => value === true;

export function buildPhoneAcceptanceReport(input = {}) {
  const visibleHome = bool(input.visibleHome);
  const androidHost = bool(input.androidHost);
  const backendVerified = input.runtimeStatus === 'VERIFIED';
  const restartObserved = Number.isFinite(Number(input.previousBootAt)) && Number(input.previousBootAt) > 0;
  const creatorAccepted = bool(input.creatorAccepted);
  const checks = {
    androidHost,
    visibleHome,
    backendVerified,
    restartObserved,
    creatorAccepted,
  };
  return {
    schema: 'synthai.computer-phone-acceptance/v1',
    artifact: {
      sha256: String(input.artifactSha256 ?? ''),
      source: String(input.artifactSource ?? ''),
    },
    device: {
      userAgent: String(input.userAgent ?? ''),
      platform: String(input.platform ?? ''),
    },
    runtime: {
      status: String(input.runtimeStatus ?? 'UNKNOWN'),
      detail: String(input.runtimeDetail ?? ''),
      services: Array.isArray(input.services) ? [...input.services] : [],
    },
    workspace: {
      projectCount: Number(input.projectCount ?? 0),
      onDeviceProjectCount: Number(input.onDeviceProjectCount ?? 0),
    },
    checks,
    state: creatorAccepted && androidHost && visibleHome && backendVerified && restartObserved
      ? 'phone-accepted'
      : visibleHome && androidHost
        ? 'user-access-verified'
        : 'pending',
    observedAt: Number(input.observedAt ?? Date.now()),
  };
}

export default buildPhoneAcceptanceReport;

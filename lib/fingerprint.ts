import { getUniqueId } from "react-native-device-info";

const FALLBACK = "unknown";
const TIMEOUT_MS = 1500;

let fingerprintPromise: Promise<string> | null = null;

function resolveFingerprint(): Promise<string> {
  const lookup = Promise.resolve()
    .then(() => getUniqueId())
    .catch(() => FALLBACK);
  const timeout = new Promise<string>((resolve) => {
    setTimeout(() => resolve(FALLBACK), TIMEOUT_MS);
  });
  return Promise.race([lookup, timeout]);
}

export function getFingerprint(): Promise<string> {
  if (fingerprintPromise) return fingerprintPromise;

  const pending = resolveFingerprint().then((id) => {
    if (id === FALLBACK) fingerprintPromise = null;
    return id;
  });

  fingerprintPromise = pending;
  return pending;
}

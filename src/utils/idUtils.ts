/**
 * Generates an RFC4122 version 4 compliant UUID.
 * Works uniformly across React Native, Hermes, and web environments.
 */
export function generateId(): string {
  // If global crypto.randomUUID is available, use it
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback RFC4122 v4 generator using timestamp and Math.random entropy
  let d = new Date().getTime();
  let d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

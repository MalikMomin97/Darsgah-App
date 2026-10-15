import { Colors } from '../config/theme';

/** Token-based tints for initials avatars; picked deterministically from the name. */
const AVATAR_TONES = [
  { fg: Colors.primary, bg: Colors.primaryLight },
  { fg: Colors.accentDark, bg: Colors.accentLight },
  { fg: Colors.info, bg: Colors.infoLight },
  { fg: Colors.holiday, bg: Colors.holidayBg },
  { fg: Colors.needsImprovement, bg: Colors.needsImprovementBg },
  { fg: Colors.success, bg: Colors.successLight },
];

/** Stable colour pair for a person's avatar, so the same name always gets the same tint. */
export function avatarTone(name: string): { fg: string; bg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** Up to two initials (first and last word) for an avatar. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

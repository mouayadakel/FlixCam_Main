/**
 * Shared category icon mapping for equipment categories.
 * Used by the equipment category bar and the categories index page.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Camera,
  Lightbulb,
  Mic2,
  Film,
  Video,
  Monitor,
  Clapperboard,
  Aperture,
  Speaker,
  Grip,
} from 'lucide-react'

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  camera: Camera,
  cameras: Camera,
  lens: Aperture,
  lenses: Aperture,
  lighting: Lightbulb,
  light: Lightbulb,
  lights: Lightbulb,
  audio: Mic2,
  sound: Mic2,
  microphone: Mic2,
  grip: Grip,
  film: Film,
  video: Video,
  monitor: Monitor,
  monitors: Monitor,
  production: Clapperboard,
  speaker: Speaker,
  speakers: Speaker,
}

/**
 * Returns the Lucide icon component for a category slug (e.g. "cameras", "lighting").
 * Falls back to Film if no slug key matches.
 */
export function getCategoryIcon(slug: string): LucideIcon {
  const key = slug.toLowerCase()
  for (const [k, Icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (key.includes(k)) return Icon
  }
  return Film
}

/** Alias for getCategoryIcon for use in categories page and other callers. */
export const getIcon = getCategoryIcon

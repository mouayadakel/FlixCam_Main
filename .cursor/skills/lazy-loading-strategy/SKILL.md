---
name: lazy-loading-strategy
description: Suggests lazy loading for images, long lists (virtualization), and below-fold content. Use for large lists, media, or below-fold content.
---

# Lazy Loading Strategy

## When to Trigger

- Large lists/grids
- Images/media
- Below-fold content

## What to Do

1. **Images**: next/image with loading="lazy" (default for below-fold); priority for LCP image.
2. **Lists**: Virtualize long lists (e.g. @tanstack/react-virtual) so only visible rows render; use for 100+ items.
3. **Infinite scroll**: useInfiniteQuery + intersection observer to load next page when sentinel visible.
4. **Components**: Dynamic import or render when inView for heavy below-fold sections.

Preserve accessibility (e.g. announce "load more" to screen readers). Prefer native lazy loading where sufficient.

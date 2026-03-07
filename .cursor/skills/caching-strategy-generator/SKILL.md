---
name: caching-strategy-generator
description: Suggests caching layers (React Query, unstable_cache, Redis) and invalidation. Use when repeated API calls or slow data fetching is observed.
---

# Caching Strategy Generator

## When to Trigger

- Repeated API calls detected
- Slow data fetching
- "Add caching"

## What to Do

1. **Client**: React Query (or SWR) with staleTime/cacheTime for list/detail; use for user-specific or frequently refetched data.
2. **Server**: Next.js unstable_cache or revalidateTag for server-rendered or API data; set revalidate seconds.
3. **Distributed**: Redis for high-traffic shared data; TTL and cache key by resource/query; invalidate on write (e.g. delete key on POST/PATCH).
4. **Invalidation**: On create/update/delete, invalidate related keys and revalidatePath/revalidateTag as needed.

Match strategy to data: static → long revalidate; dynamic → short TTL and invalidation; user-specific → client only. Document cache keys and TTLs.

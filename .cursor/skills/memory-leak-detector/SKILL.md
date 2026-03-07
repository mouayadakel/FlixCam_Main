---
name: memory-leak-detector
description: Detects and fixes leaks: missing cleanup for listeners, timers, subscriptions, fetch. Use when adding event listeners, intervals, or useEffect with side effects.
---

# Memory Leak Detector

## When to Trigger

- Component unmounting
- Event listeners added
- Timers/intervals created
- useEffect cleanup

## What to Do

1. **Listeners**: addEventListener in useEffect → return () => removeEventListener in cleanup.
2. **Timers**: setInterval/setTimeout → return () => clearInterval/clearTimeout.
3. **Subscriptions**: subscribe in useEffect → return () => unsubscribe().
4. **Fetch**: Use AbortController; in cleanup call controller.abort(); ignore AbortError in catch.
5. **State updates**: Avoid setState after unmount; abort fetch or check mounted ref before setState.

Always return a cleanup function from useEffect when registering listeners, timers, or subscriptions. Prefer abort for in-flight requests.

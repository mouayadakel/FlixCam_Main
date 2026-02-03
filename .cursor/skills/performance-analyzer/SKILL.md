---
name: performance-analyzer
description: Analyzes performance impact of query and code changes. Detects N+1 queries, missing indexes, sync-in-loops, unpaginated fetches, missing memoization, inefficient algorithms. Use for database query changes, loops, API changes, large file ops, or keywords fetch/query/loop/map/filter.
---

# Performance Impact Analyzer

## When to Trigger

- Database query changes
- Adding loops or iterations
- API route modifications
- Large file operations
- Keywords: "fetch", "query", "loop", "map", "filter"

## What to Do

### Step 1: Detect Anti-Patterns

Check for:

1. N+1 queries
2. Missing database indexes
3. Synchronous operations in loops
4. Large data fetches without pagination
5. Missing memoization (React)
6. Inefficient algorithms (O(n²) or worse)

### Step 2: Estimate Impact

Report current vs after (e.g. query count, time). Explain why slower (e.g. N+1).

### Step 3: Suggest Optimizations

- Replace N+1 with single query using `include`/`select` or JOINs.
- Add indexes for filtered/sorted columns.
- Add pagination (skip/take or cursor).
- Use `useMemo`/`useCallback` where appropriate.
- Prefer single aggregation over multiple sequential queries.

Show **SLOW** vs **FAST** code snippets. Ask: "Apply optimized version? (yes/no)".

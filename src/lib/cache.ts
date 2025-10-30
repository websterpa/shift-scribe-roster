/**
 * Lightweight client-side cache with TTL and manual invalidation
 * 
 * Reduces redundant Supabase queries for frequently-accessed data
 * like staff profiles and shift patterns during roster generation.
 * 
 * @module lib/cache
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Fetch data with caching
 * 
 * @param key - Unique cache key (e.g., "staff_${tenantId}")
 * @param fetchFn - Async function that fetches the data
 * @param ttl - Time-to-live in milliseconds (default: 60 seconds)
 * @returns Promise<T> - Cached or fresh data
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 60_000
): Promise<T> {
  const entry = cache.get(key);
  
  // Return cached data if still valid
  if (entry && Date.now() - entry.timestamp < ttl) {
    console.info(`[CACHE HIT] ${key}`);
    return entry.data;
  }
  
  // Cache miss or expired - fetch fresh data
  console.info(`[CACHE MISS] ${key} - fetching fresh data`);
  const data = await fetchFn();
  
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
  
  return data;
}

/**
 * Invalidate cache entries by key or pattern
 * 
 * @param keyOrPattern - Exact key or regex pattern to match
 */
export function invalidateCache(keyOrPattern: string | RegExp): void {
  if (typeof keyOrPattern === 'string') {
    // Exact key invalidation
    const deleted = cache.delete(keyOrPattern);
    if (deleted) {
      console.info(`[CACHE INVALIDATE] ${keyOrPattern}`);
    }
  } else {
    // Pattern-based invalidation (e.g., /^staff_/)
    let count = 0;
    for (const key of cache.keys()) {
      if (keyOrPattern.test(key)) {
        cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      console.info(`[CACHE INVALIDATE] Pattern ${keyOrPattern} - cleared ${count} entries`);
    }
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  const size = cache.size;
  cache.clear();
  console.info(`[CACHE CLEAR] Cleared ${size} entries`);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const entries = Array.from(cache.entries()).map(([key, entry]) => ({
    key,
    age: Date.now() - entry.timestamp,
    size: JSON.stringify(entry.data).length,
  }));
  
  return {
    size: cache.size,
    entries,
    totalBytes: entries.reduce((sum, e) => sum + e.size, 0),
  };
}

/**
 * In-memory cache for job upload previews.
 * Keyed by upload_id, items expire after 30 minutes.
 */
class UploadCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 30 * 60 * 1000; // 30 minutes
  }

  set(id, data) {
    // Clear existing timeout if any
    const existing = this.cache.get(id);
    if (existing && existing.timer) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.cache.delete(id);
    }, this.ttl);

    this.cache.set(id, { data, timer });
  }

  get(id) {
    const entry = this.cache.get(id);
    return entry ? entry.data : null;
  }

  delete(id) {
    const entry = this.cache.get(id);
    if (entry && entry.timer) clearTimeout(entry.timer);
    this.cache.delete(id);
  }
}

// Singleton instance
module.exports = new UploadCache();

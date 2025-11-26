const NodeCache = require('node-cache');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

/**
 * Enhanced Metadata Cache with TTL and persistence
 */
class MetadataCache {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 86400, // 24 hours default
      checkperiod: options.checkperiod || 3600, // Check every hour
      useClones: false
    });

    this.cacheDir = path.join(os.homedir(), '.spotify-dl-cache');
    this.cacheFile = path.join(this.cacheDir, 'metadata.json');
  }

  async init() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.load();
    } catch (error) {
      // Ignore if cache doesn't exist yet
    }
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl) {
    return this.cache.set(key, value, ttl);
  }

  has(key) {
    return this.cache.has(key);
  }

  del(key) {
    return this.cache.del(key);
  }

  async clear() {
    this.cache.flushAll();
    try {
      await fs.unlink(this.cacheFile);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  async save() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const data = this.cache.keys().reduce((acc, key) => {
        acc[key] = this.cache.get(key);
        return acc;
      }, {});
      await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      // Silent fail for cache save
    }
  }

  async load() {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf8');
      const parsed = JSON.parse(data);
      Object.entries(parsed).forEach(([key, value]) => {
        this.cache.set(key, value);
      });
    } catch (error) {
      // Silent fail for cache load
    }
  }

  getStats() {
    return this.cache.getStats();
  }
}

module.exports = MetadataCache;

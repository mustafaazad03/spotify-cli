const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');

/**
 * File-system based caching for metadata
 * Reduces redundant API calls
 */
class MetadataCache {
  constructor(cacheDir = path.join(os.homedir(), '.spotify-dl-cache')) {
    this.cacheDir = cacheDir;
    this.ttl = 86400000; // 24 hours
  }

  async get(key) {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const cacheFile = path.join(this.cacheDir, this.hashKey(key));
      const data = await fs.readFile(cacheFile, 'utf8');
      const cached = JSON.parse(data);

      // Check if expired
      if (Date.now() - cached.timestamp > this.ttl) {
        await fs.unlink(cacheFile);
        return null;
      }

      return cached.data;
    } catch (error) {
      return null;
    }
  }

  async set(key, data) {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const cacheFile = path.join(this.cacheDir, this.hashKey(key));

      await fs.writeFile(
        cacheFile,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch (error) {
      // Silent fail - caching is optional
      console.error('Cache write failed:', error.message);
    }
  }

  hashKey(key) {
    return crypto.createHash('md5').update(key).digest('hex');
  }

  async clear() {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.cacheDir, file)))
      );
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  }
}

module.exports = MetadataCache;

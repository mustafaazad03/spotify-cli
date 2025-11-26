const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Statistics Tracker
 * Tracks download statistics
 */
class StatsTracker {
  constructor() {
    this.statsDir = path.join(os.homedir(), '.spotify-dl');
    this.statsFile = path.join(this.statsDir, 'stats.json');
    this.stats = {
      totalDownloads: 0,
      successfulDownloads: 0,
      failedDownloads: 0,
      totalSize: 0,
      lastDownload: null,
      tracks: [],
      playlists: [],
      albums: []
    };
  }

  async load() {
    try {
      const data = await fs.readFile(this.statsFile, 'utf8');
      this.stats = JSON.parse(data);
    } catch (error) {
      // Stats file doesn't exist yet
    }
  }

  async save() {
    try {
      await fs.mkdir(this.statsDir, { recursive: true });
      await fs.writeFile(this.statsFile, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      // Ignore save errors
    }
  }

  async recordDownload(type, metadata, success = true, size = 0) {
    await this.load();

    this.stats.totalDownloads++;
    if (success) {
      this.stats.successfulDownloads++;
      this.stats.totalSize += size;
    } else {
      this.stats.failedDownloads++;
    }

    this.stats.lastDownload = new Date().toISOString();

    const record = {
      type,
      metadata,
      success,
      size,
      timestamp: this.stats.lastDownload
    };

    if (type === 'track') {
      this.stats.tracks.push(record);
    } else if (type === 'playlist') {
      this.stats.playlists.push(record);
    } else if (type === 'album') {
      this.stats.albums.push(record);
    }

    await this.save();
  }

  async getStats() {
    await this.load();
    return {
      ...this.stats,
      successRate: this.stats.totalDownloads > 0
        ? ((this.stats.successfulDownloads / this.stats.totalDownloads) * 100).toFixed(2) + '%'
        : '0%',
      averageSize: this.stats.successfulDownloads > 0
        ? Math.round(this.stats.totalSize / this.stats.successfulDownloads / 1024 / 1024) + ' MB'
        : '0 MB',
      totalSizeFormatted: Math.round(this.stats.totalSize / 1024 / 1024) + ' MB'
    };
  }

  async reset() {
    this.stats = {
      totalDownloads: 0,
      successfulDownloads: 0,
      failedDownloads: 0,
      totalSize: 0,
      lastDownload: null,
      tracks: [],
      playlists: [],
      albums: []
    };
    await this.save();
  }
}

module.exports = StatsTracker;

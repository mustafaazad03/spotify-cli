const path = require('path');
const fs = require('fs').promises;
const pLimit = require('p-limit');

const SpotifyClient = require('../core/spotify');
const YouTubeDownloader = require('../core/youtube');
const YouTubeDlpDownloader = require('../core/youtube-dlp');
const AudioProcessor = require('../core/audio');
const MetadataEmbedder = require('../core/metadata');
const ProgressManager = require('../utils/progress');
const MetadataCache = require('../utils/cache');
const Logger = require('../utils/logger');
const TemplateParser = require('../utils/template');
const StatsTracker = require('../utils/stats');

/**
 * Download command implementation
 */
class DownloadCommand {
  constructor(config) {
    this.spotify = new SpotifyClient(config.clientId, config.clientSecret);
    this.youtube = new YouTubeDownloader();
    this.ytdlp = new YouTubeDlpDownloader();
    this.audio = new AudioProcessor();
    this.metadata = new MetadataEmbedder();
    this.progress = new ProgressManager();
    this.cache = new MetadataCache();
    this.logger = new Logger();
    this.template = new TemplateParser();
    this.stats = new StatsTracker();
    this.useYtDlp = null; // Will be determined on first use
  }

  async initializeDownloader() {
    if (this.useYtDlp === null) {
      this.useYtDlp = await this.ytdlp.checkYtDlp();
      if (this.useYtDlp) {
        this.progress.showInfo('Using yt-dlp for downloads (recommended)');
      } else {
        this.progress.showWarning('yt-dlp not found, using ytdl-core (may have issues)');
        this.progress.showInfo('Install yt-dlp for better reliability: pip install yt-dlp');
      }
    }
  }

  async downloadTrack(url, options) {
    const trackId = this.extractTrackId(url);

    if (!trackId) {
      throw new Error('Invalid Spotify track URL');
    }

    const spinner = this.progress.showSpinner('Fetching track information...');
    const track = await this.spotify.getTrack(trackId);
    spinner.succeed(`Found: ${track.artist} - ${track.name}`);

    // Create output directory
    await fs.mkdir(options.output, { recursive: true });

    await this.downloadAndProcessTrack(track, options);

    this.progress.showSuccess(`Downloaded: ${track.artist} - ${track.name}`);
  }

  async downloadPlaylist(url, options) {
    const playlistId = this.extractPlaylistId(url);

    if (!playlistId) {
      throw new Error('Invalid Spotify playlist URL');
    }

    const spinner = this.progress.showSpinner('Fetching playlist tracks...');
    const tracks = await this.spotify.getPlaylistTracks(playlistId);
    spinner.succeed(`Found ${tracks.length} tracks`);

    await this.downloadMultipleTracks(tracks, options);
  }

  async downloadAlbum(url, options) {
    const albumId = this.extractAlbumId(url);

    if (!albumId) {
      throw new Error('Invalid Spotify album URL');
    }

    const spinner = this.progress.showSpinner('Fetching album tracks...');
    const tracks = await this.spotify.getAlbumTracks(albumId);
    spinner.succeed(`Found ${tracks.length} tracks`);

    await this.downloadMultipleTracks(tracks, options);
  }

  async downloadMultipleTracks(tracks, options) {
    const { output, concurrent } = options;

    // Create output directory
    await fs.mkdir(output, { recursive: true });

    // Concurrent download limit
    const limit = pLimit(parseInt(concurrent));

    // Create progress bar
    const overallBar = this.progress.createTrackProgress('Overall Progress', tracks.length);

    let successCount = 0;
    let failCount = 0;

    // Download tracks concurrently
    const downloadPromises = tracks.map((track) =>
      limit(async () => {
        try {
          await this.downloadAndProcessTrack(track, options);
          successCount++;
          overallBar.increment();
        } catch (error) {
          failCount++;
          overallBar.increment();
          this.progress.showError(`Failed: ${track.artist} - ${track.name} (${error.message})`);
          await this.logger.error('Track download failed', {
            track: `${track.artist} - ${track.name}`,
            error: error.message
          });
        }
      })
    );

    await Promise.all(downloadPromises);

    this.progress.stop();
    console.log('\n');
    this.progress.showSuccess(`Downloaded ${successCount} tracks successfully`);
    if (failCount > 0) {
      this.progress.showWarning(`Failed to download ${failCount} tracks`);
    }
    this.progress.showInfo(`Files saved to: ${output}`);
  }

  async downloadAndProcessTrack(track, options) {
    const { output, quality, template, dryRun } = options;

    // Initialize downloader if not done yet
    await this.initializeDownloader();

    // Generate filename from template or use default
    const filenameTemplate = template || this.template.getDefaultTemplate();
    const filename = this.template.parse(filenameTemplate, track);
    const tempPath = path.join(output, `${filename}.temp`);
    const outputPath = path.join(output, `${filename}.mp3`);

    // Dry run mode - just show what would be downloaded
    if (dryRun) {
      await this.logger.info('Dry run: would download', { track: `${track.artist} - ${track.name}`, outputPath });
      return outputPath;
    }

    // Check if file already exists
    try {
      await fs.access(outputPath);
      await this.logger.info('File already exists, skipping', { outputPath });
      return outputPath; // Skip if already downloaded
    } catch {
      // File doesn't exist, continue with download
    }

    // Check cache for YouTube video ID
    const cacheKey = `yt:${track.artist}:${track.name}`;
    let videoId = await this.cache.get(cacheKey);

    // Search YouTube if not cached
    const downloader = this.useYtDlp ? this.ytdlp : this.youtube;

    if (!videoId) {
      videoId = await downloader.searchTrack(track.name, track.artist);
      await this.cache.set(cacheKey, videoId);
    }

    try {
      if (this.useYtDlp) {
        // yt-dlp downloads and converts in one step
        await downloader.downloadAudio(videoId, tempPath);

        // If yt-dlp created an MP3, move it directly
        if (await this.fileExists(tempPath)) {
          const fsSync = require('fs');
          fsSync.renameSync(tempPath, outputPath);
        }
      } else {
        // ytdl-core requires separate download and conversion
        await downloader.downloadAudio(videoId, tempPath);
        await this.audio.convertToMP3(tempPath, outputPath, parseInt(quality));
      }
    } catch (error) {
      // Clean up temp file if exists
      try {
        const fsSync = require('fs');
        if (fsSync.existsSync(tempPath)) {
          fsSync.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }

    // Embed metadata
    await this.metadata.embedMetadata(outputPath, track);

    // Track stats
    const stats = await fs.stat(outputPath);
    await this.stats.recordDownload('track', { artist: track.artist, name: track.name }, true, stats.size);

    await this.logger.info('Track download completed', {
      track: `${track.artist} - ${track.name}`,
      outputPath
    });

    return outputPath;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim();
  }

  extractTrackId(url) {
    // Remove query parameters and extract ID
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  extractPlaylistId(url) {
    // Remove query parameters and extract ID
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  extractAlbumId(url) {
    // Remove query parameters and extract ID
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/album\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  detectUrlType(url) {
    if (url.includes('/track/')) {
      return 'track';
    }
    if (url.includes('/playlist/')) {
      return 'playlist';
    }
    if (url.includes('/album/')) {
      return 'album';
    }
    return null;
  }

  async download(url, options) {
    const urlType = this.detectUrlType(url);

    switch (urlType) {
      case 'track':
        await this.downloadTrack(url, options);
        break;
      case 'playlist':
        await this.downloadPlaylist(url, options);
        break;
      case 'album':
        await this.downloadAlbum(url, options);
        break;
      default:
        throw new Error('Invalid Spotify URL. Must be a track, playlist, or album URL.');
    }
  }
}

module.exports = DownloadCommand;

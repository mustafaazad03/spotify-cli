const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

/**
 * YouTube Audio Downloader using yt-dlp
 * More reliable alternative to ytdl-core
 */
class YouTubeDlpDownloader {
  constructor() {
    this.logger = new Logger();
    this.ytdlpPath = 'yt-dlp'; // System-wide installation
  }

  async checkYtDlp() {
    return new Promise((resolve) => {
      const check = spawn('which', ['yt-dlp']);
      check.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  async searchTrack(trackName, artistName) {
    try {
      const query = `${artistName} ${trackName} official audio`;

      // Use yt-dlp to search YouTube
      const searchResults = await this.ytdlpSearch(query);

      if (!searchResults || searchResults.length === 0) {
        throw new Error(`No results found for: ${query}`);
      }

      await this.logger.info('YouTube search successful', {
        query,
        videoId: searchResults[0].id
      });

      return searchResults[0].id;
    } catch (error) {
      await this.logger.error('YouTube search failed', {
        trackName,
        artistName,
        error: error.message
      });
      throw new Error(`YouTube search failed: ${error.message}`);
    }
  }

  async ytdlpSearch(query) {
    return new Promise((resolve, reject) => {
      const args = [
        `ytsearch5:${query}`,
        '--get-id',
        '--get-title',
        '--skip-download'
      ];

      const ytdlp = spawn('yt-dlp', args);
      let stdout = '';
      let stderr = '';

      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ytdlp.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp search failed: ${stderr}`));
          return;
        }

        const lines = stdout.trim().split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i += 2) {
          if (lines[i] && lines[i + 1]) {
            results.push({
              title: lines[i],
              id: lines[i + 1]
            });
          }
        }

        resolve(results);
      });
    });
  }

  downloadAudio(videoId, outputPath, progressCallback = null) {
    const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // yt-dlp arguments for best audio quality
          const args = [
            videoURL,
            '-f', 'bestaudio',
            '-x', // Extract audio
            '--audio-format', 'mp3',
            '--audio-quality', '0', // Best quality
            '-o', outputPath.replace('.temp', '.%(ext)s'),
            '--no-playlist',
            '--no-warnings',
            '--progress',
            '--newline'
          ];

          const ytdlp = spawn('yt-dlp', args);
          let lastProgress = 0;

          ytdlp.stdout.on('data', (data) => {
            const output = data.toString();

            // Parse progress from yt-dlp output
            const progressMatch = output.match(/(\d+\.?\d*)%/);
            if (progressMatch && progressCallback) {
              const progress = parseFloat(progressMatch[1]);
              if (progress > lastProgress) {
                lastProgress = progress;
                progressCallback(progress);
              }
            }
          });

          ytdlp.stderr.on('data', (data) => {
          // yt-dlp outputs progress to stderr sometimes
            const output = data.toString();
            if (output.includes('ERROR')) {
              this.logger.error('yt-dlp error', { error: output });
            }
          });

          ytdlp.on('close', async (code) => {
            if (code !== 0) {
              reject(new Error(`yt-dlp download failed with code ${code}`));
              return;
            }

            // Find the downloaded file (yt-dlp may have changed extension)
            const dir = path.dirname(outputPath);
            const basename = path.basename(outputPath, '.temp');
            const files = fs.readdirSync(dir);
            const downloadedFile = files.find(f => f.startsWith(basename));

            if (!downloadedFile) {
              reject(new Error('Downloaded file not found'));
              return;
            }

            const finalPath = path.join(dir, downloadedFile);

            // Rename to expected .temp path
            fs.renameSync(finalPath, outputPath);

            await this.logger.info('YouTube download completed', { videoId });
            resolve(outputPath);
          });

          ytdlp.on('error', async (error) => {
            await this.logger.error('yt-dlp spawn error', { error: error.message });
            reject(error);
          });
        } catch (error) {
          await this.logger.error('YouTube download failed', {
            videoId,
            error: error.message
          });
          reject(error);
        }
      })();
    });
  }

  async getVideoInfo(videoId) {
    return new Promise((resolve, reject) => {
      const args = [
        `https://www.youtube.com/watch?v=${videoId}`,
        '--print', '%(title)s',
        '--print', '%(duration)s',
        '--print', '%(uploader)s',
        '--skip-download'
      ];

      const ytdlp = spawn('yt-dlp', args);
      let stdout = '';

      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ytdlp.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Failed to get video info'));
          return;
        }

        const lines = stdout.trim().split('\n');
        resolve({
          title: lines[0] || '',
          duration: lines[1] || '',
          author: lines[2] || ''
        });
      });
    });
  }

  isValidVideoId(videoId) {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }
}

module.exports = YouTubeDlpDownloader;

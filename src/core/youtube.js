const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const Logger = require('../utils/logger');

/**
 * YouTube Audio Downloader
 * Searches and downloads audio from YouTube
 */
class YouTubeDownloader {
  constructor() {
    this.logger = new Logger();
  }

  async searchTrack(trackName, artistName) {
    try {
      // Search query optimization for best match
      const query = `${artistName} ${trackName} official audio`;
      
      // Use youtube-search-api for searching
      const youtubeSearch = require('youtube-search-api');
      const results = await youtubeSearch.GetListByKeyword(query, false, 5);
      
      if (!results || !results.items || results.items.length === 0) {
        throw new Error(`No results found for: ${query}`);
      }

      // Filter and return video results
      const videoResults = results.items.filter(item => item.type === 'video');
      
      if (videoResults.length === 0) {
        throw new Error(`No video results found for: ${query}`);
      }

      await this.logger.info('YouTube search successful', { 
        query, 
        videoId: videoResults[0].id 
      });

      return videoResults[0].id;
    } catch (error) {
      await this.logger.error('YouTube search failed', { 
        trackName, 
        artistName, 
        error: error.message 
      });
      throw new Error(`YouTube search failed: ${error.message}`);
    }
  }

  async downloadAudio(videoId, outputPath, progressCallback = null) {
    const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
    
    return new Promise(async (resolve, reject) => {
      try {
        const info = await ytdl.getInfo(videoURL);
        const audioFormat = ytdl.chooseFormat(info.formats, { 
          quality: 'highestaudio',
          filter: 'audioonly'
        });

        if (!audioFormat) {
          throw new Error('No audio format available');
        }

        const stream = ytdl(videoURL, {
          quality: 'highestaudio',
          filter: 'audioonly'
        });

        const writeStream = fs.createWriteStream(outputPath);
        
        let downloadedBytes = 0;
        const totalBytes = parseInt(audioFormat.contentLength || 0);

        stream.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (progressCallback && totalBytes > 0) {
            const progress = (downloadedBytes / totalBytes) * 100;
            progressCallback(Math.min(progress, 100));
          }
        });

        stream.on('error', (error) => {
          this.logger.error('YouTube download stream error', { 
            videoId, 
            error: error.message 
          });
          reject(error);
        });

        writeStream.on('error', (error) => {
          this.logger.error('File write error', { 
            outputPath, 
            error: error.message 
          });
          reject(error);
        });

        writeStream.on('finish', async () => {
          await this.logger.info('YouTube download completed', { videoId });
          resolve(outputPath);
        });

        stream.pipe(writeStream);
      } catch (error) {
        await this.logger.error('YouTube download failed', { 
          videoId, 
          error: error.message 
        });
        reject(error);
      }
    });
  }

  async getVideoInfo(videoId) {
    try {
      const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await ytdl.getInfo(videoURL);
      
      return {
        title: info.videoDetails.title,
        duration: info.videoDetails.lengthSeconds,
        author: info.videoDetails.author.name
      };
    } catch (error) {
      await this.logger.error('Failed to get video info', { 
        videoId, 
        error: error.message 
      });
      throw error;
    }
  }

  isValidVideoId(videoId) {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }
}

module.exports = YouTubeDownloader;

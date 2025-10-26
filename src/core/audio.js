const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const Logger = require('../utils/logger');

/**
 * Audio Processing with FFmpeg
 * Converts audio to MP3 format
 */
class AudioProcessor {
  constructor() {
    this.logger = new Logger();
    this.verifyFFmpeg();
  }

  verifyFFmpeg() {
    try {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error('\n⚠️  FFmpeg not found. Please install FFmpeg:');
          console.error('   Ubuntu/Debian: sudo apt-get install ffmpeg');
          console.error('   macOS: brew install ffmpeg');
          console.error('   Windows: Download from https://ffmpeg.org/download.html\n');
        }
      });
    } catch (error) {
      // FFmpeg will be checked when actually used
    }
  }

  async convertToMP3(inputPath, outputPath, quality = 320) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .audioBitrate(quality)
        .audioCodec('libmp3lame')
        .audioChannels(2)
        .audioFrequency(44100)
        .on('end', async () => {
          // Clean up input file
          try {
            fs.unlinkSync(inputPath);
          } catch (error) {
            // Ignore cleanup errors
          }
          await this.logger.info('Audio conversion completed', { outputPath });
          resolve(outputPath);
        })
        .on('error', async (error) => {
          await this.logger.error('Audio conversion failed', { 
            inputPath, 
            error: error.message 
          });
          reject(new Error(`FFmpeg conversion failed: ${error.message}`));
        })
        .save(outputPath);
    });
  }

  async convertWithProgress(inputPath, outputPath, quality, progressCallback) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .audioBitrate(quality)
        .audioCodec('libmp3lame')
        .audioChannels(2)
        .audioFrequency(44100)
        .on('progress', (progress) => {
          if (progressCallback && progress.percent) {
            progressCallback(Math.min(progress.percent, 100));
          }
        })
        .on('end', async () => {
          try {
            fs.unlinkSync(inputPath);
          } catch (error) {
            // Ignore cleanup errors
          }
          await this.logger.info('Audio conversion with progress completed', { outputPath });
          resolve(outputPath);
        })
        .on('error', async (error) => {
          await this.logger.error('Audio conversion with progress failed', { 
            inputPath, 
            error: error.message 
          });
          reject(new Error(`FFmpeg conversion failed: ${error.message}`));
        })
        .save(outputPath);
    });
  }

  async getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            duration: metadata.format.duration,
            bitrate: metadata.format.bit_rate,
            format: metadata.format.format_name
          });
        }
      });
    });
  }
}

module.exports = AudioProcessor;

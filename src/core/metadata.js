const NodeID3 = require('node-id3');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Logger = require('../utils/logger');

/**
 * Metadata Embedding
 * Embeds ID3 tags and album artwork
 */
class MetadataEmbedder {
  constructor() {
    this.logger = new Logger();
  }

  async embedMetadata(audioPath, metadata) {
    try {
      const tags = {
        title: metadata.name,
        artist: metadata.artist,
        album: metadata.album,
        year: metadata.releaseDate?.substring(0, 4),
        trackNumber: metadata.trackNumber?.toString()
      };

      // Download and embed album art
      if (metadata.albumArt) {
        try {
          const artPath = await this.downloadAlbumArt(metadata.albumArt);
          tags.image = {
            mime: 'image/jpeg',
            type: { id: 3, name: 'front cover' },
            description: 'Album Art',
            imageBuffer: fs.readFileSync(artPath)
          };
          fs.unlinkSync(artPath); // Clean up
        } catch (artError) {
          await this.logger.warn('Failed to download album art', { 
            error: artError.message 
          });
          // Continue without album art
        }
      }

      const success = NodeID3.write(tags, audioPath);
      
      if (!success) {
        throw new Error('Failed to write metadata tags');
      }

      await this.logger.info('Metadata embedded successfully', { audioPath });
      return audioPath;
    } catch (error) {
      await this.logger.error('Metadata embedding failed', { 
        audioPath, 
        error: error.message 
      });
      // Don't fail the entire download if metadata fails
      return audioPath;
    }
  }

  async downloadAlbumArt(url) {
    const tempPath = path.join(
      os.tmpdir(),
      `album-art-${Date.now()}.jpg`
    );

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000
      });

      fs.writeFileSync(tempPath, response.data);
      return tempPath;
    } catch (error) {
      throw new Error(`Failed to download album art: ${error.message}`);
    }
  }

  async readMetadata(audioPath) {
    try {
      const tags = NodeID3.read(audioPath);
      return tags;
    } catch (error) {
      await this.logger.error('Failed to read metadata', { 
        audioPath, 
        error: error.message 
      });
      return null;
    }
  }

  async removeMetadata(audioPath) {
    try {
      const success = NodeID3.removeTags(audioPath);
      return success;
    } catch (error) {
      await this.logger.error('Failed to remove metadata', { 
        audioPath, 
        error: error.message 
      });
      return false;
    }
  }
}

module.exports = MetadataEmbedder;

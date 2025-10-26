const axios = require('axios');
const TokenBucket = require('../utils/rate-limiter');
const Logger = require('../utils/logger');

/**
 * Spotify Web API Client
 * Handles authentication and metadata fetching
 */
class SpotifyClient {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.rateLimiter = new TokenBucket(30, 1); // 30 requests per 30 seconds
    this.baseURL = 'https://api.spotify.com/v1';
    this.logger = new Logger();
  }

  async authenticate() {
    const authString = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64');

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      await this.logger.info('Spotify authentication successful');
    } catch (error) {
      await this.logger.error('Spotify authentication failed', { error: error.message });
      throw new Error(`Spotify authentication failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  async makeRequest(endpoint, params = {}) {
    await this.ensureAuthenticated();
    await this.rateLimiter.consume(1);

    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '5');
        await this.logger.warn(`Rate limited, retrying after ${retryAfter}s`);
        await this.sleep(retryAfter * 1000);
        return this.makeRequest(endpoint, params);
      }
      
      if (error.response?.status === 404) {
        const resourceType = endpoint.includes('/playlist') ? 'Playlist' : 
                           endpoint.includes('/album') ? 'Album' : 
                           endpoint.includes('/track') ? 'Track' : 'Resource';
        throw new Error(`${resourceType} not found. The URL may be incorrect or the resource may be private/unavailable.`);
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please run: spotify-dl config');
      }
      
      await this.logger.error('Spotify API request failed', { 
        endpoint,
        status: error.response?.status,
        error: error.message 
      });
      
      throw new Error(`Spotify API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getTrack(trackId) {
    const data = await this.makeRequest(`/tracks/${trackId}`);
    return this.formatTrackData(data);
  }

  async getPlaylistTracks(playlistId) {
    const tracks = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const data = await this.makeRequest(`/playlists/${playlistId}/tracks`, {
        offset,
        limit,
        fields: 'items(track(id,name,artists,album,duration_ms,track_number)),next'
      });

      tracks.push(...data.items
        .filter(item => item.track && item.track.id) // Filter out null tracks
        .map(item => this.formatTrackData(item.track))
      );

      if (!data.next) break;
      offset += limit;
    }

    return tracks;
  }

  async getAlbumTracks(albumId) {
    const tracks = [];
    let offset = 0;
    const limit = 50;

    // First, get album info for artwork
    const albumData = await this.makeRequest(`/albums/${albumId}`);

    while (true) {
      const data = await this.makeRequest(`/albums/${albumId}/tracks`, {
        offset,
        limit
      });

      tracks.push(...data.items.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: albumData.name,
        albumArt: albumData.images[0]?.url,
        duration: track.duration_ms,
        releaseDate: albumData.release_date,
        trackNumber: track.track_number
      })));

      if (!data.next) break;
      offset += limit;
    }

    return tracks;
  }

  formatTrackData(track) {
    return {
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      albumArt: track.album.images[0]?.url,
      duration: track.duration_ms,
      releaseDate: track.album.release_date,
      trackNumber: track.track_number
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SpotifyClient;

const axios = require('axios');
const TokenBucket = require('../utils/rate-limiter');
const Logger = require('../utils/logger');
const SpotifyDLError = require('../utils/errors');
const retryWithBackoff = require('../utils/retry');

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
      throw new SpotifyDLError(
        `Spotify authentication failed: ${error.response?.data?.error_description || error.message}`,
        'AUTH_FAILED',
        { originalError: error.message }
      );
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

    return retryWithBackoff(async () => {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params
        });

        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          const resourceType = endpoint.includes('/playlist') ? 'Playlist'
            : endpoint.includes('/album') ? 'Album'
              : endpoint.includes('/track') ? 'Track' : 'Resource';
          throw new SpotifyDLError(
            `${resourceType} not found. The URL may be incorrect or the resource may be private/unavailable.`,
            'NOT_FOUND',
            { endpoint }
          );
        }

        if (error.response?.status === 401) {
          // Token might be expired, try to re-auth once (not handled by retryWithBackoff usually, but let's throw specific error)
          // In a more complex setup, we'd refresh token and retry immediately, but here we just fail for now or let retry handle transient 401s if any?
          // Actually, standard 401 means re-auth needed.
          throw new SpotifyDLError(
            'Authentication failed. Please run: spotify-dl config',
            'AUTH_REQUIRED'
          );
        }

        // For other errors, rethrow so retryWithBackoff can catch them
        // We attach status to help retry logic if needed
        error.status = error.response?.status;
        throw error;
      }
    }, {
      maxRetries: 3,
      shouldRetry: (error) => {
        // Don't retry 404s or 401s (unless we implemented token refresh logic inside retry, which we haven't)
        if (error instanceof SpotifyDLError) return false;
        if (error.status === 404 || error.status === 401) return false;
        return true; // Retry network errors, 5xx, 429s
      }
    }).catch(error => {
      // Catch final error after retries
      if (error instanceof SpotifyDLError) throw error;

      // Wrap unknown errors
      throw new SpotifyDLError(
        `Spotify API error: ${error.response?.data?.error?.message || error.message}`,
        'API_ERROR',
        {
          endpoint,
          status: error.response?.status,
          originalError: error.message
        }
      );
    });
  }

  async getTrack(trackId) {
    const data = await this.makeRequest(`/tracks/${trackId}`);
    return this.formatTrackData(data);
  }

  async getPlaylistTracks(playlistId) {
    const tracks = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const data = await this.makeRequest(`/playlists/${playlistId}/tracks`, {
        offset,
        limit,
        fields: 'items(track(id,name,artists,album,duration_ms,track_number)),next'
      });

      tracks.push(...data.items
        .filter(item => item.track && item.track.id) // Filter out null tracks
        .map(item => this.formatTrackData(item.track))
      );

      hasMore = !!data.next;
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
    let hasMore = true;

    while (hasMore) {
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

      hasMore = !!data.next;
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

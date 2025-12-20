const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const SpotifyClient = require('../core/spotify');
const ProgressManager = require('../utils/progress');

/**
 * Export command implementation
 * Exports track names and URLs from a playlist/album to a file
 */
async function exportCommand(url, outputFile, credentials) {
  const spotify = new SpotifyClient(credentials.clientId, credentials.clientSecret);
  const progress = new ProgressManager();

  const resolveUrl = async (url) => {
    if (url.includes('spoti.fi/') || url.includes('spotify.link/')) {
      const axios = require('axios');
      try {
        const response = await axios.get(url, { maxRedirects: 5 });
        return response.request.res.responseUrl || url;
      } catch (error) {
        return url;
      }
    }
    return url;
  };

  const resolvedUrl = await resolveUrl(url);

  const detectUrlType = (url) => {
    if (url.includes('/track/') || url.includes('spotify:track:')) {
      return 'track';
    }
    if (url.includes('/playlist/') || url.includes('spotify:playlist:')) {
      return 'playlist';
    }
    if (url.includes('/album/') || url.includes('spotify:album:')) {
      return 'album';
    }
    return null;
  };

  const extractId = (url, type) => {
    const cleanUrl = url.split('?')[0];
    const webRegex = new RegExp(`${type}/([a-zA-Z0-9]+)`);
    const uriRegex = new RegExp(`spotify:${type}:([a-zA-Z0-9]+)`);
    const match = cleanUrl.match(webRegex) || cleanUrl.match(uriRegex);
    return match ? match[1] : null;
  };

  const urlType = detectUrlType(resolvedUrl);
  if (!urlType) {
    throw new Error('Invalid Spotify URL. Must be a track, playlist, or album URL.');
  }

  let tracks = [];
  const spinner = progress.showSpinner(`Fetching ${urlType} information...`);

  try {
    if (urlType === 'track') {
      const trackId = extractId(resolvedUrl, 'track');
      const track = await spotify.getTrack(trackId);
      tracks = [track];
    } else if (urlType === 'playlist') {
      const playlistId = extractId(resolvedUrl, 'playlist');
      tracks = await spotify.getPlaylistTracks(playlistId);
    } else if (urlType === 'album') {
      const albumId = extractId(resolvedUrl, 'album');
      tracks = await spotify.getAlbumTracks(albumId);
    }
    spinner.succeed(`Found ${tracks.length} tracks`);
  } catch (error) {
    spinner.fail(`Failed to fetch ${urlType}: ${error.message}`);
    throw error;
  }

  const exportFormat = outputFile && outputFile.endsWith('.json') ? 'json' : 'text';
  let finalData;

  // Security: Prevent path traversal to sensitive system directories
  if (outputFile) {
    const resolvedPath = path.resolve(outputFile);
    const restrictedDirs = ['/etc', '/var', '/root', '/bin', '/sbin'];
    if (restrictedDirs.some(dir => resolvedPath.startsWith(dir))) {
      throw new Error('Security: Cannot export to restricted system directories.');
    }
  }

  if (exportFormat === 'json') {
    finalData = JSON.stringify(tracks.map(t => ({
      name: t.name,
      artist: t.artist,
      album: t.album,
      url: `https://open.spotify.com/track/${t.id}`
    })), null, 2);
  } else {
    finalData = tracks.map(t => `https://open.spotify.com/track/${t.id}`).join('\n');
  }

  const finalOutputFile = outputFile || `export-${urlType}-${Date.now()}.${exportFormat === 'json' ? 'json' : 'txt'}`;

  await fs.writeFile(finalOutputFile, finalData);
  console.log(chalk.green(`\n✅ Exported ${tracks.length} tracks to: ${finalOutputFile}\n`));
}

module.exports = exportCommand;


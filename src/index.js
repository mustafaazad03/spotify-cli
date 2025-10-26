const SpotifyClient = require('./core/spotify');
const YouTubeDownloader = require('./core/youtube');
const AudioProcessor = require('./core/audio');
const MetadataEmbedder = require('./core/metadata');
const DownloadCommand = require('./commands/download');
const Config = require('./utils/config');
const MetadataCache = require('./utils/cache');
const Logger = require('./utils/logger');
const ProgressManager = require('./utils/progress');
const TokenBucket = require('./utils/rate-limiter');

module.exports = {
  SpotifyClient,
  YouTubeDownloader,
  AudioProcessor,
  MetadataEmbedder,
  DownloadCommand,
  Config,
  MetadataCache,
  Logger,
  ProgressManager,
  TokenBucket
};

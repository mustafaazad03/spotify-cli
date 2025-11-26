const DownloadCommand = require('../../src/commands/download');
const SpotifyClient = require('../../src/core/spotify');
const YouTubeDownloader = require('../../src/core/youtube');
const YouTubeDlpDownloader = require('../../src/core/youtube-dlp');
const AudioProcessor = require('../../src/core/audio');
const MetadataEmbedder = require('../../src/core/metadata');
const fs = require('fs').promises;
const path = require('path');

jest.mock('../../src/core/spotify');
jest.mock('../../src/core/youtube');
jest.mock('../../src/core/youtube-dlp');
jest.mock('../../src/core/audio');
jest.mock('../../src/core/metadata');
jest.mock('ora', () => {
    return () => ({
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn().mockReturnThis(),
        fail: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        text: ''
    });
});
jest.mock('../../src/utils/logger', () => {
    return class MockLogger {
        async info() { }
        async warn() { }
        async error() { }
        async debug() { }
    };
});
jest.mock('fs', () => ({
    promises: {
        mkdir: jest.fn(),
        access: jest.fn(),
        readFile: jest.fn(),
        stat: jest.fn().mockResolvedValue({ size: 5242880 }), // 5MB
        writeFile: jest.fn()
    }
}));

describe('Download Integration', () => {
    let downloader;
    const mockCredentials = { clientId: 'test', clientSecret: 'test' };

    beforeEach(() => {
        jest.clearAllMocks();
        downloader = new DownloadCommand(mockCredentials);
    });

    test('should download a track successfully', async () => {
        // Mock yt-dlp check to return false (use YouTubeDownloader)
        YouTubeDlpDownloader.prototype.checkYtDlp.mockResolvedValue(false);

        // Mock Spotify response
        SpotifyClient.prototype.getTrack.mockResolvedValue({
            id: 'track1',
            name: 'Test Track',
            artist: 'Test Artist',
            album: 'Test Album'
        });

        // Mock fs.access to reject (file doesn't exist)
        fs.access.mockRejectedValue(new Error('File not found'));

        // Mock YouTube search
        YouTubeDownloader.prototype.searchTrack.mockResolvedValue('video1');

        // Mock Download
        YouTubeDownloader.prototype.downloadAudio.mockResolvedValue('/tmp/video1.mp3');

        // Mock Audio Processing
        AudioProcessor.prototype.convertToMP3.mockResolvedValue('/downloads/Test Artist - Test Track.mp3');

        await downloader.download('https://open.spotify.com/track/track1', { output: '/downloads' });

        expect(SpotifyClient.prototype.getTrack).toHaveBeenCalledWith('track1');
        expect(YouTubeDownloader.prototype.searchTrack).toHaveBeenCalled();
        expect(YouTubeDownloader.prototype.downloadAudio).toHaveBeenCalled();
        expect(AudioProcessor.prototype.convertToMP3).toHaveBeenCalled();
        expect(MetadataEmbedder.prototype.embedMetadata).toHaveBeenCalled();
    });

    test('should handle download errors gracefully', async () => {
        SpotifyClient.prototype.getTrack.mockRejectedValue(new Error('API Error'));

        await expect(downloader.download('https://open.spotify.com/track/track1'))
            .rejects.toThrow('API Error');
    });
});

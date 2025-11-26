# Spotify Music Downloader CLI

CLI tool to download Spotify playlists, albums, and tracks with high-quality audio and complete metadata.

## Features

- 🎵 Download individual tracks, playlists, or entire albums
- 🎨 Automatic metadata embedding (artist, album, artwork, etc.)
- 🔊 High-quality audio (up to 320kbps MP3)
- ⚡ Concurrent downloads for faster processing
- 💾 Smart caching to reduce API calls
- 📊 Beautiful progress bars and real-time feedback
- 🔒 Secure credential management
- 🚀 Zero infrastructure cost - runs entirely on your machine

## ✨ What's New in v1.1.0

- 🔒 **Encrypted Credentials**: Your Spotify API credentials are now securely encrypted
- 📊 **Statistics Tracking**: Track your download stats with `spotify-dl stats`
- 🎨 **Custom Templates**: Name your files your way with `--template "{artist}/{album}/{track}"`
- 🔍 **Dry-Run Mode**: Preview downloads before committing with `--dry-run`
- 🔄 **Duplicate Detection**: Find and remove duplicates with `spotify-dl dedupe`
- ✅ **Better Testing**: 75% code coverage with comprehensive tests
- 🚀 **Performance**: Enhanced caching and parallel download management
- 📝 **Structured Logging**: Winston-based logging with rotation

See [CHANGELOG.md](CHANGELOG.md) for full details.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **FFmpeg** (for audio conversion)
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Verify: `ffmpeg -version`

### Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create an App"**
4. Fill in the app details (name and description)
5. Copy your **Client ID** and **Client Secret**

## 🚀 Installation

### Option 1: Install from NPM (Recommended)

```bash
npm install -g spotify-music-downloader-cli
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/spotify-cli.git
cd spotify-cli

# Install dependencies
npm install

# Link globally
npm link
```

## Configuration

Run the configuration wizard:

```bash
spotify-dl config
```

Or view detailed setup instructions:

```bash
spotify-dl help-setup
```

## Usage

### Download a Track

```bash
spotify-dl download https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp
```

### Download a Playlist

```bash
spotify-dl download https://open.spotify.com/playlist/44YDp4eCFJedE5QPRzGXPd
```

### Download an Album

```bash
spotify-dl download https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy
```

### Custom Options

```bash
# Specify output directory
spotify-dl download <url> -o ~/Music/Spotify

# Set audio quality (128, 192, 256, 320)
spotify-dl download <url> -q 320

# Adjust concurrent downloads (1-10)
spotify-dl download <url> -c 5

# Combine options
spotify-dl download <url> -o ./music -q 320 -c 3
```

### Available Commands

```bash
# Core Commands
spotify-dl config         # Configure Spotify API credentials
spotify-dl download <url> # Download track/playlist/album
spotify-dl clear-cache    # Clear metadata cache
spotify-dl help-setup     # Show detailed setup instructions

# New in v1.1.0
spotify-dl stats          # Show download statistics
spotify-dl dedupe <dir>   # Find duplicate files
spotify-dl --version      # Show version number
spotify-dl --help         # Show help information
```

### Download Options

```bash
# Basic options
spotify-dl download <url> -o ~/Music/Spotify  # Custom output directory
spotify-dl download <url> -q 320              # Audio quality (128/192/256/320)
spotify-dl download <url> -c 5                # Concurrent downloads (1-10)

# New in v1.1.0
spotify-dl download <url> --dry-run           # Preview without downloading
spotify-dl download <url> --template "{artist} - {track}"  # Custom filename template

# Template variables: {artist}, {track}, {album}, {year}, {track_number}
spotify-dl download <url> --template "{artist}/{album}/{track_number} - {track}"
```

## Architecture

The tool uses a client-side architecture that runs entirely on your machine:

```
User's Machine
├── Spotify API (metadata only - legal)
├── YouTube Search (find matching audio)
├── YouTube Download (audio stream)
├── FFmpeg (audio conversion)
└── ID3 Tagging (metadata embedding)
```

**Key Components:**

- **Spotify API Client**: Fetches track metadata (artist, album, artwork)
- **YouTube Downloader**: Searches and downloads matching audio
- **Audio Processor**: Converts to MP3 with FFmpeg
- **Metadata Embedder**: Embeds ID3 tags and album artwork
- **Rate Limiter**: Prevents API quota exhaustion
- **Cache System**: Reduces redundant API calls

> [!CAUTION]
> **LEGAL DISCLAIMER: PERSONAL & EDUCATIONAL USE ONLY**
>
> This tool is intended strictly for **educational purposes** and **personal use**.
> - It uses the Spotify API for metadata only.
> - Audio is sourced from third-party services (YouTube).
> - Downloading copyrighted material without permission may violate the Terms of Service of Spotify, YouTube, and your local copyright laws.
> - The developers of this tool assume **no liability** for any misuse or legal consequences arising from the use of this software.
> - **By using this tool, you agree to take full responsibility for your actions.**


## Troubleshooting

### FFmpeg Not Found

```bash
# Install FFmpeg first
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows - download from ffmpeg.org and add to PATH
```

### Authentication Failed

- Verify your Client ID and Client Secret are correct
- Reconfigure: `spotify-dl config`
- Make sure your Spotify app is active in the developer dashboard

### YouTube Download Errors

- Some videos may be geo-restricted or age-restricted
- The tool will skip failed downloads and continue with others
- Check logs in `~/.spotify-dl-logs/` for details

### Rate Limiting

- The tool implements smart rate limiting
- If you hit limits, wait a few minutes and try again
- Consider reducing concurrent downloads: `-c 2`

## File Locations

- **Config**: `~/.spotify-dl/config.json`
- **Cache**: `~/.spotify-dl-cache/`
- **Logs**: `~/.spotify-dl-logs/`
- **Downloads**: `./downloads/` (or custom path with `-o`)

## Performance Tips

1. **Optimal Concurrent Downloads**: `-c 3` (default)
   - Too high may cause rate limiting
   - Too low is slower

2. **Audio Quality**: `-q 320` for best quality
   - 320kbps = highest quality
   - 128kbps = smaller files, lower quality

3. **Cache Usage**: 
   - Cache is automatic
   - Clear periodically: `spotify-dl clear-cache`

4. **Playlist Organization**:
   - Use separate output folders for different playlists
   - Example: `-o ~/Music/Playlists/Workout`

## 🔧 Development

### Project Structure

```
spotify-cli/
├── bin/
│   └── cli.js              # CLI entry point
├── src/
│   ├── commands/
│   │   └── download.js     # Download logic
│   ├── core/
│   │   ├── spotify.js      # Spotify API client
│   │   ├── youtube.js      # YouTube downloader
│   │   ├── audio.js        # FFmpeg processor
│   │   └── metadata.js     # ID3 tagger
│   ├── utils/
│   │   ├── cache.js        # Caching system
│   │   ├── config.js       # Config management
│   │   ├── logger.js       # Logging utility
│   │   ├── progress.js     # Progress display
│   │   └── rate-limiter.js # Rate limiting
│   └── index.js            # Module exports
├── package.json
└── README.md
```

### Run Locally

```bash
# Install dependencies
npm install

# Run CLI
node bin/cli.js download <url>

# Or use npm start
npm start
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Star History

If you find this tool useful, please give it a star! ⭐

---

**Made with ❤️ for music lovers**

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-12-20

### Added
- **Bulk Download**: Support for multiple URLs and `--file` input in `download` command
- **Scheduled Downloads**: New `schedule` command using cron syntax for automated tasks
- **Playlist Export**: New `export` command to save playlist/album tracks to JSON or TXT
- **Concurrency Control**: Improved handling for bulk playlist processing

## [1.1.1] - 2025-11-26

### Added
- Improved error messages for rate limiting
- Fixed minor bug in metadata embedding for albums with long titles
- Updated dependencies for security

## [1.1.0] - 2025-11-26

### Added

#### 🔒 Security & Compliance (P0)
- **Encrypted Credential Storage**: Credentials are now encrypted using AES-256-CTR instead of plain JSON
- **Legal Disclaimer**: Added prominent legal disclaimer in README and CLI startup warning
- **Structured Error Handling**: Introduced `SpotifyDLError` class for better error tracking
- **Retry Logic**: Implemented exponential backoff for API calls with configurable retry attempts

#### 📊 Logging & Observability (P1)
- **Winston Integration**: Replaced custom logger with Winston for structured logging
- **File Rotation**: Automatic log rotation with 5MB max file size (5 files retained)
- **JSON Logging**: Error and combined logs in JSON format for better analysis
- **Console Pretty-Print**: Human-readable console output for development

#### ✅ Testing & CI/CD (P1)
- **Unit Tests**: Added comprehensive unit tests for auth and retry modules
- **Integration Tests**: Added integration tests for download flow
- **GitHub Actions CI/CD**: Multi-platform testing (Ubuntu, macOS, Windows) with Node 18 & 20
- **Security Audit**: Automated npm audit in CI pipeline
- **Code Coverage**: Achieved ~75% code coverage

#### 🚀 Performance Optimization (P2)
- **Download Queue**: Smart parallel processing with p-limit
- **Enhanced Caching**: Node-cache with TTL and persistence for metadata
- **Concurrent Downloads**: Improved parallel download management

#### ⭐ Advanced Features (P2)
- **Custom Naming Templates**: Use `--template` flag for custom filenames
  - Variables: `{artist}`, `{track}`, `{album}`, `{year}`, `{track_number}`
  - Example: `--template "{artist}/{album}/{track_number} - {track}"`
- **Dry-Run Mode**: Preview downloads without actually downloading with `--dry-run`
- **Statistics Tracking**: Track download stats with `spotify-dl stats` command
  - Total downloads, success rate, file sizes, last download time
- **Duplicate Detection**: Find and remove duplicates with `spotify-dl dedupe <directory>`
  - Detects duplicates by metadata or file hash
  - Use `--remove` flag to actually delete duplicates

### Changed
- Improved error messages with structured error codes
- Better progress reporting during downloads
- Enhanced cache management with automatic cleanup

### Fixed
- Integration test failures due to missing fs.stat mock
- Lint errors (indentation, max-len, unused vars)
- File path handling across platforms

### Security
- **BREAKING**: Config files are now encrypted. Existing users need to re-run `spotify-dl config`
- Added legal compliance warnings for personal/educational use only

## [1.0.1] - 2025-11-25

### Fixed
- Minor bug fixes and improvements
- Updated dependencies

## [1.0.0] - 2025-11-24

### Added
- Initial release
- Download Spotify tracks, playlists, and albums
- High-quality audio (up to 320kbps MP3)
- Automatic metadata embedding
- Basic caching and rate limiting
- CLI interface with progress bars

---

## Migration Guide

### From 1.0.x to 1.1.0

**Important**: Version 1.1.0 introduces encrypted credential storage. After upgrading:

1. **Re-configure credentials**: Run `spotify-dl config` to re-enter your Spotify API credentials
2. **Old credentials**: Your old `~/.spotify-dl/config.json` will be automatically migrated and encrypted
3. **New features**: Update your scripts to use new CLI options if needed

**New CLI Options:**
```bash
# Custom naming
spotify-dl download <url> --template "{artist} - {track}"

# Dry run
spotify-dl download <url> --dry-run

# New commands
spotify-dl stats
spotify-dl dedupe ./downloads [--remove]
```

## Roadmap

### Planned for 1.2.0
- [ ] Playlist synchronization (`sync` command)
- [ ] Watch mode for playlists
- [ ] Export metadata to JSON/CSV
- [ ] Multi-user support
- [ ] Download history tracking

### Planned for 2.0.0
- [ ] GUI interface
- [ ] Docker support
- [ ] Cloud storage integration
- [ ] Scheduled downloads (cron)
- [ ] Multiple output formats (FLAC, AAC, OGG)

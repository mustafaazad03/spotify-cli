const DownloadCommand = require('../src/commands/download');

describe('DownloadCommand URL Parsing', () => {
  let downloader;

  beforeEach(() => {
    downloader = new DownloadCommand({
      clientId: 'test',
      clientSecret: 'test'
    });
  });

  test('should extract track ID from clean URL', () => {
    const url = 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp';
    const id = downloader.extractTrackId(url);
    expect(id).toBe('3n3Ppam7vgaVa1iaRUc9Lp');
  });

  test('should extract track ID from URL with query parameters', () => {
    const url = 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=abc123';
    const id = downloader.extractTrackId(url);
    expect(id).toBe('3n3Ppam7vgaVa1iaRUc9Lp');
  });

  test('should extract playlist ID from clean URL', () => {
    const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
    const id = downloader.extractPlaylistId(url);
    expect(id).toBe('37i9dQZF1DXcBWIGoYBM5M');
  });

  test('should extract playlist ID from URL with query parameters', () => {
    const url = 'https://open.spotify.com/playlist/0Edhkp2uIG2onR2EcZt8qc?si=RJW_JpC7Sta-ePepzzgdPg';
    const id = downloader.extractPlaylistId(url);
    expect(id).toBe('0Edhkp2uIG2onR2EcZt8qc');
  });

  test('should extract album ID from URL', () => {
    const url = 'https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy';
    const id = downloader.extractAlbumId(url);
    expect(id).toBe('4aawyAB9vmqN3uQ7FjRGTy');
  });

  test('should detect track URL type', () => {
    const url = 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp';
    const type = downloader.detectUrlType(url);
    expect(type).toBe('track');
  });

  test('should detect playlist URL type', () => {
    const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
    const type = downloader.detectUrlType(url);
    expect(type).toBe('playlist');
  });

  test('should detect album URL type', () => {
    const url = 'https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy';
    const type = downloader.detectUrlType(url);
    expect(type).toBe('album');
  });

  test('should sanitize filenames correctly', () => {
    const filename = 'Artist: Name / Track | Title * 2024';
    const sanitized = downloader.sanitizeFilename(filename);
    expect(sanitized).toBe('Artist_ Name _ Track _ Title _ 2024');
  });
});

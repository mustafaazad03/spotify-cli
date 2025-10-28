const MetadataCache = require('../src/utils/cache');
const path = require('path');
const os = require('os');

describe('MetadataCache', () => {
  let cache;
  const testCacheDir = path.join(os.tmpdir(), 'test-spotify-cache');

  beforeEach(() => {
    cache = new MetadataCache(testCacheDir);
  });

  afterEach(async () => {
    await cache.clear();
  });

  test('should set and get cache values', async () => {
    const key = 'test-key';
    const value = { id: '123', name: 'Test Track' };

    await cache.set(key, value);
    const retrieved = await cache.get(key);

    expect(retrieved).toEqual(value);
  });

  test('should return null for non-existent keys', async () => {
    const result = await cache.get('non-existent');
    expect(result).toBeNull();
  });

  test('should handle cache expiry', async () => {
    cache.ttl = 100; // Set 100ms TTL for testing
    const key = 'expiry-test';
    const value = 'test-value';

    await cache.set(key, value);
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const result = await cache.get(key);
    expect(result).toBeNull();
  });
});

const TokenBucket = require('../src/utils/rate-limiter');

describe('TokenBucket', () => {
  test('should consume tokens correctly', async () => {
    const bucket = new TokenBucket(10, 10); // 10 tokens, refill 10/sec
    
    const result = await bucket.consume(5);
    expect(result).toBe(true);
    expect(bucket.tokens).toBe(5);
  });

  test('should refill tokens over time', async () => {
    const bucket = new TokenBucket(10, 10);
    await bucket.consume(10);
    
    // Wait 1 second for refill
    await new Promise(resolve => setTimeout(resolve, 1100));
    bucket.refill();
    
    expect(bucket.tokens).toBeGreaterThan(5);
  });

  test('should not exceed capacity', async () => {
    const bucket = new TokenBucket(10, 10);
    
    // Wait and refill
    await new Promise(resolve => setTimeout(resolve, 2000));
    bucket.refill();
    
    expect(bucket.tokens).toBeLessThanOrEqual(10);
  });
});

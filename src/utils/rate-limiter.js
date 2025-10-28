/**
 * Token Bucket Rate Limiter
 * Implements token bucket algorithm for API rate limiting
 */
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;           // Max tokens (e.g., 100)
    this.tokens = capacity;             // Current tokens
    this.refillRate = refillRate;       // Tokens per second
    this.lastRefill = Date.now();
  }

  async consume(tokens = 1) {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    // Wait for token availability
    const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
    await this.sleep(waitTime);
    this.tokens = 0;
    return true;
  }

  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = TokenBucket;

const pLimit = require('p-limit');
const Logger = require('./logger');

/**
 * Download Queue Manager
 * Manages parallel downloads with concurrency control
 */
class DownloadQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 3;
    this.limit = pLimit(this.concurrency);
    this.queue = [];
    this.completed = [];
    this.failed = [];
    this.logger = new Logger();
  }

  async add(task, metadata = {}) {
    const wrappedTask = this.limit(async () => {
      try {
        await this.logger.info('Starting task', { metadata });
        const result = await task();
        this.completed.push({ metadata, result });
        await this.logger.info('Task completed', { metadata });
        return result;
      } catch (error) {
        this.failed.push({ metadata, error: error.message });
        await this.logger.error('Task failed', {
          metadata,
          error: error.message
        });
        throw error;
      }
    });

    this.queue.push(wrappedTask);
    return wrappedTask;
  }

  async waitAll() {
    return Promise.allSettled(this.queue);
  }

  getStats() {
    return {
      total: this.queue.length,
      completed: this.completed.length,
      failed: this.failed.length,
      pending: this.queue.length - this.completed.length - this.failed.length
    };
  }

  reset() {
    this.queue = [];
    this.completed = [];
    this.failed = [];
  }
}

module.exports = DownloadQueue;

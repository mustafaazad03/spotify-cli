const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Simple logger utility
 */
class Logger {
  constructor() {
    this.logDir = path.join(os.homedir(), '.spotify-dl-logs');
    this.logFile = path.join(this.logDir, `spotify-dl-${this.getDateString()}.log`);
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;

    try {
      await fs.mkdir(this.logDir, { recursive: true });
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      // Silent fail for logging
    }
  }

  async info(message, data) {
    await this.log('info', message, data);
  }

  async error(message, data) {
    await this.log('error', message, data);
  }

  async warn(message, data) {
    await this.log('warn', message, data);
  }

  async debug(message, data) {
    await this.log('debug', message, data);
  }

  getDateString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

module.exports = Logger;

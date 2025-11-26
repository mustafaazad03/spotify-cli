const winston = require('winston');
const path = require('path');
const os = require('os');

const logDir = path.join(os.homedir(), '.spotify-dl-logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'spotify-dl' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production then log to the `console` with the format:
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Wrapper class to maintain backward compatibility with existing code
class LoggerWrapper {
  constructor() {
    this.logger = logger;
  }

  async info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  async warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  async error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  async debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }
}

module.exports = LoggerWrapper;

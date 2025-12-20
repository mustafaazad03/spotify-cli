const fs = require('fs');
const path = require('path');
const os = require('os');

const PID_FILE = path.join(os.homedir(), '.spotify-dl', 'schedule.pid');

/**
 * Manages the PID (Process ID) for background scheduling
 */
const PidManager = {
  save(pid, args) {
    const dir = path.dirname(PID_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PID_FILE, JSON.stringify({
      pid,
      startTime: new Date().toLocaleString(),
      args
    }, null, 2));
  },

  get() {
    if (fs.existsSync(PID_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  remove() {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  },

  isRunning(pid) {
    try {
      // process.kill(pid, 0) checks if process exists without killing it
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return false;
    }
  }
};

module.exports = PidManager;


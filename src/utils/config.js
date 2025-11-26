const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const inquirer = require('inquirer');
const auth = require('./auth');

/**
 * Configuration management
 */
class Config {
  constructor() {
    this.configDir = path.join(os.homedir(), '.spotify-dl');
    this.configFile = path.join(this.configDir, 'config.json');
  }

  async load() {
    try {
      const data = await fs.readFile(this.configFile, 'utf8');

      // Try to parse as JSON first
      try {
        const plain = JSON.parse(data);
        if (plain.clientId && plain.clientSecret) {
          await this.save(plain); // Re-save as encrypted
          return plain;
        }
      } catch (e) {
        // Not JSON, assume encrypted string
      }

      // Decrypt
      const decrypted = await auth.decrypt(data);
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  async save(config) {
    await fs.mkdir(this.configDir, { recursive: true });
    const encrypted = await auth.encrypt(JSON.stringify(config));
    await fs.writeFile(this.configFile, encrypted);
  }

  async exists() {
    try {
      await fs.access(this.configFile);
      return true;
    } catch {
      return false;
    }
  }

  async promptForConfig() {
    console.log('\n🎵 Spotify Downloader - Configuration Setup\n');
    console.log('To use this tool, you need Spotify API credentials.');
    console.log('Get them at: https://developer.spotify.com/dashboard\n');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'clientId',
        message: 'Enter your Spotify Client ID:',
        validate: (input) => input.length > 0 || 'Client ID is required'
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: 'Enter your Spotify Client Secret:',
        validate: (input) => input.length > 0 || 'Client Secret is required'
      }
    ]);

    await this.save(answers);
    return answers;
  }

  async getOrPrompt() {
    const config = await this.load();
    if (config && config.clientId && config.clientSecret) {
      return config;
    }
    return await this.promptForConfig();
  }
}

module.exports = Config;

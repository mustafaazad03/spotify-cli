const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const inquirer = require('inquirer');

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
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async save(config) {
    await fs.mkdir(this.configDir, { recursive: true });
    await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
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

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const inquirer = require('inquirer');
const chalk = require('chalk');
const clipboardy = require('clipboardy');
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
    console.log(chalk.cyan.bold('\n🎵 Spotify Downloader - Configuration Setup\n'));
    console.log('To use this tool, you need Spotify API credentials.');
    console.log(chalk.yellow('Opening Spotify Developer Dashboard in your browser...\n'));

    // Open browser to Spotify Dashboard
    try {
      const openBrowser = (await import('open')).default;
      await openBrowser('https://developer.spotify.com/dashboard');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for browser to open
    } catch (error) {
      console.log(chalk.yellow('Unable to open browser automatically.'));
      console.log('Please visit: https://developer.spotify.com/dashboard\n');
    }

    console.log(chalk.cyan('📋 Steps to get your credentials:\n'));
    console.log('1. Log in to the Spotify Developer Dashboard');
    console.log('2. Click "Create app" (or select an existing app)');
    console.log('3. Fill in the required fields (any values work for personal use)');
    console.log('4. Click "Settings" to view your credentials');
    console.log('5. Copy your Client ID and Client Secret\n');

    console.log(chalk.gray('💡 Tip: You can paste directly (Ctrl+V) when prompted\n'));

    // Try to detect clipboard for Client ID
    let defaultClientId = '';
    try {
      const clipboard = await clipboardy.read();
      if (clipboard && clipboard.length === 32 && /^[a-f0-9]+$/i.test(clipboard)) {
        defaultClientId = clipboard;
        console.log(chalk.green('✓ Detected Client ID in clipboard!\n'));
      }
    } catch (error) {
      // Clipboard detection failed, continue normally
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'clientId',
        message: 'Enter your Spotify Client ID:',
        default: defaultClientId,
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Client ID is required';
          }
          if (input.length !== 32) {
            return 'Client ID should be 32 characters long';
          }
          return true;
        }
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: 'Enter your Spotify Client Secret:',
        mask: '*',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Client Secret is required';
          }
          if (input.length !== 32) {
            return 'Client Secret should be 32 characters long';
          }
          return true;
        }
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

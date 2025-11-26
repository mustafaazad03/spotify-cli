#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');
const DownloadCommand = require('../src/commands/download');
const Config = require('../src/utils/config');

// ASCII Art Banner
console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║      🎵  Spotify Music Downloader CLI  🎵                 ║
║                                                           ║
║      Download Spotify playlists & tracks to MP3           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`));

// Legal Warning
console.log(chalk.yellow.bold('⚠️  LEGAL DISCLAIMER: FOR PERSONAL & EDUCATIONAL USE ONLY'));
console.log(chalk.yellow('   This tool uses Spotify for metadata and YouTube for audio.'));
console.log(chalk.yellow('   Downloading copyrighted content may violate Terms of Service.'));
console.log(chalk.yellow('   You are responsible for your actions.\n'));

program
  .name('spotify-dl')
  .description('Enterprise-grade Spotify music downloader')
  .version(packageJson.version);

program
  .command('download <url>')
  .description('Download a Spotify track, playlist, or album')
  .option('-o, --output <dir>', 'Output directory', './downloads')
  .option('-q, --quality <quality>', 'Audio quality (128, 192, 256, 320)', '320')
  .option('-c, --concurrent <number>', 'Concurrent downloads', '3')
  .option('--dry-run', 'Simulate download without actually downloading')
  .option('--template <template>', 'Custom filename template (e.g., "{artist} - {track}")')
  .action(async (url, options) => {
    try {
      // Get or prompt for configuration
      const config = new Config();
      const credentials = await config.getOrPrompt();

      // Createdownload command
      const downloader = new DownloadCommand(credentials);

      // Start download
      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 Dry run mode - no files will be downloaded\n'));
      }
      console.log(chalk.cyan('\n📥 Starting download...\n'));
      await downloader.download(url, options);

      console.log(chalk.green('\n✨ All done!\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Configure Spotify API credentials')
  .action(async () => {
    try {
      const config = new Config();
      await config.promptForConfig();
      console.log(chalk.green('\n✓ Configuration saved successfully!\n'));
      console.log(chalk.cyan('You can now use: spotify-dl download <url>\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('clear-cache')
  .description('Clear the metadata cache')
  .action(async () => {
    try {
      const MetadataCache = require('../src/utils/cache');
      const cache = new MetadataCache();
      await cache.clear();
      console.log(chalk.green('\n✓ Cache cleared successfully!\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('help-setup')
  .description('Show setup instructions')
  .action(() => {
    console.log(chalk.cyan('\n📖 Setup Instructions:\n'));
    console.log('1. Get Spotify API credentials:');
    console.log('   - Go to https://developer.spotify.com/dashboard');
    console.log('   - Log in with your Spotify account');
    console.log('   - Click "Create an App"');
    console.log('   - Copy your Client ID and Client Secret\n');
    console.log('2. Configure the CLI:');
    console.log(chalk.yellow('   spotify-dl config\n'));
    console.log('3. Install FFmpeg (required for audio conversion):');
    console.log('   - Ubuntu/Debian: sudo apt-get install ffmpeg');
    console.log('   - macOS: brew install ffmpeg');
    console.log('   - Windows: Download from https://ffmpeg.org/download.html\n');
    console.log('4. Start downloading:');
    console.log(chalk.yellow('   spotify-dl download <spotify-url>\n'));
    console.log(chalk.green('Happy downloading! 🎵\n'));
  });

program
  .command('stats')
  .description('Show download statistics')
  .action(async () => {
    try {
      const statsCommand = require('../src/commands/stats');
      await statsCommand();
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('dedupe <directory>')
  .description('Find and remove duplicate files')
  .option('--remove', 'Actually remove duplicates (default: dry run)')
  .action(async (directory, options) => {
    try {
      const dedupeCommand = require('../src/commands/dedupe');
      await dedupeCommand(directory, options);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
  console.log(chalk.cyan('\nExamples:'));
  console.log('  $ spotify-dl config');
  console.log('  $ spotify-dl download https://open.spotify.com/track/...');
  console.log('  $ spotify-dl download https://open.spotify.com/playlist/...');
  console.log('  $ spotify-dl download <url> -o ./music -q 320\n');
  console.log(chalk.yellow('💡 Run "spotify-dl help-setup" for detailed setup instructions\n'));
}

program.parse();

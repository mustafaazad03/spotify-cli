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
  .command('download [urls...]')
  .description('Download Spotify tracks, playlists, or albums (supports multiple URLs)')
  .option('-f, --file <path>', 'File containing Spotify URLs (one per line)')
  .option('-o, --output <dir>', 'Output directory', './downloads')
  .option('-q, --quality <quality>', 'Audio quality (128, 192, 256, 320)', '320')
  .option('-c, --concurrent <number>', 'Concurrent downloads', '3')
  .option('--dry-run', 'Simulate download without actually downloading')
  .option('--template <template>', 'Custom filename template (e.g., "{artist} - {track}")')
  .action(async (urls, options) => {
    try {
      const fs = require('fs').promises;
      let allUrls = [...urls];

      if (options.file) {
        try {
          const fileContent = await fs.readFile(options.file, 'utf8');
          const fileUrls = fileContent.split(/\r?\n/).map(u => u.trim()).filter(u => u.length > 0);
          allUrls = [...allUrls, ...fileUrls];
        } catch (error) {
          throw new Error(`Could not read file ${options.file}: ${error.message}`);
        }
      }

      if (allUrls.length === 0) {
        console.error(chalk.red('\n❌ Error: No URLs provided. Please provide URLs as arguments or use --file.\n'));
        process.exit(1);
      }

      // Get or prompt for configuration
      const config = new Config();
      const credentials = await config.getOrPrompt();

      // Createdownload command
      const downloader = new DownloadCommand(credentials);

      // Start download
      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 Dry run mode - no files will be downloaded\n'));
      }
      console.log(chalk.cyan(`\n📥 Starting download for ${allUrls.length} items...\n`));

      for (const url of allUrls) {
        console.log(chalk.blue(`\n▶ Processing: ${url}`));
        try {
          await downloader.download(url, options);
        } catch (error) {
          console.error(chalk.red(`  ❌ Failed to process ${url}: ${error.message}`));
          // Continue with next URL
        }
      }

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

program
  .command('export <url> [outputFile]')
  .description('Export tracks from a playlist/album to a file')
  .action(async (url, outputFile) => {
    try {
      const config = new Config();
      const credentials = await config.getOrPrompt();
      const exportCommand = require('../src/commands/export');
      await exportCommand(url, outputFile, credentials);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('schedule <cron> [urls...]')
  .description('Schedule downloads using cron syntax (e.g., "0 0 * * *" for daily at midnight)')
  .option('-f, --file <path>', 'File containing Spotify URLs')
  .option('-o, --output <dir>', 'Output directory', './downloads')
  .option('-q, --quality <quality>', 'Audio quality', '320')
  .option('-c, --concurrent <number>', 'Concurrent downloads', '3')
  .option('--template <template>', 'Filename template')
  .option('-b, --background', 'Run the scheduler in the background (survives terminal close)')
  .option('--internal-daemon', 'Internal flag for background execution', false)
  .action(async (cron, urls, options) => {
    try {
      const config = new Config();
      const credentials = await config.getOrPrompt();
      const scheduleCommand = require('../src/commands/schedule');
      await scheduleCommand(cron, urls, options, credentials);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('schedule-status')
  .description('Check the status of the background scheduler')
  .action(() => {
    const PidManager = require('../src/utils/pid-manager');
    const status = PidManager.get();
    if (status && PidManager.isRunning(status.pid)) {
      console.log(chalk.green('\n✅ Background scheduler is RUNNING'));
      console.log(chalk.cyan(`   PID: ${status.pid}`));
      console.log(chalk.cyan(`   Started: ${status.startTime}`));
      console.log(chalk.cyan(`   Schedule: "${status.args.cron}"`));
      console.log(chalk.gray('\n   Logs: ~/.spotify-dl/schedule.log\n'));
    } else {
      console.log(chalk.yellow('\nℹ Background scheduler is NOT running.\n'));
      if (status) {
        PidManager.remove();
      }
    }
  });

program
  .command('schedule-stop')
  .description('Stop the background scheduler')
  .action(() => {
    const PidManager = require('../src/utils/pid-manager');
    const status = PidManager.get();
    if (status && PidManager.isRunning(status.pid)) {
      try {
        process.kill(status.pid, 'SIGTERM');
        PidManager.remove();
        console.log(chalk.green(`\n✅ Stopped background scheduler (PID: ${status.pid})\n`));
      } catch (error) {
        console.error(chalk.red(`\n❌ Failed to stop scheduler: ${error.message}\n`));
      }
    } else {
      console.log(chalk.yellow('\nℹ No active background scheduler found.\n'));
      if (status) {
        PidManager.remove();
      }
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

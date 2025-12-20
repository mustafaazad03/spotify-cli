const cron = require('node-cron');
const chalk = require('chalk');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const path = require('path');
const DownloadCommand = require('./download');
const PidManager = require('../utils/pid-manager');

/**
 * Schedule command implementation
 * Uses node-cron to schedule downloads
 */
async function scheduleCommand(cronExpression, urls, options, credentials) {
  // 1. Validate Cron
  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression: "${cronExpression}"`);
  }

  // 2. Handle Backgrounding (Daemon Mode)
  if (options.background && !options.internalDaemon) {
    const existing = PidManager.get();
    if (existing && PidManager.isRunning(existing.pid)) {
      throw new Error(`A background schedule is already running (PID: ${existing.pid}). Please stop it first.`);
    }

    // Prepare arguments for the background process
    // We remove --background and add --internal-daemon to avoid infinite loops
    const args = process.argv.slice(1)
      .filter(arg => arg !== '--background' && arg !== '-b')
      .concat(['--internal-daemon']);

    const out = await fs.open(path.join(require('os').homedir(), '.spotify-dl', 'schedule.log'), 'a');

    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: ['ignore', out, out]
    });

    PidManager.save(child.pid, { cron: cronExpression, urls });
    child.unref();

    console.log(chalk.green('\n🚀 Schedule started in background!'));
    console.log(chalk.cyan(`   PID: ${child.pid}`));
    console.log(chalk.cyan('   Logs: ~/.spotify-dl/schedule.log'));
    console.log(chalk.gray('   Terminal can be closed now.\n'));
    return;
  }

  // 3. Normal/Internal Daemon Execution
  const downloader = new DownloadCommand(credentials);

  if (!options.internalDaemon) {
    console.log(chalk.cyan(`\n⏰ Schedule active: "${cronExpression}"`));
    console.log(chalk.gray('Keep this process running to execute tasks. Use --background to run in background.\n'));
  }

  cron.schedule(cronExpression, async () => {
    const now = new Date().toLocaleString();
    const logPrefix = `[${now}] `;

    try {
      let allUrls = [...urls];
      if (options.file) {
        try {
          const fileContent = await fs.readFile(options.file, 'utf8');
          const fileUrls = fileContent.split(/\r?\n/).map(u => u.trim()).filter(u => u.length > 0);
          allUrls = [...allUrls, ...fileUrls];
        } catch (error) {
          console.error(logPrefix + chalk.red(`❌ File read failed: ${error.message}`));
        }
      }

      if (allUrls.length === 0) {
        console.log(logPrefix + chalk.yellow('No URLs to process.'));
        return;
      }

      console.log(logPrefix + chalk.blue(`Starting scheduled task for ${allUrls.length} items...`));

      for (const url of allUrls) {
        try {
          await downloader.download(url, options);
        } catch (error) {
          console.error(logPrefix + chalk.red(`❌ Failed ${url}: ${error.message}`));
        }
      }

      console.log(logPrefix + chalk.green('✅ Task completed.'));
    } catch (error) {
      console.error(logPrefix + chalk.red(`❌ Critical Error: ${error.message}`));
    }
  });
}

module.exports = scheduleCommand;


const cliProgress = require('cli-progress');
const chalk = require('chalk');
const ora = require('ora');

/**
 * Progress display manager
 * Handles progress bars and spinners
 */
class ProgressManager {
  constructor() {
    this.multibar = null;
    this.bars = new Map();
  }

  initMultibar() {
    if (!this.multibar) {
      this.multibar = new cliProgress.MultiBar({
        format: chalk.cyan('{bar}') + ' | {filename} | {percentage}% | {value}/{total}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false
      }, cliProgress.Presets.shades_classic);
    }
  }

  createTrackProgress(filename, total) {
    this.initMultibar();
    const bar = this.multibar.create(total, 0, { filename });
    this.bars.set(filename, bar);
    return bar;
  }

  updateProgress(bar, value) {
    if (bar) {
      bar.update(value);
    }
  }

  incrementProgress(bar, increment = 1) {
    if (bar) {
      bar.increment(increment);
    }
  }

  stop() {
    if (this.multibar) {
      this.multibar.stop();
    }
  }

  showSpinner(text) {
    return ora({
      text: chalk.cyan(text),
      spinner: 'dots'
    }).start();
  }

  showSuccess(text) {
    console.log(chalk.green('✓ ' + text));
  }

  showError(text) {
    console.log(chalk.red('✗ ' + text));
  }

  showWarning(text) {
    console.log(chalk.yellow('⚠ ' + text));
  }

  showInfo(text) {
    console.log(chalk.blue('ℹ ' + text));
  }
}

module.exports = ProgressManager;

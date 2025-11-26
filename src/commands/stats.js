const chalk = require('chalk');
const StatsTracker = require('../utils/stats');

/**
 * Stats command - Display download statistics
 */
async function statsCommand() {
  const tracker = new StatsTracker();
  const stats = await tracker.getStats();

  console.log(chalk.cyan('\n📊 Download Statistics\n'));
  console.log(chalk.white('Total Downloads:     ') + chalk.green(stats.totalDownloads));
  console.log(chalk.white('Successful:          ') + chalk.green(stats.successfulDownloads));
  console.log(chalk.white('Failed:              ') + chalk.red(stats.failedDownloads));
  console.log(chalk.white('Success Rate:        ') + chalk.yellow(stats.successRate));
  console.log(chalk.white('Total Size:          ') + chalk.blue(stats.totalSizeFormatted));
  console.log(chalk.white('Average File Size:   ') + chalk.blue(stats.averageSize));

  if (stats.lastDownload) {
    console.log(chalk.white('Last Download:       ') + chalk.gray(new Date(stats.lastDownload).toLocaleString()));
  }

  console.log(chalk.cyan('\n📝 Breakdown:\n'));
  console.log(chalk.white('Tracks:              ') + chalk.green(stats.tracks.length));
  console.log(chalk.white('Playlists:           ') + chalk.green(stats.playlists.length));
  console.log(chalk.white('Albums:              ') + chalk.green(stats.albums.length));

  console.log();
}

module.exports = statsCommand;

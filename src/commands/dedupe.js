const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const chalk = require('chalk');
const NodeID3 = require('node-id3');

/**
 * Dedupe command - Find and optionally remove duplicate files
 */
class DedupeCommand {
  constructor(directory) {
    this.directory = directory;
    this.duplicates = new Map();
  }

  async findDuplicates() {
    const files = await this.getMP3Files(this.directory);
    const hashes = new Map();

    console.log(chalk.cyan(`\n🔍 Scanning ${files.length} files for duplicates...\n`));

    for (const file of files) {
      try {
        // Try metadata-based detection first
        const metadata = NodeID3.read(file);
        const metaKey = `${metadata.artist}-${metadata.title}`.toLowerCase();

        if (hashes.has(metaKey)) {
          hashes.get(metaKey).push(file);
          this.duplicates.set(metaKey, hashes.get(metaKey));
        } else {
          hashes.set(metaKey, [file]);
        }
      } catch (error) {
        // Fallback to file hash
        const hash = await this.getFileHash(file);
        if (hashes.has(hash)) {
          hashes.get(hash).push(file);
          this.duplicates.set(hash, hashes.get(hash));
        } else {
          hashes.set(hash, [file]);
        }
      }
    }

    return Array.from(this.duplicates.values()).filter(group => group.length > 1);
  }

  async getMP3Files(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getMP3Files(fullPath));
      } else if (entry.name.endsWith('.mp3')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  async getFileHash(filePath) {
    const content = await fs.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async remove(duplicateGroups, keepFirst = true) {
    let removed = 0;

    for (const group of duplicateGroups) {
      const toRemove = keepFirst ? group.slice(1) : [group[0]];

      for (const file of toRemove) {
        try {
          await fs.unlink(file);
          removed++;
          console.log(chalk.red('✖ Removed: ') + chalk.gray(file));
        } catch (error) {
          console.log(chalk.yellow('⚠ Failed to remove: ') + chalk.gray(file));
        }
      }
    }

    return removed;
  }
}

async function dedupeCommand(directory, options = {}) {
  try {
    const dedupe = new DedupeCommand(directory);
    const duplicates = await dedupe.findDuplicates();

    if (duplicates.length === 0) {
      console.log(chalk.green('\n✓ No duplicates found!\n'));
      return;
    }

    console.log(chalk.yellow(`\n⚠ Found ${duplicates.length} groups of duplicates:\n`));

    duplicates.forEach((group, index) => {
      console.log(chalk.cyan(`\nGroup ${index + 1}:`));
      group.forEach((file, i) => {
        const marker = i === 0 ? chalk.green('✓ Keep:   ') : chalk.red('✖ Remove: ');
        console.log(marker + chalk.gray(path.basename(file)));
      });
    });

    if (options.remove) {
      console.log();
      const removed = await dedupe.remove(duplicates);
      console.log(chalk.green(`\n✓ Removed ${removed} duplicate files\n`));
    } else {
      console.log(chalk.yellow('\n💡 Run with --remove flag to delete duplicates\n'));
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    throw error;
  }
}

module.exports = dedupeCommand;

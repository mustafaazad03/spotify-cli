/**
 * Filename Template Parser
 * Supports variables: {artist}, {track}, {album}, {year}, {track_number}
 */
class TemplateParser {
  constructor() {
    this.variables = [
      'artist',
      'track',
      'album',
      'year',
      'track_number'
    ];
  }

  parse(template, metadata) {
    let result = template;

    // Replace each variable
    const replacements = {
      artist: metadata.artist || 'Unknown Artist',
      track: metadata.name || 'Unknown Track',
      album: metadata.album || 'Unknown Album',
      year: metadata.releaseDate?.substring(0, 4) || '',
      track_number: metadata.trackNumber?.toString().padStart(2, '0') || '00'
    };

    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, this.sanitize(value));
    });

    return result;
  }

  sanitize(text) {
    // Remove or replace invalid filename characters
    return text
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  validate(template) {
    // Check if template contains valid variables
    const regex = /\{(\w+)\}/g;
    const matches = [...template.matchAll(regex)];

    for (const match of matches) {
      if (!this.variables.includes(match[1])) {
        throw new Error(`Invalid template variable: {${match[1]}}`);
      }
    }

    return true;
  }

  getDefaultTemplate() {
    return '{artist} - {track}';
  }

  getExamples() {
    return [
      '{artist} - {track}',
      '{album}/{track_number} - {track}',
      '{artist}/{album}/{track_number} - {track}',
      '{year} - {artist} - {album} - {track}'
    ];
  }
}

module.exports = TemplateParser;

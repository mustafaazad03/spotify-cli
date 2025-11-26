class SpotifyDLError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'SpotifyDLError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

module.exports = SpotifyDLError;

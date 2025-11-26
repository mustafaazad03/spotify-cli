const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class Auth {
    constructor() {
        this.configDir = path.join(os.homedir(), '.spotify-dl');
        this.keyFile = path.join(this.configDir, '.key');
        this.algorithm = 'aes-256-ctr';
    }

    async getOrCreateKey() {
        try {
            const key = await fs.readFile(this.keyFile);
            return key;
        } catch (error) {
            // Generate a new key
            const key = crypto.randomBytes(32);
            await fs.mkdir(this.configDir, { recursive: true });
            await fs.writeFile(this.keyFile, key, { mode: 0o600 }); // Read/write only by owner
            return key;
        }
    }

    async encrypt(text) {
        const key = await this.getOrCreateKey();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        const result = Buffer.concat([iv, cipher.update(text), cipher.final()]);
        return result.toString('hex');
    }

    async decrypt(content) {
        try {
            const key = await this.getOrCreateKey();
            const buffer = Buffer.from(content, 'hex');
            const iv = buffer.slice(0, 16);
            const text = buffer.slice(16);
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            const result = Buffer.concat([decipher.update(text), decipher.final()]);
            return result.toString();
        } catch (error) {
            throw new Error('Failed to decrypt credentials. You may need to re-configure.');
        }
    }
}

module.exports = new Auth();

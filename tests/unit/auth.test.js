const auth = require('../../src/utils/auth');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        access: jest.fn()
    }
}));

describe('Auth', () => {
    const mockKey = Buffer.from('12345678901234567890123456789012'); // 32 bytes

    beforeEach(() => {
        jest.clearAllMocks();
        fs.readFile.mockResolvedValue(mockKey);
    });

    test('should encrypt and decrypt correctly', async () => {
        const secret = 'super-secret-password';
        const encrypted = await auth.encrypt(secret);

        expect(encrypted).not.toBe(secret);
        expect(typeof encrypted).toBe('string');

        const decrypted = await auth.decrypt(encrypted);
        expect(decrypted).toBe(secret);
    });

    test('should generate new key if missing', async () => {
        fs.readFile.mockRejectedValue(new Error('ENOENT'));

        const secret = 'test';
        await auth.encrypt(secret);

        expect(fs.writeFile).toHaveBeenCalled();
        expect(fs.mkdir).toHaveBeenCalled();
    });
});

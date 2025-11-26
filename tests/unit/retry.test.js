const retryWithBackoff = require('../../src/utils/retry');

describe('retryWithBackoff', () => {
    test('should return result if function succeeds', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        const result = await retryWithBackoff(fn);
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure', async () => {
        const fn = jest.fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValue('success');

        const result = await retryWithBackoff(fn, { initialDelay: 10 });
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should fail after max retries', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fail'));

        await expect(retryWithBackoff(fn, { maxRetries: 2, initialDelay: 10 }))
            .rejects.toThrow('fail');

        expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should not retry if shouldRetry returns false', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fatal'));

        await expect(retryWithBackoff(fn, {
            shouldRetry: () => false
        })).rejects.toThrow('fatal');

        expect(fn).toHaveBeenCalledTimes(1);
    });
});

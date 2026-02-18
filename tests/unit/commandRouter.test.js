jest.mock('../../src/services/evolution', () => ({
    sendText: jest.fn().mockResolvedValue({})
}));

jest.mock('../../src/services/commands/admin', () => ({
    handleAdminCommand: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/services/commands/media', () => ({
    handleMediaCommand: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/services/commands/personal', () => ({
    handlePersonalCommand: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/services/commands/privacy', () => ({
    handlePrivacyCommand: jest.fn().mockResolvedValue(true)
}));

const evolution = require('../../src/services/evolution');
const { handleMediaCommand } = require('../../src/services/commands/media');
const { routeCommand } = require('../../src/services/commandRouter');

describe('commandRouter pack gating', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns false for non-command messages', async () => {
        const handled = await routeCommand({
            content: { text: 'hello' },
            remoteJid: '123@s.whatsapp.net'
        }, 'inst-1');

        expect(handled).toBe(false);
    });

    it('blocks command when pack is disabled', async () => {
        const handled = await routeCommand({
            content: { text: '!sticker' },
            remoteJid: '123@s.whatsapp.net'
        }, 'inst-1', {
            enabledPacks: { media: false }
        });

        expect(handled).toBe(true);
        expect(handleMediaCommand).not.toHaveBeenCalled();
        expect(evolution.sendText).toHaveBeenCalledTimes(1);
    });

    it('executes command when pack is enabled', async () => {
        const handled = await routeCommand({
            content: { text: '!sticker' },
            remoteJid: '123@s.whatsapp.net'
        }, 'inst-1', {
            enabledPacks: { media: true }
        });

        expect(handled).toBe(true);
        expect(handleMediaCommand).toHaveBeenCalledTimes(1);
        expect(evolution.sendText).not.toHaveBeenCalled();
    });
});

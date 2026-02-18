jest.mock('../../src/services/evolution', () => ({}));

const evolutionAdapter = require('../../src/adapters/evolutionAdapter');

describe('evolutionAdapter.normalize', () => {
    it('maps quoted image fields for reply-based commands', () => {
        const payload = {
            instance: 'test-instance',
            data: {
                key: {
                    id: 'msg-1',
                    remoteJid: '123456789@s.whatsapp.net',
                    fromMe: false
                },
                pushName: 'Tester',
                messageTimestamp: 1737000000,
                message: {
                    extendedTextMessage: {
                        text: '!sticker',
                        contextInfo: {
                            stanzaId: 'quoted-1',
                            participant: '987654321@s.whatsapp.net',
                            quotedMessage: {
                                imageMessage: {
                                    caption: 'an image',
                                    url: 'https://cdn.example.com/image.jpg'
                                }
                            }
                        }
                    }
                }
            }
        };

        const normalized = evolutionAdapter.normalize(payload);

        expect(normalized).toBeTruthy();
        expect(normalized.content.text).toBe('!sticker');
        expect(normalized.message_type).toBe('text');
        expect(normalized.media_url).toBeNull();
        expect(normalized.quoted).toBeTruthy();
        expect(normalized.quoted.type).toBe('image');
        expect(normalized.quoted.media_url).toBe('https://cdn.example.com/image.jpg');
        expect(normalized.quoted.key.id).toBe('quoted-1');
    });

    it('maps direct image media fields', () => {
        const payload = {
            instance: 'test-instance',
            data: {
                key: {
                    id: 'msg-2',
                    remoteJid: '123456789@s.whatsapp.net',
                    fromMe: false
                },
                message: {
                    imageMessage: {
                        caption: '!sticker',
                        url: 'https://cdn.example.com/direct.jpg'
                    }
                }
            }
        };

        const normalized = evolutionAdapter.normalize(payload);

        expect(normalized).toBeTruthy();
        expect(normalized.message_type).toBe('image');
        expect(normalized.media_url).toBe('https://cdn.example.com/direct.jpg');
        expect(normalized.content.text).toBe('!sticker');
    });
});

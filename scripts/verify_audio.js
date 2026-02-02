const axios = require('axios');

async function testAudioSend() {
    try {
        console.log('🚀 Sending Audio Request...');

        // Use the instance name found in the logs
        const instanceName = 'inst_1769948308147_4oaqd';
        const number = '972538245304'; // User's target number

        // A real WebM file from the web
        const webmUrl = 'https://tevicnjzxcbswsffcgoy.supabase.co/storage/v1/object/public/GreenBuilders/f7513201-3a7a-4ac4-9ce2-91ce89c1a552/1769965976327_uwjtrd.webm';

        const payload = {
            instanceName,
            number,
            audioUrl: webmUrl, // Mapping 'media' to 'audioUrl' for the endpoint
            ptt: true,
            mediatype: 'audio',
            mimetype: 'audio/webm',
            fileName: 'voice_message.webm'
        };

        console.log('Payload:', payload);

        const response = await axios.post('http://localhost:3000/api/messages/audio', payload, {
            headers: {
                'apikey': '54yWPufPt9y2Wp9QUap' // Value from .env
            }
        });

        console.log('✅ Response:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

testAudioSend();

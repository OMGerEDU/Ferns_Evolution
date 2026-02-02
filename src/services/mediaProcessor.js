const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const axios = require('axios');
const util = require('util');
const logger = require('../utils/logger');

const execPromise = util.promisify(exec);

class MediaProcessor {
    constructor() {
        this.tempDir = os.tmpdir();
    }

    /**
     * Download file from URL to local temp path
     */
    async downloadFile(url, extension = 'tmp') {
        try {
            const fileName = `download_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
            const filePath = path.join(this.tempDir, fileName);

            logger.debug(`Downloading file from ${url} to ${filePath}`);

            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filePath);

            return new Promise((resolve, reject) => {
                response.data.pipe(writer);
                let error = null;
                writer.on('error', err => {
                    error = err;
                    writer.close();
                    reject(err);
                });
                writer.on('close', () => {
                    if (!error) {
                        resolve(filePath);
                    }
                });
            });
        } catch (error) {
            logger.error('Failed to download file', { url, error: error.message });
            throw error;
        }
    }

    /**
     * Convert audio to MP3 using ffmpeg
     */
    async convertToMp3(inputPath) {
        try {
            // Check if input file exists
            if (!fs.existsSync(inputPath)) {
                throw new Error(`Input file not found: ${inputPath}`);
            }

            const outputFileName = `converted_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
            const outputPath = path.join(this.tempDir, outputFileName);

            // Command to convert: ffmpeg -i input -b:a 128k output.mp3 -y
            const command = `ffmpeg -i "${inputPath}" -b:a 128k "${outputPath}" -y`;

            logger.debug('Executing conversion', { command });

            await execPromise(command);

            // Check if output file exists
            if (!fs.existsSync(outputPath)) {
                throw new Error('Conversion failed: Output file not created');
            }

            return outputPath;
        } catch (error) {
            logger.error('Audio conversion failed', { inputPath, error: error.message });
            throw error;
        }
    }

    /**
     * Read file as Base64
     */
    async getFileAsBase64(filePath) {
        try {
            const fileBuffer = await fs.promises.readFile(filePath);
            return fileBuffer.toString('base64');
        } catch (error) {
            logger.error('Failed to read file as base64', { filePath, error: error.message });
            throw error;
        }
    }

    /**
     * Delete files
     */
    async cleanup(paths) {
        try {
            const files = Array.isArray(paths) ? paths : [paths];
            for (const file of files) {
                if (file && fs.existsSync(file)) {
                    await fs.promises.unlink(file);
                }
            }
        } catch (error) {
            logger.warn('Failed to cleanup temp files', { error: error.message });
        }
    }

    /**
     * Process Audio: Download -> Convert -> Base64 -> Cleanup
     */
    async processAudioForWhatsApp(url) {
        let inputPath = null;
        let outputPath = null;

        try {
            // 1. Download (assume WebM or whatever the URL gives)
            inputPath = await this.downloadFile(url, 'webm'); // Defaulting to webm extension for temp file

            // 2. Convert to MP3
            outputPath = await this.convertToMp3(inputPath);

            // 3. Get Base64
            const base64 = await this.getFileAsBase64(outputPath);

            return base64;
        } finally {
            // 4. Cleanup
            await this.cleanup([inputPath, outputPath]);
        }
    }
}

module.exports = new MediaProcessor();

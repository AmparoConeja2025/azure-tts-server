const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS para GitHub Pages
app.use(cors({
    origin: ['http://localhost:3000', 'https://amparoconeja2025.github.io', 'http://127.0.0.1:5500', '*'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// TUS CREDENCIALES DE AZURE (van a venir de variables de entorno)
const AZURE_TTS_KEY = process.env.AZURE_TTS_KEY;
const AZURE_TTS_REGION = process.env.AZURE_TTS_REGION || 'eastus';

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Server funcionando', time: new Date().toISOString() });
});

// Endpoint principal para TTS
app.post('/speech', async (req, res) => {
    const { word } = req.body;
    
    if (!word) {
        return res.status(400).json({ error: 'Se necesita una palabra' });
    }
    
    console.log(`🎤 Generando audio para: "${word}"`);
    
    try {
        const audioBuffer = await generateSpeech(word);
        const base64Audio = audioBuffer.toString('base64');
        
        res.json({ 
            audio: base64Audio,
            word: word,
            success: true 
        });
        
        console.log(`✅ Audio generado exitosamente para: "${word}"`);
    } catch (error) {
        console.error('❌ Error en TTS:', error.message);
        res.status(500).json({ 
            error: 'Error generando audio',
            details: error.message 
        });
    }
});

// Función para generar speech con Azure
function generateSpeech(text) {
    return new Promise((resolve, reject) => {
        const ssml = `
            <speak version="1.0" xml:lang="en-US">
                <voice name="en-US-AriaNeural">
                    <prosody rate="0.9" pitch="medium">
                        ${text}
                    </prosody>
                </voice>
            </speak>
        `;
        
        const options = {
            hostname: `${AZURE_TTS_REGION}.tts.speech.microsoft.com`,
            path: '/cognitiveservices/v1',
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_TTS_KEY,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
                'User-Agent': 'NodeJS-TTS-Client'
            }
        };
        
        const req = https.request(options, (response) => {
            const chunks = [];
            
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            response.on('end', () => {
                if (response.statusCode === 200) {
                    const audioBuffer = Buffer.concat(chunks);
                    resolve(audioBuffer);
                } else {
                    reject(new Error(`Error de Azure: ${response.statusCode}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(ssml);
        req.end();
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🔊 Listo para generar audio`);
});

module.exports = app;

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

// 🔑 CREDENCIALES DE ELEVENLABS
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// 🎭 SISTEMA DE VOCES MÚLTIPLES (1 male, 1 female)
const voices = [
    'Adam',   // 🎙️ Male - Deep, authoritative voice
    'Rachel'  // 👩 Female - Clear, professional voice
];
let currentVoiceIndex = 0;

// 🎪 Función para obtener la próxima voz en rotación
function getNextVoice() {
    const voice = voices[currentVoiceIndex];
    currentVoiceIndex = (currentVoiceIndex + 1) % voices.length;
    console.log(`🎭 Próxima voz seleccionada: ${voice}`);
    return voice;
}

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ElevenLabs TTS Server funcionando', 
        time: new Date().toISOString(),
        voices: voices.length 
    });
});

// Endpoint principal para TTS
app.post('/speech', async (req, res) => {
    const { word, voice } = req.body;
    
    if (!word) {
        return res.status(400).json({ error: 'Se necesita una palabra' });
    }
    
    // Usar voz específica del request o rotar automáticamente
    const selectedVoice = voice || getNextVoice();
    
    console.log(`🎤 Generando audio para: "${word}" con voz: ${selectedVoice}`);
    
    try {
        const audioBuffer = await generateSpeechElevenLabs(word, selectedVoice);
        const base64Audio = audioBuffer.toString('base64');
        
        res.json({ 
            audio: base64Audio,
            word: word,
            voice: selectedVoice,
            success: true 
        });
        
        console.log(`✅ Audio generado exitosamente para: "${word}" con ${selectedVoice}`);
    } catch (error) {
        console.error('❌ Error en ElevenLabs TTS:', error.message);
        res.status(500).json({ 
            error: 'Error generando audio',
            details: error.message 
        });
    }
});

// 🚀 FUNCIÓN PARA GENERAR SPEECH CON ELEVENLABS
function generateSpeechElevenLabs(text, voiceName) {
    return new Promise((resolve, reject) => {
        // Mapeo de nombres a voice_ids de ElevenLabs
        const voiceMap = {
            'Adam': 'pNInz6obpgDQGcFmaJgB',      // Adam - Male
            'Rachel': '21m00Tcm4TlvDq8ikWAM',    // Rachel - Female
            'Josh': 'TxGEqnHWrfWFTfGW9XjX',      // Josh - Male (backup)
            'Bella': 'EXAVITQu4vr4xnSDxMaL'      // Bella - Female (backup)
        };
        
        const voiceId = voiceMap[voiceName] || voiceMap['Adam']; // Default to Adam
        
        const postData = JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5,
                style: 0.0,
                use_speaker_boost: true
            }
        });
        
        const options = {
            hostname: 'api.elevenlabs.io',
            path: `/v1/text-to-speech/${voiceId}`,
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Length': Buffer.byteLength(postData)
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
                    reject(new Error(`Error de ElevenLabs: ${response.statusCode} - ${response.statusMessage}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

app.listen(PORT, () => {
    console.log(`🚀 ElevenLabs TTS Server corriendo en puerto ${PORT}`);
    console.log(`🔊 Listo para generar audio con ${voices.length} voces`);
    console.log(`🎭 Voces disponibles: ${voices.join(', ')}`);
});

module.exports = app;

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
// Use PORT from environment (required by Railway and other hosting platforms)
const serverPort = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow requests from frontend
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

app.use(cors({
  origin: function (origin, callback) {
    // In production when serving from same domain, allow same-origin requests
    if (process.env.NODE_ENV === 'production' && !origin) {
      return callback(null, true); // Same-origin request
    }
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // In production, be more strict
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Configure multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

const HEYGEN_API_KEY = process.env.VITE_HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com';

// Initialize Supabase client
// Try both VITE_ prefixed (for consistency) and non-prefixed versions
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase initialized with URL:', supabaseUrl.substring(0, 30) + '...');
} else {
  console.warn('Supabase not configured - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required');
  console.warn('supabaseUrl:', !!supabaseUrl, 'supabaseKey:', !!supabaseKey);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Test endpoint to verify routing works
app.post('/api/heygen/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'Test endpoint works!' });
});

// List avatars endpoint to help debug
app.get('/api/heygen/avatars', async (req, res) => {
  try {
    if (!HEYGEN_API_KEY) {
      return res.status(500).json({ error: 'HeyGen API key not configured' });
    }

    const response = await fetch(`${HEYGEN_API_URL}/v1/avatars`, {
      method: 'GET',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error listing avatars:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Upload audio to HeyGen and get asset_id
app.post('/api/heygen/upload-audio', upload.single('audio'), async (req, res) => {
  console.log('Upload audio endpoint hit');
  console.log('Request method:', req.method);
  console.log('Has file:', !!req.file);
  try {
    if (!HEYGEN_API_KEY) {
      console.log('HeyGen API key not configured');
      return res.status(500).json({ error: 'HeyGen API key not configured' });
    }

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    console.log('File received, size:', req.file.size);

    // Upload audio to get a public URL
    // Try Supabase Storage first, then fallback to other services
    console.log('Uploading audio to hosting service...');
    console.log('File size:', req.file.size, 'bytes');
    
    let audioUrl = null;
    let lastError = null;

    // Try Supabase Storage first (most reliable)
    if (supabase) {
      try {
        console.log('Trying Supabase Storage...');
        const fileName = `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
        console.log('Uploading to Supabase bucket "audio-files" with filename:', fileName);
        
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, req.file.buffer, {
            contentType: 'audio/mpeg',
            upsert: false,
          });

        if (error) {
          console.error('Supabase upload error:', JSON.stringify(error, null, 2));
          lastError = `Supabase: ${error.message || JSON.stringify(error)}`;
        } else {
          console.log('Supabase upload successful, data:', data);
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('audio-files')
            .getPublicUrl(fileName);
          
          console.log('Supabase public URL data:', urlData);
          
          if (urlData?.publicUrl) {
            audioUrl = urlData.publicUrl;
            console.log('✅ Audio uploaded to Supabase:', audioUrl);
            
            // Verify the URL is actually accessible (important for HeyGen)
            try {
              const verifyResponse = await fetch(audioUrl, { method: 'HEAD' });
              if (verifyResponse.ok) {
                console.log('✅ Verified Supabase URL is publicly accessible');
              } else {
                console.warn('⚠️ Supabase URL returned status:', verifyResponse.status, '- HeyGen might not be able to access it');
                console.warn('⚠️ Make sure the "audio-files" bucket is set to PUBLIC in Supabase Storage settings');
              }
            } catch (verifyError) {
              console.warn('⚠️ Could not verify Supabase URL accessibility:', verifyError.message);
              console.warn('⚠️ This might cause issues with HeyGen accessing the file');
            }
          } else {
            console.error('Supabase: Failed to get public URL, urlData:', urlData);
            lastError = 'Supabase: Failed to get public URL';
          }
        }
      } catch (error) {
        console.error('Supabase exception:', error);
        lastError = `Supabase: ${error.message}`;
      }
    } else {
      console.warn('⚠️ Supabase not initialized - skipping Supabase upload');
    }

    // If Supabase failed or not configured, try 0x0.st
    if (!audioUrl) {
      try {
        console.log('Trying 0x0.st...');
        const uploadFormData = new FormData();
        uploadFormData.append('file', req.file.buffer, {
          filename: 'audio.mp3',
          contentType: 'audio/mpeg',
        });
        
        const uploadResponse = await fetch('https://0x0.st', {
          method: 'POST',
          body: uploadFormData,
        });

        console.log('0x0.st response status:', uploadResponse.status);
        
        if (uploadResponse.ok) {
          const url = (await uploadResponse.text()).trim();
          if (url && url.startsWith('http')) {
            audioUrl = url;
            console.log('Audio uploaded to 0x0.st:', audioUrl);
          }
        } else {
          const errorText = await uploadResponse.text();
          console.error('0x0.st upload failed:', uploadResponse.status, errorText);
          lastError = `0x0.st: ${uploadResponse.status} ${errorText}`;
        }
      } catch (error) {
        console.error('0x0.st error:', error.message);
        lastError = `0x0.st: ${error.message}`;
      }
    }

    // If 0x0.st failed, try tmpfiles.org as fallback
    if (!audioUrl) {
      try {
        console.log('Trying tmpfiles.org as fallback...');
        const tmpFilesFormData = new FormData();
        tmpFilesFormData.append('file', req.file.buffer, {
          filename: 'audio.mp3',
          contentType: 'audio/mpeg',
        });

        const tmpFilesResponse = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: tmpFilesFormData,
        });

        console.log('tmpfiles.org response status:', tmpFilesResponse.status);
        
        if (tmpFilesResponse.ok) {
          const tmpFilesData = await tmpFilesResponse.json();
          console.log('tmpfiles.org response:', tmpFilesData);
          if (tmpFilesData.status === 'success' && tmpFilesData.data && tmpFilesData.data.url) {
            // tmpfiles.org returns download URL format: http://tmpfiles.org/dl/{id}
            // Try using the download URL directly with HTTPS
            const downloadUrl = tmpFilesData.data.url;
            console.log('tmpfiles.org download URL:', downloadUrl);
            
            // Convert to HTTPS and use the download URL directly
            // HeyGen should be able to access download URLs
            audioUrl = downloadUrl.replace('http://', 'https://');
            console.log('Audio uploaded to tmpfiles.org (using download URL with HTTPS):', audioUrl);
          }
        } else {
          const errorText = await tmpFilesResponse.text();
          console.error('tmpfiles.org upload failed:', tmpFilesResponse.status, errorText.substring(0, 200));
          lastError = lastError ? `${lastError}; tmpfiles.org: ${tmpFilesResponse.status}` : `tmpfiles.org: ${tmpFilesResponse.status}`;
        }
      } catch (error) {
        console.error('tmpfiles.org error:', error.message);
        lastError = lastError ? `${lastError}; tmpfiles.org: ${error.message}` : `tmpfiles.org: ${error.message}`;
      }
    }

    // If still no URL, try file.io as last resort
    if (!audioUrl) {
      try {
        console.log('Trying file.io as last resort...');
        const fileIoFormData = new FormData();
        fileIoFormData.append('file', req.file.buffer, {
          filename: 'audio.mp3',
          contentType: 'audio/mpeg',
        });

        const fileIoResponse = await fetch('https://file.io?expires=1d', {
          method: 'POST',
          body: fileIoFormData,
        });

        console.log('file.io response status:', fileIoResponse.status);
        
        if (fileIoResponse.ok) {
          const responseText = await fileIoResponse.text();
          console.log('file.io response (first 200 chars):', responseText.substring(0, 200));
          
          // Check if response is JSON
          if (responseText.trim().startsWith('{')) {
            try {
              const fileIoData = JSON.parse(responseText);
              if (fileIoData.success && fileIoData.link) {
                audioUrl = fileIoData.link;
                console.log('Audio uploaded to file.io:', audioUrl);
              } else {
                console.error('file.io response missing link:', fileIoData);
                lastError = lastError ? `${lastError}; file.io: Invalid response` : 'file.io: Invalid response';
              }
            } catch (parseError) {
              console.error('file.io JSON parse error:', parseError.message);
              lastError = lastError ? `${lastError}; file.io: JSON parse error` : 'file.io: JSON parse error';
            }
          } else {
            console.error('file.io returned HTML instead of JSON');
            lastError = lastError ? `${lastError}; file.io: HTML response` : 'file.io: HTML response';
          }
        } else {
          const errorText = await fileIoResponse.text();
          console.error('file.io upload failed:', fileIoResponse.status, errorText.substring(0, 200));
          lastError = lastError ? `${lastError}; file.io: ${fileIoResponse.status}` : `file.io: ${fileIoResponse.status}`;
        }
      } catch (error) {
        console.error('file.io error:', error.message);
        lastError = lastError ? `${lastError}; file.io: ${error.message}` : `file.io: ${error.message}`;
      }
    }

    if (!audioUrl) {
      throw new Error(`Failed to upload audio to any hosting service. Errors: ${lastError || 'Unknown error'}`);
    }
    
    // Return the public URL
    return res.json({ audio_url: audioUrl });
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generate video using HeyGen
app.post('/api/heygen/generate-video', async (req, res) => {
  try {
    if (!HEYGEN_API_KEY) {
      return res.status(500).json({ error: 'HeyGen API key not configured' });
    }

    const { audio_url, avatar_id, avatar_group_id, video_title } = req.body;

    if (!audio_url || (!avatar_id && !avatar_group_id)) {
      return res.status(400).json({ error: 'Missing required parameters (audio_url and avatar_id or avatar_group_id)' });
    }

    console.log('Generating video with:', { video_title, avatar_id, avatar_group_id, audio_url: audio_url.substring(0, 50) + '...' });

    // HeyGen v2 API requires video_inputs array format
    // In v2, avatar_id should be directly on character, not nested under avatar object!
    if (!avatar_id || !avatar_id.trim()) {
      return res.status(400).json({ error: 'avatar_id is required and cannot be empty' });
    }
    
    // Structure for v2: character: { type: 'avatar', avatar_id: '...' }
    const characterConfig = {
      type: 'avatar',
      avatar_id: avatar_id.trim(), // Directly on character, not nested!
    };
    
    // According to HeyGen docs: https://docs.heygen.com/docs/create-video
    // Free API Plan export resolution limit is 720p
    // Set resolution using dimension object with width and height
    const requestBody = {
      video_title: video_title || 'Generated Video',
      video_inputs: [
        {
          character: characterConfig,
          voice: {
            type: 'audio',
            audio_url: audio_url,
          },
        },
      ],
      // Set 720p resolution for free plan compatibility
      dimension: {
        width: 1280,
        height: 720
      },
    };

    console.log('HeyGen request body:', JSON.stringify(requestBody, null, 2));

    // Verify the audio URL is accessible before sending to HeyGen
    console.log('Verifying audio URL is accessible:', audio_url);
    try {
      const audioCheckController = new AbortController();
      const audioCheckTimeout = setTimeout(() => audioCheckController.abort(), 10000);
      const audioCheckResponse = await fetch(audio_url, { 
        method: 'HEAD', 
        signal: audioCheckController.signal 
      });
      clearTimeout(audioCheckTimeout);
      if (!audioCheckResponse.ok) {
        console.warn('⚠️ Audio URL might not be accessible. Status:', audioCheckResponse.status);
      } else {
        console.log('✅ Audio URL is accessible (Status:', audioCheckResponse.status + ')');
        const contentType = audioCheckResponse.headers.get('content-type');
        console.log('Audio content-type:', contentType);
      }
    } catch (audioCheckError) {
      if (audioCheckError.name === 'AbortError') {
        console.warn('⚠️ Audio URL check timed out - URL might not be accessible');
      } else {
        console.warn('⚠️ Could not verify audio URL accessibility:', audioCheckError.message);
      }
      // Continue anyway - HeyGen might still be able to access it
    }

    // Use v2 API (error message format suggests v2)
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response;
    try {
      response = await fetch(`${HEYGEN_API_URL}/v2/video/generate`, {
        method: 'POST',
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('HeyGen request timed out after 30 seconds');
        return res.status(504).json({ 
          error: 'Request to HeyGen timed out. The audio URL might not be accessible, or HeyGen is experiencing issues.',
          suggestion: 'Try again in a moment, or verify the audio file is publicly accessible.'
        });
      }
      throw fetchError;
    }

    console.log('HeyGen video generation response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen video generation failed:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      // Provide more helpful error messages
      let userMessage = 'Failed to generate video';
      if (response.status === 502) {
        userMessage = 'HeyGen server error (502). This usually means: 1) HeyGen cannot access the audio file URL, 2) HeyGen API is temporarily down, or 3) The audio file format is incompatible. Please try again or check if the audio URL is publicly accessible.';
      } else if (response.status === 400) {
        userMessage = 'Invalid request to HeyGen. Please check your avatar ID and audio URL.';
      } else if (response.status === 401 || response.status === 403) {
        userMessage = 'HeyGen API authentication failed. Please check your API key.';
      }
      
      return res.status(response.status).json({ 
        error: userMessage,
        heyGenError: errorData,
        audioUrl: audio_url,
        statusCode: response.status
      });
    }

    const data = await response.json();
    console.log('HeyGen API response:', JSON.stringify(data, null, 2));
    
    // HeyGen v2 API response structure might be different
    const videoId = data.data?.video_id || data.video_id || data.data?.id;
    const status = data.data?.status || data.status || 'processing';
    
    console.log('Extracted video_id:', videoId, 'status:', status);
    
    res.json({
      video_id: videoId,
      status: status,
    });
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check video status
app.get('/api/heygen/video-status/:videoId', async (req, res) => {
  try {
    if (!HEYGEN_API_KEY) {
      return res.status(500).json({ error: 'HeyGen API key not configured' });
    }

    const { videoId } = req.params;

    const response = await fetch(
      `${HEYGEN_API_URL}/v1/video_status.get?video_id=${videoId}`,
      {
        method: 'GET',
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: errorData.message || 'Failed to check video status' 
      });
    }

    const data = await response.json();
    console.log('HeyGen video status response:', JSON.stringify(data, null, 2));
    
    // HeyGen v1 API response structure
    // Response has: { code: 100, data: { status: "...", video_url: "..." }, message: "Success" }
    const status = data.data?.status || data.status;
    const videoUrl = data.data?.video_url || data.data?.url || data.video_url || data.url || null;
    
    console.log('Extracted status:', status, 'video_url:', videoUrl);
    
    // Also check for error in the response
    if (data.data?.error) {
      console.error('HeyGen video error:', data.data.error);
    }
    
    res.json({
      status: status,
      video_url: videoUrl || null,
    });
  } catch (error) {
    console.error('Error checking video status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files from the React app in production
// Check if dist folder exists (means we're in production build)
const distPath = join(__dirname, 'dist');
const isProduction = process.env.NODE_ENV === 'production' || existsSync(distPath);

if (isProduction) {
  // Serve static files from the dist directory
  app.use(express.static(distPath));
  
  // Handle React routing - return all requests to React app
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(serverPort, () => {
  console.log(`Server running on port ${serverPort}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Local URL: http://localhost:${serverPort}`);
  }
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/heygen/upload-audio');
  console.log('  POST /api/heygen/generate-video');
  console.log('  GET  /api/heygen/video-status/:videoId');
  if (process.env.NODE_ENV === 'production') {
    console.log('  Serving React app from /dist');
  }
});


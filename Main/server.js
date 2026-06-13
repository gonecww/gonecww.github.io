const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PROCESSED_DIR = path.join(__dirname, 'processed');
const LOGS_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'usage.log');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// In development, avoid aggressive caching so updated frontend files are served immediately.
app.use((req, res, next) => {
  if (req.url.endsWith('.html') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/wasm', express.static(path.join(__dirname, 'wasm')));

// Only serve the main web app and diagnostics pages.
// The extension popup UI is no longer exposed here.

// Simple CORS middleware to allow local testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const supportedMimeTypes = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm'
];
const supportedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function appendLog(entry) {
  const line = `${JSON.stringify(entry)}\n`;
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error('Unable to write usage log:', err);
  });
}

function readLogs(limit = 200) {
  if (!fs.existsSync(LOG_FILE)) return [];
  const content = fs.readFileSync(LOG_FILE, 'utf8').trim();
  if (!content) return [];
  return content
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(-limit);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 262144000 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!supportedExtensions.includes(extension)) {
      return cb(new Error('Supported video formats are MP4, MOV, AVI, MKV, and WebM.'));
    }
    if (!supportedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid video MIME type. Please upload a valid video file.'));
    }
    cb(null, true);
  }
}).single('videoFile');

const progressStore = {};

function sanitizeDownloadName(name) {
  const safeName = String(name || 'download');
  const baseName = safeName.replace(/\\/g, '/').split('/').pop();
  return baseName.replace(/[^a-zA-Z0-9-._]/g, '_');
}

function buildFfmpegOptions(options) {
  const codec = options.codec === 'h265' ? 'libx265' : 'libx264';
  const qualityMode = String(options.qualityMode || 'balanced').toLowerCase();
  const qualityDefaults = {
    high: { bitrate: 22000, audioBitrate: 256, crf: 18 },
    balanced: { bitrate: 12000, audioBitrate: 192, crf: 23 },
    low: { bitrate: 7000, audioBitrate: 128, crf: 26 }
  };
  const modeDefaults = qualityDefaults[qualityMode] || qualityDefaults.balanced;

  const bitrate = Math.min(Math.max(Number(options.bitrate) || modeDefaults.bitrate, 1000), 60000);
  const audioBitrate = Math.min(Math.max(Number(options.audioQuality) || modeDefaults.audioBitrate, 64), 384);
  const crf = Math.min(Math.max(Number(options.crf) || modeDefaults.crf, 14), 32);
  const framerate = options.frameRate === 'preserve' ? null : Math.min(Math.max(Number(options.frameRate) || 0, 1), 240);

  let resolution = String(options.resolution || 'original').trim();
  let targetHeight = null;
  if (resolution === 'original') {
    targetHeight = null;
  } else {
    const match = /^\s*(\d+)\s*[xX]\s*(\d+)\s*$/.exec(resolution);
    if (match) {
      targetHeight = Number(match[2]);
    } else {
      targetHeight = Number(resolution) || 720;
    }
  }

  return {
    codec,
    targetHeight,
    framerate,
    bitrate,
    audioBitrate,
    crf,
    normalizeAudio: options.normalizeAudio === 'true' || options.normalizeAudio === 'on' || options.normalizeAudio === '1'
  };
}

function parseTimemark(timemark) {
  const parts = timemark.split(':').map(Number);
  if (parts.length !== 3) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

app.post('/api/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No video file was uploaded.' });
    }

    const taskId = uuidv4();
    const settings = buildFfmpegOptions(req.body);
    const userName = (req.body.userName || 'anonymous').trim() || 'anonymous';
    const clientIp = getClientIp(req);
    const inputPath = req.file.path;
    const outputFilename = `${taskId}-${Date.now()}.mp4`;
    const outputPath = path.join(PROCESSED_DIR, outputFilename);

    progressStore[taskId] = {
      status: 'queued',
      percent: 0,
      message: 'Preparing your TikTok-optimized render.',
      downloadUrl: null,
      inputName: req.file.originalname,
      outputName: outputFilename,
      userName,
      startedAt: Date.now()
    };

    appendLog({
      timestamp: new Date().toISOString(),
      event: 'upload_started',
      taskId,
      userName,
      clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
      originalFile: req.file.originalname,
      fileSize: req.file.size,
      settings: {
        resolution: req.body.resolution,
        frameRate: req.body.frameRate,
        codec: req.body.codec,
        bitrate: req.body.bitrate,
        audioQuality: req.body.audioQuality,
        normalizeAudio: req.body.normalizeAudio,
        crf: req.body.crf
      }
    });

    ffmpeg.ffprobe(inputPath, (probeErr, metadata) => {
        if (probeErr) {
          progressStore[taskId].status = 'failed';
          progressStore[taskId].message = 'Could not read video metadata.';
          if (fs.existsSync(inputPath)) fs.unlink(inputPath, () => {});
          return res.status(500).json({ error: 'Could not read video metadata.' });
        }

        const duration = metadata.format.duration || 0;
        // build a small metadata summary to return to clients
        const stream = (metadata.streams && metadata.streams[0]) || {};
        const metaSummary = {
          width: stream.width || null,
          height: stream.height || null,
          codec: stream.codec_name || null,
          duration: metadata.format.duration || null,
          size: metadata.format.size || null,
          bit_rate: metadata.format.bit_rate || null
        };
        progressStore[taskId].metadata = metaSummary;

        const command = ffmpeg(inputPath)
        .videoCodec(settings.codec)
        .audioCodec('aac')
        .audioBitrate(`${settings.audioBitrate}k`)
        .outputOptions([
          '-preset slow',
          `-crf ${settings.crf}`,
          `-maxrate ${settings.bitrate}k`,
          `-bufsize ${settings.bitrate * 2}k`,
          '-profile:v high',
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          '-threads 0'
        ])
        .outputOptions(settings.codec === 'libx265' ? ['-x265-params log-level=error'] : []);

      // Apply a height-capped scale filter while preserving aspect ratio.
      // Use: scale=-2:min(targetHeight,ih) to cap height and avoid upscaling.
      if (settings.targetHeight) {
        const scaleFilter = `scale=-2:min(${settings.targetHeight},ih)`;
        command.videoFilters(scaleFilter);
      }

      if (settings.normalizeAudio) {
        command.audioFilters('loudnorm=I=-14:TP=-2:LRA=11');
      }

      if (settings.framerate) {
        command.fps(settings.framerate);
        command.outputOptions(['-vsync', '1']);
      } else {
        command.outputOptions(['-vsync', '0']);
      }

      command.output(outputPath)
        .on('start', () => {
          progressStore[taskId].status = 'processing';
          progressStore[taskId].message = 'Encoding video for TikTok delivery.';
        })
        .on('progress', (progress) => {
          const currentTime = parseTimemark(progress.timemark || '0:0:0');
          let percent = progress.percent;
          if (!percent && duration > 0) {
            percent = Math.min(100, Math.round((currentTime / duration) * 100));
          }
          progressStore[taskId].percent = percent || 0;
          progressStore[taskId].message = `Processing video: ${Math.round(progressStore[taskId].percent)}% complete.`;
        })
        .on('error', (ffErr) => {
          progressStore[taskId].status = 'failed';
          progressStore[taskId].message = 'Video conversion failed. Please try a different file or settings.';
          console.error('FFmpeg conversion error:', ffErr.message);
        })
        .on('end', () => {
          progressStore[taskId].status = 'completed';
          progressStore[taskId].percent = 100;
          progressStore[taskId].message = 'Your TikTok-ready video is ready to download.';
          progressStore[taskId].downloadUrl = `/download/${sanitizeDownloadName(outputFilename)}`;
          setTimeout(() => {
            if (fs.existsSync(inputPath)) fs.unlink(inputPath, () => {});
          }, 10000);
        });

      // respond to the client now that metadata is available
      res.json({ taskId, status: 'processing', metadata: metaSummary });

      command.run();
    });
    
  });
});

app.get('/api/progress/:taskId', (req, res) => {
  const task = progressStore[req.params.taskId];
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  res.json(task);
});

app.get('/api/status', (req, res) => {
  const activeTasks = Object.values(progressStore).filter((task) => task.status === 'processing' || task.status === 'queued').length;
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    port: PORT,
    activeTasks,
    version: '1.0.0'
  });
});

app.get('/api/logs', (req, res) => {
  const logs = readLogs(500);
  res.json({ logs });
});

// Return only feedback submissions (parsed from usage log)
app.get('/api/feedbacks', (req, res) => {
  try {
    const logs = readLogs(1000);
    const feedbacks = logs.filter((l) => l && l.event === 'feedback_submitted');
    res.json({ feedbacks });
  } catch (err) {
    res.status(500).json({ error: 'Unable to read feedbacks.' });
  }
});

app.post('/api/feedback', (req, res) => {
  const taskId = req.body.taskId || req.body.taskId;
  const feedback = (req.body.feedback || '').trim();
  const userName = (req.body.userName || 'anonymous').trim() || 'anonymous';

  if (!taskId || !feedback) {
    return res.status(400).json({ error: 'Feedback and task ID are required.' });
  }

  appendLog({
    timestamp: new Date().toISOString(),
    event: 'feedback_submitted',
    taskId,
    userName,
    clientIp: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    feedback
  });

  res.json({ success: true, message: 'Thank you — your feedback has been received.' });
});

app.get('/logs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logs.html'));
});

app.get('/download/:filename', (req, res) => {
  const fileName = sanitizeDownloadName(req.params.filename);
  const absolutePath = path.join(PROCESSED_DIR, fileName);
  if (!absolutePath.startsWith(PROCESSED_DIR) || !fs.existsSync(absolutePath)) {
    return res.status(404).send('Download not found.');
  }
  res.download(absolutePath, `tiktok-optimized-${fileName}`, (err) => {
    if (err) {
      console.error('Download error:', err.message);
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function cleanupTempFolders() {
  const now = Date.now();
  const expiration = 1000 * 60 * 60 * 3; // 3 hours
  [UPLOAD_DIR, PROCESSED_DIR].forEach((dir) => {
    fs.readdir(dir, (readErr, files) => {
      if (readErr) return;
      files.forEach((file) => {
        const fullPath = path.join(dir, file);
        fs.stat(fullPath, (statErr, stats) => {
          if (statErr) return;
          if (now - stats.mtimeMs > expiration) {
            fs.unlink(fullPath, () => {});
          }
        });
      });
    });
  });
}

setInterval(cleanupTempFolders, 1000 * 60 * 60);

if (require.main === module) {
    app.get('/', (req, res) => {
        res.send('Server is working perfectly!');
    });

    app.listen(PORT, () => {
        console.log(`TikTok optimizer server listening on port ${PORT}`);
    });
}
module.exports = {
  app,
  sanitizeDownloadName,
  buildFfmpegOptions
};

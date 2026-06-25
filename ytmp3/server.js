const express = require('express');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Health check for Render
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Get video info (title, thumbnail)
app.post('/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  exec(`yt-dlp --dump-json --no-playlist "${url}"`, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: 'Could not fetch video info. Check the URL and try again.' });
    try {
      const info = JSON.parse(stdout);
      res.json({ title: info.title, thumbnail: info.thumbnail, duration: info.duration_string });
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse video info.' });
    }
  });
});

// Convert and stream MP3
app.get('/convert', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const tmpFile = path.join(os.tmpdir(), `ytmp3_${Date.now()}.mp3`);

  const args = [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--no-playlist',
    '-o', tmpFile.replace('.mp3', '.%(ext)s'),
    '--ffmpeg-location', '/usr/bin/ffmpeg',
    url
  ];

  console.log(`[convert] ${url}`);

  const dl = spawn('yt-dlp', args);

  let stderr = '';
  dl.stderr.on('data', d => { stderr += d.toString(); });

  dl.on('close', (code) => {
    if (code !== 0) {
      console.error('[yt-dlp error]', stderr);
      return res.status(500).json({ error: 'Download failed. The video may be private, age-restricted, or unavailable.' });
    }

    // yt-dlp may name the file slightly differently
    const finalFile = tmpFile.replace('.mp3', '.mp3');
    if (!fs.existsSync(finalFile)) {
      return res.status(500).json({ error: 'Conversion failed — output file not found.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="audio.mp3"`);

    const stream = fs.createReadStream(finalFile);
    stream.pipe(res);
    stream.on('end', () => {
      fs.unlink(finalFile, () => {});
    });
    stream.on('error', () => {
      res.status(500).json({ error: 'Failed to stream file.' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

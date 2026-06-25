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

  const cmd = `yt-dlp --dump-json --no-playlist --no-check-certificates -q "${url}"`;

  exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[info error]', stderr);
      return res.status(500).json({ error: 'Could not fetch video info. The video may be private, age-restricted, or unavailable.' });
    }
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

  const tmpBase = path.join(os.tmpdir(), `ytmp3_${Date.now()}`);
  const tmpTemplate = tmpBase + '.%(ext)s';

  const args = [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--no-playlist',
    '--no-check-certificates',
    '-o', tmpTemplate,
    url
  ];

  console.log(`[convert] ${url}`);

  const dl = spawn('yt-dlp', args);

  let stderr = '';
  dl.stderr.on('data', d => { stderr += d.toString(); console.log('[yt-dlp]', d.toString()); });
  dl.stdout.on('data', d => { console.log('[yt-dlp out]', d.toString()); });

  dl.on('close', (code) => {
    if (code !== 0) {
      console.error('[yt-dlp error]', stderr);
      return res.status(500).json({ error: 'Download failed. The video may be private, age-restricted, or unavailable.' });
    }

    // Find the output file
    const mp3File = tmpBase + '.mp3';
    const webmFile = tmpBase + '.webm';
    const m4aFile = tmpBase + '.m4a';

    let finalFile = null;
    if (fs.existsSync(mp3File)) finalFile = mp3File;
    else if (fs.existsSync(webmFile)) finalFile = webmFile;
    else if (fs.existsSync(m4aFile)) finalFile = m4aFile;
    else {
      const tmpDir = os.tmpdir();
      const stamp = path.basename(tmpBase).split('_')[1];
      const files = fs.readdirSync(tmpDir).filter(f => f.includes(stamp));
      if (files.length > 0) finalFile = path.join(tmpDir, files[0]);
    }

    if (!finalFile) {
      return res.status(500).json({ error: 'Conversion failed — output file not found.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="audio.mp3"`);

    const stream = fs.createReadStream(finalFile);
    stream.pipe(res);
    stream.on('end', () => { fs.unlink(finalFile, () => {}); });
    stream.on('error', (e) => {
      console.error('[stream error]', e);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to stream file.' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

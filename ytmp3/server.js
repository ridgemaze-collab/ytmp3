const express = require('express');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Path to cookies file
const COOKIES = path.join(__dirname, 'cookies.txt');
const cookiesExist = fs.existsSync(COOKIES);

console.log(cookiesExist ? '[cookies] cookies.txt found' : '[cookies] No cookies.txt — YouTube may block requests');

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const cookiesArg = cookiesExist ? `--cookies "${COOKIES}"` : '';
  const cmd = `yt-dlp --dump-json --no-playlist --no-check-certificates ${cookiesArg} -q "${url}"`;

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

app.get('/convert', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const tmpBase = path.join(os.tmpdir(), `ytmp3_${Date.now()}`);
  const tmpTemplate = tmpBase + '.%(ext)s';

  const args = ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '--no-playlist', '--no-check-certificates'];
  if (cookiesExist) args.push('--cookies', COOKIES);
  args.push('-o', tmpTemplate, url);

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

    let finalFile = null;
    for (const ext of ['.mp3', '.webm', '.m4a', '.opus']) {
      if (fs.existsSync(tmpBase + ext)) { finalFile = tmpBase + ext; break; }
    }
    if (!finalFile) {
      const stamp = path.basename(tmpBase).split('_')[1];
      const files = fs.readdirSync(os.tmpdir()).filter(f => f.includes(stamp));
      if (files.length > 0) finalFile = path.join(os.tmpdir(), files[0]);
    }

    if (!finalFile) return res.status(500).json({ error: 'Conversion failed — output file not found.' });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="audio.mp3"`);
    const stream = fs.createReadStream(finalFile);
    stream.pipe(res);
    stream.on('end', () => { fs.unlink(finalFile, () => {}); });
    stream.on('error', () => { if (!res.headersSent) res.status(500).json({ error: 'Failed to stream file.' }); });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

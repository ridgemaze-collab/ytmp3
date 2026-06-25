# YouTube to MP3 Converter

Powered by yt-dlp. Converts YouTube (and many other sites) to MP3.

---

## How to deploy on Render (free, no credit card)

### Step 1 — Create a GitHub account
Go to https://github.com and sign up for free.

### Step 2 — Create a new repository
1. Click the **+** icon (top right) → **New repository**
2. Name it `ytmp3` (or anything you like)
3. Set it to **Public**
4. Click **Create repository**

### Step 3 — Upload the files
1. On your new repo page click **"uploading an existing file"**
2. Upload ALL of these files (drag them all in at once):
   - `server.js`
   - `package.json`
   - `render.yaml`
   - The `public/` folder containing `index.html`
3. Click **Commit changes**

### Step 4 — Create a Render account
Go to https://render.com and sign up using your GitHub account.

### Step 5 — Deploy on Render
1. On the Render dashboard click **New** → **Web Service**
2. Connect your GitHub account if prompted
3. Select your `ytmp3` repository
4. Fill in these settings:
   - **Name:** ytmp3 (or anything)
   - **Runtime:** Node
   - **Build Command:** `npm install && pip install -U yt-dlp`
   - **Start Command:** `node server.js`
5. Click **Create Web Service**

### Step 6 — Wait for deploy
Render will build and deploy your app (takes 2-3 minutes).
Once done you'll see a green **Live** status and a URL like:
`https://ytmp3-xxxx.onrender.com`

That's your converter — open it in any browser!

---

## Notes
- Render's free tier spins down after 15 mins of inactivity. First load after that takes ~30 seconds — just wait.
- If YouTube updates and breaks things, go to Render dashboard → click **Manual Deploy** → **Deploy latest commit**. That updates yt-dlp and fixes it.
- Works with YouTube, SoundCloud, TikTok, Instagram, Twitter/X, Vimeo, and more.

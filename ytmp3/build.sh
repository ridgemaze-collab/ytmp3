#!/usr/bin/env bash
# Install Node dependencies
npm install

# Install yt-dlp
pip install -U yt-dlp

# Install ffmpeg
apt-get install -y ffmpeg || true

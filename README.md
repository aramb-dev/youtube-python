# YouTube Video Downloader API + Frontend

A Bun-powered YouTube downloader built on YouTube.js with a simple API and a bold frontend.

## Requirements

- Bun installed (https://bun.sh)

## Setup

```bash
bun install
```

## Run

```bash
bun run dev
```

Server starts on `http://localhost:3000`.

## API

- `GET /api/health`
- `GET /api/info?url=VIDEO_URL`
- `GET /api/download?url=VIDEO_URL&itag=ITAG`
- `GET /api/download?url=VIDEO_URL&merge=1&container=mp4`

## Notes

- The downloader streams directly; no files are stored on disk.
- Use the `itag` from `/api/info` to select a specific format.
- Merged downloads use mediabunny to mux the best video-only + audio-only formats.
- Default merged container is `mp4`; use `container=webm` if you want WebM.

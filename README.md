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

### Health Check
- `GET /api/health` - Returns `{ ok: true }`

### Video Info
- `GET /api/info?url=VIDEO_URL`
  
Returns video metadata and available formats. Each format includes:
- `downloadable: true/false` - Whether the format can be downloaded
- `type: 'video+audio' | 'video' | 'audio'` - Format type

### Download
- `GET /api/download?url=VIDEO_URL` - Download combined video+audio (360p MP4)
- `GET /api/download?url=VIDEO_URL&itag=18` - Download specific format by itag

## Limitations

⚠️ **Video-only and audio-only downloads are not supported** due to YouTube's bot protection (BotGuard/po_token). Only combined video+audio formats (like itag 18) can be downloaded.

For separate video and audio streams, consider using [yt-dlp](https://github.com/yt-dlp/yt-dlp) which has more sophisticated anti-bot circumvention.

## Notes

- The downloader streams directly; no files are stored on disk.
- Use the `itag` from `/api/info` to select a specific format.
- Only formats marked as `downloadable: true` in `/api/info` will work with `/api/download`.

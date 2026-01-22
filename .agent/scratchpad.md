# Scratchpad - YouTube Video Downloader API

## Context

Project state:
- Implementation exists in `src/server.js`
- Frontend exists in `public/`
- API endpoints: `/api/health`, `/api/info`, `/api/download`
- Uses youtubei.js library
- Bun runtime

## Current Implementation Notes

**Working features:**
- Health check endpoint
- Video info retrieval (title, author, duration, formats)
- Download endpoint with itag selection
- Combined video+audio downloads (itag 18, 360p MP4)
- Frontend interface

**Known limitations:**
- Video-only and audio-only formats blocked by YouTube bot protection
- Only combined (muxed) streams work reliably

## Pending Events

- `spec.start` - Starting YouTube video downloader API specification

## Task Markers

(No tasks yet)

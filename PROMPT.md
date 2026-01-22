# YouTube Video Downloader API Implementation

Implement a high-quality YouTube video downloader using Next.js, Bun, youtubei.js, and Mediabunny.

## Objective
Build a web-based tool that fetches YouTube video metadata and allows users to download videos in various qualities, including 1080p+ by merging DASH streams server-side.

## Key Requirements
- **Metadata Retrieval**: Use `youtubei.js` to fetch video title, thumbnail, and stream formats.
- **High-Quality Downloads**: Implement server-side muxing of separate video/audio DASH streams using `Mediabunny`.
- **Streaming Response**: Stream final files directly to the user's browser.
- **Frontend**: A clean Next.js (App Router) interface with loading states.
- **Environment**: Optimized for Bun runtime and Railway deployment.

## Acceptance Criteria
- Users can enter a YouTube URL and see video details.
- Download buttons work for both combined (e.g., 720p) and DASH (e.g., 1080p) formats.
- DASH downloads successfully merge video and audio into a playable MP4.
- Temporary files in `/tmp` are cleaned up after every download.
- No external binary dependencies (like FFmpeg) are required for core functionality.

## Reference
Refer to the detailed design and implementation plan for step-by-step guidance:
- Design: `.sop/planning/design/detailed-design.md`
- Implementation Plan: `.sop/planning/implementation/plan.md`
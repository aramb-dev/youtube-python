# Media Merging Research: Mediabunny vs FFmpeg

## Primary Choice: Mediabunny
Based on the latest research, we will use **Mediabunny** for server-side muxing instead of the FFmpeg CLI.

### Why Mediabunny?
- **Zero Binary Dependencies**: Unlike FFmpeg, Mediabunny is a pure TypeScript/JavaScript library. This allows us to run on Railway (or even Cloudflare if we handle storage correctly) without a custom Dockerfile to install binaries.
- **Server-Side Transmuxing**: Mediabunny supports muxing (combining video and audio tracks) on the server in Node.js/Bun environments without re-encoding.
- **Performance**: It uses a streaming I/O approach which is memory efficient.

### Implementation Strategy with Mediabunny
1.  **Fetch Streams**: Use `youtubei.js` to get the DASH stream URLs for video and audio.
2.  **Muxing**: Use Mediabunny's `MP4Muxer` (or appropriate muxer) to combine the tracks.
3.  **Output**: Stream the resulting buffer/stream directly to the Next.js API response.

## Fallback: FFmpeg (CLI)
FFmpeg remains a fallback if complex re-encoding is required, but it is currently not the primary path.
- **Note**: Using FFmpeg would require a custom Dockerfile on Railway to install the `ffmpeg` package.

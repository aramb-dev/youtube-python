# API Testing

## Health check

```bash
curl http://localhost:3000/api/health
```

## Fetch info

```bash
curl "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## Download

```bash
curl -L "http://localhost:3000/api/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&itag=22" --output video.mp4
```

## Download (merged best video + audio)

```bash
curl -L "http://localhost:3000/api/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&merge=1&container=mp4" --output video.mp4
```

## Notes

- Use the `itag` returned from the info endpoint for accurate downloads.
- If a download fails, retry with a different format or remove the `itag` to let the server pick a best match.
- For merged output, use `video_itag` and `audio_itag` if you want to lock specific streams.
- Use `container=webm` if you prefer WebM output.
- If MP4 audio/video streams are unavailable, the server falls back to the best combined MP4 stream.

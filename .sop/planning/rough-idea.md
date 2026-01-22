# Task: YouTube Video Downloader API

Create a working YouTube video downloader API with a web frontend that allows users to:

1. Search and retrieve video information (title, duration, available formats)
2. Download YouTube videos in various formats
3. Use a simple, clean web interface for downloads

## Requirements

- Use Bun as the runtime environment
- Implement API endpoints for video info and downloads
- Support multiple video formats where possible
- Stream downloads (no disk storage)
- Include a frontend interface
- Handle errors gracefully

## Constraints

- Work within YouTube's limitations (bot protection for adaptive streams)
- Support only downloadable formats (combined video+audio streams work best)
- Keep the implementation simple and maintainable

# API Testing Commands

## Configuration

```bash
# Base URL (change if deployed elsewhere)
BASE_URL="https://yt.ezaalah.com"

# API Key (from environment or default)
API_KEY="X-eGKp0yitrTNE4LXilSo_9zsDbOcwcqgj7qLTkhVT0"

# Replace with an actual YouTube video URL
VIDEO_URL="https://www.youtube.com/watch?v=7vkK9xy5Y6o"
```

---

## 1. Check Connection (No Auth Required)

```bash
curl -i "${BASE_URL}/check-connection"
```

---

## 2. Get Video Info

```bash
curl -i -X POST "${BASE_URL}/video_info" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"url\": \"${VIDEO_URL}\"}"
```

---

## 3. Get Available Resolutions

```bash
curl -i -X POST "${BASE_URL}/available_resolutions" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"url\": \"${VIDEO_URL}\"}"
```

---

## 4. Download Video by Resolution

Replace `1080p` with a resolution from the available resolutions response.

> **Note:** Resolutions above 720p use ffmpeg to merge video+audio. Do NOT use `-i` when saving files.

```bash
curl -X POST "${BASE_URL}/download/1080p" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"url\": \"${VIDEO_URL}\"}" \
  -o video_1080p.mp4
```

To see headers only (check for errors first):

```bash
curl -i -X POST "${BASE_URL}/download/1080p" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"url\": \"${VIDEO_URL}\"}"
```

---

## 5. Download Best Quality Video

Downloads the highest available resolution (uses ffmpeg for 1080p+).

```bash
curl -X POST "${BASE_URL}/download/best" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"url\": \"${VIDEO_URL}\"}" \
  -o video_best.mp4
```

---

## 6. Download Thumbnail

```bash
curl -i -X POST "${BASE_URL}/download_thumbnail" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"url\": \"${VIDEO_URL}\"}" \
  -o thumbnail.jpg
```

---

## 7. API Help/Documentation

```bash
curl -i "${BASE_URL}/help" \
  -H "X-API-Key: ${API_KEY}"
```

---

## 8. Debug Sentry (Triggers Test Error)

```bash
curl -i "${BASE_URL}/debug-sentry" \
  -H "X-API-Key: ${API_KEY}"
```

---

## Notes

| Placeholder | Description |
|-------------|-------------|
| `${BASE_URL}` | API base URL (`http://localhost:5000` for local dev) |
| `${API_KEY}` | Your API key (default provided above) |
| `${VIDEO_URL}` | Any valid YouTube URL (`youtube.com/watch?v=...` or `youtu.be/...`) |
| `720p` | Replace with actual resolution from `/available_resolutions` |

### Curl Flags Used

| Flag | Purpose |
|------|---------|
| `-i` | Show response headers + body |
| `-I` | Show headers only (HEAD request) |
| `-X POST` | Use POST method |
| `-H` | Add header |
| `-d` | Request body (JSON) |
| `-o file` | Save output to file |

# YouTube Video Downloader and Info API (Vercel Compatible)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Description
The YouTube Video Downloader and Info API is a Flask-based Python project that allows you to stream YouTube videos and retrieve video information using Pytubefix. This version is optimized for serverless environments like **Vercel**, using streaming to avoid file system restrictions.

### New Features by aramb-dev:
- **Streaming Downloads:** Videos are streamed directly to the client, making it compatible with Vercel and other serverless platforms.
- **Thumbnail Support:** Retrieve thumbnail URLs and download thumbnail images directly.
- **SSL Fix:** Pre-configured to handle SSL certificate verification issues common on macOS.

## Features
- Stream YouTube videos in various resolutions.
- Retrieve comprehensive information about YouTube videos (including thumbnails).
- Download thumbnail images directly.
- JSON API endpoints for easy integration.
- Vercel-ready configuration.

## Libraries and Technologies Used
- Python 3.x
- Flask for building the API.
- Pytubefix for interacting with YouTube content.
- Vercel for serverless deployment.

## Usage
1. Clone this repository: `git clone https://github.com/aramb-dev/youtube-python.git`
2. Install the required libraries: `pip install -r requirements.txt`
3. Run the Flask application: `python main.py`
4. Access the API endpoints using HTTP requests.

## API Endpoints

### Download Video by Resolution (Streaming)
- **Endpoint:** `/download/<resolution>`
- **HTTP Method:** POST
- **Request Body:** JSON
    ```json
    {
        "url": "https://www.youtube.com/watch?v=VIDEO_ID"
    }
    ```

### Get Video Info
- **Endpoint:** `/video_info`
- **HTTP Method:** POST
- **Request Body:** JSON
    ```json
    {
        "url": "https://www.youtube.com/watch?v=VIDEO_ID"
    }
    ```
- **Response includes:** `title`, `author`, `length`, `views`, `description`, `publish_date`, and `thumbnail_url`.

### Get Available Resolutions
- **Endpoint:** `/available_resolutions`
- **HTTP Method:** POST
- **Request Body:** JSON
    ```json
    {
        "url": "https://www.youtube.com/watch?v=VIDEO_ID"
    }
    ```

### Download Thumbnail
- **Endpoint:** `/download_thumbnail`
- **HTTP Method:** POST
- **Request Body:** JSON
    ```json
    {
        "url": "https://www.youtube.com/watch?v=VIDEO_ID"
    }
    ```
- **Returns:** Image file (`image/jpeg`).

## Deployment on Vercel
This project is configured for Vercel. Simply connect your GitHub repository to Vercel, and it will automatically deploy using the provided `vercel.json` and `requirements.txt`.

## Attribution
This project is a fork and enhancement of the original work by [Zarar Ashraf](https://github.com/zararashraf/youtube-video-downloader-api).

**Enhanced and Maintained by:** [aramb-dev](https://github.com/aramb-dev)

## License
This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). You are free to use, modify, and distribute the code while providing appropriate attribution.
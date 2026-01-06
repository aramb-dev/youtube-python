from flask import Flask, request, jsonify, send_file, Response, stream_with_context
from pytubefix import YouTube
import re
import ssl
import os
import sentry_sdk
import threading
from io import BytesIO
from urllib.request import urlopen
from urllib.parse import quote
from functools import wraps

# Initialize Sentry
sentry_sdk.init(
    dsn="https://703c70222d9f64e1b656b744a9267205@o480658.ingest.us.sentry.io/4510664628109312",
    # Add data like request headers and IP for users,
    # see https://docs.sentry.io/platforms/python/data-management/data-collected/ for more info
    send_default_pii=True,
    # Enable sending logs to Sentry
    enable_logs=True,
)

ssl._create_default_https_context = ssl._create_unverified_context

app = Flask(__name__)

# Rate limiting: Max 6 simultaneous downloads
download_semaphore = threading.BoundedSemaphore(value=6)

# Security: API Key required for functional endpoints
API_KEY = os.environ.get('API_KEY', 'X-eGKp0yitrTNE4LXilSo_9zsDbOcwcqgj7qLTkhVT0')

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.headers.get('X-API-Key') == API_KEY:
            return f(*args, **kwargs)
        else:
            return jsonify({"error": "Unauthorized: Invalid or missing API Key."}), 401
    return decorated_function

def get_stream_object(url, resolution):
    try:
        yt = YouTube(url, client='ANDROID')
        stream = yt.streams.filter(progressive=True, file_extension='mp4', resolution=resolution).first()
        if stream:
            return stream, None
        else:
            return None, "Video with the specified resolution not found."
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return None, f"({type(e).__name__}): {str(e)}"

def get_best_progressive_stream(url):
    try:
        yt = YouTube(url, client='ANDROID')
        # Filter for progressive MP4s and order by resolution descending
        stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first()
        if stream:
            return stream, None
        else:
            return None, "No progressive MP4 streams found for this video."
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return None, f"({type(e).__name__}): {str(e)}"

def get_thumbnail_data(url):
    try:
        yt = YouTube(url, client='ANDROID')
        thumbnail_url = yt.thumbnail_url
        
        # Fetch the image data
        with urlopen(thumbnail_url) as response:
            image_data = response.read()
            
        return BytesIO(image_data), None
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return None, f"({type(e).__name__}): {str(e)}"
def get_video_info(url):
    try:
        yt = YouTube(url, client='ANDROID')
        video_info = {
            "title": yt.title,
            "author": yt.author,
            "length": yt.length,
            "views": yt.views,
            "description": yt.description,
            "publish_date": yt.publish_date,
            "thumbnail_url": yt.thumbnail_url
        }
        return video_info, None
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return None, f"({type(e).__name__}): {str(e)}"

def is_valid_youtube_url(url):
    # Supports youtube.com/watch?v=... and youtu.be/...
    pattern = r"^(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[\w-]+([?&]\S*)?$"
    return re.match(pattern, url) is not None

@app.route('/download/<resolution>', methods=['POST'])
@require_api_key
def download_by_resolution(resolution):
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "Missing 'url' parameter in the request body."}), 400

    if not is_valid_youtube_url(url):
        return jsonify({"error": "Invalid YouTube URL."}), 400
    
    # Attempt to acquire a download slot
    acquired = download_semaphore.acquire(blocking=True, timeout=5)
    if not acquired:
        return jsonify({"error": "Server busy: Too many concurrent downloads. Please try again in a minute."}), 503

    # Ensure release happens even if get_stream_object or urlopen fails
    semaphore_released = False
    try:
        stream, error_message = get_stream_object(url, resolution)
        
        if stream:
            try:
                # Get the direct URL to the video file
                video_url = stream.url
                title = stream.title
                
                # Stream the content from the direct URL to the client
                req = urlopen(video_url)
                
                # Encode title for Content-Disposition header to avoid Unicode errors
                safe_title = quote(title)
                
                def generate():
                    try:
                        while True:
                            chunk = req.read(4096)
                            if not chunk:
                                break
                            yield chunk
                    finally:
                        download_semaphore.release()

                semaphore_released = True # Generator will handle release
                return Response(
                    stream_with_context(generate()),
                    headers={
                        "Content-Disposition": f"attachment; filename*=UTF-8''{safe_title}.mp4",
                        "Content-Type": "video/mp4",
                    }
                )
            except Exception as e:
                sentry_sdk.capture_exception(e)
                return jsonify({"error": f"Error streaming video: {str(e)}"}), 500
        else:
            return jsonify({"error": error_message}), 500
    finally:
        if not semaphore_released:
            download_semaphore.release()

@app.route('/download/best', methods=['POST'])
@require_api_key
def download_best_quality():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "Missing 'url' parameter in the request body."}), 400

    if not is_valid_youtube_url(url):
        return jsonify({"error": "Invalid YouTube URL."}), 400
    
    # Attempt to acquire a download slot
    acquired = download_semaphore.acquire(blocking=True, timeout=5)
    if not acquired:
        return jsonify({"error": "Server busy: Too many concurrent downloads. Please try again in a minute."}), 503

    semaphore_released = False
    try:
        stream, error_message = get_best_progressive_stream(url)
        
        if stream:
            try:
                # Get the direct URL to the video file
                video_url = stream.url
                title = stream.title
                resolution = stream.resolution
                
                # Stream the content from the direct URL to the client
                req = urlopen(video_url)
                
                # Encode title for Content-Disposition header to avoid Unicode errors
                safe_title = quote(title)
                
                def generate():
                    try:
                        while True:
                            chunk = req.read(4096)
                            if not chunk:
                                break
                            yield chunk
                    finally:
                        download_semaphore.release()

                semaphore_released = True # Generator will handle release
                return Response(
                    stream_with_context(generate()),
                    headers={
                        "Content-Disposition": f"attachment; filename*=UTF-8''{safe_title}_{resolution}.mp4",
                        "Content-Type": "video/mp4",
                    }
                )
            except Exception as e:
                sentry_sdk.capture_exception(e)
                return jsonify({"error": f"Error streaming video: {str(e)}"}), 500
        else:
            return jsonify({"error": error_message}), 500
    finally:
        if not semaphore_released:
            download_semaphore.release()

@app.route('/video_info', methods=['POST'])
@require_api_key
def video_info():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "Missing 'url' parameter in the request body."}), 400

    if not is_valid_youtube_url(url):
        return jsonify({"error": "Invalid YouTube URL."}), 400
    
    video_info, error_message = get_video_info(url)
    
    if video_info:
        return jsonify(video_info), 200
    else:
        return jsonify({"error": error_message}), 500


@app.route('/available_resolutions', methods=['POST'])
@require_api_key
def available_resolutions():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "Missing 'url' parameter in the request body."}), 400

    if not is_valid_youtube_url(url):
        return jsonify({"error": "Invalid YouTube URL."}), 400
    
    try:
        yt = YouTube(url, client='ANDROID')
        progressive_resolutions = list(set([
            stream.resolution 
            for stream in yt.streams.filter(progressive=True, file_extension='mp4')
            if stream.resolution
        ]))
        all_resolutions = list(set([
            stream.resolution 
            for stream in yt.streams.filter(file_extension='mp4')
            if stream.resolution
        ]))
        return jsonify({
            "progressive": sorted(progressive_resolutions),
            "all": sorted(all_resolutions)
        }), 200
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return jsonify({"error": f"({type(e).__name__}): {str(e)}"}), 500

@app.route('/download_thumbnail', methods=['POST'])
@require_api_key
def download_thumbnail():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "Missing 'url' parameter in the request body."}), 400

    if not is_valid_youtube_url(url):
        return jsonify({"error": "Invalid YouTube URL."}), 400
    
    image_io, error_message = get_thumbnail_data(url)
    
    if image_io:
        return send_file(
            image_io,
            mimetype='image/jpeg',
            as_attachment=True,
            download_name='thumbnail.jpg'
        )
    else:
        return jsonify({"error": error_message}), 500

@app.route('/check-connection', methods=['GET'])
def check_connection():
    return "200 OK - API is running!", 200

@app.route('/help', methods=['GET'])
@require_api_key
def api_help():
    help_data = {
        "api_name": "YouTube Video Downloader API",
        "authentication": {
            "header": "X-API-Key",
            "required": True,
            "type": "Static API Key"
        },
        "endpoints": [
            {
                "path": "/check-connection",
                "method": "GET",
                "description": "Public heartbeat endpoint to verify the API is live.",
                "auth_required": False,
                "response_schema": {
                    "type": "string",
                    "example": "200 OK - API is running!"
                }
            },
            {
                "path": "/video_info",
                "method": "POST",
                "description": "Retrieves comprehensive metadata about a YouTube video.",
                "auth_required": True,
                "request_schema": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "A valid YouTube URL (youtube.com or youtu.be)"}
                    },
                    "required": ["url"]
                },
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "author": {"type": "string"},
                        "length": {"type": "integer", "description": "Duration in seconds"},
                        "views": {"type": "integer"},
                        "description": {"type": "string"},
                        "publish_date": {"type": "string", "format": "date-time"},
                        "thumbnail_url": {"type": "string"}
                    }
                }
            },
            {
                "path": "/available_resolutions",
                "method": "POST",
                "description": "Lists all available video resolutions for the provided URL.",
                "auth_required": True,
                "request_schema": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string"}
                    },
                    "required": ["url"]
                },
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "progressive": {"type": "array", "items": {"type": "string"}, "description": "MP4 with audio (e.g., 360p, 720p)"},
                        "all": {"type": "array", "items": {"type": "string"}, "description": "All available quality levels"}
                    }
                }
            },
            {
                "path": "/download/<resolution>",
                "method": "POST",
                "description": "Streams the video file directly. Limited to 6 concurrent downloads.",
                "auth_required": True,
                "parameters": {
                    "resolution": {"type": "string", "example": "720p"}
                },
                "request_schema": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string"}
                    },
                    "required": ["url"]
                },
                "response_schema": {
                    "type": "binary",
                    "content_type": "video/mp4"
                }
            },
            {
                "path": "/download_thumbnail",
                "method": "POST",
                "description": "Downloads the high-quality thumbnail image.",
                "auth_required": True,
                "request_schema": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string"}
                    },
                    "required": ["url"]
                },
                "response_schema": {
                    "type": "binary",
                    "content_type": "image/jpeg"
                }
            },
            {
                "path": "/debug-sentry",
                "method": "GET",
                "description": "Triggers a ZeroDivisionError for Sentry verification.",
                "auth_required": True
            },
            {
                "path": "/help",
                "method": "GET",
                "description": "Returns this schema documentation.",
                "auth_required": True
            }
        ],
        "error_codes": {
            "400": "Bad Request - Missing or invalid parameters.",
            "401": "Unauthorized - Invalid or missing API Key.",
            "503": "Service Unavailable - Concurrent download limit reached (max 6).",
            "500": "Internal Server Error - Unexpected failure or YouTube parsing error."
        }
    }
    return jsonify(help_data), 200

@app.route('/debug-sentry')
@require_api_key
def trigger_error():
    division_by_zero = 1 / 0
    return "Error Triggered", 500
    
if __name__ == '__main__':
    app.run(debug=True)

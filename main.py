from flask import Flask, request, jsonify, send_file, Response, stream_with_context
from pytubefix import YouTube
import re
import ssl
import os
import sentry_sdk
from io import BytesIO
from urllib.request import urlopen
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
    except Exception as e:
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
    
    stream, error_message = get_stream_object(url, resolution)
    
    if stream:
        try:
            # Get the direct URL to the video file
            video_url = stream.url
            title = stream.title
            
            # Stream the content from the direct URL to the client
            req = urlopen(video_url)
            
            def generate():
                while True:
                    chunk = req.read(4096)
                    if not chunk:
                        break
                    yield chunk

            return Response(
                stream_with_context(generate()),
                headers={
                    "Content-Disposition": f"attachment; filename={title}.mp4",
                    "Content-Type": "video/mp4",
                }
            )
        except Exception as e:
             return jsonify({"error": f"Error streaming video: {str(e)}"}), 500
    else:
        return jsonify({"error": error_message}), 500

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
            "required": True
        },
        "endpoints": [
            {
                "path": "/check-connection",
                "method": "GET",
                "description": "Public heartbeat endpoint to verify the API is live.",
                "auth_required": False
            },
            {
                "path": "/video_info",
                "method": "POST",
                "description": "Retrieves comprehensive metadata about a YouTube video.",
                "request_body": {
                    "url": "string (Valid YouTube URL)"
                },
                "auth_required": True
            },
            {
                "path": "/available_resolutions",
                "method": "POST",
                "description": "Lists all available video resolutions for the provided URL.",
                "request_body": {
                    "url": "string (Valid YouTube URL)"
                },
                "auth_required": True
            },
            {
                "path": "/download/<resolution>",
                "method": "POST",
                "description": "Streams the video file directly as an attachment. Note: Vercel may timeout for long videos.",
                "parameters": {
                    "resolution": "e.g., 360p, 720p, 1080p"
                },
                "request_body": {
                    "url": "string (Valid YouTube URL)"
                },
                "auth_required": True
            },
            {
                "path": "/download_thumbnail",
                "method": "POST",
                "description": "Downloads the high-quality thumbnail image for the video.",
                "request_body": {
                    "url": "string (Valid YouTube URL)"
                },
                "auth_required": True
            },
            {
                "path": "/help",
                "method": "GET",
                "description": "Returns this documentation.",
                "auth_required": True
            },
            {
                "path": "/debug-sentry",
                "method": "GET",
                "description": "Triggers a ZeroDivisionError to verify Sentry integration.",
                "auth_required": True
            }
        ]
    }
    return jsonify(help_data), 200

@app.route('/debug-sentry')
@require_api_key
def trigger_error():
    division_by_zero = 1 / 0
    return "Error Triggered", 500
    
if __name__ == '__main__':
    app.run(debug=True)

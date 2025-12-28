from flask import Flask, request, jsonify, send_file, Response, stream_with_context
from pytubefix import YouTube
import re
import ssl
from io import BytesIO
from urllib.request import urlopen

ssl._create_default_https_context = ssl._create_unverified_context

app = Flask(__name__)

def get_stream_object(url, resolution):
    try:
        yt = YouTube(url)
        stream = yt.streams.filter(progressive=True, file_extension='mp4', resolution=resolution).first()
        if stream:
            return stream, None
        else:
            return None, "Video with the specified resolution not found."
    except Exception as e:
        return None, str(e)

def get_thumbnail_data(url):
    try:
        yt = YouTube(url)
        thumbnail_url = yt.thumbnail_url
        
        # Fetch the image data
        with urlopen(thumbnail_url) as response:
            image_data = response.read()
            
        return BytesIO(image_data), None
    except Exception as e:
        return None, str(e)

def get_video_info(url):
    try:
        yt = YouTube(url)
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
        return None, str(e)

def is_valid_youtube_url(url):
    pattern = r"^(https?://)?(www\.)?youtube\.com/watch\?v=[\w-]+(&\S*)?$"
    return re.match(pattern, url) is not None

@app.route('/download/<resolution>', methods=['POST'])
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
def available_resolutions():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "Missing 'url' parameter in the request body."}), 400

    if not is_valid_youtube_url(url):
        return jsonify({"error": "Invalid YouTube URL."}), 400
    
    try:
        yt = YouTube(url)
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
        return jsonify({"error": str(e)}), 500

@app.route('/download_thumbnail', methods=['POST'])
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
    
if __name__ == '__main__':
    app.run(debug=True)

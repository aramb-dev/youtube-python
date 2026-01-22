import { Innertube } from 'youtubei.js';

const PORT = Number(process.env.PORT || 3000);
const publicDirUrl = new URL('../public/', import.meta.url);

// Create Innertube with a JavaScript interpreter for URL deciphering
const yt = await Innertube.create({
  retrieve_player: true,
  generate_session_locally: true
});

// Provide the JS interpreter for deciphering signatures
yt.session.player.evaluate = (code) => {
  return eval(code);
};

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data, null, 2), { ...init, headers });
}

function badRequest(message) {
  return json({ error: message }, { status: 400 });
}

function extractVideoId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  
  // Plain video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    
    // youtu.be/VIDEO_ID
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.split('/').filter(Boolean)[0] || null;
    }
    
    // ?v=VIDEO_ID
    if (url.searchParams.has('v')) {
      return url.searchParams.get('v');
    }
    
    // /shorts/VIDEO_ID or /embed/VIDEO_ID
    const match = url.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]+)/);
    if (match) return match[2];
  } catch {
    // Fallback regex
    const fallback = input.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]+)/);
    return fallback ? fallback[1] : null;
  }
  
  return null;
}

function sanitizeFilename(name) {
  return String(name || 'video')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'video';
}

function getExtension(mimeType) {
  if (!mimeType) return 'mp4';
  const mime = mimeType.split(';')[0].trim();
  const map = {
    'video/mp4': 'mp4',
    'audio/mp4': 'm4a',
    'video/webm': 'webm',
    'audio/webm': 'webm'
  };
  return map[mime] || 'mp4';
}

function hasVideo(format) {
  return !!(format.quality_label || format.qualityLabel || format.width);
}

function hasAudio(format) {
  return !!(format.audio_quality || format.audioQuality || format.audio_bitrate);
}

function normalizeFormat(format) {
  return {
    itag: format.itag,
    mimeType: format.mime_type || format.mimeType,
    qualityLabel: format.quality_label || format.qualityLabel || format.quality,
    bitrate: format.bitrate,
    hasVideo: hasVideo(format),
    hasAudio: hasAudio(format),
    contentLength: format.content_length || format.contentLength
  };
}

function getFormats(info) {
  const streaming = info.streaming_data || {};
  const all = [...(streaming.formats || []), ...(streaming.adaptive_formats || [])];
  
  const seen = new Set();
  return all
    .filter(f => f.itag && !seen.has(f.itag) && seen.add(f.itag))
    .map(normalizeFormat);
}

async function handleInfo(url) {
  const input = url.searchParams.get('url');
  if (!input) return badRequest('Missing url parameter');
  
  const videoId = extractVideoId(input);
  if (!videoId) return badRequest('Invalid video URL or ID');
  
  const info = await yt.getInfo(videoId);
  const basic = info.basic_info || {};
  
  return json({
    videoId,
    title: basic.title || 'Unknown',
    author: basic.author || basic.channel?.name,
    duration: basic.duration,
    viewCount: basic.view_count,
    thumbnails: basic.thumbnail,
    formats: getFormats(info)
  });
}

async function handleDownload(url) {
  const input = url.searchParams.get('url');
  if (!input) return badRequest('Missing url parameter');
  
  const videoId = extractVideoId(input);
  if (!videoId) return badRequest('Invalid video URL or ID');
  
  const itag = url.searchParams.get('itag');
  const quality = url.searchParams.get('quality') || 'best';
  
  const info = await yt.getInfo(videoId);
  const title = info.basic_info?.title || 'video';
  
  // Get all available formats for headers
  const streaming = info.streaming_data || {};
  const allFormats = [...(streaming.formats || []), ...(streaming.adaptive_formats || [])];
  
  let downloadOptions;
  let chosen;
  
  if (itag) {
    // Download specific format by itag
    chosen = allFormats.find(f => f.itag === Number(itag));
    if (!chosen) {
      return badRequest(`Format with itag ${itag} not found`);
    }
    // Use format options for specific itag
    downloadOptions = {
      type: hasVideo(chosen) && hasAudio(chosen) ? 'video+audio' : (hasVideo(chosen) ? 'video' : 'audio'),
      quality: chosen.quality_label || quality,
      format: 'mp4'
    };
  } else {
    // Default: best quality with video+audio
    downloadOptions = {
      type: 'video+audio',
      quality: quality,
      format: 'mp4'
    };
    // Find the format that will be chosen for headers
    chosen = allFormats
      .filter(f => hasVideo(f) && hasAudio(f))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  }
  
  const stream = await info.download(downloadOptions);
  
  const mimeType = chosen?.mime_type || 'video/mp4';
  const ext = getExtension(mimeType);
  const filename = sanitizeFilename(title);
  
  const headers = new Headers({
    'content-type': mimeType,
    'content-disposition': `attachment; filename="${filename}.${ext}"`,
    'cache-control': 'no-store'
  });
  
  if (chosen?.content_length) {
    headers.set('content-length', String(chosen.content_length));
  }
  
  return new Response(stream, { headers });
}

async function handleRequest(req) {
  const url = new URL(req.url);
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'content-type'
      }
    });
  }
  
  // API routes
  if (url.pathname === '/api/health') {
    return json({ ok: true });
  }
  
  if (url.pathname === '/api/info') {
    try {
      const res = await handleInfo(url);
      res.headers.set('access-control-allow-origin', '*');
      return res;
    } catch (e) {
      return json({ error: e.message }, { status: 500 });
    }
  }
  
  if (url.pathname === '/api/download') {
    try {
      const res = await handleDownload(url);
      res.headers.set('access-control-allow-origin', '*');
      return res;
    } catch (e) {
      return json({ error: e.message }, { status: 500 });
    }
  }
  
  // Static files
  const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const fileUrl = new URL(`.${filePath}`, publicDirUrl);
  
  if (!fileUrl.pathname.startsWith(publicDirUrl.pathname)) {
    return new Response('Not found', { status: 404 });
  }
  
  const file = Bun.file(fileUrl);
  if (await file.exists()) {
    return new Response(file);
  }
  
  return new Response('Not found', { status: 404 });
}

Bun.serve({
  port: PORT,
  fetch: handleRequest
});

console.log(`🎬 YouTube Downloader running at http://localhost:${PORT}`);

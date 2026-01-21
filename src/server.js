import { Innertube } from 'youtubei.js';
import {
  ALL_FORMATS,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  MkvOutputFormat,
  Mp4OutputFormat,
  Output,
  ReadableStreamSource,
  StreamTarget,
  WebMOutputFormat
} from 'mediabunny';

const PORT = Number(process.env.PORT || 3000);
const publicDirUrl = new URL('../public/', import.meta.url);
const ytPromise = Innertube.create({
  enable_session_cache: true,
  retrieve_player: true,
  retrieve_innertube_config: true
});

const infoCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  }
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers
  });
}

function badRequest(message, details) {
  return json({ error: message, details }, { status: 400 });
}

function notFound() {
  return new Response('Not found', { status: 404 });
}

function getCachedInfo(videoId) {
  const entry = infoCache.get(videoId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    infoCache.delete(videoId);
    return null;
  }
  return entry.info;
}

function setCachedInfo(videoId, info) {
  infoCache.set(videoId, { info, timestamp: Date.now() });
}

function extractVideoId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed.includes('http')) {
    if (trimmed.includes('youtu.')) {
      return extractVideoId(`https://${trimmed}`);
    }
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }
    if (url.searchParams.has('v')) {
      return url.searchParams.get('v');
    }
    const pathMatch = url.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[2];
  } catch (error) {
    return null;
  }

  const fallbackMatch = input.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]+)/);
  return fallbackMatch ? fallbackMatch[1] : null;
}

function sanitizeFilename(name) {
  return String(name || 'video')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || 'video';
}

function asciiFallbackFilename(name, ext) {
  const safe = sanitizeFilename(name)
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, 140) || 'video';
  return safe.endsWith(`.${ext}`) ? safe : `${safe}.${ext}`;
}

function contentDisposition(filename, ext) {
  const fallback = asciiFallbackFilename(filename, ext);
  const encoded = encodeURIComponent(`${sanitizeFilename(filename)}.${ext}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function extensionFromMime(mimeType) {
  if (!mimeType) return 'mp4';
  const clean = mimeType.split(';')[0].trim();
  const mapping = {
    'video/mp4': 'mp4',
    'audio/mp4': 'm4a',
    'video/webm': 'webm',
    'audio/webm': 'webm',
    'audio/opus': 'opus'
  };
  return mapping[clean] || clean.split('/')[1] || 'mp4';
}

function parseBoolean(value) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function formatMime(format) {
  return (format?.mime_type || format?.mimeType || '').split(';')[0].trim().toLowerCase();
}

function chooseOutputFormat(videoFormat, audioFormat, container) {
  if (container === 'mp4') {
    return new Mp4OutputFormat({ fastStart: 'fragmented' });
  }

  if (container === 'webm') {
    return new WebMOutputFormat();
  }

  const videoMime = formatMime(videoFormat);
  const audioMime = formatMime(audioFormat);

  if (videoMime.includes('mp4') && audioMime.includes('mp4')) {
    return new Mp4OutputFormat({ fastStart: 'fragmented' });
  }

  if (videoMime.includes('webm') && audioMime.includes('webm')) {
    return new WebMOutputFormat();
  }

  return new MkvOutputFormat();
}

function filterByContainer(formats, container) {
  if (!container || container === 'auto') return formats;
  const normalized = container.toLowerCase();
  if (normalized === 'mp4') {
    return formats.filter((format) => formatMime(format).includes('mp4'));
  }
  if (normalized === 'webm') {
    return formats.filter((format) => formatMime(format).includes('webm'));
  }
  return formats;
}

function getRawFormats(info) {
  const streamingData = info.streaming_data || info.streamingData || {};
  return [
    ...(streamingData.formats || []),
    ...(streamingData.adaptive_formats || [])
  ];
}

function hasAudio(format) {
  return Boolean(
    format.has_audio ??
    format.hasAudio ??
    format.audio_quality ??
    format.audioQuality ??
    format.audio_bitrate ??
    format.audioBitrate
  );
}

function hasVideo(format) {
  return Boolean(
    format.has_video ??
    format.hasVideo ??
    format.quality_label ??
    format.qualityLabel ??
    format.width
  );
}

function normalizeFormat(format) {
  return {
    itag: format.itag,
    mimeType: format.mime_type || format.mimeType,
    qualityLabel: format.quality_label || format.qualityLabel || format.quality,
    bitrate: format.bitrate,
    fps: format.fps,
    audioQuality: format.audio_quality || format.audioQuality,
    audioBitrate: format.audio_bitrate || format.audioBitrate,
    contentLength: format.content_length || format.contentLength,
    hasAudio: hasAudio(format),
    hasVideo: hasVideo(format)
  };
}

function listFormats(info) {
  const rawFormats = getRawFormats(info);
  const seen = new Set();
  const formats = [];

  for (const format of rawFormats) {
    const view = normalizeFormat(format);
    if (!view.itag || seen.has(view.itag)) continue;
    seen.add(view.itag);
    formats.push(view);
  }

  return formats;
}

function selectFormat(rawFormats, { itag, quality, type }) {
  let candidates = rawFormats.slice();

  if (type === 'audio') {
    candidates = candidates.filter((format) => hasAudio(format) && !hasVideo(format));
  } else if (type === 'video') {
    candidates = candidates.filter((format) => hasVideo(format) && !hasAudio(format));
  } else if (type === 'video+audio') {
    candidates = candidates.filter((format) => hasVideo(format) && hasAudio(format));
  }

  if (itag) {
    const numericItag = Number(itag);
    return candidates.find((format) => format.itag === numericItag);
  }

  if (quality) {
    const desired = quality.toLowerCase();
    const match = candidates.find((format) => {
      const label = format.quality_label || format.qualityLabel || format.quality;
      return label && label.toLowerCase() === desired;
    });
    if (match) return match;
  }

  return candidates.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
}

function selectBestVideoFormat(rawFormats, { quality, itag, container }) {
  const filtered = filterByContainer(rawFormats, container);

  if (itag) {
    const match = filtered.find((format) => format.itag === Number(itag));
    if (match && hasVideo(match) && !hasAudio(match)) return match;
  }

  let candidates = filtered.filter((format) => hasVideo(format) && !hasAudio(format));

  if (quality) {
    const desired = quality.toLowerCase();
    const match = candidates.find((format) => {
      const label = format.quality_label || format.qualityLabel || format.quality;
      return label && label.toLowerCase() === desired;
    });
    if (match) return match;
  }

  candidates = candidates.sort((a, b) => {
    const aHeight = a.height || a.width || 0;
    const bHeight = b.height || b.width || 0;
    if (aHeight !== bHeight) return bHeight - aHeight;
    return (b.bitrate || 0) - (a.bitrate || 0);
  });

  return candidates[0];
}

function selectBestAudioFormat(rawFormats, { itag, container }) {
  const filtered = filterByContainer(rawFormats, container);

  if (itag) {
    const match = filtered.find((format) => format.itag === Number(itag));
    if (match && hasAudio(match) && !hasVideo(match)) return match;
  }

  const candidates = filtered
    .filter((format) => hasAudio(format) && !hasVideo(format))
    .sort((a, b) => {
      const aRate = a.audio_bitrate || a.audioBitrate || a.bitrate || 0;
      const bRate = b.audio_bitrate || b.audioBitrate || b.bitrate || 0;
      return bRate - aRate;
    });

  return candidates[0];
}

function toWebStream(stream) {
  if (!stream) return stream;
  if (typeof stream.getReader === 'function') return stream;
  if (typeof stream.pipe === 'function') {
    return new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (error) => controller.error(error));
      },
      cancel() {
        if (stream.destroy) stream.destroy();
      }
    });
  }
  return stream;
}

function resolvePublicFile(pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const fileUrl = new URL(`.${cleanPath}`, publicDirUrl);

  if (!fileUrl.pathname.startsWith(publicDirUrl.pathname)) {
    return null;
  }

  return fileUrl;
}

async function streamMergedDownload(info, videoFormat, audioFormat, container) {
  const outputFormat = chooseOutputFormat(videoFormat, audioFormat, container);
  const { readable, writable } = new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk.data);
    }
  });

  const output = new Output({
    format: outputFormat,
    target: new StreamTarget(writable)
  });

  const process = (async () => {
    const videoStream = toWebStream(await info.download(videoFormat));
    const audioStream = toWebStream(await info.download(audioFormat));

    const videoInput = new Input({
      formats: ALL_FORMATS,
      source: new ReadableStreamSource(videoStream)
    });
    const audioInput = new Input({
      formats: ALL_FORMATS,
      source: new ReadableStreamSource(audioStream)
    });

    try {
      const videoTrack = await videoInput.getPrimaryVideoTrack();
      const audioTrack = await audioInput.getPrimaryAudioTrack();

      if (!videoTrack || !audioTrack) {
        throw new Error('Missing video or audio track.');
      }
      if (!videoTrack.codec || !audioTrack.codec) {
        throw new Error('Unsupported codec for merge.');
      }

      const videoSource = new EncodedVideoPacketSource(videoTrack.codec);
      const audioSource = new EncodedAudioPacketSource(audioTrack.codec);

      output.addVideoTrack(videoSource, { rotation: videoTrack.rotation });
      output.addAudioTrack(audioSource);

      await output.start();

      const [videoDecoderConfig, audioDecoderConfig] = await Promise.all([
        videoTrack.getDecoderConfig().catch(() => null),
        audioTrack.getDecoderConfig().catch(() => null)
      ]);

      const videoSink = new EncodedPacketSink(videoTrack);
      const audioSink = new EncodedPacketSink(audioTrack);

      const pump = async (sink, source, decoderConfig) => {
        let first = true;
        for await (const packet of sink.packets()) {
          if (first) {
            await source.add(packet, decoderConfig ? { decoderConfig } : undefined);
            first = false;
          } else {
            await source.add(packet);
          }
        }
      };

      await Promise.all([
        pump(videoSink, videoSource, videoDecoderConfig),
        pump(audioSink, audioSource, audioDecoderConfig)
      ]);

      await output.finalize();
    } finally {
      videoInput.dispose();
      audioInput.dispose();
    }
  })();

  process.catch(async (error) => {
    try {
      await writable.abort(error);
    } catch {
      // ignore
    }
  });

  return {
    stream: readable,
    mimeType: outputFormat.mimeType,
    ext: outputFormat.fileExtension
  };
}

async function handleInfo(url) {
  const input = url.searchParams.get('url');
  if (!input) return badRequest('Missing url parameter.');

  const videoId = extractVideoId(input);
  if (!videoId) return badRequest('Unable to extract a valid video ID.');

  const cached = getCachedInfo(videoId);
  if (cached) return json(cached);

  const yt = await ytPromise;
  const info = await yt.getInfo(videoId);

  const data = {
    videoId,
    title: info.basic_info?.title || info.basic_info?.title_text || 'Unknown title',
    author: info.basic_info?.author?.name || info.basic_info?.author || info.basic_info?.channel?.name,
    durationSeconds: Number(info.basic_info?.duration || info.basic_info?.duration_seconds) || null,
    viewCount: Number(info.basic_info?.view_count) || null,
    thumbnails: info.basic_info?.thumbnail || info.basic_info?.thumbnails,
    formats: listFormats(info)
  };

  setCachedInfo(videoId, data);
  return json(data);
}

async function handleDownload(url) {
  const input = url.searchParams.get('url');
  if (!input) return badRequest('Missing url parameter.');

  const videoId = extractVideoId(input);
  if (!videoId) return badRequest('Unable to extract a valid video ID.');

  const itag = url.searchParams.get('itag');
  const quality = url.searchParams.get('quality');
  const type = url.searchParams.get('type') || 'video+audio';
  const merge = parseBoolean(url.searchParams.get('merge'));
  const videoItag = url.searchParams.get('video_itag');
  const audioItag = url.searchParams.get('audio_itag');
  const container = (url.searchParams.get('container') || 'mp4').toLowerCase();

  const yt = await ytPromise;
  const info = await yt.getInfo(videoId);
  const rawFormats = getRawFormats(info);

  if (merge) {
    const videoFormat = selectBestVideoFormat(rawFormats, { quality, itag: videoItag, container });
    const audioFormat = selectBestAudioFormat(rawFormats, { itag: audioItag, container });

    if (!videoFormat || !audioFormat) {
      return badRequest(`Unable to select ${container} video + audio formats for merge.`);
    }

    try {
      const merged = await streamMergedDownload(info, videoFormat, audioFormat, container);
      const filename = info.basic_info?.title || 'video';

      return new Response(toWebStream(merged.stream), {
        headers: {
          'content-type': merged.mimeType,
          'content-disposition': contentDisposition(filename, merged.ext),
          'cache-control': 'no-store'
        }
      });
    } catch (error) {
      return badRequest('Unable to merge formats with mediabunny.', error?.message);
    }
  }

  let chosen = null;

  if (typeof info.chooseFormat === 'function') {
    try {
      chosen = info.chooseFormat({
        itag: itag ? Number(itag) : undefined,
        quality: quality || 'best',
        type
      });
    } catch (error) {
      chosen = null;
    }
  }

  if (!chosen) {
    chosen = selectFormat(rawFormats, { itag, quality, type });
  }

  if (!chosen) {
    return badRequest('No matching format found.');
  }

  let stream;
  try {
    stream = await info.download(chosen);
  } catch (error) {
    const fallback = itag
      ? { itag: Number(itag) }
      : { quality: quality || 'best', type };
    stream = await info.download(fallback);
  }
  const mimeType = chosen.mime_type || chosen.mimeType || 'application/octet-stream';
  const ext = extensionFromMime(mimeType);
  const filename = info.basic_info?.title || 'video';
  const contentLength = chosen.content_length || chosen.contentLength;

  const headers = new Headers({
    'content-type': mimeType,
    'content-disposition': contentDisposition(filename, ext),
    'cache-control': 'no-store'
  });

  if (contentLength) {
    headers.set('content-length', String(contentLength));
  }

  return new Response(toWebStream(stream), {
    headers
  });
}

async function handleRequest(req) {
  const url = new URL(req.url);

  if (url.pathname.startsWith('/api/')) {
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

    if (url.pathname === '/api/health') {
      return json({ ok: true, time: new Date().toISOString() }, {
        headers: { 'access-control-allow-origin': '*' }
      });
    }

    try {
      if (url.pathname === '/api/info') {
        const response = await handleInfo(url);
        response.headers.set('access-control-allow-origin', '*');
        return response;
      }
      if (url.pathname === '/api/download') {
        const response = await handleDownload(url);
        response.headers.set('access-control-allow-origin', '*');
        return response;
      }
    } catch (error) {
      return json({ error: 'Request failed.', details: error?.message }, {
        status: 500,
        headers: { 'access-control-allow-origin': '*' }
      });
    }

    return notFound();
  }

  const fileUrl = resolvePublicFile(url.pathname);
  if (!fileUrl) return notFound();

  const file = Bun.file(fileUrl);
  if (!(await file.exists())) return notFound();
  return new Response(file);
}

Bun.serve({
  port: PORT,
  fetch: handleRequest
});

console.log(`Server running on http://localhost:${PORT}`);

const form = document.querySelector('#lookup-form');
const statusEl = document.querySelector('#status');
const videoCard = document.querySelector('#video-card');
const thumbEl = document.querySelector('#thumb');
const titleEl = document.querySelector('#title');
const metaEl = document.querySelector('#meta');
const formatsList = document.querySelector('#formats');
const quickDownloadBtn = document.querySelector('#quick-download');
const copyLinkBtn = document.querySelector('#copy-link');

let currentUrl = '';
let currentFormats = [];

function setStatus(message, tone = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function formatSize(bytes) {
  if (!bytes) return 'Unknown';
  const size = Number(bytes);
  if (Number.isNaN(size)) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let value = size;
  while (value > 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value > 100 ? 0 : 1)} ${units[index]}`;
}

function formatMeta(info) {
  const parts = [];
  if (info.author) parts.push(info.author);
  if (info.durationSeconds) {
    const minutes = Math.floor(info.durationSeconds / 60);
    const seconds = info.durationSeconds % 60;
    parts.push(`${minutes}:${String(seconds).padStart(2, '0')}`);
  }
  if (info.viewCount) {
    parts.push(`${Number(info.viewCount).toLocaleString()} views`);
  }
  return parts.join(' • ');
}

function sortFormats(formats) {
  return formats.slice().sort((a, b) => {
    const aScore = (a.hasVideo ? 2 : 0) + (a.hasAudio ? 1 : 0);
    const bScore = (b.hasVideo ? 2 : 0) + (b.hasAudio ? 1 : 0);
    if (aScore !== bScore) return bScore - aScore;
    return (b.bitrate || 0) - (a.bitrate || 0);
  });
}

function renderFormats(formats) {
  formatsList.innerHTML = '';
  sortFormats(formats).forEach((format) => {
    const row = document.createElement('li');
    row.className = 'format-row';

    const label = format.qualityLabel || (format.hasVideo ? 'Video' : 'Audio');
    const type = format.hasVideo && format.hasAudio
      ? 'Video + Audio'
      : format.hasVideo
        ? 'Video Only'
        : 'Audio Only';

    const size = formatSize(format.contentLength);
    const bitrate = format.bitrate ? `${Math.round(format.bitrate / 1000)} kbps` : '—';

    row.innerHTML = `
      <div>
        <strong>${label}</strong>
        <span>• ${format.mimeType || 'format'} • ${bitrate}</span>
      </div>
      <span>${type}</span>
      <span>${size}</span>
      <button data-itag="${format.itag}">Download</button>
    `;

    const button = row.querySelector('button');
    button.addEventListener('click', () => {
      if (!currentUrl) return;
      const downloadUrl = new URL('/api/download', window.location.origin);
      downloadUrl.searchParams.set('url', currentUrl);
      downloadUrl.searchParams.set('itag', format.itag);
      window.location.href = downloadUrl.toString();
    });

    formatsList.appendChild(row);
  });
}

function showVideoCard(info) {
  const thumb = Array.isArray(info.thumbnails)
    ? info.thumbnails[info.thumbnails.length - 1]
    : info.thumbnails;

  if (thumb?.url) {
    thumbEl.src = thumb.url;
    thumbEl.alt = info.title;
  }

  titleEl.textContent = info.title;
  metaEl.textContent = formatMeta(info);
  videoCard.classList.remove('hidden');
}

async function fetchInfo(url) {
  setStatus('Fetching formats…');
  const requestUrl = new URL('/api/info', window.location.origin);
  requestUrl.searchParams.set('url', url);

  const response = await fetch(requestUrl.toString());
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to fetch info');
  }

  return response.json();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.querySelector('#video-url');
  const value = input.value.trim();
  if (!value) return;

  try {
    currentUrl = value;
    const info = await fetchInfo(value);
    currentFormats = info.formats || [];

    showVideoCard(info);
    renderFormats(currentFormats);
    setStatus(`Loaded ${currentFormats.length} formats.`);
  } catch (error) {
    setStatus(error.message || 'Something went wrong.', 'error');
  }
});

quickDownloadBtn.addEventListener('click', () => {
  if (!currentUrl) return;
  const url = new URL('/api/download', window.location.origin);
  url.searchParams.set('url', currentUrl);
  url.searchParams.set('merge', '1');
  url.searchParams.set('container', 'mp4');
  window.location.href = url.toString();
});

copyLinkBtn.addEventListener('click', async () => {
  if (!currentUrl) return;
  const url = new URL('/api/download', window.location.origin);
  url.searchParams.set('url', currentUrl);
  url.searchParams.set('merge', '1');
  url.searchParams.set('container', 'mp4');

  try {
    await navigator.clipboard.writeText(url.toString());
    setStatus('Download URL copied to clipboard.');
  } catch (error) {
    setStatus('Unable to copy link.');
  }
});

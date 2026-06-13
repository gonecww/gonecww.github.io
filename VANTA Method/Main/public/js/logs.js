async function renderLogs() {
  const container = document.getElementById('logChannel');
  if (!container) return;
  container.innerHTML = '<p style="color: var(--text-secondary);">Loading log channel...</p>';

  try {
    const response = await fetch('/api/logs');
    const result = await response.json();
    const logs = (result.logs || []).slice().reverse();

    if (!logs.length) {
      container.innerHTML = '<p style="color: var(--text-secondary);">No upload events recorded yet.</p>';
      return;
    }

    container.innerHTML = logs.map((log) => {
      const time = new Date(log.timestamp).toLocaleString();
      const settings = log.settings || {};
      return `
        <article class="log-entry">
          <div class="log-meta">
            <span><strong>${log.userName || 'anonymous'}</strong> · ${log.event.replace('_', ' ')}</span>
            <span>${time}</span>
          </div>
          <div class="log-message">${log.originalFile || 'unknown file'}<br><strong>IP:</strong> ${log.clientIp || 'unknown'} · <strong>Agent:</strong> ${log.userAgent || 'unknown'}</div>
          <div class="log-settings">
            <div><strong>Resolution</strong><br>${settings.resolution || 'auto'}</div>
            <div><strong>Frame rate</strong><br>${settings.frameRate || 'preserve'}</div>
            <div><strong>Bitrate</strong><br>${settings.bitrate || 'default'} kbps</div>
            <div><strong>Codec</strong><br>${settings.codec || 'h264'}</div>
            <div><strong>Audio</strong><br>${settings.audioQuality || '192'} kbps</div>
            <div><strong>Normalize</strong><br>${settings.normalizeAudio === 'true' ? 'Yes' : 'No'}</div>
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: var(--text-secondary);">Unable to load logs: ${err.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const refreshButton = document.getElementById('refreshLogs');
  if (refreshButton) {
    refreshButton.addEventListener('click', renderLogs);
  }
  renderLogs();
});

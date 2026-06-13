const pageIds = ['landing', 'upload', 'processing', 'results', 'feedback'];
const selectedFileName = document.getElementById('selectedFileName');
const selectedFileMeta = document.getElementById('selectedFileMeta');
const fileSelectedPanel = document.getElementById('fileSelectedPanel');
const uploadError = document.getElementById('uploadError');
const uploadErrorMsg = document.getElementById('uploadErrorMsg');
const dropZone = document.getElementById('dropZone');
const browseBtn = document.getElementById('browseBtn');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const bitrateRange = document.getElementById('bitrateRange');
const bitrateLabel = document.getElementById('bitrateLabel');
const audioBitrateRange = document.getElementById('audioBitrateRange');
const audioBitrateLabel = document.getElementById('audioBitrateLabel');
const presetBtn = document.getElementById('presetBtn');
const procStatusMsg = document.getElementById('procStatusMsg');
const procProgressFill = document.getElementById('procProgressFill');
const procPct = document.getElementById('procPct');
const procElapsed = document.getElementById('procElapsed');
const procETA = document.getElementById('procETA');
const procSpeed = document.getElementById('procSpeed');
const stageAnalyze = document.getElementById('stage-analyze');
const stageEncode = document.getElementById('stage-encode');
const stageAudio = document.getElementById('stage-audio');
const stageMux = document.getElementById('stage-mux');
const stageFinalize = document.getElementById('stage-finalize');
const procError = document.getElementById('procError');
const procErrorMsg = document.getElementById('procErrorMsg');
const origFilename = document.getElementById('origFilename');
const origSize = document.getElementById('origSize');
const origMeta = document.getElementById('origMeta');
const optFilename = document.getElementById('optFilename');
const optSize = document.getElementById('optSize');
const optMeta = document.getElementById('optMeta');
const sizeReduction = document.getElementById('sizeReduction');
const summaryGrid = document.getElementById('summaryGrid');
const downloadBtn = document.getElementById('downloadBtn');
const dlProgress = document.getElementById('dlProgress');
const dlFill = document.getElementById('dlFill');
const dlProgressLabel = document.getElementById('dlProgressLabel');
const feedbackText = document.getElementById('feedbackText');
const feedbackSubmit = document.getElementById('feedbackSubmit');
const feedbackNote = document.getElementById('feedbackNote');
const navFeedbackBtn = document.getElementById('navFeedbackBtn');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackPageText = document.getElementById('feedbackPageText');
const feedbackPageSubmit = document.getElementById('feedbackPageSubmit');
const feedbackPageNote = document.getElementById('feedbackPageNote');
const feedbackCategory = document.getElementById('feedbackCategory');
const feedbackEmail = document.getElementById('feedbackEmail');
const removeFile = document.getElementById('removeFile');
const themeToggle = document.getElementById('themeToggle');
const toastContainer = document.getElementById('toastContainer');
const backendStatusLabel = document.getElementById('backendStatusLabel');
const refreshBackendStatusBtn = document.getElementById('refreshBackendStatusBtn');
const navLogsBtn = document.getElementById('navLogsBtn');
const logsList = document.getElementById('logsList');
const refreshLogsBtn = document.getElementById('refreshLogsBtn');
const logsFilter = document.getElementById('logsFilter');
const logsSearch = document.getElementById('logsSearch');

let selectedFile = null;
let taskId = null;
let pollInterval = null;
let processingStart = null;
let previousPercent = 0;
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let currentCursorX = cursorX;
let currentCursorY = cursorY;
let cursorEl = null;
const permittedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
const maxFileSize = 250 * 1024 * 1024;

function showPage(page) {
  pageIds.forEach((id) => {
    const section = document.getElementById(`page-${id}`);
    if (section) {
      section.classList.toggle('active', id === page);
    }
  });
  // nav active state for feedback
  try {
    document.querySelectorAll('.nav-link').forEach((el) => el.classList.remove('active'));
    if (page === 'feedback') {
      const nav = document.getElementById('navFeedbackBtn');
      if (nav) nav.classList.add('active');
    }
  } catch (e) {}
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setError(message) {
  uploadErrorMsg.textContent = message;
  uploadError.style.display = 'flex';
}

function clearError() {
  uploadError.style.display = 'none';
}

function updateBitrateLabel(value) {
  bitrateLabel.textContent = `${value} kbps`;
  const track = document.getElementById('bitrateTrackFill');
  if (track) {
    const percent = ((value - parseInt(bitrateRange.min, 10)) / (parseInt(bitrateRange.max, 10) - parseInt(bitrateRange.min, 10))) * 100;
    track.style.width = `${percent}%`;
  }
}

function updateAudioLabel(value) {
  audioBitrateLabel.textContent = `${value} kbps`;
}

function setToggleGroup(groupId, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  const buttons = Array.from(group.querySelectorAll('.toggle-btn'));
  buttons.forEach((button) => {
    if (button.dataset.value === value.toString()) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

function getToggleGroupValue(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return null;
  const active = group.querySelector('.toggle-btn.active');
  return active ? active.dataset.value : null;
}

function applyTikTokPreset() {
  setToggleGroup('codecToggle', 'libx265');
  setToggleGroup('fpsToggle', '30');
  setToggleGroup('crfToggle', '18');
  setToggleGroup('qualityToggle', 'balanced');
  document.getElementById('resolutionSelect').value = 'original';
  bitrateRange.value = 14000;
  audioBitrateRange.value = 192;
  document.getElementById('normalizeAudio').checked = true;
  updateBitrateLabel(bitrateRange.value);
  updateAudioLabel(audioBitrateRange.value);
}

function handleFile(file) {
  clearError();
  if (!file) return;
  if (file.size > maxFileSize) {
    setError('File size exceeds 250 MB limit.');
    return;
  }
  if (!permittedTypes.includes(file.type)) {
    setError('Supported video types are MP4, MOV, AVI, MKV, and WebM.');
    return;
  }

  selectedFile = file;
  selectedFileName.textContent = file.name;
  selectedFileMeta.textContent = `${humanFileSize(file.size)} · ${file.type.split('/').pop().toUpperCase()}`;
  fileSelectedPanel.style.display = 'block';
  processBtn.disabled = false;
}

function humanFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(1)} ${units[index]}`;
}

function resetUploadState() {
  selectedFile = null;
  if (fileInput) fileInput.value = '';
  fileSelectedPanel.style.display = 'none';
  processBtn.disabled = true;
  clearError();
  stageAnalyze.classList.remove('active', 'done');
  stageEncode.classList.remove('active', 'done');
  stageAudio.classList.remove('active', 'done');
  stageMux.classList.remove('active', 'done');
  stageFinalize.classList.remove('active', 'done');
  procError.style.display = 'none';
  procProgressFill.style.width = '0%';
  procPct.textContent = '0%';
  procElapsed.textContent = '0:00';
  procETA.textContent = '—';
  procSpeed.textContent = '—';
}

function updateDragState(isActive) {
  if (!dropZone) return;
  dropZone.classList.toggle('drag-over', isActive);
}

function showProcessingStage(stageId) {
  document.querySelectorAll('.stage').forEach((stage) => stage.classList.remove('active'));
  const stage = document.getElementById(stageId);
  if (stage) stage.classList.add('active');
}

function enableUploadMode(enabled) {
  if (enabled) {
    processBtn.disabled = !selectedFile;
  } else {
    processBtn.disabled = true;
  }
}

function bindToggleEvents() {
  document.querySelectorAll('.toggle-group').forEach((group) => {
    group.querySelectorAll('.toggle-btn').forEach((button) => {
      button.addEventListener('click', () => {
        group.querySelectorAll('.toggle-btn').forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });
  });
}

function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobi|android|iphone|ipad|ipod|windows phone/.test(ua)) return 'mobile';
  return 'desktop';
}

function enforceDesktopFramerate() {
  if (getDeviceType() === 'desktop') {
    setToggleGroup('fpsToggle', 'preserve');
    const note = document.getElementById('framerateNote');
    if (note) {
      note.textContent = 'Desktop and Mac users: original framerate is recommended for smooth playback.';
    }
  }
}

function showToast(message, type = 'success') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-title">${message}</span><button class="toast-close" type="button" aria-label="Dismiss">×</button>`;
  toastContainer.appendChild(toast);

  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 220);
  };

  toast.querySelector('.toast-close').addEventListener('click', removeToast);
  setTimeout(removeToast, 4200);
}

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  if (themeToggle) {
    themeToggle.textContent = theme === 'light' ? 'Dark mode' : 'Light mode';
  }
  localStorage.setItem('themePreference', theme);
  showToast(`Switched to ${theme === 'light' ? 'Light' : 'Dark'} mode`, 'success');
}

function loadThemePreference() {
  const storedTheme = localStorage.getItem('themePreference');
  applyTheme(storedTheme === 'light' ? 'light' : 'dark');
}

async function refreshBackendStatus() {
  if (!backendStatusLabel) return;
  backendStatusLabel.textContent = 'Checking backend...';

  try {
    const response = await fetch('/api/status', { cache: 'no-cache' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed');

    backendStatusLabel.textContent = `Online · ${result.activeTasks} active task${result.activeTasks === 1 ? '' : 's'}`;
  } catch (error) {
    backendStatusLabel.textContent = 'Offline or unreachable';
  }
}

function toggleTheme() {
  const activeTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
  applyTheme(activeTheme === 'light' ? 'dark' : 'light');
}

function bindEvents() {
  browseBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (event) => handleFile(event.target.files[0]));
  removeFile.addEventListener('click', resetUploadState);

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      updateDragState(true);
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (eventName === 'drop') {
        handleFile(event.dataTransfer.files[0]);
      }
      updateDragState(false);
    });
  });

  bitrateRange.addEventListener('input', (event) => updateBitrateLabel(event.target.value));
  audioBitrateRange.addEventListener('input', (event) => updateAudioLabel(event.target.value));
  presetBtn.addEventListener('click', applyTikTokPreset);
  if (refreshBackendStatusBtn) {
    refreshBackendStatusBtn.addEventListener('click', refreshBackendStatus);
  }
  if (navFeedbackBtn) {
    navFeedbackBtn.addEventListener('click', () => showPage('feedback'));
  }
  if (navLogsBtn) {
    navLogsBtn.addEventListener('click', () => { showPage('logs'); fetchLogs(); });
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  if (feedbackSubmit) {
    feedbackSubmit.addEventListener('click', submitFeedback);
  }
  if (feedbackPageSubmit) {
    feedbackPageSubmit.addEventListener('click', submitFeedbackPage);
  }
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', fetchLogs);
  }
}

async function submitFeedbackPage() {
  if (!feedbackPageText || !feedbackPageSubmit || !feedbackPageNote) return;
  const text = feedbackPageText.value.trim();
  if (!text) {
    feedbackPageNote.textContent = 'Please enter some feedback before sending.';
    return;
  }

  feedbackPageSubmit.disabled = true;
  feedbackPageSubmit.textContent = 'Sending...';
  feedbackPageNote.textContent = '';

  try {
    const payload = {
      taskId: `global-${Date.now()}`,
      userName: (document.getElementById('userName')?.value || 'anonymous').trim() || 'anonymous',
      feedback: `[${feedbackCategory?.value || 'general'}] ${text} ${feedbackEmail?.value ? ` (email: ${feedbackEmail.value.trim()})` : ''}`
    };

    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to send feedback.');

    feedbackPageNote.style.color = 'var(--accent-emerald)';
    feedbackPageNote.textContent = result.message || 'Thanks — we received your feedback.';
    feedbackPageText.value = '';
    feedbackEmail.value = '';
    showConfetti();
  } catch (err) {
    feedbackPageNote.style.color = 'var(--accent-red)';
    feedbackPageNote.textContent = err.message || 'Could not send feedback.';
  } finally {
    feedbackPageSubmit.disabled = false;
    feedbackPageSubmit.textContent = 'Send feedback';
  }
}

function showConfetti() {
  const count = 36;
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = `${50 + (Math.random() - 0.5) * 60}%`;
    el.style.background = `hsl(${Math.random() * 360} 80% 60%)`;
    el.style.transform = `translateY(-20vh) rotate(${Math.random() * 360}deg)`;
    container.appendChild(el);
    (function(e){
      requestAnimationFrame(() => e.style.transform = `translateY(${80 + Math.random() * 40}vh) rotate(${Math.random() * 720}deg)`);
    })(el);
  }
  setTimeout(() => container.remove(), 2800);
}

async function fetchLogs() {
  if (!logsList) return;
  logsList.innerHTML = '<div style="opacity:0.6">Loading…</div>';
  try {
    const res = await fetch('/api/logs', { cache: 'no-cache' });
    const data = await res.json();
    const items = (data.logs || []).filter((l) => l.event === 'feedback_submitted');
    renderLogs(items);
  } catch (err) {
    logsList.innerHTML = `<div class="error-banner">Unable to load logs.</div>`;
  }
}

function renderLogs(items) {
  if (!logsList) return;
  if (!items || items.length === 0) {
    logsList.innerHTML = '<div style="padding:18px; color:var(--text-muted)">No feedback yet.</div>';
    return;
  }
  const q = (logsSearch?.value || '').toLowerCase();
  const category = logsFilter?.value || 'all';
  const filtered = items.filter((it) => {
    const text = (it.feedback || '') + ' ' + (it.userName || '');
    if (category !== 'all' && !text.toLowerCase().includes(category)) return false;
    if (q && !text.toLowerCase().includes(q)) return false;
    return true;
  });
  logsList.innerHTML = '';
  filtered.slice().reverse().forEach((it) => {
    const el = document.createElement('div');
    el.className = 'log-item';
    const time = new Date(it.timestamp).toLocaleString();
    el.innerHTML = `
      <div class="log-head"><strong>${it.userName || 'anonymous'}</strong>
        <span class="log-meta">${time} · ${it.clientIp || ''}</span>
      </div>
      <div class="log-body">${escapeHtml(it.feedback || '')}</div>
      <div class="log-foot">taskId: <span class="mono">${it.taskId}</span> · ua: <span class="mono">${(it.userAgent||'').slice(0,80)}</span></div>
    `;
    logsList.appendChild(el);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br/>');
}

async function startProcessing() {
  if (!selectedFile) {
    setError('Select a video before optimizing.');
    return;
  }

  showPage('processing');
  if (!processingStart) processingStart = Date.now();
  procStatusMsg.textContent = 'Uploading your video to the backend...';
  showProcessingStage('stage-analyze');

  const formData = new FormData();
  formData.append('videoFile', selectedFile);
  formData.append('userName', document.getElementById('userName')?.value.trim() || 'anonymous');
  formData.append('resolution', document.getElementById('resolutionSelect').value);
  formData.append('frameRate', getToggleGroupValue('fpsToggle') || 'preserve');
  formData.append('codec', getToggleGroupValue('codecToggle') === 'libx265' ? 'h265' : 'h264');
  formData.append('bitrate', bitrateRange.value);
  formData.append('audioQuality', audioBitrateRange.value);
  formData.append('normalizeAudio', document.getElementById('normalizeAudio').checked ? 'true' : 'false');
  formData.append('crf', getToggleGroupValue('crfToggle') || '23');
  formData.append('qualityMode', getToggleGroupValue('qualityToggle') || 'balanced');

  try {
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed.');
    }
    const data = await response.json();
    taskId = data.taskId;
    startPolling();
  } catch (error) {
    procErrorMsg.textContent = error.message;
    procError.style.display = 'flex';
    procStatusMsg.textContent = 'Upload error';
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  processingStart = Date.now();
  previousPercent = 0;
  pollInterval = setInterval(fetchProgress, 1200);
  fetchProgress();
}

async function fetchProgress() {
  if (!taskId) return;
  try {
    const response = await fetch(`/api/progress/${taskId}`);
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    const percent = Math.min(100, Math.round(data.percent || 0));
    procProgressFill.style.width = `${percent}%`;
    procPct.textContent = `${percent}%`;
    procStatusMsg.textContent = data.message || 'Processing video...';

    const elapsedSeconds = Math.floor((Date.now() - processingStart) / 1000);
    procElapsed.textContent = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

    if (percent > 0) {
      const etaSeconds = Math.max(0, Math.round((elapsedSeconds / percent) * (100 - percent)));
      procETA.textContent = `${Math.floor(etaSeconds / 60)}:${String(etaSeconds % 60).padStart(2, '0')}`;
      procSpeed.textContent = `${Math.round(percent / Math.max(elapsedSeconds, 1))}% /s`;
    }

    if (data.status === 'processing') {
      if (percent > 0 && percent < 35) showProcessingStage('stage-encode');
      else if (percent >= 35 && percent < 65) showProcessingStage('stage-audio');
      else if (percent >= 65 && percent < 95) showProcessingStage('stage-mux');
      else showProcessingStage('stage-finalize');
    }

    if (data.status === 'completed') {
      clearInterval(pollInterval);
      showResults(data);
    }

    if (data.status === 'failed') {
      clearInterval(pollInterval);
      procErrorMsg.textContent = data.message || 'Conversion failed.';
      procError.style.display = 'flex';
      procStatusMsg.textContent = 'Processing failed';
    }
  } catch (error) {
    clearInterval(pollInterval);
    procErrorMsg.textContent = error.message;
    procError.style.display = 'flex';
    procStatusMsg.textContent = 'Unable to retrieve status.';
  }
}

function showResults(data) {
  showPage('results');

  origFilename.textContent = selectedFile ? selectedFile.name : 'source';
  origSize.textContent = selectedFile ? humanFileSize(selectedFile.size) : '—';
  origMeta.textContent = selectedFile ? `${selectedFile.type.split('/').pop().toUpperCase()}` : '—';

  optFilename.textContent = data.outputName || 'optimized.mp4';
  optSize.textContent = data.outputSize ? humanFileSize(data.outputSize) : '—';
  optMeta.textContent = data.outputName ? 'MP4 · H.264/H.265' : '—';

  if (selectedFile && data.outputSize) {
    const ratio = Math.round((1 - data.outputSize / selectedFile.size) * 100);
    sizeReduction.textContent = `${ratio > 0 ? ratio : 0}% smaller`;
  } else {
    sizeReduction.textContent = 'Ready to download';
  }

  summaryGrid.innerHTML = '';
  const settings = [
    ['Resolution', document.getElementById('resolutionSelect').value],
    ['Frame rate', getToggleGroupValue('fpsToggle')],
    ['Codec', getToggleGroupValue('codecToggle') === 'libx265' ? 'H.265' : 'H.264'],
    ['Quality mode', getToggleGroupValue('qualityToggle')],
    ['Max bitrate', `${bitrateRange.value} kbps`],
    ['CRF', getToggleGroupValue('crfToggle')],
    ['Audio', `${audioBitrateRange.value} kbps`],
    ['Normalization', document.getElementById('normalizeAudio').checked ? 'Enabled' : 'Disabled']
  ];
  settings.forEach(([label, value]) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'summary-item';
    wrapper.innerHTML = `<span class="s-label">${label}</span><span class="s-value">${value}</span>`;
    summaryGrid.appendChild(wrapper);
  });

  const downloadUrl = data.downloadUrl || `/download/${data.outputName}`;
  downloadBtn.dataset.url = downloadUrl;
  downloadBtn.onclick = () => {
    if (downloadBtn.dataset.url) {
      window.location.href = downloadBtn.dataset.url;
    }
  };

  if (feedbackText) {
    feedbackText.value = '';
  }
  if (feedbackNote) {
    feedbackNote.textContent = '';
  }
  if (feedbackSubmit) {
    feedbackSubmit.disabled = false;
    feedbackSubmit.textContent = 'Send feedback';
  }
}

async function submitFeedback() {
  if (!feedbackText || !feedbackSubmit || !feedbackNote) return;
  const text = feedbackText.value.trim();
  if (!text) {
    feedbackNote.textContent = 'Please enter your feedback before sending.';
    return;
  }

  feedbackSubmit.disabled = true;
  feedbackSubmit.textContent = 'Sending...';
  feedbackNote.textContent = '';

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        userName: document.getElementById('userName')?.value.trim() || 'anonymous',
        feedback: text
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Unable to send feedback.');
    }

    feedbackNote.style.color = 'var(--accent-emerald)';
    feedbackNote.textContent = result.message || 'Thanks for your feedback!';
    feedbackText.value = '';
  } catch (error) {
    feedbackNote.style.color = 'var(--accent-red)';
    feedbackNote.textContent = error.message || 'Could not send feedback. Try again later.';
  } finally {
    if (feedbackSubmit) {
      feedbackSubmit.disabled = false;
      feedbackSubmit.textContent = 'Send feedback';
    }
  }
}

function downloadResult() {
  if (downloadBtn.dataset.url) {
    window.location.href = downloadBtn.dataset.url;
  }
}

function restartApp() {
  resetUploadState();
  showPage('upload');
}

function animateWasmBackground() {
  const baseValue = Math.floor((Math.sin(Date.now() / 900) + 1) * 46);
  let intensity = baseValue;
  if (window.WasmCompute && WasmCompute.ready) {
    const faded = WasmCompute.fade(baseValue, 80);
    if (typeof faded === 'number') {
      intensity = faded;
    }
  }
  document.documentElement.style.setProperty('--hero-bw-intensity', `${Math.min(0.22, 0.04 + intensity / 420)}`);
  requestAnimationFrame(animateWasmBackground);
}

function createCursorRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'cursor-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 620);
}

function initCustomCursor() {
  if ('ontouchstart' in window) return;

  cursorEl = document.createElement('div');
  cursorEl.className = 'custom-cursor';
  document.body.appendChild(cursorEl);

  const hoverSelector = 'button, input, select, textarea, a, .upload-zone, .toggle-btn, .nav-link, .btn';

  window.addEventListener('mousemove', (event) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    if (cursorEl) cursorEl.style.opacity = '1';
  });

  window.addEventListener('mouseleave', () => {
    if (cursorEl) cursorEl.style.opacity = '0';
  });

  document.addEventListener('mouseover', (event) => {
    if (event.target.closest(hoverSelector)) {
      cursorEl?.classList.add('hover');
    }
  });

  document.addEventListener('mouseout', (event) => {
    if (event.target.closest(hoverSelector)) {
      cursorEl?.classList.remove('hover');
    }
  });

  document.addEventListener('mousedown', (event) => {
    cursorEl?.classList.add('hover');
    createCursorRipple(event.clientX, event.clientY);
  });

  document.addEventListener('mouseup', () => {
    cursorEl?.classList.remove('hover');
  });

  const renderCursor = () => {
    currentCursorX += (cursorX - currentCursorX) * 0.18;
    currentCursorY += (cursorY - currentCursorY) * 0.18;
    if (cursorEl) {
      cursorEl.style.left = `${currentCursorX}px`;
      cursorEl.style.top = `${currentCursorY}px`;
    }
    requestAnimationFrame(renderCursor);
  };

  renderCursor();
}

function init() {
  bindEvents();
  bindToggleEvents();
  loadThemePreference();
  refreshBackendStatus();
  updateBitrateLabel(bitrateRange.value);
  updateAudioLabel(audioBitrateRange.value);
  setToggleGroup('codecToggle', 'libx264');
  setToggleGroup('fpsToggle', 'preserve');
  setToggleGroup('crfToggle', '23');
  setToggleGroup('qualityToggle', 'balanced');
  enforceDesktopFramerate();
  initCustomCursor();
  requestAnimationFrame(animateWasmBackground);
}

init();

/* Interactive UI: spotlight, animated lines, and button ripple */
function initInteractiveEffects() {
  // create overlay
  if (document.getElementById('interactiveOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'interactiveOverlay';
  overlay.className = 'interactive-overlay';
  overlay.innerHTML = '<div class="lines"></div><div class="spotlight"></div>';
  document.body.appendChild(overlay);

  // mouse / touch tracking
  function updateCursor(x, y) {
    document.documentElement.style.setProperty('--cursor-x', x + 'px');
    document.documentElement.style.setProperty('--cursor-y', y + 'px');
    const ox = Math.round((x - window.innerWidth / 2) / 24);
    const oy = Math.round((y - window.innerHeight / 2) / 36);
    document.documentElement.style.setProperty('--lines-offset-x', ox + 'px');
    document.documentElement.style.setProperty('--lines-offset-y', oy + 'px');
  }

  let raf = null;
  window.addEventListener('mousemove', (ev) => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => updateCursor(ev.clientX, ev.clientY));
  }, { passive: true });

  window.addEventListener('touchmove', (ev) => {
    const t = ev.touches && ev.touches[0];
    if (!t) return;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => updateCursor(t.clientX, t.clientY));
  }, { passive: true });

  // ripple effect for buttons
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.btn');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (ev.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (ev.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }, true);
}

// start interactive effects after DOM ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initInteractiveEffects, 80);
} else {
  window.addEventListener('DOMContentLoaded', initInteractiveEffects, { once: true });
}

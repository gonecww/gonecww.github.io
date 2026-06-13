const server = 'http://localhost:5000';
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const statusEl = document.getElementById('status');
const progressFill = document.getElementById('progressFill');
const openApp = document.getElementById('openApp');

openApp.href = server;

async function postFeedbackToBackground(message) {
  try {
    chrome.runtime.sendMessage({ type: 'notify', title: 'VANTA', message });
  } catch (e) {
    // ignore
  }
}

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return statusEl.textContent = 'Please choose a file first.';

  statusEl.textContent = 'Uploading...';
  progressFill.style.width = '6%';

  const fd = new FormData();
  fd.append('videoFile', file);
  fd.append('resolution', document.getElementById('resolutionSelect').value);
  fd.append('qualityMode', document.getElementById('qualitySelect').value);

  try {
    const res = await fetch(`${server}/api/upload`, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(()=>({error:'Upload failed'}));
      statusEl.textContent = err.error || 'Upload failed';
      return;
    }
    const info = await res.json();
    const taskId = info.taskId;
    statusEl.textContent = 'Processing...';
    pollProgress(taskId);
  } catch (e) {
    statusEl.textContent = 'Upload error';
  }
});

let pollHandle = null;
async function pollProgress(taskId){
  if (pollHandle) clearInterval(pollHandle);
  const start = Date.now();
  pollHandle = setInterval(async ()=>{
    try{
      const r = await fetch(`${server}/api/progress/${taskId}`);
      const j = await r.json();
      const pct = Math.min(100, Math.round(j.percent || 0));
      progressFill.style.width = pct + '%';
      statusEl.textContent = j.message || `Processing ${pct}%`;
      if (j.status === 'completed'){
        clearInterval(pollHandle);
        statusEl.textContent = 'Completed — opening download';
        const url = j.downloadUrl || `/download/${j.outputName}`;
        window.open(url.startsWith('http')?url:server+url, '_blank');
        postFeedbackToBackground('Conversion complete — download opened');
      }
      if (j.status === 'failed'){
        clearInterval(pollHandle);
        statusEl.textContent = 'Processing failed';
        postFeedbackToBackground('Conversion failed');
      }
    }catch(e){
      clearInterval(pollHandle);
      statusEl.textContent = 'Unable to reach server';
    }
  }, 1200);
}

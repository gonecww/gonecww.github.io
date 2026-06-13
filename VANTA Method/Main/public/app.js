const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const browseButton = document.getElementById('browseButton');
const uploadSubmitBtn = document.getElementById('uploadSubmitBtn');
const showUploadBtn = document.getElementById('showUploadBtn');
const startUploadBtn = document.getElementById('startUploadBtn');
const cancelProcessBtn = document.getElementById('cancelProcessBtn');
const processNewBtn = document.getElementById('processNewBtn');
const landingScreen = document.getElementById('landingScreen');
const uploadScreen = document.getElementById('uploadScreen');
const processingScreen = document.getElementById('processingScreen');
const resultScreen = document.getElementById('resultScreen');
const filePreview = document.getElementById('filePreview');
const previewName = document.getElementById('previewName');
const previewSize = document.getElementById('previewSize');
const processMessage = document.getElementById('processMessage');
const processPercent = document.getElementById('processPercent');
const processFill = document.getElementById('processFill');
const estimateText = document.getElementById('estimateText');
const uploadState = document.getElementById('uploadState');
const conversionState = document.getElementById('conversionState');
const downloadLink = document.getElementById('downloadLink');
const resultFileName = document.getElementById('resultFileName');

let selectedFile = null;
let currentTask = null;
let pollTimer = null;
let uploadStartTime = null;

function showScreen(screen) {
  [landingScreen, uploadScreen, processingScreen, resultScreen].forEach((section) => {
    section.classList.toggle('hidden', section !== screen);
  });
}

function humanFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let value = bytes;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(1)} ${units[index]}`;
}

function updatePreview(file) {
  selectedFile = file;
  if (!file) return;
  previewName.textContent = file.name;
  previewSize.textContent = humanFileSize(file.size);
  filePreview.classList.remove('hidden');
}

function resetForm() {
  selectedFile = null;
  currentTask = null;
  fileInput.value = '';
  filePreview.classList.add('hidden');
  uploadState.textContent = 'Waiting';
  conversionState.textContent = 'Queued';
  processMessage.textContent = 'Preparing upload.';
  processPercent.textContent = '0%';
  processFill.style.width = '0%';
  estimateText.textContent = 'Estimated completion time will appear once processing begins.';
  downloadLink.removeAttribute('href');
  resultFileName.textContent = '-';
}

function activateDropZone() {
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (file.size > 250 * 1024 * 1024) {
      alert('File size exceeds 250 MB. Please choose a smaller video.');
      return;
    }
    updatePreview(file);
  });
}

function attachUIEvents() {
  browseButton.addEventListener('click', () => fileInput.click());
  showUploadBtn.addEventListener('click', () => showScreen(uploadScreen));
  startUploadBtn.addEventListener('click', () => showScreen(uploadScreen));
  processNewBtn.addEventListener('click', () => {
    resetForm();
    showScreen(uploadScreen);
  });
  cancelProcessBtn.addEventListener('click', () => {
    if (pollTimer) clearInterval(pollTimer);
    resetForm();
    showScreen(uploadScreen);
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 250 * 1024 * 1024) {
      alert('File size exceeds 250 MB. Please choose a smaller video.');
      return;
    }
    updatePreview(file);
  });

  uploadSubmitBtn.addEventListener('click', () => {
    if (!selectedFile) {
      alert('Please select a video file before continuing.');
      return;
    }
    startUpload();
  });
}

function startUpload() {
  const formData = new FormData();
  const resolution = document.getElementById('resolutionSelect').value;
  const frameRate = document.getElementById('frameRateSelect').value;
  const codec = document.getElementById('codecSelect').value;
  const bitrate = document.getElementById('bitrateInput').value;
  const audioQuality = document.getElementById('audioQualitySelect').value;

  formData.append('videoFile', selectedFile);
  formData.append('resolution', resolution);
  formData.append('frameRate', frameRate);
  formData.append('codec', codec);
  formData.append('bitrate', bitrate);
  formData.append('audioQuality', audioQuality);

  const request = new XMLHttpRequest();
  request.open('POST', '/api/upload');

  request.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      uploadState.textContent = `Uploading: ${percent}%`;
    }
  };

  request.onreadystatechange = () => {
    if (request.readyState === XMLHttpRequest.DONE) {
      if (request.status >= 200 && request.status < 300) {
        const response = JSON.parse(request.responseText);
        currentTask = response.taskId;
        uploadState.textContent = 'Upload complete';
        showScreen(processingScreen);
        uploadStartTime = Date.now();
        fetchProgress();
        pollTimer = setInterval(fetchProgress, 1200);
      } else {
        const error = request.responseText ? JSON.parse(request.responseText).error : 'Upload failed.';
        alert(error);
        resetForm();
      }
    }
  };

  request.send(formData);
}

function fetchProgress() {
  if (!currentTask) return;
  fetch(`/api/progress/${currentTask}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }
      conversionState.textContent = data.status === 'processing' ? 'Rendering' : data.status;
      processMessage.textContent = data.message;
      processPercent.textContent = `${Math.round(data.percent)}%`;
      processFill.style.width = `${Math.round(data.percent)}%`;
      if (data.percent > 0) {
        const elapsed = (Date.now() - uploadStartTime) / 1000;
        const predicted = Math.max(5, Math.round((elapsed / Math.max(1, data.percent)) * (100 - data.percent)));
        estimateText.textContent = `Estimated time remaining: ${predicted}s`;
      }
      if (data.status === 'completed') {
        clearInterval(pollTimer);
        showResult(data);
      }
      if (data.status === 'failed') {
        clearInterval(pollTimer);
        alert(data.message || 'Processing failed. Please try again with a different file.');
        resetForm();
        showScreen(uploadScreen);
      }
    })
    .catch((error) => {
      console.error('Progress error', error);
      clearInterval(pollTimer);
      alert('Unable to get processing status. Please refresh the page and try again.');
      resetForm();
      showScreen(uploadScreen);
    });
}

function showResult(data) {
  if (data.downloadUrl) {
    downloadLink.href = data.downloadUrl;
    downloadLink.setAttribute('download', `tiktok-optimized.mp4`);
    resultFileName.textContent = selectedFile ? selectedFile.name : 'Optimized video';
  }
  showScreen(resultScreen);
}

attachUIEvents();
activateDropZone();
resetForm();

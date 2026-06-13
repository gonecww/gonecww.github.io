const assert = require('assert');
const { sanitizeDownloadName, buildFfmpegOptions } = require('../server.js');

function testSanitizeDownloadName() {
  const raw = '../../secret/video?name=hello.mp4';
  const sanitized = sanitizeDownloadName(raw);

  assert.strictEqual(sanitized, 'video_name=hello.mp4'.replace(/[^a-zA-Z0-9-._]/g, '_'));
  assert(!sanitized.includes('..\\') && !sanitized.includes('../'), 'Path traversal should be removed');
}

function testBuildFfmpegOptionsClampsNumbers() {
  const options = buildFfmpegOptions({
    codec: 'h265',
    bitrate: '50000',
    audioQuality: '500',
    frameRate: '480',
    resolution: '1080x1920',
    normalizeAudio: 'true'
  });

  assert.strictEqual(options.codec, 'libx265');
  assert.strictEqual(options.bitrate, 30000, 'Bitrate should be capped to 30000 kbps');
  assert.strictEqual(options.audioBitrate, 320, 'Audio bitrate should be capped to 320 kbps');
  assert.strictEqual(options.framerate, 240, 'Framerate should be capped to 240 fps');
  assert.strictEqual(options.targetHeight, 1920);
  assert.strictEqual(options.normalizeAudio, true);
}

function runTests() {
  console.log('Running server helper tests...');
  testSanitizeDownloadName();
  testBuildFfmpegOptionsClampsNumbers();
  console.log('All tests passed.');
}

runTests();

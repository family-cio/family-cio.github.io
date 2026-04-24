const WORKER_URL = 'https://wedding-photo-upload.familycio.workers.dev/upload';

// ── Falling blush-pink hearts ────────────────────────────
const HEART_COLORS = ['#f2c4c4', '#e8a9a9', '#f5d0d0', '#ebbaba'];
for (let i = 0; i < 16; i++) {
  const size  = 10 + Math.random() * 14;
  const color = HEART_COLORS[i % HEART_COLORS.length];
  const wrap  = document.createElement('div');
  wrap.className = 'heart';
  Object.assign(wrap.style, {
    left:              (Math.random() * 100) + 'vw',
    top:               '-30px',
    animationDuration: (10 + Math.random() * 14) + 's',
    animationDelay:    (Math.random() * 18) + 's',
  });
  wrap.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 32 29.6" xmlns="http://www.w3.org/2000/svg">
    <path fill="${color}" d="M23.6 0C20.9 0 18.4 1.3 16 4 13.6 1.3 11.1 0 8.4 0 3.8 0 0 3.8 0 8.4c0 9.4 16 21.2 16 21.2S32 17.8 32 8.4C32 3.8 28.2 0 23.6 0z"/>
  </svg>`;
  document.body.appendChild(wrap);
}

// ── App state ────────────────────────────────────────────
let selectedFiles = [];
const fileInput   = document.getElementById('file-input');
const dropZone    = document.getElementById('drop-zone');
const previewSec  = document.getElementById('preview-section');
const previewGrid = document.getElementById('preview-grid');
const countEl     = document.getElementById('count');
const pluralEl    = document.getElementById('plural');
const uploadBtn   = document.getElementById('upload-btn');
const progressSec = document.getElementById('progress-section');
const guestNameEl = document.getElementById('guest-name');

fileInput.addEventListener('change', () => handleFiles(fileInput.files));
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
  const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
  selectedFiles = [...selectedFiles, ...imgs];
  renderPreviews();
}

function renderPreviews() {
  previewGrid.innerHTML = '';
  selectedFiles.forEach(file => {
    const img = document.createElement('img');
    img.className = 'preview-thumb';
    img.src = URL.createObjectURL(file);
    previewGrid.appendChild(img);
  });
  countEl.textContent = selectedFiles.length;
  pluralEl.textContent = selectedFiles.length === 1 ? '' : 's';
  previewSec.style.display = selectedFiles.length ? 'block' : 'none';
  uploadBtn.disabled = selectedFiles.length === 0;
}

uploadBtn.addEventListener('click', startUpload);

async function startUpload() {
  if (!selectedFiles.length) return;
  uploadBtn.disabled = true;
  progressSec.innerHTML = '';

  const guestName = guestNameEl.value.trim().replace(/[^a-zA-Z0-9_\- ]/g, '') || 'guest';
  const ts = Date.now();

  const items = selectedFiles.map((file, i) => {
    const ext  = file.name.split('.').pop().toLowerCase();
    const name = `${ts}_${guestName.replace(/ /g,'_')}_${i+1}.${ext}`;
    const el   = createProgItem(file.name);
    progressSec.appendChild(el);
    return { file, name, el };
  });

  let ok = 0, fail = 0;
  for (const item of items) {
    try {
      setProgStatus(item.el, 'uploading');
      await uploadViaWorker(item.file, item.name);
      setProgStatus(item.el, 'done');
      ok++;
    } catch (err) {
      setProgStatus(item.el, 'error', err.message);
      fail++;
    }
  }

  selectedFiles = [];
  fileInput.value = '';
  renderPreviews(); // also sets uploadBtn.disabled = true since selectedFiles is now empty

  // Clear progress indicators after a short delay so the user sees final state
  setTimeout(() => { progressSec.innerHTML = ''; }, 2500);

  showToast(
    fail === 0
      ? `🌸 ${ok} photo${ok > 1 ? 's' : ''} shared — thank you!`
      : `${ok} shared · ${fail} failed`,
    fail === 0 ? 'success' : 'error'
  );
}

async function uploadViaWorker(file, filename) {
  const body = new FormData();
  body.append('file', file);
  body.append('filename', filename);

  const res = await fetch(WORKER_URL, { method: 'POST', body });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

function createProgItem(filename) {
  const div = document.createElement('div');
  div.className = 'prog-item';
  div.innerHTML = `
    <span class="status">🌊</span>
    <div style="flex:1;overflow:hidden">
      <div class="filename">${filename}</div>
      <div class="prog-bar-wrap"><div class="prog-bar"></div></div>
    </div>`;
  return div;
}

function setProgStatus(el, state, msg) {
  const icon = el.querySelector('.status');
  const bar  = el.querySelector('.prog-bar');
  if (state === 'uploading') {
    icon.textContent = '📤';
    bar.style.width = '55%';
  } else if (state === 'done') {
    icon.textContent = '🌸';
    bar.style.width = '100%';
    bar.style.background = 'var(--sage-dark)';
    el.classList.add('done');
  } else {
    icon.textContent = '🌧️';
    bar.style.width = '100%';
    bar.style.background = '#d4807a';
    el.classList.add('err');
    el.querySelector('.filename').textContent += ` — ${msg}`;
  }
}

let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 3800);
}

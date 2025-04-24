const fileInput = document.getElementById('fileInput');
const viewer = document.getElementById('viewer');
const uploadZone = document.getElementById('upload-zone');
const uploadContent = document.getElementById('upload-content');
const browseText = document.getElementById('browse-text');
const pageIndicator = document.getElementById('page-indicator');
const topBar = document.getElementById('top-bar');

let currentPage = 1;
let pdfDoc = null;
let showPercentage = false;
let topBarVisible = false;
let inactivityTimer;

topBar.style.top = '-60px';

function showTopBar() {
  if (window.matchMedia('(pointer: coarse)').matches) {
    topBar.style.top = '0';
    topBarVisible = true;
    resetInactivityTimer();
  }
}

function hideTopBar() {
  if (window.matchMedia('(pointer: coarse)').matches) {
    topBar.style.top = '-60px';
    topBarVisible = false;
  }
}

pageIndicator.addEventListener('click', () => {
  showPercentage = !showPercentage;
  updatePageIndicator();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

uploadZone.addEventListener('click', () => fileInput.click());
browseText.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

viewer.addEventListener('click', (e) => {
  if (pdfDoc && !e.target.closest('.nav-arrow') && !e.target.closest('#page-indicator')) {
    if (window.matchMedia('(pointer: coarse)').matches) {
      if (topBarVisible) {
        hideTopBar();
      } else {
        showTopBar();
      }
    }
  }
});

viewer.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  resetInactivityTimer();
});

viewer.addEventListener('touchend', (e) => {
  touchEndY = e.changedTouches[0].clientY;
  const swipeDistance = touchEndY - touchStartY;
  if (swipeDistance > 100) showTopBar();
});

const reloadButton = document.getElementById('reload-button');
reloadButton.addEventListener('click', () => window.location.reload());

const backButton = document.getElementById('back-button');
backButton.addEventListener('click', () => {
  window.location.reload();
});

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.10.377/build/pdf.worker.min.js';

function handleFile(file) {
  if (file.type !== 'application/pdf') {
    alert('Please upload a valid PDF.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    uploadZone.style.display = 'none';
    viewer.style.display = 'block';
    showTopBar();
    if (window.matchMedia('(pointer: fine)').matches) {
      document.getElementById('back-button').classList.add('visible');
    }
    renderPDF(e.target.result);
  };
  reader.readAsArrayBuffer(file);
}

function renderPDF(arrayBuffer) {
  viewer.innerHTML = `
    <div id="pdf-container" style="width:100%;height:100%;"></div>
    <div class="loading-spinner"></div>
    <button class="nav-arrow" id="prevPage">◄</button>
    <button class="nav-arrow" id="nextPage">►</button>
  `;
  viewer.appendChild(pageIndicator);

  const container = viewer.querySelector('#pdf-container');
  const prevButton = viewer.querySelector('#prevPage');
  const nextButton = viewer.querySelector('#nextPage');

  pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(pdf => {
    pdfDoc = pdf;
    viewer.querySelector('.loading-spinner').remove();
    updatePageIndicator();
    renderPage(currentPage);

    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
        updatePageIndicator();
      }
    });

    nextButton.addEventListener('click', () => {
      if (currentPage < pdfDoc.numPages) {
        currentPage++;
        renderPage(currentPage);
        updatePageIndicator();
      }
    });

    addSwipeListeners();
  }).catch(error => {
    console.error('PDF load error:', error);
    viewer.innerHTML = '<p>Error loading PDF. Try another.</p>';
  });
}

function updatePageIndicator() {
  if (!pdfDoc) return;
  pageIndicator.textContent = showPercentage
    ? `${Math.round((currentPage / pdfDoc.numPages) * 100)}% completed`
    : `Page ${currentPage} of ${pdfDoc.numPages}`;
}

function renderPage(pageNum) {
  const container = viewer.querySelector('#pdf-container');
  container.innerHTML = '';

  pdfDoc.getPage(pageNum).then(page => {
    const scale = Math.min(
      container.clientWidth / page.getViewport({ scale: 1 }).width,
      container.clientHeight / page.getViewport({ scale: 1 }).height
    );
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    container.appendChild(canvas);
    page.render({ canvasContext: context, viewport });
  });
}

function addSwipeListeners() {
  let startX = 0, endX = 0;
  viewer.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].screenX;
  });
  viewer.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].screenX;
    const dist = endX - startX;
    if (dist > 50 && currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
      updatePageIndicator();
    } else if (dist < -50 && currentPage < pdfDoc.numPages) {
      currentPage++;
      renderPage(currentPage);
      updatePageIndicator();
    }
  });
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  if (topBarVisible) {
    inactivityTimer = setTimeout(() => hideTopBar(), 3000);
  }
}

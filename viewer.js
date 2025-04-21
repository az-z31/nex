const fileInput = document.getElementById('fileInput');
const viewer = document.getElementById('viewer');
const uploadZone = document.getElementById('upload-zone');
const uploadContent = document.getElementById('upload-content');
const browseText = document.getElementById('browse-text');

// Handle file input change
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) handleFile(file);
});

// Handle click on upload zone or "browse" text
uploadZone.addEventListener('click', () => fileInput.click());
browseText.addEventListener('click', () => fileInput.click());

// Handle drag-and-drop
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

function handleFile(file) {
  if (file.type !== 'application/pdf') {
    alert('Please upload a valid PDF file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadZone.style.display = 'none';
    viewer.style.display = 'block';
    renderPDF(e.target.result);
  };
  reader.readAsArrayBuffer(file);
}

let currentPage = 1;
let pdfDoc = null;

function addSwipeListeners() {
  let touchStartX = 0;
  let touchEndX = 0;

  viewer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  viewer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  function handleSwipe() {
    const swipeThreshold = 50; // Minimum swipe distance in pixels
    const swipeDistance = touchEndX - touchStartX;

    if (swipeDistance > swipeThreshold) {
      // Swipe right - previous page
      if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
      }
    } else if (swipeDistance < -swipeThreshold) {
      // Swipe left - next page
      if (currentPage < pdfDoc.numPages) {
        currentPage++;
        renderPage(currentPage);
      }
    }
  }
}

function renderPDF(arrayBuffer) {
  viewer.innerHTML = `
    <div id="pdf-container" style="width:100%;height:100%;"></div>
    <div class="loading-spinner"></div>
    <button class="nav-arrow" id="prevPage">◄</button>
    <button class="nav-arrow" id="nextPage">►</button>
  `;
  
  const container = viewer.querySelector('#pdf-container');
  const prevButton = viewer.querySelector('#prevPage');
  const nextButton = viewer.querySelector('#nextPage');
  
  pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(pdf => {
    pdfDoc = pdf;
    viewer.querySelector('.loading-spinner').remove();
    renderPage(currentPage);
    
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
      }
    });
    
    nextButton.addEventListener('click', () => {
      if (currentPage < pdfDoc.numPages) {
        currentPage++;
        renderPage(currentPage);
      }
    });

    addSwipeListeners();
  }).catch(error => {
    console.error('Error loading PDF:', error);
    viewer.innerHTML = '<p>Error loading PDF. Please try another file.</p>';
  });
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
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    page.render(renderContext);
  }).catch(error => {
    console.error('Error rendering page:', error);
    container.innerHTML = '<p>Error rendering page.</p>';
  });
} 
const fileInput = document.getElementById('fileInput');
const viewer = document.getElementById('viewer');
const uploadZone = document.getElementById('upload-zone');
const uploadContent = document.getElementById('upload-content');
const browseText = document.getElementById('browse-text');
const pageIndicator = document.getElementById('page-indicator');

let currentPage = 1;
let pdfDoc = null;
let showPercentage = false; // Track whether to show percentage or page number

// Toggle between page number and percentage on click
pageIndicator.addEventListener('click', () => {
  showPercentage = !showPercentage; // Toggle the state
  updatePageIndicator();
});

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

// Add click event to show/hide top bar
let topBarVisible = false;
const topBar = document.getElementById('top-bar');

// Initially hide the top bar
topBar.style.display = 'none';

viewer.addEventListener('click', (e) => {
  // Only trigger if the click is not on the navigation arrows or page indicator
  if (pdfDoc && !e.target.closest('.nav-arrow') && !e.target.closest('#page-indicator')) {
    topBarVisible = !topBarVisible;
    topBar.style.top = topBarVisible ? '0' : '-60px';
  }
});

// Fix for PDF.js worker warning
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.10.377/build/pdf.worker.min.js';

// Add swipe down detection for mobile
let touchStartY = 0;
let touchEndY = 0;
const swipeThreshold = 100; // Minimum swipe distance in pixels

viewer.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
});

viewer.addEventListener('touchend', (e) => {
  touchEndY = e.changedTouches[0].clientY;
  handleSwipe();
});

function handleSwipe() {
  const swipeDistance = touchEndY - touchStartY;

  if (swipeDistance > swipeThreshold) {
    // Swipe down detected - show top bar
    topBar.style.top = '0';
  }
}

// Add reload button functionality for desktop
const reloadButton = document.getElementById('reload-button');
reloadButton.addEventListener('click', () => {
  window.location.reload();
});

// Add back button functionality
const backButton = document.getElementById('back-button');
backButton.addEventListener('click', () => {
  // Reset viewer state
  viewer.style.display = 'none';
  uploadZone.style.display = 'flex';
  pdfDoc = null;
  currentPage = 1;
  topBar.style.top = '-60px';
  topBar.style.display = 'none';
});

// Show top bar when PDF is loaded
function handleFile(file) {
  if (file.type !== 'application/pdf') {
    alert('Please upload a valid PDF file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadZone.style.display = 'none';
    viewer.style.display = 'block';
    topBar.style.display = 'block';
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
  
  // Reattach the page indicator to the viewer
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
    console.error('Error loading PDF:', error);
    viewer.innerHTML = '<p>Error loading PDF. Please try another file.</p>';
  });
}

function updatePageIndicator() {
  if (pdfDoc) {
    if (showPercentage) {
      // Calculate the percentage of the book completed
      const percentage = Math.round((currentPage / pdfDoc.numPages) * 100);
      pageIndicator.textContent = `${percentage}% completed`;
    } else {
      // Show the current page and total pages
      pageIndicator.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
    }
  }
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
        updatePageIndicator();
      }
    } else if (swipeDistance < -swipeThreshold) {
      // Swipe left - next page
      if (currentPage < pdfDoc.numPages) {
        currentPage++;
        renderPage(currentPage);
        updatePageIndicator();
      }
    }
  }
} 
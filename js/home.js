pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.10.377/build/pdf.worker.min.js';

// Initialize variables
const fileInput = document.getElementById('fileInput');
const viewer = document.getElementById('viewer');
const uploadZone = document.getElementById('upload-zone');
const continueReading = document.getElementById('continue-reading');
const backButton = document.getElementById('back-button');
const topBar = document.getElementById('top-bar');
const pageIndicator = document.getElementById('page-indicator');
const pdfContainer = document.getElementById('pdf-container');
const recentBooksContainer = document.getElementById('recent-books');
const browseText = document.getElementById('browse-text');

let currentPage = 1;
let pdfDoc = null;
let scale = 1;
let isTopBarVisible = false;
let touchStartY = 0;
let touchEndY = 0;
const SWIPE_THRESHOLD = 50;
let inactivityTimer;
let currentFileName = null;

// Initialize UI
topBar.style.top = '-60px';
backButton.style.display = 'none';
viewer.style.display = 'none';

// Event listeners
fileInput.addEventListener('change', handleFile);
backButton.addEventListener('click', goBackToHome);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('touchstart', handleTouchStart);
document.addEventListener('touchend', handleTouchEnd);
pageIndicator.addEventListener('click', togglePercentage);

// Add these after your existing event listeners
document.getElementById('prevPage').addEventListener('click', previousPage);
document.getElementById('nextPage').addEventListener('click', nextPage);

// Add swipe handling only for touch devices
if (window.matchMedia('(pointer: coarse)').matches) {
  document.addEventListener('touchstart', handleTouchStart);
  document.addEventListener('touchend', handleTouchEnd);
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
  if (recentBooks.length > 0) {
    continueReading.style.display = 'block';
    displayRecentBooks();
  } else {
    continueReading.style.display = 'none';
  }
});

// File handling
function handleFile(e) {
  const file = e.target.files[0];
  if (!file || file.type !== 'application/pdf') {
    alert('Please upload a valid PDF.');
    return;
  }

  // Set the current file name
  currentFileName = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    const searchHeader = document.querySelector('.search-header');
    if (searchHeader) {
      searchHeader.style.display = 'none';
    }
    
    uploadZone.style.display = 'none';
    viewer.style.display = 'block';
    continueReading.style.display = 'none';
    backButton.style.display = 'block';
    
    // Check for existing reading progress
    const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
    const existingBook = recentBooks.find(book => book.name === file.name);
    const startPage = existingBook ? Math.min(existingBook.lastPage, existingBook.totalPages) : 1;

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) });
    loadingTask.promise.then(pdf => {
      pdfDoc = pdf;
      currentPage = startPage;
      
      // Update the book info with the new data
      const updatedBooks = recentBooks.map(book => {
        if (book.name === file.name) {
          return {
            ...book,
            totalPages: pdf.numPages,
            lastPage: currentPage
          };
        }
        return book;
      });
      
      // If the book doesn't exist, add it
      if (!existingBook) {
        updatedBooks.unshift({
          name: file.name,
          lastPage: currentPage,
          totalPages: pdf.numPages,
          timestamp: new Date().getTime()
        });
      }
      
      // Keep only last 5 books
      if (updatedBooks.length > 5) updatedBooks.pop();
      
      localStorage.setItem('recentBooks', JSON.stringify(updatedBooks));
      displayRecentBooks();
      
      // Render the page after updating the book info
      renderPage(currentPage);
      updatePageIndicator();
    }).catch(error => {
      console.error('Error loading PDF:', error);
      alert('Error loading PDF. Please try again.');
      goBackToHome();
    });
  };
  
  reader.readAsArrayBuffer(file);
}

// PDF rendering
function renderPDF(data) {
  pdfjsLib.getDocument(data).promise.then(pdf => {
    pdfDoc = pdf;
    renderPage(1);
  }).catch(error => {
    console.error('Error loading PDF:', error);
    alert('Error loading PDF. Please try again.');
  });
}

function renderPage(pageNum) {
  if (!pdfDoc) {
    console.error('PDF document not loaded');
    return;
  }

  pdfDoc.getPage(pageNum).then(page => {
    const scale = Math.min(
      pdfContainer.clientWidth / page.getViewport({ scale: 1 }).width,
      pdfContainer.clientHeight / page.getViewport({ scale: 1 }).height
    );
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    pdfContainer.innerHTML = '';
    pdfContainer.appendChild(canvas);
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    page.render(renderContext);
    
    console.log(`Page ${pageNum} rendered`);
    updatePageIndicator();
  }).catch(error => {
    console.error('Error rendering page:', error);
  });
}

// Navigation
function goToPage(pageNum) {
  if (pageNum < 1 || pageNum > pdfDoc.numPages) return;
  renderPage(pageNum);
}

function nextPage() {
  if (currentPage < pdfDoc.numPages) {
    currentPage++;
    updateCurrentPage(currentPage);
    renderPage(currentPage);
    updatePageIndicator();
  }
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    updateCurrentPage(currentPage);
    renderPage(currentPage);
    updatePageIndicator();
  }
}

// UI updates
function updatePageIndicator() {
  pageIndicator.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
}

function togglePercentage() {
  const indicator = document.getElementById('page-indicator');
  if (indicator.classList.contains('percentage')) {
    indicator.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
    indicator.classList.remove('percentage');
  } else {
    const percentage = Math.round((currentPage / pdfDoc.numPages) * 100);
    indicator.textContent = `${percentage}%`;
    indicator.classList.add('percentage');
  }
}

// Continue reading
function displayRecentBooks() {
  const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
  recentBooksContainer.innerHTML = '';
  
  recentBooks.forEach(book => {
    const bookElement = document.createElement('div');
    bookElement.className = 'recent-book';
    
    bookElement.innerHTML = `
      <div class="placeholder-cover">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
      </div>
      <div class="progress" style="width: ${(book.lastPage / book.totalPages || 0) * 100}%"></div>
      <div class="title">${book.name}</div>
    `;
    
    bookElement.addEventListener('click', () => {
      alert('Please re-upload the PDF file to continue reading.');
      fileInput.click();
    });
    
    recentBooksContainer.appendChild(bookElement);
  });
}

// Save state
function saveBookInfo(name, data, totalPages) {
  const arrayBuffer = new Uint8Array(data).buffer;
  
  pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(pdf => {
    const books = JSON.parse(localStorage.getItem('recentBooks') || '[]');
    
    // Check if book already exists
    const existingIndex = books.findIndex(book => book.name === name);
    if (existingIndex > -1) {
      books.splice(existingIndex, 1);
    }
    
    // Add new book to the beginning
    books.unshift({
      name: name,
      lastPage: currentPage,
      totalPages: totalPages,
      timestamp: new Date().getTime()
    });
    
    // Keep only last 5 books
    if (books.length > 5) books.pop();
    
    localStorage.setItem('recentBooks', JSON.stringify(books));
    displayRecentBooks();
  }).catch(error => {
    console.error('Error saving book info:', error);
  });
}

function saveCurrentPage() {
  const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
  const currentBook = recentBooks.find(book => book.data === pdfDoc);
  if (currentBook) {
    currentBook.lastPage = currentPage;
    localStorage.setItem('recentBooks', JSON.stringify(recentBooks));
  }
}

// Navigation handlers
function handleKeyDown(e) {
  if (!pdfDoc) return;
  
  switch (e.key) {
    case 'ArrowRight':
      nextPage();
      break;
    case 'ArrowLeft':
      previousPage();
      break;
  }
}

function handleMouseMove() {
  if (!isTopBarVisible) {
    showTopBar();
    startInactivityTimer();
  }
}

function handleTouchStart(e) {
  touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
  touchEndY = e.changedTouches[0].clientY;
  const deltaY = touchStartY - touchEndY;
  
  if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
    if (deltaY > 0) {
      nextPage();
    } else {
      previousPage();
    }
  }
}

// Top bar controls
function showTopBar() {
  isTopBarVisible = true;
  topBar.style.top = '0';
}

function hideTopBar() {
  isTopBarVisible = false;
  topBar.style.top = '-60px';
}

function startInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(hideTopBar, 2000);
}

// Back to home
function goBackToHome() {
  const searchHeader = document.querySelector('.search-header');
  if (searchHeader) {
    searchHeader.style.display = 'block';
  }
  viewer.style.display = 'none';
  uploadZone.style.display = 'flex';
  continueReading.style.display = 'block';
  backButton.style.display = 'none';
  pdfDoc = null;
  currentPage = 1;
  currentFileName = null;
  fileInput.value = '';
}

// Add these event listeners
browseText.addEventListener('click', () => fileInput.click());

// Handle drag and drop
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
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    fileInput.files = e.dataTransfer.files;
    handleFile({ target: fileInput });
  }
});

// Add this function to handle page changes
function updateCurrentPage(page) {
  const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
  const updatedBooks = recentBooks.map(book => {
    if (book.name === currentFileName) {
      return {
        ...book,
        lastPage: page
      };
    }
    return book;
  });
  localStorage.setItem('recentBooks', JSON.stringify(updatedBooks));
}

const fileInput = document.getElementById('fileInput');
const viewer = document.getElementById('viewer');
const uploadZone = document.getElementById('upload-zone');
const uploadContent = document.getElementById('upload-content');
const browseText = document.getElementById('browse-text');
const pageIndicator = document.getElementById('page-indicator');
const topBar = document.getElementById('top-bar');

let currentPage = localStorage.getItem('lastPage') ? parseInt(localStorage.getItem('lastPage')) : 1;
let pdfDoc = null;
let showPercentage = false;
let topBarVisible = false;
let inactivityTimer;
let touchStartY = 0;
let touchEndY = 0;
let currentFileName = '';

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

viewer.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  resetInactivityTimer();
});

viewer.addEventListener('touchend', (e) => {
  touchEndY = e.changedTouches[0].clientY;
  const swipeDistance = touchEndY - touchStartY;
  
  if (swipeDistance > 50 && !topBarVisible) {
    showTopBar();
  } else if (swipeDistance < -50 && topBarVisible) {
    hideTopBar();
  }
});

const reloadButton = document.getElementById('reload-button');
reloadButton.addEventListener('click', () => {
  localStorage.removeItem('lastPage');
  window.location.reload();
});

const backButton = document.getElementById('back-button');
backButton.addEventListener('click', () => {
  window.location.reload();
});

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.10.377/build/pdf.worker.min.js';

function handleFile(file) {
  if (!file || file.type !== 'application/pdf') {
    alert('Please upload a valid PDF.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    uploadZone.style.display = 'none';
    viewer.style.display = 'block';
    document.getElementById('continue-reading').style.display = 'none';
    if (window.matchMedia('(pointer: fine)').matches) {
      document.getElementById('back-button').classList.add('visible');
    }
    
    // Check if this is a continuation of a previous reading session
    const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
    const existingBook = recentBooks.find(book => book.name === file.name);
    const startPage = existingBook ? existingBook.lastPage : 1;
    
    // Set the current file name
    currentFileName = file.name;
    
    // Render the PDF with the correct page
    renderPDF(e.target.result, startPage);
    
    // Save the book info after rendering
    saveBookInfo(file.name, e.target.result);
  };
  
  fileInput.value = '';
  reader.readAsArrayBuffer(file);
}

function saveBookInfo(name, data) {
  const arrayBuffer = new Uint8Array(data).buffer;
  
  // Get the total number of pages
  pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(pdf => {
    const books = JSON.parse(localStorage.getItem('recentBooks') || '[]');
    
    // Check if book already exists
    const existingIndex = books.findIndex(book => book.name === name);
    if (existingIndex > -1) {
      books.splice(existingIndex, 1);
    }
    
    // Add new book to the beginning (without storing the actual PDF data)
    books.unshift({
      name: name,
      lastPage: currentPage,
      totalPages: pdf.numPages,
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

function displayRecentBooks() {
  const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
  const container = document.getElementById('recent-books');
  container.innerHTML = '';

  recentBooks.forEach(book => {
    const bookElement = document.createElement('div');
    bookElement.className = 'recent-book';
    
    // Show a placeholder image since we're not storing the PDF data
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
      // Prompt user to re-upload the file
      alert('Please re-upload the PDF file to continue reading.');
      fileInput.click();
    });
    
    container.appendChild(bookElement);
  });
}

// Call displayRecentBooks when the page loads
document.addEventListener('DOMContentLoaded', () => {
  displayRecentBooks();
  
  // If there's a last viewed book, show the upload zone with a message
  const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
  if (recentBooks.length > 0) {
    const lastBook = recentBooks[0];
    document.getElementById('continue-reading').style.display = 'block';
    document.getElementById('upload-content').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="upload-icon">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <p>Upload "${lastBook.name}" to continue reading from page ${lastBook.lastPage}</p>
      <input type="file" id="fileInput" accept=".pdf">
    `;
  }
});

function renderPDF(arrayBuffer, startPage = 1) {
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
    currentPage = startPage; // Set after pdfDoc is ready
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
    
  // Save page progress
  const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
  const updatedBooks = recentBooks.map(book => {
    if (book.name === currentFileName) {
      return { ...book, lastPage: currentPage };
    }
    return book;
  });
  localStorage.setItem('recentBooks', JSON.stringify(updatedBooks));
}

function renderPage(pageNum) {
  const container = viewer.querySelector('#pdf-container');
  container.innerHTML = '';

  if (!pdfDoc) {
    console.error('PDF document not loaded');
    return;
  }

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
    
    // Save the current page to localStorage
    localStorage.setItem('lastPage', pageNum);
    console.log('Rendered page:', pageNum); // Debugging
  }).catch(error => {
    console.error('Error rendering page:', error);
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

// Add this function for testing
function clearRecentBooks() {
  localStorage.removeItem('recentBooks');
  displayRecentBooks();
}

// You can call this function from the browser console to reset the recent books
// clearRecentBooks();

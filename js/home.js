// Function to display recent books
function displayRecentBooks() {
  const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
  const container = document.getElementById('recent-books');
  
  if (!container) return;
  
  container.innerHTML = '';
  
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
      // Redirect to pdf.html when a book is clicked
      window.location.href = 'pdf.html';
    });
    
    container.appendChild(bookElement);
  });
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const recentBooks = JSON.parse(localStorage.getItem('recentBooks') || '[]');
  const continueReading = document.getElementById('continue-reading');
  
  if (continueReading) {
    if (recentBooks.length > 0) {
      continueReading.style.display = 'block';
      displayRecentBooks();
    } else {
      continueReading.style.display = 'none';
    }
  }
});

// Import table manager
import { TableManager } from './table-manager.js';

// Store PDF list and current index
let pdfList = [];
let currentIndex = -1;
let currentFilename = '';
let currentPageCount = 0;
let currentlyEditing = null;
let editingFilename = false;
let tableManager = null; // Table manager instance
let currentMetadata = null; // Store current metadata
let aiSuggestions = null; // Store AI suggestions for diff display

// Set up header button event listeners directly
// This is more reliable than delegation when buttons might be recreated
function setupHeaderButtons() {
  // Remove existing listeners by cloning and replacing buttons (prevents duplicates)
  const backBtn = document.getElementById('back-to-list-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const splitBtn = document.getElementById('split-btn');
  
  if (backBtn) {
    // Clone to remove old listeners
    const currentDisplay = backBtn.style.display; // Preserve current display state
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);
    newBackBtn.style.display = currentDisplay; // Restore display state after cloning
    newBackBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Back to list clicked');
      showFileListView();
      await loadFileList();
    });
  }
  
  if (prevBtn) {
    const newPrevBtn = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    newPrevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Previous clicked');
      navigatePrevious();
    });
  }
  
  if (nextBtn) {
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Next clicked');
      navigateNext();
    });
  }
  
  if (splitBtn) {
    const newSplitBtn = splitBtn.cloneNode(true);
    splitBtn.parentNode.replaceChild(newSplitBtn, splitBtn);
    newSplitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Split clicked');
      if (currentFilename) {
        try {
          const response = await fetch(`/api/metadata/${encodeURIComponent(currentFilename)}`);
          const metadata = await response.json();
          showSplitterView(currentFilename, metadata);
        } catch (error) {
          console.error('Error loading metadata for splitter:', error);
          alert('Error loading PDF metadata');
        }
      }
    });
  }
}

// Load available PDFs on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Show file list view by default
  showFileListView();
  await loadFileList();
  
  // Set up file list refresh button
  const refreshBtn = document.getElementById('refresh-list-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadFileList();
    });
  }
  
  // Set up buttons immediately
  setupHeaderButtons();
  
  // Also set up buttons after a short delay to catch any that are created later
  setTimeout(setupHeaderButtons, 100);
  
  // Hide back button initially (only show in detail view)
  const backToListBtn = document.getElementById('back-to-list-btn');
  if (backToListBtn) {
    backToListBtn.style.display = 'none';
  }
  
  // Filename click handler - use event delegation so it works after innerHTML updates
  document.addEventListener('click', (e) => {
    // Check if click is on the filename or the clickable span inside it
    if (e.target.id === 'pdf-name' || e.target.closest('#pdf-name .filename-clickable') || 
        (e.target.classList.contains('filename-clickable') && e.target.closest('#pdf-name'))) {
      handleFilenameClick(e);
    }
  });
  
  // Set up activity log toggle
  const activityLogToggle = document.getElementById('activity-log-toggle');
  if (activityLogToggle) {
    activityLogToggle.addEventListener('click', toggleActivityLog);
  }
});

async function loadPDFList() {
  try {
    const response = await fetch('/api/pdfs');
    pdfList = await response.json();
  } catch (error) {
    console.error('Error loading PDF list:', error);
  }
}

// File List View Functions
function showFileListView() {
  const fileListView = document.getElementById('file-list-view');
  const detailView = document.getElementById('detail-view');
  
  if (fileListView) fileListView.style.display = 'block';
  if (detailView) detailView.style.display = 'none';
  
  // Hide navigation buttons in list view (header stays visible)
  const backBtn = document.getElementById('back-to-list-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const splitBtn = document.getElementById('split-btn');
  const pdfName = document.getElementById('pdf-name');
  const viewTitle = document.getElementById('view-title');
  const refreshBtn = document.getElementById('refresh-list-btn');
  
  if (backBtn) backBtn.style.display = 'none';
  if (prevBtn) prevBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';
  if (splitBtn) splitBtn.style.display = 'none';
  if (pdfName) pdfName.style.display = 'none';
  if (viewTitle) {
    viewTitle.style.display = 'flex';
    viewTitle.textContent = 'PDF Files';
  }
  if (refreshBtn) refreshBtn.style.display = 'block';
}

function showDetailView() {
  document.getElementById('file-list-view').style.display = 'none';
  document.getElementById('detail-view').style.display = 'block';
  
  // Show navigation buttons in detail view (header always visible)
  const backBtn = document.getElementById('back-to-list-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const pdfName = document.getElementById('pdf-name');
  const viewTitle = document.getElementById('view-title');
  const refreshBtn = document.getElementById('refresh-list-btn');
  
  if (backBtn) backBtn.style.display = 'block';
  if (prevBtn) prevBtn.style.display = 'flex';
  if (nextBtn) nextBtn.style.display = 'flex';
  if (pdfName) pdfName.style.display = 'flex';
  if (viewTitle) viewTitle.style.display = 'none';
  if (refreshBtn) refreshBtn.style.display = 'none';
  
  // Re-setup header buttons to ensure they work
  setupHeaderButtons();
  
  // Ensure buttons are visible after setup (setupHeaderButtons preserves display state)
  // But we explicitly set them here to be safe
  if (backBtn) backBtn.style.display = 'block';
  if (prevBtn) prevBtn.style.display = 'flex';
  if (nextBtn) nextBtn.style.display = 'flex';
  if (pdfName) pdfName.style.display = 'flex';
}

async function loadFileList() {
  const container = document.getElementById('file-list-container');
  if (!container) return;
  
  container.innerHTML = '<p class="placeholder">Loading files...</p>';
  
  try {
    // First, load just filenames quickly (no metadata)
    const quickResponse = await fetch('/api/files-list?metadata=false');
    if (!quickResponse.ok) {
      throw new Error('Failed to load files');
    }
    
    const quickData = await quickResponse.json();
    const files = quickData.files || quickData;
    const totalFiles = quickData.total || files.length;
    
    if (files.length === 0) {
      container.innerHTML = '<p class="placeholder">No PDF files found</p>';
      updateFileListStats(0, 0);
      return;
    }
    
    // Create native HTML table
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'file-list-table';
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th data-sort="string" data-filter="true" class="sortable">Filename</th>
        <th data-sort="string" data-filter="true" class="sortable">Title</th>
        <th data-sort="string" data-filter="true" class="sortable">Subject</th>
        <th data-sort="string" data-filter="true" class="sortable">Keywords</th>
        <th data-sort="number" data-filter="true" class="sortable text-center">Pages</th>
        <th data-sort="number" data-filter="true" class="sortable text-center">Updates</th>
        <th class="text-center">Actions</th>
      </tr>
    `;
    
    // Create table body
    const tbody = document.createElement('tbody');
    files.forEach(file => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-field="filename" data-filename="${escapeHtml(file.filename)}">
          <a href="#" class="file-name-link">${escapeHtml(file.filename)}</a>
        </td>
        <td data-field="title"><span class="loading-placeholder">Loading...</span></td>
        <td data-field="subject"><span class="loading-placeholder">Loading...</span></td>
        <td data-field="keywords"><span class="loading-placeholder">Loading...</span></td>
        <td data-field="pageCount" class="text-center"><span class="loading-placeholder">-</span></td>
        <td data-field="updateCount" class="text-center"><span class="loading-placeholder">-</span></td>
        <td class="text-center">
          <div class="actions-menu-container">
            <button class="kebab-menu-btn" data-filename="${escapeHtml(file.filename)}" aria-label="Actions menu" title="Actions">
              <span class="kebab-icon">
                <span class="kebab-dot"></span>
                <span class="kebab-dot"></span>
                <span class="kebab-dot"></span>
              </span>
            </button>
            <div class="actions-menu" data-filename="${escapeHtml(file.filename)}" style="display: none;">
              <button class="menu-item delete-menu-item" data-filename="${escapeHtml(file.filename)}">Delete</button>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Initialize table manager
    tableManager = new TableManager(table);
    
    // Add click handlers
    table.addEventListener('click', async (e) => {
      // Handle kebab menu button click
      if (e.target.closest('.kebab-menu-btn')) {
        e.stopPropagation();
        const btn = e.target.closest('.kebab-menu-btn');
        const filename = btn.dataset.filename;
        const menu = btn.parentElement.querySelector('.actions-menu');
        const isVisible = menu.style.display !== 'none';
        
        // Close all other menus
        table.querySelectorAll('.actions-menu').forEach(m => {
          m.style.display = 'none';
        });
        
        // Toggle this menu
        menu.style.display = isVisible ? 'none' : 'block';
      }
      // Handle menu item clicks
      else if (e.target.classList.contains('delete-menu-item')) {
        e.stopPropagation();
        const filename = e.target.dataset.filename;
        // Close menu
        e.target.closest('.actions-menu').style.display = 'none';
        await deleteFile(filename);
      }
      // Handle filename link clicks
      else if (e.target.classList.contains('file-name-link')) {
        e.preventDefault();
        const filename = e.target.closest('[data-filename]').dataset.filename;
        openFileDetail(filename);
      }
      // Close menus when clicking outside
      else {
        table.querySelectorAll('.actions-menu').forEach(m => {
          m.style.display = 'none';
        });
      }
    });
    
    // Close menus when clicking outside the table
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.file-list-table')) {
        table.querySelectorAll('.actions-menu').forEach(m => {
          m.style.display = 'none';
        });
      }
    });
    
    // Update stats with total files
    updateFileListStats(totalFiles, 0); // Will update edited count after metadata loads
    
    // Now load metadata in batches (progressive loading)
    await loadMetadataProgressively(files);
    
  } catch (error) {
    console.error('Error loading file list:', error);
    container.innerHTML = '<p class="placeholder">Error loading files</p>';
  }
}

// Update file list statistics
function updateFileListStats(totalFiles, filesWithEdits) {
  const totalFilesEl = document.getElementById('stat-total-files');
  const filesWithEditsEl = document.getElementById('stat-files-with-edits');
  
  if (totalFilesEl) {
    totalFilesEl.textContent = totalFiles;
  }
  if (filesWithEditsEl) {
    filesWithEditsEl.textContent = filesWithEdits;
  }
}

// Load metadata progressively in batches
async function loadMetadataProgressively(files, batchSize = 20) {
  if (!tableManager) return;
  
  const totalFiles = files.length;
  const filesWithEditsSet = new Set(); // Track unique files with edits
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    // Load metadata for this batch
    try {
      const response = await fetch(`/api/files-list?metadata=true&limit=${batch.length}&offset=${i}`);
      if (!response.ok) continue;
      
      const data = await response.json();
      const batchFiles = data.files || data;
      
      // Update table rows with metadata
      batchFiles.forEach(file => {
        const keywordsArray = file.keywords ? parseCommaDelimitedString(file.keywords) : [];
        
        // Track files with edits (updateCount > 0)
        if (file.updateCount && file.updateCount > 0) {
          filesWithEditsSet.add(file.filename);
        }
        
        tableManager.updateRow(file.filename, {
          title: file.title || '',
          subject: file.subject || '',
          keywords: file.keywords || '',
          keywordsArray: keywordsArray,
          pageCount: file.pageCount || 0,
          updateCount: file.updateCount || 0
        });
      });
      
      // Update stats after each batch
      updateFileListStats(totalFiles, filesWithEditsSet.size);
    } catch (error) {
      console.error(`Error loading metadata for batch ${i}-${i + batchSize}:`, error);
    }
    
    // Small delay between batches to keep UI responsive
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  // Final stats update
  updateFileListStats(totalFiles, filesWithEditsSet.size);
}

async function openFileDetail(filename) {
  // Load PDF list for navigation (cache if already loaded)
  if (!pdfList || pdfList.length === 0) {
    await loadPDFList();
  }
  
  // Find index of file
  currentIndex = pdfList.indexOf(filename);
  if (currentIndex === -1) {
    currentIndex = 0;
    if (pdfList.length > 0) {
      filename = pdfList[0];
    }
  }
  
  currentFilename = filename;
  aiSuggestions = null; // Clear suggestions when opening a new file
  
  // Show detail view immediately
  showDetailView();
  updatePDFNameDisplay();
  updateNavigationButtons();
  
  // Load metadata and preview in parallel for faster initial load
  // Metadata loads faster, so show it first
  const metadataPromise = loadPDFMetadata(filename);
  const previewPromise = loadPDFPreview(filename);
  
  // Wait for both, but metadata will likely finish first
  await Promise.all([metadataPromise, previewPromise]);
  updateSplitButtonVisibility();
}

async function deleteFile(filename) {
  if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete file');
    }
    
    // Reload file list
    await loadFileList();
    
    // If we deleted the current file, go back to list view
    if (currentFilename === filename) {
      showFileListView();
      currentFilename = '';
      currentIndex = -1;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    alert(`Error deleting file: ${error.message}`);
  }
}

function updatePDFNameDisplay() {
  const pdfNameElement = document.getElementById('pdf-name');
  
  if (editingFilename) {
    // Show input field with save button
    const currentName = currentFilename || '';
    const nameWithoutExt = currentName.replace(/\.pdf$/i, '');
    pdfNameElement.innerHTML = `
      <div class="filename-edit-container">
        <input type="text" 
               class="filename-input" 
               value="${escapeHtml(nameWithoutExt)}" 
               id="filename-edit-input"
               placeholder="Enter filename">
        <button class="save-btn filename-save-btn">Save</button>
        <button class="cancel-btn filename-cancel-btn">Cancel</button>
      </div>
    `;
    
    // Add event listeners
    const input = document.getElementById('filename-edit-input');
    const saveBtn = pdfNameElement.querySelector('.filename-save-btn');
    const cancelBtn = pdfNameElement.querySelector('.filename-cancel-btn');
    
    input.focus();
    input.select();
    
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent bubbling to parent
      handleFileRename();
    });
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent bubbling to parent
      cancelFilenameEdit();
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleFileRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelFilenameEdit();
      }
    });
  } else {
    // Show clickable filename with page count
    if (currentFilename) {
      const pageText = currentPageCount > 0 ? ` (${currentPageCount} ${currentPageCount === 1 ? 'page' : 'pages'})` : '';
      pdfNameElement.innerHTML = `<span class="filename-clickable">${escapeHtml(currentFilename)}${pageText}</span>`;
      pdfNameElement.style.cursor = 'pointer';
    } else {
      pdfNameElement.textContent = '-- No PDF selected --';
      pdfNameElement.style.cursor = 'default';
    }
  }
  
  // Update Split button visibility
  updateSplitButtonVisibility();
}

function updateSplitButtonVisibility() {
  const splitBtn = document.getElementById('split-btn');
  if (splitBtn) {
    // Show Split button only if PDF has more than 1 page
    splitBtn.style.display = (currentPageCount > 1 && currentFilename) ? 'block' : 'none';
  }
}

function handleFilenameClick(event) {
  // Don't trigger if clicking on buttons or input inside
  if (event.target.closest('.filename-save-btn') || 
      event.target.closest('.filename-cancel-btn') || 
      event.target.closest('.filename-input') ||
      event.target.closest('.filename-edit-container')) {
    return;
  }
  
  if (!currentFilename || editingFilename) return;
  
  editingFilename = true;
  updatePDFNameDisplay();
}

function cancelFilenameEdit() {
  editingFilename = false;
  updatePDFNameDisplay();
}

function navigatePrevious() {
  if (pdfList.length === 0) return;
  
  // Loop to end if at beginning
  if (currentIndex <= 0) {
    currentIndex = pdfList.length - 1;
  } else {
    currentIndex--;
  }
  
  const filename = pdfList[currentIndex];
  currentFilename = filename;
  currentlyEditing = null;
  editingFilename = false;
  aiSuggestions = null; // Clear suggestions when navigating
  updatePDFNameDisplay();
  updateNavigationButtons();
  
  // Load in parallel for faster navigation
  Promise.all([
    loadPDFPreview(filename),
    loadPDFMetadata(filename)
  ]).then(() => {
    updateSplitButtonVisibility();
  });
}

function navigateNext() {
  if (pdfList.length === 0) return;
  
  // Loop to beginning if at end
  if (currentIndex >= pdfList.length - 1) {
    currentIndex = 0;
  } else {
    currentIndex++;
  }
  
  const filename = pdfList[currentIndex];
  currentFilename = filename;
  currentlyEditing = null;
  editingFilename = false;
  aiSuggestions = null; // Clear suggestions when navigating
  updatePDFNameDisplay();
  updateNavigationButtons();
  
  // Load in parallel for faster navigation
  Promise.all([
    loadPDFPreview(filename),
    loadPDFMetadata(filename)
  ]).then(() => {
    updateSplitButtonVisibility();
  });
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  // Buttons are never disabled since we loop around
  prevBtn.disabled = pdfList.length === 0;
  nextBtn.disabled = pdfList.length === 0;
}

function clearDisplay() {
  currentFilename = '';
  currentPageCount = 0;
  updatePDFNameDisplay();
  updateSplitButtonVisibility();
  
  const preview = document.getElementById('pdf-preview');
  preview.innerHTML = '<p class="placeholder">Select a PDF file to view</p>';
  
  const metadata = document.getElementById('metadata-display');
  metadata.innerHTML = '<p class="placeholder">No file selected</p>';
}

async function loadPDFPreview(filename, useCacheBust = false) {
  const preview = document.getElementById('pdf-preview');
  let pdfUrl = `/pdfs/${encodeURIComponent(filename)}`;
  
  if (useCacheBust) {
    pdfUrl += `?t=${Date.now()}`;
  }
  
  try {
    // Show loading state
    preview.innerHTML = '<p class="placeholder">Loading preview...</p>';
    
    // Use PDF.js for minimal preview
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    // Update page count immediately (from PDF object, faster than rendering)
    currentPageCount = pdf.numPages;
    updatePDFNameDisplay();
    updateSplitButtonVisibility();
    
    preview.innerHTML = '';
    
    // Render first page immediately for fast initial display
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'pdf-pages-container';
    
    // Render first page synchronously
    const firstPage = await pdf.getPage(1);
    const firstViewport = firstPage.getViewport({ scale: 1.2 });
    
    const firstPageWrapper = document.createElement('div');
    firstPageWrapper.className = 'pdf-page-wrapper';
    
    const firstCanvas = document.createElement('canvas');
    const firstContext = firstCanvas.getContext('2d');
    firstCanvas.height = firstViewport.height;
    firstCanvas.width = firstViewport.width;
    
    await firstPage.render({
      canvasContext: firstContext,
      viewport: firstViewport
    }).promise;
    
    const firstPageLabel = document.createElement('div');
    firstPageLabel.className = 'page-label';
    firstPageLabel.textContent = 'Page 1';
    
    firstPageWrapper.appendChild(firstPageLabel);
    firstPageWrapper.appendChild(firstCanvas);
    pagesContainer.appendChild(firstPageWrapper);
    
    preview.appendChild(pagesContainer);
    
    // Lazy load remaining pages in background (non-blocking)
    if (pdf.numPages > 1) {
      // Show a loading indicator for remaining pages
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'pdf-loading-indicator';
      loadingIndicator.textContent = `Loading ${pdf.numPages - 1} more page${pdf.numPages - 1 > 1 ? 's' : ''}...`;
      pagesContainer.appendChild(loadingIndicator);
      
      // Load remaining pages asynchronously
      loadRemainingPages(pdf, pagesContainer, loadingIndicator);
    }
    
  } catch (error) {
    console.error('Error loading PDF preview:', error);
    preview.innerHTML = '<p class="placeholder">Error loading PDF preview</p>';
    currentPageCount = 0;
    updatePDFNameDisplay();
    updateSplitButtonVisibility();
  }
}

// Load remaining PDF pages in background
async function loadRemainingPages(pdf, container, loadingIndicator) {
  try {
    for (let pageNum = 2; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.2 });
      
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page-wrapper';
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      const pageLabel = document.createElement('div');
      pageLabel.className = 'page-label';
      pageLabel.textContent = `Page ${pageNum}`;
      
      pageWrapper.appendChild(pageLabel);
      pageWrapper.appendChild(canvas);
      
      // Insert before loading indicator
      container.insertBefore(pageWrapper, loadingIndicator);
      
      // Small delay to prevent blocking UI
      if (pageNum % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // Remove loading indicator when done
    if (loadingIndicator && loadingIndicator.parentNode) {
      loadingIndicator.remove();
    }
  } catch (error) {
    console.error('Error loading remaining pages:', error);
    if (loadingIndicator) {
      loadingIndicator.textContent = 'Error loading some pages';
      loadingIndicator.className = 'pdf-loading-indicator error';
    }
  }
}

async function loadPDFMetadata(filename) {
  try {
    const response = await fetch(`/api/metadata/${encodeURIComponent(filename)}`);
    const metadata = await response.json();
    
    // Store current metadata
    currentMetadata = metadata;
    
    // Store page count for navigation bar display
    currentPageCount = metadata.pageCount || 0;
    updatePDFNameDisplay();
    updateSplitButtonVisibility();
    
    displayMetadata(metadata, aiSuggestions);
  } catch (error) {
    console.error('Error loading metadata:', error);
    const metadataDisplay = document.getElementById('metadata-display');
    metadataDisplay.innerHTML = '<p class="placeholder">Error loading metadata</p>';
    currentPageCount = 0;
    updatePDFNameDisplay();
    updateSplitButtonVisibility();
  }
}


function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to render diff view for a field
function renderDiffValue(currentValue, suggestedValue, isEmpty) {
  if (!suggestedValue || suggestedValue === currentValue) {
    // No suggestion or suggestion matches current - show normal
    return isEmpty ? '<span class="empty">(empty)</span>' : escapeHtml(currentValue);
  }
  
  // Show diff: current (red strikethrough) → suggested (green)
  const currentDisplay = currentValue || '(empty)';
  const suggestedDisplay = suggestedValue || '(empty)';
  
  return `
    <span class="diff-value">
      <span class="diff-removed">${escapeHtml(currentDisplay)}</span>
      <span class="diff-arrow"> → </span>
      <span class="diff-added">${escapeHtml(suggestedDisplay)}</span>
    </span>
  `;
}

// Helper function to render keywords diff
function renderKeywordsDiff(currentKeywords, suggestedKeywords) {
  const currentArray = currentKeywords ? parseCommaDelimitedString(currentKeywords) : [];
  const suggestedArray = suggestedKeywords ? parseCommaDelimitedString(suggestedKeywords) : [];
  
  // Check if they're the same
  const currentStr = currentArray.sort().join(',');
  const suggestedStr = suggestedArray.sort().join(',');
  
  if (currentStr === suggestedStr) {
    // No change - show normal
    if (currentArray.length === 0) {
      return '<span class="empty">(empty)</span>';
    }
    return '<div class="tags-display">' + currentArray.map(tag => {
      const isWarning = tag === 'needs-deleting' || tag === 'duplicate';
      return `<span class="tag ${isWarning ? 'tag-warning' : ''}">${escapeHtml(tag)}</span>`;
    }).join('') + '</div>';
  }
  
  // Show diff
  const removedTags = currentArray.filter(t => !suggestedArray.includes(t));
  const addedTags = suggestedArray.filter(t => !currentArray.includes(t));
  const keptTags = currentArray.filter(t => suggestedArray.includes(t));
  
  let html = '<div class="tags-diff">';
  
  // Show removed tags (red strikethrough)
  if (removedTags.length > 0) {
    html += '<div class="tags-removed">';
    removedTags.forEach(tag => {
      html += `<span class="tag tag-removed">${escapeHtml(tag)}</span>`;
    });
    html += '</div>';
  }
  
  // Show kept tags (normal)
  if (keptTags.length > 0) {
    html += '<div class="tags-kept">';
    keptTags.forEach(tag => {
      const isWarning = tag === 'needs-deleting' || tag === 'duplicate';
      html += `<span class="tag ${isWarning ? 'tag-warning' : ''}">${escapeHtml(tag)}</span>`;
    });
    html += '</div>';
  }
  
  // Show added tags (green)
  if (addedTags.length > 0) {
    html += '<div class="tags-added">';
    addedTags.forEach(tag => {
      html += `<span class="tag tag-added">${escapeHtml(tag)}</span>`;
    });
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

// Parse comma-delimited string, handling quoted values
function parseCommaDelimitedString(str) {
  if (!str || typeof str !== 'string') return [];
  
  // Simple split by comma, then trim each item
  const result = str
    .split(',')
    .map(item => {
      // Remove quotes if present and trim
      let trimmed = item.trim();
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        trimmed = trimmed.slice(1, -1).trim();
      }
      return trimmed;
    })
    .filter(item => item.length > 0);
  
  return result;
}

function displayMetadata(metadata, suggestions = null) {
  const metadataDisplay = document.getElementById('metadata-display');
  if (!metadataDisplay) return;
  
  // Show loading state immediately
  metadataDisplay.innerHTML = '<p class="placeholder">Loading metadata...</p>';
  
  // Defer heavy DOM work to next frame to keep UI responsive
  requestAnimationFrame(() => {
    // Main editable fields - shown first (always visible)
    const mainFields = [
      { key: 'filename', label: 'Filename', editable: false, isFilename: true }, // Filename is special - not editable in metadata but can be renamed
      { key: 'title', label: 'Title', editable: true },
      { key: 'keywords', label: 'Keywords', editable: true }
    ];
    
    // Secondary editable fields - shown before system fields
    const secondaryFields = [
      { key: 'subject', label: 'Subject', editable: true },
      { key: 'author', label: 'Author', editable: true }
    ];
    
    // System fields - shown at bottom, smaller, not editable
    const systemFields = [
      { key: 'creator', label: 'Creator', editable: false },
      { key: 'producer', label: 'Producer', editable: false },
      { key: 'creationDate', label: 'Creation Date', editable: false },
      { key: 'modificationDate', label: 'Modification Date', editable: false },
      { key: 'pageCount', label: 'Page Count', editable: false }
    ];
    
    let html = '';
    
    // Render main editable fields first
    mainFields.forEach(field => {
    // Special handling for filename field
    if (field.key === 'filename') {
      const currentFilenameValue = currentFilename ? currentFilename.replace(/\.pdf$/i, '') : '';
      const suggestedFilename = suggestions && suggestions.filename !== undefined ? suggestions.filename : null;
      // Compare without .pdf extension for both
      const currentCompare = currentFilenameValue.toLowerCase().trim();
      const suggestedCompare = suggestedFilename ? suggestedFilename.toLowerCase().trim() : null;
      const hasSuggestion = suggestedCompare !== null && suggestedCompare !== currentCompare;
      
      html += `
        <div class="metadata-item ${hasSuggestion ? 'has-suggestion' : ''}">
          <div class="metadata-label">${field.label}</div>
          <div class="metadata-value">
            ${hasSuggestion ? renderDiffValue(currentFilenameValue, suggestedFilename, !currentFilenameValue) : escapeHtml(currentFilenameValue || '(empty)')}
          </div>
          ${hasSuggestion ? `
            <div class="suggestion-actions">
              <button class="ai-apply-inline-btn" data-field="filename" data-value="${escapeHtml(suggestedFilename || '')}">Apply</button>
              <button class="ai-dismiss-inline-btn" data-field="filename" title="Dismiss suggestion">×</button>
            </div>
          ` : ''}
        </div>
      `;
      return; // Skip rest of processing for filename
    }
    
    const value = metadata[field.key];
    const displayValue = value || (field.key === 'pageCount' ? '0' : '');
    const isEmpty = !value && field.key !== 'pageCount';
    const isEditing = currentlyEditing === field.key;
    
    // Special handling for keywords field
    if (field.key === 'keywords') {
      if (isEditing) {
        // Parse keywords from comma-delimited string or array
        let keywordsArray = [];
        if (value) {
          if (typeof value === 'string') {
            // Split by comma only, handle quoted strings
            keywordsArray = parseCommaDelimitedString(value);
          } else if (Array.isArray(value)) {
            keywordsArray = value.filter(k => k && k.length > 0);
          }
        }
        
        html += `
          <div class="metadata-item editing">
            <div class="metadata-label">${field.label}</div>
            <div class="tags-editor">
              <div class="tags-container" id="tags-container-${field.key}">
                ${keywordsArray.map((tag, idx) => {
                  const isWarning = tag === 'needs-deleting' || tag === 'duplicate';
                  return `
                  <span class="tag ${isWarning ? 'tag-warning' : ''}" data-tag-index="${idx}">
                    ${escapeHtml(tag)}
                    <button class="tag-remove" data-tag-index="${idx}">×</button>
                  </span>
                `;
                }).join('')}
              </div>
              <div class="tag-input-container">
                <div class="predefined-tags">
                  <span class="predefined-tags-label">Quick add:</span>
                  <button type="button" class="predefined-tag-btn" data-tag="no-split-needed">no-split-needed</button>
                  <button type="button" class="predefined-tag-btn" data-tag="multi-doc">multi-doc</button>
                  <button type="button" class="predefined-tag-btn" data-tag="needs-deleting">needs-deleting</button>
                  <button type="button" class="predefined-tag-btn" data-tag="duplicate">duplicate</button>
                </div>
                <div class="tag-input-wrapper">
                  <input type="text" 
                         class="tag-input" 
                         placeholder="Add a tag..."
                         data-field="${field.key}"
                         id="tag-input-${field.key}">
                  <button class="save-btn" data-field="${field.key}">Save</button>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // Display keywords as tags, with diff if suggestions exist
        const suggestedKeywords = suggestions && suggestions.keywords !== undefined ? suggestions.keywords : null;
        const hasSuggestion = suggestedKeywords !== null && suggestedKeywords !== value;
        
        const clickable = field.editable ? 'clickable' : '';
        
        html += `
          <div class="metadata-item ${hasSuggestion ? 'has-suggestion' : ''}">
            <div class="metadata-label">${field.label}</div>
            <div class="tags-display ${clickable}" 
                 data-field="${field.key}" 
                 ${field.editable ? 'data-editable="true"' : ''}>
              ${hasSuggestion ? renderKeywordsDiff(value, suggestedKeywords) : (() => {
                // Parse keywords - server returns comma-delimited string
                let keywordsArray = [];
                if (value) {
                  if (typeof value === 'string') {
                    keywordsArray = parseCommaDelimitedString(value);
                  } else if (Array.isArray(value)) {
                    keywordsArray = value.filter(k => k && k.length > 0);
                  }
                }
                return keywordsArray.length > 0 
                  ? keywordsArray.map(tag => {
                    const isWarning = tag === 'needs-deleting' || tag === 'duplicate';
                    return `<span class="tag ${isWarning ? 'tag-warning' : ''}">${escapeHtml(tag)}</span>`;
                  }).join('')
                  : '<span class="empty">(empty)</span>';
              })()}
            </div>
            ${hasSuggestion ? `
            <div class="suggestion-actions">
              <button class="ai-apply-inline-btn" data-field="${field.key}" data-value="${escapeHtml(suggestedKeywords || '')}">Apply</button>
              <button class="ai-dismiss-inline-btn" data-field="${field.key}" title="Dismiss suggestion">×</button>
            </div>
          ` : ''}
          </div>
        `;
      }
    } else {
      // Regular field handling
      if (isEditing) {
        // Show input field with save button
        html += `
          <div class="metadata-item editing">
            <div class="metadata-label">${field.label}</div>
            <div class="metadata-edit-container">
              <input type="text" 
                     class="metadata-input" 
                     value="${value || ''}" 
                     data-field="${field.key}"
                     id="edit-${field.key}">
              <button class="save-btn" data-field="${field.key}">Save</button>
            </div>
          </div>
        `;
      } else {
        // Show regular display or diff if suggestions exist
        const clickable = field.editable ? 'clickable' : '';
        const suggestedValue = suggestions && suggestions[field.key] !== undefined ? suggestions[field.key] : null;
        const hasSuggestion = suggestedValue !== null && suggestedValue !== value;
        
        html += `
          <div class="metadata-item ${hasSuggestion ? 'has-suggestion' : ''}">
            <div class="metadata-label">${field.label}</div>
            <div class="metadata-value ${isEmpty && !hasSuggestion ? 'empty' : ''} ${clickable}" 
                 data-field="${field.key}" 
                 ${field.editable ? 'data-editable="true"' : ''}>
              ${hasSuggestion ? renderDiffValue(value, suggestedValue, isEmpty) : (isEmpty ? '(empty)' : displayValue)}
            </div>
            ${hasSuggestion ? `
              <div class="suggestion-actions">
                <button class="ai-apply-inline-btn" data-field="${field.key}" data-value="${escapeHtml(suggestedValue || '')}">Apply</button>
                <button class="ai-dismiss-inline-btn" data-field="${field.key}" title="Dismiss suggestion">×</button>
              </div>
            ` : ''}
          </div>
        `;
      }
    }
    });
    
    // Render secondary editable fields
    secondaryFields.forEach(field => {
    const value = metadata[field.key];
    const displayValue = value || '';
    const isEmpty = !value;
    const isEditing = currentlyEditing === field.key;
    
    if (isEditing) {
      // Show input field with save button
      html += `
        <div class="metadata-item editing">
          <div class="metadata-label">${field.label}</div>
          <div class="metadata-edit-container">
            <input type="text" 
                   class="metadata-input" 
                   value="${value || ''}" 
                   data-field="${field.key}"
                   id="edit-${field.key}">
            <button class="save-btn" data-field="${field.key}">Save</button>
          </div>
        </div>
      `;
    } else {
      // Show regular display or diff if suggestions exist
      const clickable = field.editable ? 'clickable' : '';
      const suggestedValue = suggestions && suggestions[field.key] !== undefined ? suggestions[field.key] : null;
      const hasSuggestion = suggestedValue !== null && suggestedValue !== value;
      
      html += `
        <div class="metadata-item ${hasSuggestion ? 'has-suggestion' : ''}">
          <div class="metadata-label">${field.label}</div>
          <div class="metadata-value ${isEmpty && !hasSuggestion ? 'empty' : ''} ${clickable}" 
               data-field="${field.key}" 
               ${field.editable ? 'data-editable="true"' : ''}>
            ${hasSuggestion ? renderDiffValue(value, suggestedValue, isEmpty) : (isEmpty ? '(empty)' : displayValue)}
          </div>
          ${hasSuggestion ? `
            <div class="suggestion-actions">
              <button class="ai-apply-inline-btn" data-field="${field.key}" data-value="${escapeHtml(suggestedValue || '')}">Apply</button>
              <button class="ai-dismiss-inline-btn" data-field="${field.key}" title="Dismiss suggestion">×</button>
            </div>
          ` : ''}
        </div>
      `;
    }
    });
    
    // Render system fields at bottom (smaller, not editable)
    systemFields.forEach(field => {
    const value = metadata[field.key];
    const displayValue = value || (field.key === 'pageCount' ? '0' : '');
    const isEmpty = !value && field.key !== 'pageCount';
    
    html += `
      <div class="metadata-item system-field">
        <div class="metadata-label system-label">${field.label}</div>
        <div class="metadata-value system-value ${isEmpty ? 'empty' : ''}">
          ${isEmpty ? '(empty)' : displayValue}
        </div>
      </div>
    `;
    });
    
    // Display custom metadata if available
    if (metadata.custom && Object.keys(metadata.custom).length > 0) {
      html += '<div class="metadata-item"><div class="metadata-label">Custom Properties</div></div>';
      Object.entries(metadata.custom).forEach(([key, value]) => {
        html += `
          <div class="metadata-item">
            <div class="metadata-label">${key}</div>
            <div class="metadata-value">${value}</div>
          </div>
        `;
      });
    }
    
    // Add AI Suggestions button at the top
    html = `
      <div class="metadata-item ai-suggestions-action">
        <button id="ai-suggestions-btn" class="ai-suggestions-btn">✨ Get AI Suggestions</button>
      </div>
    ` + html;
    
    metadataDisplay.innerHTML = html;
    
    // Add click handler for AI suggestions button
    const aiBtn = document.getElementById('ai-suggestions-btn');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        requestAISuggestions(currentFilename);
      });
    }
    
    // Add click handlers for editable fields
    metadataDisplay.querySelectorAll('[data-editable="true"]').forEach(el => {
      el.addEventListener('click', handleFieldClick);
    });
    
    // Add save button handlers (excluding keywords which has its own handler)
    metadataDisplay.querySelectorAll('.save-btn').forEach(btn => {
      const field = btn.dataset.field;
      if (field !== 'keywords') {
        btn.addEventListener('click', handleSave);
      }
    });
    
    // Add click handlers for inline AI apply buttons
    metadataDisplay.querySelectorAll('.ai-apply-inline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const field = e.target.dataset.field;
        const value = e.target.dataset.value;
        applyAISuggestion(field, value);
      });
    });
    
    // Add click handlers for inline AI dismiss buttons
    metadataDisplay.querySelectorAll('.ai-dismiss-inline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const field = e.target.dataset.field;
        dismissAISuggestion(field);
      });
    });
    
    // Add Enter key handler for input fields
    metadataDisplay.querySelectorAll('.metadata-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const field = input.dataset.field;
          handleSave({ target: { dataset: { field } } });
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      });
      // Focus the input when it appears
      input.focus();
      input.select();
    });
    
    // Special handling for keywords tag editor
    if (currentlyEditing === 'keywords') {
      const tagInput = document.getElementById('tag-input-keywords');
      const tagsContainer = document.getElementById('tags-container-keywords');
      const saveBtn = metadataDisplay.querySelector('.save-btn[data-field="keywords"]');
      
      // Handle tag input (Enter to add tag, comma also adds)
      if (tagInput) {
        tagInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tagValue = tagInput.value.trim();
            if (tagValue) {
              addTag(tagValue);
              tagInput.value = '';
            }
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
          }
        });
        
        tagInput.focus();
      }
      
      // Handle predefined tag buttons
      const predefinedTagBtns = metadataDisplay.querySelectorAll('.predefined-tag-btn');
      predefinedTagBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const tagValue = btn.dataset.tag;
          if (tagValue) {
            addTag(tagValue);
          }
        });
      });
      
      // Handle tag removal
      metadataDisplay.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(btn.dataset.tagIndex);
          removeTag(index);
        });
      });
      
      // Save button handler for keywords
      if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleKeywordsSave(e);
        });
      }
    }
  }); // End requestAnimationFrame
}

function addTag(tagValue) {
  const tagsContainer = document.getElementById('tags-container-keywords');
  if (!tagsContainer) return;
  
  // Check if tag already exists
  const existingTags = Array.from(tagsContainer.querySelectorAll('.tag')).map(tag => 
    tag.textContent.replace('×', '').trim()
  );
  
  if (existingTags.includes(tagValue)) {
    return; // Don't add duplicates
  }
  
  const index = existingTags.length;
  const tagElement = document.createElement('span');
  tagElement.className = 'tag';
  tagElement.dataset.tagIndex = index;
  tagElement.innerHTML = `
    ${tagValue}
    <button class="tag-remove" data-tag-index="${index}">×</button>
  `;
  
  // Add remove handler
  tagElement.querySelector('.tag-remove').addEventListener('click', (e) => {
    e.stopPropagation();
    removeTag(index);
  });
  
  tagsContainer.appendChild(tagElement);
  
  // Update indices
  updateTagIndices();
}

function removeTag(index) {
  const tagsContainer = document.getElementById('tags-container-keywords');
  if (!tagsContainer) return;
  
  // Find tag by current index
  const tags = Array.from(tagsContainer.querySelectorAll('.tag'));
  const tag = tags.find(t => parseInt(t.dataset.tagIndex) === index);
  
  if (tag) {
    tag.remove();
    updateTagIndices();
  }
}

function updateTagIndices() {
  const tagsContainer = document.getElementById('tags-container-keywords');
  if (!tagsContainer) return;
  
  const tags = tagsContainer.querySelectorAll('.tag');
  tags.forEach((tag, newIndex) => {
    tag.dataset.tagIndex = newIndex;
    const removeBtn = tag.querySelector('.tag-remove');
    if (removeBtn) {
      removeBtn.dataset.tagIndex = newIndex;
    }
  });
}

function getKeywordsArray() {
  const tagsContainer = document.getElementById('tags-container-keywords');
  if (!tagsContainer) {
    return [];
  }
  
  const tags = Array.from(tagsContainer.querySelectorAll('.tag'));
  
  const keywords = tags.map(tag => {
    // Clone the tag to get text without the remove button
    const clone = tag.cloneNode(true);
    const removeBtn = clone.querySelector('.tag-remove');
    if (removeBtn) {
      removeBtn.remove();
    }
    // Get text content and clean it up
    let text = clone.textContent || clone.innerText || '';
    // Remove any remaining × characters or whitespace
    text = text.replace(/×/g, '').trim();
    return text;
  }).filter(tag => tag && tag.length > 0);
  
  return keywords;
}

async function handleKeywordsSave(event) {
  const keywordsArray = getKeywordsArray();
  const keywordsString = keywordsArray.join(',');
  
  try {
    const requestBody = {
      field: 'keywords',
      value: keywordsString
    };
    
    const response = await fetch(`/api/metadata/${encodeURIComponent(currentFilename)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to save';
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
      } else {
        errorMessage = response.statusText || `Server error (${response.status})`;
      }
      throw new Error(errorMessage);
    }
    
    await response.json();
    
    // Success - reload metadata and clear editing state
    currentlyEditing = null;
    await loadPDFMetadata(currentFilename);
    
    // Reload preview to show updated PDF (with cache busting)
    await loadPDFPreview(currentFilename, true);
    
    // Reload activity log if it's visible
    const activityLogContent = document.getElementById('activity-log-content');
    if (activityLogContent && activityLogContent.style.display !== 'none') {
      await loadActivityLog();
    }
  } catch (error) {
    console.error('Error saving metadata:', error);
    alert(`Error saving: ${error.message}`);
  }
}

function handleFieldClick(event) {
  if (currentlyEditing) {
    return; // Already editing a field
  }
  
  // Find the element with data-field attribute (might be clicked element or a parent)
  let target = event.target;
  let field = target.dataset.field;
  
  // If clicked on a tag or empty span, find the parent with data-field
  while (!field && target && target !== document.body) {
    target = target.parentElement;
    if (target) {
      field = target.dataset.field;
    }
  }
  
  if (!field) return;
  
  currentlyEditing = field;
  loadPDFMetadata(currentFilename);
}

function cancelEdit() {
  currentlyEditing = null;
  loadPDFMetadata(currentFilename);
}

async function handleSave(event) {
  const field = event.target.dataset.field;
  const input = document.getElementById(`edit-${field}`);
  const newValue = input.value;
  
  try {
    const response = await fetch(`/api/metadata/${encodeURIComponent(currentFilename)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        field: field,
        value: newValue
      })
    });
    
    if (!response.ok) {
      // Try to parse JSON error, but handle HTML error pages
      let errorMessage = 'Failed to save';
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
      } else {
        // If it's HTML (like an error page), use status text
        errorMessage = response.statusText || `Server error (${response.status})`;
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    
    // Success - reload metadata and clear editing state
    currentlyEditing = null;
    await loadPDFMetadata(currentFilename);
    
    // Reload preview to show updated PDF (with cache busting)
    await loadPDFPreview(currentFilename, true);
    
    // Reload activity log if it's visible
    const activityLogContent = document.getElementById('activity-log-content');
    if (activityLogContent && activityLogContent.style.display !== 'none') {
      await loadActivityLog();
    }
  } catch (error) {
    console.error('Error saving metadata:', error);
    alert(`Error saving: ${error.message}`);
  }
}

async function handleFileRename() {
  const input = document.getElementById('filename-edit-input');
  if (!input) return;
  
  const newName = input.value.trim();
  
  if (!newName) {
    alert('Please enter a filename');
    return;
  }
  
  if (!currentFilename) {
    alert('No file selected');
    return;
  }
  
  // Ensure .pdf extension
  const newFilename = newName.endsWith('.pdf') ? newName : `${newName}.pdf`;
  
  // Don't rename if it's the same
  if (newFilename === currentFilename) {
    editingFilename = false;
    updatePDFNameDisplay();
    return;
  }
  
  try {
    const response = await fetch(`/api/rename/${encodeURIComponent(currentFilename)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newFilename })
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to rename file';
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
      } else {
        errorMessage = response.statusText || `Server error (${response.status})`;
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    
    // Update the current filename and refresh the list
    currentFilename = result.newFilename || newFilename;
    
    // Reload the PDF list to ensure consistency
    await loadPDFList();
    
    // Update the current index
    currentIndex = pdfList.indexOf(currentFilename);
    if (currentIndex === -1) {
      // If file not found, try to find it or reset
      currentIndex = 0;
      if (pdfList.length > 0) {
        currentFilename = pdfList[0];
      }
    }
    
    // Exit edit mode and update displays
    editingFilename = false;
    updatePDFNameDisplay();
    await loadPDFPreview(currentFilename);
    await loadPDFMetadata(currentFilename);
    updateNavigationButtons();
    
    // Reload activity log if it's visible
    const activityLogContent = document.getElementById('activity-log-content');
    if (activityLogContent && activityLogContent.style.display !== 'none') {
      await loadActivityLog();
    }
  } catch (error) {
    console.error('Error renaming file:', error);
    alert(`Error renaming file: ${error.message}`);
  }
}

// PDF Splitter functionality
let splitMarkers = []; // Array of page numbers where splits occur (0-indexed, after which page)

async function showSplitterView(filename, metadata) {
  // Hide detail view sections, show splitter view
  document.querySelector('.preview-section').style.display = 'none';
  document.querySelector('.metadata-section').style.display = 'none';
  document.getElementById('splitter-view').style.display = 'block';
  
  // Hide navigation buttons in splitter view (header stays visible)
  const backBtn = document.getElementById('back-to-list-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const splitBtn = document.getElementById('split-btn');
  const pdfName = document.getElementById('pdf-name');
  const viewTitle = document.getElementById('view-title');
  const refreshBtn = document.getElementById('refresh-list-btn');
  
  if (backBtn) backBtn.style.display = 'none';
  if (prevBtn) prevBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';
  if (splitBtn) splitBtn.style.display = 'none';
  if (pdfName) pdfName.style.display = 'none';
  if (viewTitle) {
    viewTitle.style.display = 'flex';
    viewTitle.textContent = `Split PDF: ${filename}`;
  }
  if (refreshBtn) refreshBtn.style.display = 'none';
  
  document.getElementById('splitter-filename').textContent = filename;
  splitMarkers = [];
  
  // Load PDF and render thumbnails
  await loadSplitterThumbnails(filename);
  
  // Add event listeners
  document.getElementById('splitter-back-btn').onclick = hideSplitterView;
  document.getElementById('splitter-execute-btn').onclick = () => executeSplit(filename, metadata);
  document.getElementById('splitter-clear-btn').onclick = clearSplitMarkers;
  document.getElementById('splitter-no-split-btn').onclick = () => markAsNoSplitNeeded(filename);
}

function hideSplitterView() {
  // Show detail view, hide splitter view
  document.querySelector('.preview-section').style.display = 'block';
  document.querySelector('.metadata-section').style.display = 'block';
  document.getElementById('splitter-view').style.display = 'none';
  
  // Ensure detail view is shown and header is visible
  showDetailView();
  
  // Restore PDF name display
  updatePDFNameDisplay();
  
  splitMarkers = [];
}

async function loadSplitterThumbnails(filename) {
  const pagesContainer = document.getElementById('splitter-pages');
  pagesContainer.innerHTML = '<p>Loading pages...</p>';
  
  try {
    const pdfUrl = `/pdfs/${encodeURIComponent(filename)}`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    pagesContainer.innerHTML = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.5 }); // Smaller scale for thumbnails
      
      // Create page wrapper
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'splitter-page-wrapper';
      pageWrapper.dataset.pageNum = pageNum;
      
      // Create canvas for thumbnail
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.className = 'splitter-thumbnail';
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Create page label
      const pageLabel = document.createElement('div');
      pageLabel.className = 'splitter-page-label';
      pageLabel.textContent = `Page ${pageNum}`;
      
      pageWrapper.appendChild(canvas);
      pageWrapper.appendChild(pageLabel);
      
      // Append page wrapper first
      pagesContainer.appendChild(pageWrapper);
      
      // Create split marker area AFTER the page (clickable zone between pages)
      if (pageNum < pdf.numPages) {
        const markerArea = document.createElement('div');
        markerArea.className = 'splitter-marker-area';
        markerArea.dataset.afterPage = pageNum;
        markerArea.title = 'Click to add split marker';
        markerArea.onclick = () => toggleSplitMarker(pageNum);
        pagesContainer.appendChild(markerArea);
      }
    }
    
    updateSplitterUI();
  } catch (error) {
    console.error('Error loading PDF for splitter:', error);
    pagesContainer.innerHTML = '<p class="placeholder">Error loading PDF</p>';
  }
}

function toggleSplitMarker(afterPage) {
  // afterPage is 1-indexed (page number after which to split)
  const index = splitMarkers.indexOf(afterPage);
  if (index === -1) {
    splitMarkers.push(afterPage);
  } else {
    splitMarkers.splice(index, 1);
  }
  splitMarkers.sort((a, b) => a - b);
  updateSplitterUI();
}

function clearSplitMarkers() {
  splitMarkers = [];
  updateSplitterUI();
}

function updateSplitterUI() {
  // Update visual markers
  document.querySelectorAll('.splitter-marker-area').forEach(area => {
    const afterPage = parseInt(area.dataset.afterPage);
    if (splitMarkers.includes(afterPage)) {
      area.classList.add('has-marker');
      area.textContent = '│ SPLIT │';
    } else {
      area.classList.remove('has-marker');
      area.textContent = '';
    }
  });
  
  // Enable/disable execute button
  const executeBtn = document.getElementById('splitter-execute-btn');
  executeBtn.disabled = splitMarkers.length === 0;
  
  // Update button text with split count
  if (splitMarkers.length > 0) {
    const numFiles = splitMarkers.length + 1;
    executeBtn.textContent = `Split into ${numFiles} files`;
  } else {
    executeBtn.textContent = 'Split PDF';
  }
}

async function markAsNoSplitNeeded(filename) {
  if (!confirm('This will add the "no-split-needed" tag to this PDF, indicating it should not be split. Continue?')) {
    return;
  }
  
  try {
    // Get current metadata
    const metadataResponse = await fetch(`/api/metadata/${encodeURIComponent(filename)}`);
    if (!metadataResponse.ok) {
      throw new Error('Failed to load current metadata');
    }
    
    const currentMetadata = await metadataResponse.json();
    const currentKeywords = currentMetadata.keywords || '';
    const keywordsArray = parseCommaDelimitedString(currentKeywords);
    
    // Add no-split-needed if not already present
    if (!keywordsArray.includes('no-split-needed')) {
      keywordsArray.push('no-split-needed');
    }
    
    // Remove multi-doc tag if present (since we're marking it as no-split-needed)
    const filteredKeywords = keywordsArray.filter(k => k !== 'multi-doc');
    const newKeywords = filteredKeywords.join(',');
    
    // Update keywords
    const updateResponse = await fetch(`/api/metadata/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        field: 'keywords',
        value: newKeywords
      })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(error.error || 'Failed to update metadata');
    }
    
    alert('PDF marked as "no-split-needed"');
    
    // Hide splitter view and ensure detail view is shown
    hideSplitterView();
    showDetailView(); // Ensure detail view is properly shown
    await loadPDFMetadata(filename);
    
  } catch (error) {
    console.error('Error marking as no-split-needed:', error);
    alert('Error: ' + error.message);
  }
}

async function executeSplit(filename, metadata) {
  if (splitMarkers.length === 0) {
    alert('Please add at least one split marker');
    return;
  }
  
  if (!confirm(`This will split the PDF into ${splitMarkers.length + 1} file(s). Continue?`)) {
    return;
  }
  
  try {
    const response = await fetch('/api/split', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: filename,
        splitPoints: splitMarkers, // Array of page numbers (1-indexed) after which to split
        metadata: {
          title: metadata.title,
          subject: metadata.subject,
          keywords: metadata.keywords,
          author: metadata.author
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to split PDF');
    }
    
    const result = await response.json();
    alert(`PDF successfully split into ${result.files.length} file(s):\n${result.files.join('\n')}`);
    
    // Hide splitter view first to restore header
    hideSplitterView();
    
    // Reload PDF list
    await loadPDFList();
    
    // Select the first new file if available
    if (result.files.length > 0) {
      const firstNewFile = result.files[0];
      if (pdfList.includes(firstNewFile)) {
        currentIndex = pdfList.indexOf(firstNewFile);
        currentFilename = firstNewFile;
        showDetailView(); // Ensure detail view is shown with header
        await loadPDFPreview(currentFilename);
        await loadPDFMetadata(currentFilename);
        updatePDFNameDisplay();
        updateNavigationButtons();
      }
    } else {
      // If no files to show, at least ensure we're in a valid view state
      showDetailView();
    }
    
    // Reload activity log if it's visible
    const activityLogContent = document.getElementById('activity-log-content');
    if (activityLogContent && activityLogContent.style.display !== 'none') {
      await loadActivityLog();
    }
  } catch (error) {
    console.error('Error splitting PDF:', error);
    alert(`Error splitting PDF: ${error.message}`);
  }
}

// Activity Log functionality
async function loadActivityLog() {
  try {
    const response = await fetch('/api/activity-log');
    
    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = 'Failed to load activity log';
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || `Server error (${response.status})`;
        }
      } else {
        errorMessage = response.statusText || `Server error (${response.status})`;
      }
      throw new Error(errorMessage);
    }
    
    let log = await response.json();
    
    // Ensure log is an array
    if (!Array.isArray(log)) {
      console.warn('Activity log is not an array, using empty array');
      displayActivityLog([]);
      return;
    }
    
    // Filter log to show only entries for the current file (if viewing a file)
    if (currentFilename) {
      log = log.filter(entry => {
        // metadata_update entries
        if (entry.type === 'metadata_update' && entry.filename === currentFilename) {
          return true;
        }
        // file_rename entries - show if file is involved
        if (entry.type === 'file_rename' && 
            (entry.oldFilename === currentFilename || entry.newFilename === currentFilename)) {
          return true;
        }
        // pdf_split entries - show if file is the original or one of the created files
        if (entry.type === 'pdf_split') {
          if (entry.originalFilename === currentFilename) {
            return true;
          }
          if (entry.createdFiles && entry.createdFiles.includes(currentFilename)) {
            return true;
          }
        }
        // file_delete entries
        if (entry.type === 'file_delete' && entry.filename === currentFilename) {
          return true;
        }
        return false;
      });
    }
    
    displayActivityLog(log);
  } catch (error) {
    console.error('Error loading activity log:', error);
    const entriesContainer = document.getElementById('activity-log-entries');
    if (entriesContainer) {
      entriesContainer.innerHTML = `<p class="placeholder">Error loading activity log: ${escapeHtml(error.message)}</p>`;
    }
  }
}

function displayActivityLog(log) {
  const entriesContainer = document.getElementById('activity-log-entries');
  if (!entriesContainer) return;
  
  if (!log || log.length === 0) {
    entriesContainer.innerHTML = '<p class="placeholder">No activity recorded yet</p>';
    return;
  }
  
  const html = log.map(entry => {
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleString();
    
    let actionText = '';
    let details = '';
    
    if (entry.type === 'metadata_update') {
      actionText = `Updated ${entry.field}`;
      details = entry.field === 'keywords' 
        ? `Changed keywords`
        : `"${entry.oldValue || '(empty)'}" → "${entry.newValue || '(empty)'}"`;
    } else if (entry.type === 'file_rename') {
      actionText = 'Renamed file';
      details = `"${entry.oldFilename}" → "${entry.newFilename}"`;
    } else if (entry.type === 'pdf_split') {
      actionText = 'Split PDF';
      details = `Split "${entry.originalFilename}" (${entry.totalPages} pages) into ${entry.createdFiles.length} file(s)`;
    }
    
    return `
      <div class="activity-log-entry">
        <div class="activity-log-time">${timeStr}</div>
        <div class="activity-log-action">${actionText}</div>
        <div class="activity-log-details">${escapeHtml(details)}</div>
        ${entry.filename ? `<div class="activity-log-file">File: ${escapeHtml(entry.filename)}</div>` : ''}
      </div>
    `;
  }).join('');
  
  entriesContainer.innerHTML = html;
}

function toggleActivityLog() {
  const content = document.getElementById('activity-log-content');
  const icon = document.querySelector('.activity-log-toggle-icon');
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.textContent = '▲';
    // Reload log when opening
    loadActivityLog();
  } else {
    content.style.display = 'none';
    icon.textContent = '▼';
  }
}

// AI Suggestions functionality
async function requestAISuggestions(filename) {
  if (!filename) {
    alert('No file selected');
    return;
  }
  
  const suggestionsSection = document.getElementById('ai-suggestions-section');
  const suggestionsContent = document.getElementById('ai-suggestions-content');
  
  // Show suggestions section
  suggestionsSection.style.display = 'block';
  suggestionsContent.innerHTML = '<p class="placeholder">Analyzing document and generating suggestions...</p>';
  
  // Scroll to suggestions
  suggestionsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  try {
    // Capture images from the already-rendered PDF preview canvases
    const preview = document.getElementById('pdf-preview');
    const canvases = preview.querySelectorAll('canvas');
    
    if (canvases.length === 0) {
      throw new Error('PDF preview not loaded. Please wait for the preview to load first.');
    }
    
    // Convert canvases to base64 images (limit to first 3 pages)
    const pageImages = [];
    const maxPages = Math.min(canvases.length, 3);
    for (let i = 0; i < maxPages; i++) {
      const canvas = canvases[i];
      const imageBase64 = canvas.toDataURL('image/png').split(',')[1]; // Remove data:image/png;base64, prefix
      pageImages.push(imageBase64);
    }
    
    // Send images to server
    const response = await fetch(`/api/ai-suggestions/${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ images: pageImages })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get AI suggestions');
    }
    
    const suggestions = await response.json();
    // Store suggestions and re-render metadata with diffs
    aiSuggestions = suggestions;
    
    // Hide the separate suggestions section
    suggestionsSection.style.display = 'none';
    
    // Ensure we're still in detail view and all navigation buttons are visible
    // (in case something reset the view state during async operations)
    const detailView = document.getElementById('detail-view');
    if (detailView && detailView.style.display !== 'none') {
      const backBtn = document.getElementById('back-to-list-btn');
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      const pdfName = document.getElementById('pdf-name');
      
      if (backBtn) backBtn.style.display = 'block';
      if (prevBtn) prevBtn.style.display = 'flex';
      if (nextBtn) nextBtn.style.display = 'flex';
      if (pdfName) pdfName.style.display = 'flex';
    }
    
    // Re-render metadata to show inline diffs
    if (currentMetadata) {
      displayMetadata(currentMetadata, aiSuggestions);
    }
    
    // Final check: ensure back button is visible after all async operations
    // Use setTimeout to ensure this runs after any potential DOM updates
    setTimeout(() => {
      const detailView = document.getElementById('detail-view');
      const backBtn = document.getElementById('back-to-list-btn');
      if (detailView && detailView.style.display !== 'none' && backBtn) {
        backBtn.style.display = 'block';
      }
    }, 100);
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    suggestionsContent.innerHTML = `<p class="placeholder error">Error: ${escapeHtml(error.message)}</p>`;
  }
}

function displayAISuggestions(suggestions) {
  const suggestionsContent = document.getElementById('ai-suggestions-content');
  
  // Parse keywords for display
  const keywordsArray = suggestions.keywords 
    ? parseCommaDelimitedString(suggestions.keywords)
    : [];
  
  const html = `
    <div class="ai-suggestion-item">
      <div class="ai-suggestion-label">Filename</div>
      <div class="ai-suggestion-value">${escapeHtml(suggestions.filename)}.pdf</div>
      <button class="ai-apply-btn" data-field="filename" data-value="${escapeHtml(suggestions.filename)}">Apply</button>
    </div>
    <div class="ai-suggestion-item">
      <div class="ai-suggestion-label">Title</div>
      <div class="ai-suggestion-value">${escapeHtml(suggestions.title || '(empty)')}</div>
      <button class="ai-apply-btn" data-field="title" data-value="${escapeHtml(suggestions.title || '')}">Apply</button>
    </div>
    <div class="ai-suggestion-item">
      <div class="ai-suggestion-label">Subject</div>
      <div class="ai-suggestion-value">${escapeHtml(suggestions.subject || '(empty)')}</div>
      <button class="ai-apply-btn" data-field="subject" data-value="${escapeHtml(suggestions.subject || '')}">Apply</button>
    </div>
    <div class="ai-suggestion-item">
      <div class="ai-suggestion-label">Keywords</div>
      <div class="ai-suggestion-value">
        ${keywordsArray.length > 0 
          ? '<div class="tags-display">' + keywordsArray.map(k => {
            const isWarning = k === 'needs-deleting' || k === 'duplicate';
            return `<span class="tag ${isWarning ? 'tag-warning' : ''}">${escapeHtml(k)}</span>`;
          }).join('') + '</div>'
          : '<span class="empty">(empty)</span>'
        }
      </div>
      <button class="ai-apply-btn" data-field="keywords" data-value="${escapeHtml(suggestions.keywords || '')}">Apply</button>
    </div>
    <div class="ai-suggestion-actions">
      <button id="ai-apply-all-btn" class="ai-apply-all-btn">Apply All</button>
    </div>
  `;
  
  suggestionsContent.innerHTML = html;
  
  // Add click handlers for individual apply buttons
  suggestionsContent.querySelectorAll('.ai-apply-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const field = e.target.dataset.field;
      const value = e.target.dataset.value;
      applyAISuggestion(field, value);
    });
  });
  
  // Add click handler for apply all
  const applyAllBtn = document.getElementById('ai-apply-all-btn');
  if (applyAllBtn) {
    applyAllBtn.addEventListener('click', () => {
      applyAllAISuggestions(suggestions);
    });
  }
  
  // Add close button handler
  const closeBtn = document.getElementById('close-ai-suggestions-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('ai-suggestions-section').style.display = 'none';
    });
  }
}

function dismissAISuggestion(field) {
  if (!aiSuggestions) return;
  
  // Remove the suggestion for this field
  if (aiSuggestions[field] !== undefined) {
    delete aiSuggestions[field];
  }
  
  // Re-render metadata without this suggestion
  if (currentMetadata) {
    displayMetadata(currentMetadata, aiSuggestions);
  }
}

async function applyAISuggestion(field, value) {
  if (!currentFilename) {
    alert('No file selected');
    return;
  }
  
  if (field === 'filename') {
    // Handle filename separately (rename)
    const newFilename = value.endsWith('.pdf') ? value : `${value}.pdf`;
    try {
      const response = await fetch(`/api/rename/${encodeURIComponent(currentFilename)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newFilename })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename file');
      }
      
      const result = await response.json();
      currentFilename = result.newFilename || newFilename;
      
      // Clear the filename suggestion since it's been applied
      if (aiSuggestions && aiSuggestions.filename !== undefined) {
        delete aiSuggestions.filename;
      }
      
      await loadPDFList();
      currentIndex = pdfList.indexOf(currentFilename);
      if (currentIndex === -1) {
        currentIndex = 0;
        if (pdfList.length > 0) {
          currentFilename = pdfList[0];
        }
      }
      
      updatePDFNameDisplay();
      await loadPDFPreview(currentFilename);
      await loadPDFMetadata(currentFilename);
      updateNavigationButtons();
      updateSplitButtonVisibility();
      
      // Reload activity log if visible
      const activityLogContent = document.getElementById('activity-log-content');
      if (activityLogContent && activityLogContent.style.display !== 'none') {
        await loadActivityLog();
      }
      
      // Close suggestions
      document.getElementById('ai-suggestions-section').style.display = 'none';
    } catch (error) {
      console.error('Error applying filename suggestion:', error);
      alert(`Error applying suggestion: ${error.message}`);
    }
  } else {
    // Handle metadata fields
    try {
      const response = await fetch(`/api/metadata/${encodeURIComponent(currentFilename)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          field: field,
          value: value
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update metadata');
      }
      
      // Clear the suggestion for this field after applying
      if (aiSuggestions && aiSuggestions[field]) {
        delete aiSuggestions[field];
      }
      
      // If filename was changed, reload everything
      if (field === 'filename') {
        // Filename change already handled above, just reload metadata
        await loadPDFMetadata(currentFilename);
      } else {
        // Reload metadata
        await loadPDFMetadata(currentFilename);
      }
      
      // Reload activity log if visible
      const activityLogContent = document.getElementById('activity-log-content');
      if (activityLogContent && activityLogContent.style.display !== 'none') {
        await loadActivityLog();
      }
    } catch (error) {
      console.error('Error applying suggestion:', error);
      alert(`Error applying suggestion: ${error.message}`);
    }
  }
}

async function applyAllAISuggestions(suggestions) {
  if (!currentFilename) {
    alert('No file selected');
    return;
  }
  
  // Apply filename first (if different)
  if (suggestions.filename) {
    const suggestedFilename = suggestions.filename.endsWith('.pdf') 
      ? suggestions.filename 
      : `${suggestions.filename}.pdf`;
    
    if (suggestedFilename !== currentFilename) {
      await applyAISuggestion('filename', suggestions.filename);
      // Wait a bit for rename to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Apply other metadata fields
  const fields = ['title', 'subject', 'keywords'];
  for (const field of fields) {
    if (suggestions[field]) {
      await applyAISuggestion(field, suggestions[field]);
      // Small delay between updates
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // Close suggestions after applying all
  document.getElementById('ai-suggestions-section').style.display = 'none';
}

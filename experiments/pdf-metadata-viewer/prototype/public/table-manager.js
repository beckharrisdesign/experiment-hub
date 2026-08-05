/**
 * Lightweight table manager for sorting and filtering
 * Uses native HTML tables - easy to style with CSS
 */

export class TableManager {
  constructor(tableElement, options = {}) {
    this.table = tableElement;
    this.options = {
      sortable: options.sortable !== false,
      filterable: options.filterable !== false,
      ...options
    };
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.filterValues = {}; // For text filters
    this.filterTags = {}; // For tag filters (keywords column)
    this.originalRows = [];
    this.init();
  }

  init() {
    if (this.options.sortable) {
      this.setupSorting();
    }
    if (this.options.filterable) {
      this.setupFiltering();
    }
  }

  setupSorting() {
    const headers = this.table.querySelectorAll('thead th[data-sort]');
    headers.forEach((header, index) => {
      header.style.cursor = 'pointer';
      header.classList.add('sortable');
      
      // Add sort indicator
      const indicator = document.createElement('span');
      indicator.className = 'sort-indicator';
      indicator.textContent = ' ↕';
      header.appendChild(indicator);
      
      header.addEventListener('click', () => {
        this.sort(index, header.dataset.sort);
      });
    });
  }

  setupFiltering() {
    const headers = this.table.querySelectorAll('thead th[data-filter]');
    headers.forEach((header, index) => {
      // Save original header text
      const originalText = header.textContent.trim().replace(' ↕', '').trim();
      
      // Clear header and rebuild structure consistently
      header.innerHTML = '';
      
      // Create header row container for text and sort indicator
      const headerRow = document.createElement('div');
      headerRow.className = 'header-row';
      
      // Add header text
      const headerText = document.createElement('span');
      headerText.className = 'header-text';
      headerText.textContent = originalText;
      headerRow.appendChild(headerText);
      
      // Add sort indicator if sortable
      if (header.classList.contains('sortable')) {
        const indicator = document.createElement('span');
        indicator.className = 'sort-indicator';
        indicator.textContent = ' ↕';
        headerRow.appendChild(indicator);
      }
      
      header.appendChild(headerRow);
      
      // Add filter container below header row
      const filterContainer = document.createElement('div');
      filterContainer.className = 'filter-container';
      
      // For keywords column (index 3), use tag filter UI
      if (index === 3) {
        // Create a wrapper that looks like an input but contains tags
        const filterInputWrapper = document.createElement('div');
        filterInputWrapper.className = 'filter-input-wrapper';
        
        const filterTagsContainer = document.createElement('div');
        filterTagsContainer.className = 'filter-tags-container';
        filterTagsContainer.dataset.columnIndex = index;
        
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.className = 'table-filter table-filter-tags';
        filterInput.placeholder = `Filter ${originalText}`;
        filterInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            this.addFilterTag(index, e.target.value.trim());
            e.target.value = '';
          }
        });
        
        filterInputWrapper.appendChild(filterTagsContainer);
        filterInputWrapper.appendChild(filterInput);
        filterContainer.appendChild(filterInputWrapper);
      } else {
        // For other columns, use regular text input
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.className = 'table-filter';
        filterInput.placeholder = `Filter ${originalText}`;
        filterInput.addEventListener('input', (e) => {
          this.filter(index, e.target.value);
        });
        
        filterContainer.appendChild(filterInput);
      }
      
      header.appendChild(filterContainer);
    });
  }

  sort(columnIndex, type = 'string') {
    const tbody = this.table.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const header = this.table.querySelector(`thead th:nth-child(${columnIndex + 1})`);
    
    // Update sort indicators
    this.table.querySelectorAll('.sort-indicator').forEach(ind => {
      ind.textContent = ' ↕';
    });
    
    if (this.sortColumn === columnIndex) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columnIndex;
      this.sortDirection = 'asc';
    }
    
    const indicator = header.querySelector('.sort-indicator');
    indicator.textContent = this.sortDirection === 'asc' ? ' ↑' : ' ↓';
    
    // Sort rows
    rows.sort((a, b) => {
      const aCell = a.cells[columnIndex];
      const bCell = b.cells[columnIndex];
      const aValue = aCell.textContent.trim();
      const bValue = bCell.textContent.trim();
      
      let comparison = 0;
      if (type === 'number') {
        comparison = parseFloat(aValue) - parseFloat(bValue);
      } else {
        comparison = aValue.localeCompare(bValue);
      }
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
  }

  filter(columnIndex, filterValue) {
    this.filterValues[columnIndex] = filterValue.toLowerCase();
    this.applyFilters();
  }

  addFilterTag(columnIndex, tagValue) {
    if (!this.filterTags[columnIndex]) {
      this.filterTags[columnIndex] = new Map(); // Use Map to store original case
    }
    
    // Add tag if not already present (case-insensitive check)
    const tagLower = tagValue.toLowerCase();
    if (!this.filterTags[columnIndex].has(tagLower)) {
      this.filterTags[columnIndex].set(tagLower, tagValue); // Store original case for display
      this.renderFilterTags(columnIndex);
      this.applyFilters();
    }
  }

  removeFilterTag(columnIndex, tagValue) {
    if (this.filterTags[columnIndex]) {
      this.filterTags[columnIndex].delete(tagValue.toLowerCase());
      if (this.filterTags[columnIndex].size === 0) {
        delete this.filterTags[columnIndex];
      }
      this.renderFilterTags(columnIndex);
      this.applyFilters();
    }
  }

  renderFilterTags(columnIndex) {
    const header = this.table.querySelector(`thead th:nth-child(${columnIndex + 1})`);
    if (!header) return;
    
    const filterTagsContainer = header.querySelector('.filter-tags-container');
    if (!filterTagsContainer) return;
    
    // Clear existing tags
    filterTagsContainer.innerHTML = '';
    
    // Render each filter tag
    if (this.filterTags[columnIndex] && this.filterTags[columnIndex].size > 0) {
      this.filterTags[columnIndex].forEach((originalTag, tagLower) => {
        const isWarning = tagLower === 'needs-deleting' || tagLower === 'duplicate';
        const tagElement = document.createElement('span');
        tagElement.className = `filter-tag ${isWarning ? 'filter-tag-warning' : ''}`;
        tagElement.innerHTML = `
          <span class="filter-tag-text">${escapeHtml(originalTag)}</span>
          <button class="filter-tag-remove" data-tag="${escapeHtml(tagLower)}" aria-label="Remove filter">×</button>
        `;
        
        const removeBtn = tagElement.querySelector('.filter-tag-remove');
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeFilterTag(columnIndex, tagLower);
        });
        
        filterTagsContainer.appendChild(tagElement);
      });
      
      // Add "Clear all" button when tags are present (inside the container)
      const clearAllBtn = document.createElement('button');
      clearAllBtn.className = 'filter-clear-all';
      clearAllBtn.textContent = 'Clear all';
      clearAllBtn.setAttribute('aria-label', 'Clear all filters');
      clearAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearAllFilterTags(columnIndex);
      });
      filterTagsContainer.appendChild(clearAllBtn);
    }
  }

  clearAllFilterTags(columnIndex) {
    if (this.filterTags[columnIndex]) {
      delete this.filterTags[columnIndex];
      this.renderFilterTags(columnIndex);
      this.applyFilters();
    }
  }

  filterByTag(columnIndex, tagValue) {
    // Add tag to filter
    this.addFilterTag(columnIndex, tagValue);
  }

  applyFilters() {
    const tbody = this.table.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.forEach(row => {
      let show = true;
      
      // Apply text filters
      Object.entries(this.filterValues).forEach(([colIndex, filterValue]) => {
        if (filterValue) {
          const cell = row.cells[parseInt(colIndex)];
          if (cell) {
            const cellText = cell.textContent.toLowerCase();
            if (!cellText.includes(filterValue)) {
              show = false;
            }
          }
        }
      });
      
      // Apply tag filters (for keywords column)
      Object.entries(this.filterTags).forEach(([colIndex, tagMap]) => {
        if (tagMap && tagMap.size > 0) {
          const cell = row.cells[parseInt(colIndex)];
          if (cell) {
            const tags = cell.querySelectorAll('.tag');
            const cellTagTexts = Array.from(tags).map(tag => tag.textContent.toLowerCase());
            
            // Check if row has ALL selected tags (AND logic)
            const hasAllTags = Array.from(tagMap.keys()).every(filterTagLower => 
              cellTagTexts.some(cellTag => cellTag === filterTagLower)
            );
            
            if (!hasAllTags) {
              show = false;
            }
          }
        }
      });
      
      row.style.display = show ? '' : 'none';
    });
  }

  updateRow(filename, data) {
    const tbody = this.table.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const row = rows.find(r => {
      const filenameCell = r.querySelector('[data-filename]');
      return filenameCell && filenameCell.dataset.filename === filename;
    });
    
    if (row) {
      // Update cells based on data-field attributes
      Object.keys(data).forEach(field => {
        const cell = row.querySelector(`[data-field="${field}"]`);
        if (cell) {
          if (field === 'keywords' && data.keywordsArray) {
            // Handle keywords specially
            const keywordsArray = data.keywordsArray;
            if (keywordsArray.length === 0) {
              cell.innerHTML = '<span class="empty">(empty)</span>';
            } else {
              cell.innerHTML = '<div class="tags-display">' + 
                keywordsArray.map(keyword => {
                  const isWarning = keyword === 'needs-deleting' || keyword === 'duplicate';
                  return `<span class="tag clickable-tag ${isWarning ? 'tag-warning' : ''}" data-tag="${escapeHtml(keyword)}">${escapeHtml(keyword)}</span>`;
                }).join('') + 
                '</div>';
              
              // Add click handlers to tags
              cell.querySelectorAll('.clickable-tag').forEach(tag => {
                tag.style.cursor = 'pointer';
                tag.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const tagValue = tag.dataset.tag;
                  if (tagValue) {
                    // Filter by this tag - keywords column is index 3 (0-based)
                    this.filterByTag(3, tagValue);
                  }
                });
              });
            }
          } else if (field === 'updateCount') {
            const hasUpdates = data[field] > 0;
            cell.innerHTML = `<span class="file-update-count ${hasUpdates ? 'has-updates' : ''}">${data[field] || 0}</span>`;
          } else if (field === 'pageCount') {
            cell.textContent = data[field] || 0;
          } else {
            const value = data[field] || '';
            cell.textContent = value || '(empty)';
          }
        }
      });
      
      // Re-apply filters after update
      this.applyFilters();
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

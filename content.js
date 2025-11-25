// Content script for Amazon book detection and notification
console.log('Library Link: Content script loaded!');

let currentBookInfo = null;
let notificationShown = false;
let currentPersona = 'student'; // Will be updated from storage

// Detect persona on load
chrome.runtime.sendMessage({ action: 'getCurrentPersona' }, (response) => {
    if (response && response.persona) {
        currentPersona = response.persona;
        console.log('Library Link: Current persona:', currentPersona);
    }
});

// Detect if we're on a book product page
function isBookPage() {
    console.log('Library Link: Checking if this is a book page...');

    // Check if it's a product page
    const hasProductTitle = document.querySelector('#productTitle');
    console.log('Library Link: Has product title?', !!hasProductTitle);

    // Check for book-specific indicators
    const hasBookDescription = document.querySelector('[data-feature-name="bookDescription"]');
    const isProductPage = window.location.href.includes('/dp/');

    console.log('Library Link: Has book description?', !!hasBookDescription);
    console.log('Library Link: Is product page URL?', isProductPage);

    // Check for book-related text in detail bullets
    const hasBookDetails = Array.from(document.querySelectorAll('.a-list-item')).some(el =>
        el.textContent.includes('ISBN') ||
        el.textContent.includes('Publisher') ||
        el.textContent.includes('Paperback') ||
        el.textContent.includes('Hardcover') ||
        el.textContent.includes('Reading age') ||
        el.textContent.includes('Language')
    );

    console.log('Library Link: Has book details?', hasBookDetails);

    // It's a book page if it has a product title and book-related content
    const isBook = !!hasProductTitle && (hasBookDetails || !!hasBookDescription);

    console.log('Library Link: Is book page?', isBook);
    return isBook;
}

// Extract book information from Amazon page
function extractBookInfo() {
    console.log('Library Link: Extracting book info...');

    const bookInfo = {
        title: '',
        author: '',
        isbn: '',
        price: 0
    };

    // Extract title
    const titleElement = document.querySelector('#productTitle, #ebooksProductTitle');
    if (titleElement) {
        bookInfo.title = titleElement.textContent.trim();
        console.log('Library Link: Found title:', bookInfo.title);
    }

    // Extract author
    const authorElement = document.querySelector('.author .a-link-normal, .contributorNameID');
    if (authorElement) {
        bookInfo.author = authorElement.textContent.trim();
    } else {
        // Alternative author location
        const bylineElement = document.querySelector('#bylineInfo');
        if (bylineElement) {
            const authorMatch = bylineElement.textContent.match(/by\s+([^(]+)/i);
            if (authorMatch) {
                bookInfo.author = authorMatch[1].trim();
            }
        }
    }
    console.log('Library Link: Found author:', bookInfo.author);

    // Extract ISBN - simplified
    const detailBullets = document.querySelectorAll('#detailBullets_feature_div .a-list-item, #detailBulletsWrapper_feature_div .a-list-item, .detail-bullet-list .a-list-item');
    for (const bullet of detailBullets) {
        const text = bullet.textContent;
        if (text.includes('ISBN')) {
            const isbnMatch = text.match(/(\d{10,13})/);
            if (isbnMatch) {
                bookInfo.isbn = isbnMatch[1].trim();
                console.log('Library Link: Found ISBN:', bookInfo.isbn);
                break;
            }
        }
    }

    // Extract price
    const priceElement = document.querySelector('.a-price .a-offscreen');
    if (priceElement) {
        const priceText = priceElement.textContent.trim();
        const priceMatch = priceText.match(/[\d.]+/);
        if (priceMatch) {
            bookInfo.price = parseFloat(priceMatch[0]);
            console.log('Library Link: Found price:', bookInfo.price);
        }
    }

    console.log('Library Link: Extracted book info:', bookInfo);
    return bookInfo;
}

// Show notification banner
// Show notification banner
function showNotification(bookData) {
    if (notificationShown) return;

    console.log('Library Link: Showing notification...');
    console.log('Library Link: Book data for notification:', bookData);

    // Store book data immediately so popup can access it
    chrome.storage.local.set({
        currentBook: {
            ...currentBookInfo,
            libraryData: bookData
        }
    }, () => {
        console.log('Library Link: Stored book data in chrome.storage');
    });

    // Remove any existing notification
    const existingNotification = document.getElementById('library-link-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'library-link-notification';
    notification.className = `library-link-banner ${currentPersona === 'professor' ? 'professor-banner' : ''}`;

    let message, expandedContent;

    if (currentPersona === 'professor') {
        message = bookData
            ? `📚 "${currentBookInfo.title}" is available in the library.`
            : `📚 "${currentBookInfo.title}" is not in our library.`;
        expandedContent = createProfessorExpandedContent(bookData);
    } else {
        message = bookData
            ? `📚 Great news! "${currentBookInfo.title}" is available at NYU Library!`
            : `📚 "${currentBookInfo.title}" is not in our library. Request it now!`;
        expandedContent = createStudentExpandedContent(bookData);
    }

    notification.innerHTML = `
    <div class="library-link-content">
      <div class="library-link-icon">🎓</div>
      <div class="library-link-message">
        <strong>${message}</strong>
        <p>Click to view details and save money!</p>
      </div>
      <button class="library-link-close" aria-label="Close">&times;</button>
    </div>
    ${expandedContent}
  `;

    // Add click handler to expand/collapse
    const content = notification.querySelector('.library-link-content');
    const expanded = notification.querySelector('.library-link-expanded');

    content.addEventListener('click', (e) => {
        if (!e.target.classList.contains('library-link-close')) {
            if (expanded.style.display === 'none') {
                expanded.style.display = 'block';
                notification.classList.add('library-link-expanded-state');
                console.log('Library Link: Notification expanded');
            } else {
                expanded.style.display = 'none';
                notification.classList.remove('library-link-expanded-state');
                console.log('Library Link: Notification collapsed');
            }
        }
    });

    // Add persona-specific event handlers
    if (currentPersona === 'professor') {
        // Professor actions
        if (bookData) {
            // Add to course reserve button
            const addReserveBtn = notification.querySelector('.library-link-add-reserve-btn');
            if (addReserveBtn) {
                addReserveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const courseSelect = notification.querySelector('#courseSelect');
                    const classSizeInput = notification.querySelector('#classSize');

                    const courseCode = courseSelect.value;
                    const classSize = parseInt(classSizeInput.value);

                    if (!courseCode) {
                        alert('Please select a course');
                        return;
                    }

                    if (!classSize || classSize < 1) {
                        alert('Please enter a valid class size');
                        return;
                    }

                    chrome.runtime.sendMessage(
                        {
                            action: 'addToCourseReserve',
                            courseCode: courseCode,
                            book: bookData,
                            classSize: classSize
                        },
                        (response) => {
                            if (response && response.success) {
                                addReserveBtn.textContent = '✓ Added to Course Reserve!';
                                addReserveBtn.disabled = true;
                                addReserveBtn.style.background = '#48bb78';
                            } else {
                                alert('Failed to add: ' + (response?.message || 'Unknown error'));
                            }
                        }
                    );
                });
            }
        } else {
            // Request for course button
            const requestCourseBtn = notification.querySelector('.library-link-request-course-btn');
            if (requestCourseBtn) {
                requestCourseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const courseSelect = notification.querySelector('#courseSelect');
                    const classSizeInput = notification.querySelector('#classSize');

                    const courseCode = courseSelect.value;
                    const classSize = parseInt(classSizeInput.value);

                    if (!courseCode) {
                        alert('Please select a course');
                        return;
                    }

                    if (!classSize || classSize < 1) {
                        alert('Please enter a valid class size');
                        return;
                    }

                    chrome.runtime.sendMessage(
                        {
                            action: 'requestBookForCourse',
                            book: currentBookInfo,
                            courseCode: courseCode,
                            classSize: classSize
                        },
                        (response) => {
                            if (response && response.success) {
                                requestCourseBtn.textContent = `✓ Requested! (${response.requestCount} total)`;
                                requestCourseBtn.disabled = true;
                                requestCourseBtn.style.background = '#48bb78';
                            } else {
                                alert('Failed to request: ' + (response?.message || 'Unknown error'));
                            }
                        }
                    );
                });
            }
        }
    } else {
        // Student actions
        if (bookData) {
            const borrowBtn = notification.querySelector('.library-link-borrow-btn');
            if (borrowBtn) {
                chrome.storage.local.get(['borrowedBooks'], (result) => {
                    const borrowedBooks = result.borrowedBooks || [];
                    const alreadyBorrowed = borrowedBooks.some(b => b.isbn === bookData.isbn);

                    if (alreadyBorrowed) {
                        borrowBtn.textContent = '✓ Already Borrowed';
                        borrowBtn.disabled = true;
                        borrowBtn.style.background = '#cbd5e0';
                        borrowBtn.style.cursor = 'not-allowed';
                    } else {
                        borrowBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            chrome.runtime.sendMessage(
                                { action: 'borrowBook', book: bookData },
                                (response) => {
                                    if (response && response.success) {
                                        borrowBtn.textContent = '✓ Added to Borrowed Books!';
                                        borrowBtn.disabled = true;
                                        borrowBtn.style.background = '#48bb78';
                                    }
                                }
                            );
                        });
                    }
                });

                // Add map button handler
                const mapBtn = notification.querySelector('.library-link-map-btn');
                if (mapBtn) {
                    mapBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showFloorPlanModal(bookData);
                    });
                }
            }
        } else {
            const requestBtn = notification.querySelector('.library-link-request-btn');
            if (requestBtn) {
                const isbn = currentBookInfo.isbn || currentBookInfo.title;
                chrome.runtime.sendMessage(
                    { action: 'checkUserRequest', isbn: isbn, title: currentBookInfo.title },
                    (response) => {
                        if (response && response.hasRequested) {
                            requestBtn.textContent = '✓ You Already Requested This';
                            requestBtn.disabled = true;
                            requestBtn.style.background = '#cbd5e0';
                            requestBtn.style.cursor = 'not-allowed';
                        } else {
                            requestBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                chrome.runtime.sendMessage(
                                    { action: 'addRequest', book: currentBookInfo },
                                    (response) => {
                                        if (response && response.success) {
                                            requestBtn.textContent = `✓ Request Added! (${response.requestCount} total)`;
                                            requestBtn.disabled = true;
                                            requestBtn.style.background = '#48bb78';
                                        } else if (response && !response.success) {
                                            requestBtn.textContent = '✓ You Already Requested This';
                                            requestBtn.disabled = true;
                                            requestBtn.style.background = '#cbd5e0';
                                        }
                                    }
                                );
                            });
                        }
                    }
                );
            }
        }
    }

    // Add close button handler
    const closeBtn = notification.querySelector('.library-link-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notification.classList.add('library-link-hidden');
        setTimeout(() => notification.remove(), 300);
    });

    // Insert notification at top of page
    document.body.insertBefore(notification, document.body.firstChild);

    // Animate in
    setTimeout(() => notification.classList.add('library-link-visible'), 100);

    notificationShown = true;
    console.log('Library Link: Notification shown');
}

// Helper functions for persona-specific content
function createStudentExpandedContent(bookData) {
    if (bookData) {
        return `
      <div class="library-link-expanded" style="display: none;">
        <div class="library-link-details">
          <h3>${bookData.title}</h3>
          <p class="author">by ${bookData.author}</p>
          <div class="details-grid">
            <div class="detail-item">
              <span class="label">Copies Available:</span>
              <span class="value">${bookData.copiesAvailable}</span>
            </div>
            <div class="detail-item">
              <span class="label">Location:</span>
              <span class="value">${bookData.location}</span>
            </div>
            <div class="detail-item">
              <span class="label">You'll Save:</span>
              <span class="value price">$${bookData.price.toFixed(2)}</span>
            </div>
          </div>
          <div class="button-group">
            <button class="library-link-borrow-btn">📖 Borrow and Pickup</button>
            <button class="library-link-map-btn">📍 Show Me Where</button>
          </div>
        </div>
      </div>
    `;
    } else {
        return `
      <div class="library-link-expanded" style="display: none;">
        <div class="library-link-details">
          <h3>${currentBookInfo.title}</h3>
          <p class="author">${currentBookInfo.author ? 'by ' + currentBookInfo.author : ''}</p>
          <div class="request-info">
            <p>This book is not currently in our library. Request it to help us prioritize acquisitions!</p>
            <button class="library-link-request-btn">➕ Add Request</button>
            <p class="ez-borrow-note">
              You can also use <a href="https://ezborrow.reshare.indexdata.com/" target="_blank">EZBorrow</a> or <a href="https://library.nyu.edu/services/borrowing/from-non-nyu-libraries/interlibrary-loan/" target="_blank">InterLibrary Loan (ILL)</a> for materials unavailable at NYU
            </p>
          </div>
        </div>
      </div>
    `;
    }
}

function createProfessorExpandedContent(bookData) {
    if (bookData) {
        return `
      <div class="library-link-expanded" style="display: none;">
        <div class="library-link-details">
          <h3>${bookData.title}</h3>
          <p class="author">by ${bookData.author}</p>
          <div class="details-grid">
            <div class="detail-item">
              <span class="label">Copies Available:</span>
              <span class="value">${bookData.copiesAvailable}</span>
            </div>
            <div class="detail-item">
              <span class="label">Location:</span>
              <span class="value">${bookData.location}</span>
            </div>
          </div>
          
          <div class="professor-actions">
            <div class="course-select-group">
              <label for="courseSelect">Select Course:</label>
              <select id="courseSelect" class="course-select">
                <option value="">Choose a course...</option>
                <option value="CS101">CS101 - Intro to Computer Science</option>
                <option value="CS201">CS201 - Data Structures</option>
                <option value="CS301">CS301 - Software Engineering</option>
              </select>
            </div>
            
            <div class="class-size-group">
              <label for="classSize">Expected Class Size:</label>
              <input type="number" id="classSize" class="class-size-input" 
                     placeholder="e.g., 30" min="1" max="500">
            </div>
            
            <button class="library-link-add-reserve-btn">📚 Add to Course Reserve</button>
          </div>
        </div>
      </div>
    `;
    } else {
        return `
      <div class="library-link-expanded" style="display: none;">
        <div class="library-link-details">
          <h3>${currentBookInfo.title}</h3>
          <p class="author">${currentBookInfo.author ? 'by ' + currentBookInfo.author : ''}</p>
          <div class="request-info">
            <p>This book is not in our library. Request it for your course to help us prioritize acquisitions!</p>
          </div>
          
          <div class="professor-actions">
            <div class="course-select-group">
              <label for="courseSelect">Select Course:</label>
              <select id="courseSelect" class="course-select">
                <option value="">Choose a course...</option>
                <option value="CS101">CS101 - Intro to Computer Science</option>
                <option value="CS201">CS201 - Data Structures</option>
                <option value="CS301">CS301 - Software Engineering</option>
              </select>
            </div>
            
            <div class="class-size-group">
              <label for="classSize">Expected Class Size:</label>
              <input type="number" id="classSize" class="class-size-input" 
                     placeholder="e.g., 30" min="1" max="500">
            </div>
            
            <button class="library-link-request-course-btn">➕ Request for Course</button>
          </div>
        </div>
      </div>
    `;
    }
}

// Show floor plan modal
function showFloorPlanModal(bookData) {
    const existingModal = document.getElementById('library-link-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'library-link-modal';
    modal.className = 'library-link-modal';

    const imageUrl = chrome.runtime.getURL('icons/Gemini_Generated_Image_xw5kwfxw5kwfxw5k.png');

    modal.innerHTML = `
        <div class="library-link-modal-content">
            <button class="library-link-modal-close">&times;</button>
            <h3>Library Floor Plan</h3>
            <p>Location: ${bookData.location}</p>
            <div class="library-link-floor-plan">
                <img src="${imageUrl}" alt="Library Floor Plan">
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector('.library-link-modal-close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Animate in
    setTimeout(() => modal.classList.add('visible'), 10);
}
// Check if book is in library
function checkLibrary(bookInfo) {

    console.log('Library Link: Checking library for book...');

    chrome.runtime.sendMessage(
        { action: 'checkBook', bookInfo: bookInfo },
        (response) => {
            console.log('Library Link: Library check response:', response);

            if (response && response.found) {
                showNotification(response.bookData);
            } else if (bookInfo.title) {
                // Show notification even if not found, so user can request it
                showNotification(null);
            }
        }
    );
}

// Main detection function
function detectAndNotify() {
    console.log('Library Link: Running detectAndNotify...');
    console.log('Library Link: Current URL:', window.location.href);

    if (isBookPage()) {
        currentBookInfo = extractBookInfo();

        // Only proceed if we have at least a title
        if (currentBookInfo.title) {
            console.log('Library Link: Book detected', currentBookInfo);
            checkLibrary(currentBookInfo);
        } else {
            console.log('Library Link: Book page detected but no title found');
        }
    } else {
        console.log('Library Link: Not a book page');
    }
}

// Run detection when page loads
console.log('Library Link: Setting up detection...');
console.log('Library Link: Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Library Link: DOMContentLoaded event fired');
        detectAndNotify();
    });
} else {
    console.log('Library Link: Document already loaded, running detection now');
    // Wait a bit for dynamic content
    setTimeout(detectAndNotify, 1000);
}

// Also run when navigating (for single-page app behavior)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        notificationShown = false;
        currentBookInfo = null;
        console.log('Library Link: URL changed, re-running detection');
        setTimeout(detectAndNotify, 1000);
    }
}).observe(document, { subtree: true, childList: true });

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Library Link: Received message:', request);

    if (request.action === 'getCurrentBook') {
        console.log('Library Link: Sending current book info:', currentBookInfo);
        sendResponse({ bookInfo: currentBookInfo });
    }

    return true; // Keep channel open for async response
});

console.log('Library Link: Content script initialization complete');

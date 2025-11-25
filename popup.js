// Popup script for Library Link extension

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize persona
    await initializePersona();

    // Load and display total savings (student only)
    loadSavings();

    // Load current book information
    await loadCurrentBook();

    // Setup init default requests button
    document.getElementById('initDefaultRequests').addEventListener('click', initializeDefaultRequests);

    // Setup persona toggle
    document.getElementById('personaToggle').addEventListener('change', handlePersonaToggle);

    // Setup course selector
    document.getElementById('courseSelect').addEventListener('change', loadCourseReserves);
});

// Load total savings
function loadSavings() {
    chrome.storage.local.get(['totalSavings'], (result) => {
        const savings = result.totalSavings || 0;
        document.getElementById('totalSavings').textContent = `$${savings.toFixed(2)} `;
    });
}

// Load current book from storage or active tab
async function loadCurrentBook() {
    const loadingState = document.getElementById('loadingState');
    const noBookState = document.getElementById('noBookState');
    const availableState = document.getElementById('availableState');
    const unavailableState = document.getElementById('unavailableState');

    console.log('Popup: Loading current book...');

    try {
        // First try to get from storage
        chrome.storage.local.get(['currentBook'], async (result) => {
            console.log('Popup: Storage result:', result);

            if (result.currentBook && result.currentBook.title) {
                console.log('Popup: Found book in storage:', result.currentBook);
                const bookData = result.currentBook;

                if (bookData.libraryData) {
                    // Book is available in library
                    showAvailableBook(bookData, bookData.libraryData);
                } else {
                    // Book is not available, show request option
                    showUnavailableBook(bookData);
                }

                loadingState.style.display = 'none';
            } else {
                // No book in storage, try to get from active tab
                console.log('Popup: No book in storage, querying active tab...');

                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                console.log('Popup: Active tab:', tab);

                if (tab && tab.url && tab.url.includes('amazon.com')) {
                    // Send message to content script to get book info
                    chrome.tabs.sendMessage(tab.id, { action: 'getCurrentBook' }, (response) => {
                        console.log('Popup: Response from content script:', response);

                        if (chrome.runtime.lastError) {
                            console.log('Popup: Error communicating with content script:', chrome.runtime.lastError);
                            showNoBook();
                            return;
                        }

                        if (response && response.bookInfo && response.bookInfo.title) {
                            console.log('Popup: Got book from content script:', response.bookInfo);
                            checkBookAvailability(response.bookInfo);
                        } else {
                            console.log('Popup: No book info from content script');
                            showNoBook();
                        }
                    });
                } else {
                    console.log('Popup: Not on Amazon page');
                    showNoBook();
                }
            }
        });
    } catch (error) {
        console.error('Popup: Error loading book:', error);
        showNoBook();
    }
}

// Check if book is available in library
function checkBookAvailability(bookInfo) {
    chrome.runtime.sendMessage(
        { action: 'checkBook', bookInfo: bookInfo },
        (response) => {
            const loadingState = document.getElementById('loadingState');
            loadingState.style.display = 'none';

            if (response && response.found) {
                showAvailableBook(bookInfo, response.bookData);
            } else {
                showUnavailableBook(bookInfo);
            }
        }
    );
}

// Show book available state
function showAvailableBook(bookInfo, libraryData) {
    const availableState = document.getElementById('availableState');
    const loadingState = document.getElementById('loadingState');

    loadingState.style.display = 'none';
    availableState.style.display = 'block';

    // Populate book details
    document.getElementById('bookTitle').textContent = libraryData.title;
    document.getElementById('bookAuthor').textContent = `by ${libraryData.author} `;
    document.getElementById('copiesAvailable').textContent = libraryData.copiesAvailable;
    document.getElementById('location').textContent = libraryData.location;
    document.getElementById('bookPrice').textContent = `$${libraryData.price.toFixed(2)} `;

    // Setup borrow button
    const borrowBtn = document.getElementById('borrowBtn');
    const borrowSuccess = document.getElementById('borrowSuccess');

    // Check if already borrowed
    chrome.storage.local.get(['borrowedBooks'], (result) => {
        const borrowedBooks = result.borrowedBooks || [];
        const alreadyBorrowed = borrowedBooks.some(b => b.isbn === libraryData.isbn);

        if (alreadyBorrowed) {
            borrowBtn.textContent = '✓ Already Borrowed';
            borrowBtn.disabled = true;
            borrowBtn.classList.add('disabled');
        }
    });

    borrowBtn.onclick = () => {
        chrome.runtime.sendMessage(
            {
                action: 'borrowBook',
                book: libraryData
            },
            (response) => {
                if (response && response.success) {
                    borrowBtn.style.display = 'none';
                    borrowSuccess.style.display = 'block';

                    // Update savings display
                    document.getElementById('totalSavings').textContent = `$${response.totalSavings.toFixed(2)} `;

                    const savingsAmount = document.getElementById('totalSavings');
                    savingsAmount.classList.add('pulse');
                    setTimeout(() => savingsAmount.classList.remove('pulse'), 600);
                }
            }
        );
    };

    // Setup map button
    const mapBtn = document.getElementById('mapBtn');
    const modal = document.getElementById('floorPlanModal');
    const modalImg = document.getElementById('floorPlanImg');
    const modalLocation = document.getElementById('modalLocation');
    const closeModal = document.querySelector('.close-modal');
    const reportBtn = document.getElementById('reportMissingBtn');

    mapBtn.onclick = () => {
        modal.style.display = 'block';
        modalImg.src = 'icons/Gemini_Generated_Image_xw5kwfxw5kwfxw5k.png';
        modalLocation.textContent = `Location: ${libraryData.location}`;

        // Reset report button state
        reportBtn.textContent = '⚠️ Report Book Missing';
        reportBtn.disabled = false;
        reportBtn.style.background = 'transparent';
        reportBtn.style.color = '#e53e3e';
        reportBtn.style.cursor = 'pointer';
    };

    reportBtn.onclick = () => {
        reportBtn.textContent = '✓ Reported to Library Staff';
        reportBtn.disabled = true;
        reportBtn.style.background = '#e53e3e';
        reportBtn.style.color = 'white';
        reportBtn.style.cursor = 'default';

        // Simulate API call
        console.log('Library Link: Book reported missing', bookInfo);

        setTimeout(() => {
            alert('Thank you for reporting. Library staff have been notified and will check the shelf.');
        }, 100);
    };

    closeModal.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

// Show book unavailable state
function showUnavailableBook(bookInfo) {
    const unavailableState = document.getElementById('unavailableState');
    const loadingState = document.getElementById('loadingState');

    loadingState.style.display = 'none';
    unavailableState.style.display = 'block';

    // Populate book details
    document.getElementById('unavailableBookTitle').textContent = bookInfo.title;
    document.getElementById('unavailableBookAuthor').textContent = bookInfo.author ? `by ${bookInfo.author} ` : '';

    // Get current request count
    const isbn = bookInfo.isbn || bookInfo.title;
    chrome.runtime.sendMessage(
        { action: 'getRequestCount', isbn: isbn, title: bookInfo.title },
        (response) => {
            const requestCount = response ? response.requestCount : 0;
            document.getElementById('requestCount').textContent = requestCount;
        }
    );

    // Setup request button
    const requestBtn = document.getElementById('requestBtn');
    const requestSuccess = document.getElementById('requestSuccess');

    // Check if user already requested this book
    chrome.runtime.sendMessage(
        { action: 'checkUserRequest', isbn: isbn, title: bookInfo.title },
        (response) => {
            if (response && response.hasRequested) {
                requestBtn.textContent = '✓ You Already Requested This';
                requestBtn.disabled = true;
                requestBtn.classList.add('disabled');
            } else {
                requestBtn.onclick = () => {
                    chrome.runtime.sendMessage(
                        {
                            action: 'addRequest',
                            book: bookInfo
                        },
                        (response) => {
                            if (response && response.success) {
                                requestBtn.style.display = 'none';
                                requestSuccess.style.display = 'block';
                                document.getElementById('newRequestCount').textContent = response.requestCount;

                                // Update the count display
                                document.getElementById('requestCount').textContent = response.requestCount;
                            } else if (response && !response.success) {
                                requestBtn.textContent = '✓ You Already Requested This';
                                requestBtn.disabled = true;
                                requestBtn.classList.add('disabled');
                            }
                        }
                    );
                };
            }
        }
    );
}

// Show no book state
function showNoBook() {
    const loadingState = document.getElementById('loadingState');
    const noBookState = document.getElementById('noBookState');

    loadingState.style.display = 'none';
    noBookState.style.display = 'block';
}

// Initialize default pending requests (for testing)
function initializeDefaultRequests() {
    const defaultRequests = {
        '978-0-13-235088-4': {
            book: {
                isbn: '978-0-13-235088-4',
                title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
                author: 'Robert C. Martin',
                price: 45.00
            },
            requestCount: 3,
            requestedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        '978-0-201-63361-0': {
            book: {
                isbn: '978-0-201-63361-0',
                title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
                author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
                price: 55.00
            },
            requestCount: 5,
            requestedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        '978-0-135-95705-9': {
            book: {
                isbn: '978-0-135-95705-9',
                title: 'The Pragmatic Programmer',
                author: 'David Thomas, Andrew Hunt',
                price: 50.00
            },
            requestCount: 2,
            requestedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
    };

    console.log('Popup: Initializing default requests:', defaultRequests);

    chrome.storage.local.set({ bookRequests: defaultRequests }, () => {
        console.log('Popup: Default requests saved to storage');

        // Verify it was saved
        chrome.storage.local.get(['bookRequests'], (result) => {
            console.log('Popup: Verification - bookRequests in storage:', result.bookRequests);
        });

        const btn = document.getElementById('initDefaultRequests');
        btn.textContent = '✓ Initialized!';
        btn.style.background = '#48bb78';
        setTimeout(() => {
            btn.textContent = '🔧 Init Requests';
            btn.style.background = '';
        }, 2000);
    });
}

// ===== PERSONA MANAGEMENT =====

// Initialize persona on load
async function initializePersona() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getCurrentPersona' }, (response) => {
            const persona = response?.persona || 'student';
            const toggle = document.getElementById('personaToggle');

            if (persona === 'professor') {
                toggle.checked = true;
                showProfessorView();
                loadCourseReserves();
            } else {
                toggle.checked = false;
                showStudentView();
            }

            console.log('Popup: Initialized persona:', persona);
            resolve();
        });
    });
}

// Handle persona toggle
function handlePersonaToggle(event) {
    const isProfessor = event.target.checked;
    const newPersona = isProfessor ? 'professor' : 'student';

    chrome.runtime.sendMessage(
        { action: 'switchPersona', persona: newPersona },
        (response) => {
            if (response && response.success) {
                console.log('Popup: Switched to', newPersona);

                if (isProfessor) {
                    showProfessorView();
                    loadCourseReserves();
                } else {
                    showStudentView();
                }
            }
        }
    );
}

// Show student view
function showStudentView() {
    document.querySelectorAll('.student-only').forEach(el => {
        // Check if it's the savings section (has flex display)
        if (el.classList.contains('savings-section')) {
            el.style.display = 'flex';
        } else {
            el.style.display = 'block';
        }
    });
    document.querySelectorAll('.professor-only').forEach(el => {
        el.style.display = 'none';
    });
}

// Show professor view
function showProfessorView() {
    document.querySelectorAll('.student-only').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll('.professor-only').forEach(el => {
        // Check if it's the course reserves section
        if (el.classList.contains('course-reserves-section')) {
            el.style.display = 'block';
        } else {
            el.style.display = 'block';
        }
    });
}

// ===== COURSE RESERVE MANAGEMENT =====

// Load course reserves
function loadCourseReserves() {
    const courseSelect = document.getElementById('courseSelect');
    const selectedCourse = courseSelect.value;

    chrome.runtime.sendMessage(
        {
            action: 'getCourseReserves',
            courseCode: selectedCourse || undefined
        },
        (response) => {
            if (response && response.reserves) {
                displayCourseReserves(response.reserves, selectedCourse);
            }
        }
    );
}

// Display course reserves
function displayCourseReserves(reserves, selectedCourse) {
    const reservesList = document.getElementById('courseReservesList');

    if (!selectedCourse) {
        // Show all courses
        const allReserves = [];
        for (const [courseCode, books] of Object.entries(reserves)) {
            books.forEach(book => {
                allReserves.push({ ...book, courseCode });
            });
        }

        if (allReserves.length === 0) {
            reservesList.innerHTML = `
        <div class="empty-reserves">
          <div class="empty-reserves-icon">📚</div>
          <div class="empty-reserves-text">No books in course reserves yet.<br>Visit Amazon to add books!</div>
        </div>
      `;
            return;
        }

        reservesList.innerHTML = allReserves.map(item => createReserveItemHTML(item, item.courseCode)).join('');
    } else {
        // Show specific course
        if (!reserves || reserves.length === 0) {
            reservesList.innerHTML = `
        <div class="empty-reserves">
          <div class="empty-reserves-icon">📚</div>
          <div class="empty-reserves-text">No books in this course reserve yet.<br>Visit Amazon to add books!</div>
        </div>
      `;
            return;
        }

        reservesList.innerHTML = reserves.map(item => createReserveItemHTML(item, selectedCourse)).join('');
    }

    // Add event listeners to remove buttons
    document.querySelectorAll('.reserve-remove-btn').forEach(btn => {
        btn.addEventListener('click', handleRemoveFromReserve);
    });
}

// Create HTML for a reserve item
function createReserveItemHTML(item, courseCode) {
    const addedDate = new Date(item.addedDate).toLocaleDateString();

    return `
    <div class="reserve-item" data-isbn="${item.book.isbn}" data-course="${courseCode}">
      <div class="reserve-book-title">${item.book.title}</div>
      <div class="reserve-book-author">${item.book.author || 'Unknown Author'}</div>
      <div class="reserve-details">
        <span>Course: ${courseCode}</span>
        <span>Class Size: ${item.classSize}</span>
      </div>
      <div class="reserve-details">
        <span>Added: ${addedDate}</span>
        <span>By: ${item.addedBy}</span>
      </div>
      <button class="reserve-remove-btn">Remove from Course</button>
    </div>
  `;
}

// Handle remove from reserve
function handleRemoveFromReserve(event) {
    const reserveItem = event.target.closest('.reserve-item');
    const isbn = reserveItem.dataset.isbn;
    const courseCode = reserveItem.dataset.course;

    if (!confirm(`Remove this book from ${courseCode}?`)) {
        return;
    }

    chrome.runtime.sendMessage(
        {
            action: 'removeFromCourseReserve',
            courseCode: courseCode,
            isbn: isbn
        },
        (response) => {
            if (response && response.success) {
                console.log('Popup: Removed book from course reserve');
                loadCourseReserves(); // Reload the list
            } else {
                alert('Failed to remove book: ' + (response?.message || 'Unknown error'));
            }
        }
    );
}

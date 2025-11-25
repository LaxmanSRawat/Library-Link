// Background service worker for Library Link extension

// Initialize storage on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['borrowedBooks', 'bookRequests', 'totalSavings', 'currentPersona', 'courseReserves'], (result) => {
    if (!result.borrowedBooks) {
      chrome.storage.local.set({ borrowedBooks: [] });
    }
    if (!result.bookRequests) {
      // Initialize with some default pending requests for popular books
      const defaultRequests = {
        '978-0-13-235088-4': { // Clean Code
          book: {
            isbn: '978-0-13-235088-4',
            title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
            author: 'Robert C. Martin',
            price: 45.00
          },
          requestCount: 3,
          requestedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
        },
        '978-0-201-63361-0': { // Design Patterns
          book: {
            isbn: '978-0-201-63361-0',
            title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
            author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
            price: 55.00
          },
          requestCount: 5,
          requestedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days ago
        },
        '978-0-135-95705-9': { // The Pragmatic Programmer
          book: {
            isbn: '978-0-135-95705-9',
            title: 'The Pragmatic Programmer',
            author: 'David Thomas, Andrew Hunt',
            price: 50.00
          },
          requestCount: 2,
          requestedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        }
      };
      chrome.storage.local.set({ bookRequests: defaultRequests });
    }
    if (!result.totalSavings) {
      chrome.storage.local.set({ totalSavings: 0 });
    }
    if (!result.currentPersona) {
      chrome.storage.local.set({ currentPersona: 'student' }); // Default to student
    }
    if (!result.courseReserves) {
      chrome.storage.local.set({ courseReserves: {} }); // Empty course reserves
    }
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkBook') {
    // Load library dataset and check if book exists
    fetch(chrome.runtime.getURL('data/library-books.json'))
      .then(response => response.json())
      .then(data => {
        const book = findBook(data.books, request.bookInfo);
        sendResponse({ found: !!book, bookData: book });
      })
      .catch(error => {
        console.error('Error loading library data:', error);
        sendResponse({ found: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'borrowBook') {
    // Add book to borrowed list and update savings
    chrome.storage.local.get(['borrowedBooks', 'totalSavings'], (result) => {
      const borrowedBooks = result.borrowedBooks || [];
      const totalSavings = result.totalSavings || 0;

      // Check if already borrowed
      const alreadyBorrowed = borrowedBooks.some(b => b.isbn === request.book.isbn);

      if (!alreadyBorrowed) {
        borrowedBooks.push({
          isbn: request.book.isbn,
          title: request.book.title,
          author: request.book.author,
          price: request.book.price,
          borrowedDate: new Date().toISOString()
        });

        const newSavings = totalSavings + request.book.price;

        chrome.storage.local.set({
          borrowedBooks: borrowedBooks,
          totalSavings: newSavings
        }, () => {
          sendResponse({ success: true, totalSavings: newSavings });
          updateBadge(borrowedBooks.length);
        });
      } else {
        sendResponse({ success: false, message: 'Book already borrowed' });
      }
    });
    return true;
  }

  if (request.action === 'addRequest') {
    // Add or increment request for unavailable book
    chrome.storage.local.get(['bookRequests', 'userRequests'], (result) => {
      const bookRequests = result.bookRequests || {};
      const userRequests = result.userRequests || [];
      const isbn = request.book.isbn || request.book.title;

      // Normalize ISBN for comparison
      const normalizedIsbn = isbn.replace(/-/g, '');

      // Check if user already requested this book (with normalized ISBN)
      const alreadyRequested = userRequests.some(storedIsbn =>
        storedIsbn.replace(/-/g, '') === normalizedIsbn
      );

      if (alreadyRequested) {
        // Find the existing request count
        let existingCount = 0;
        for (const [storedIsbn, data] of Object.entries(bookRequests)) {
          if (storedIsbn.replace(/-/g, '') === normalizedIsbn) {
            existingCount = data.requestCount;
            break;
          }
        }

        sendResponse({
          success: false,
          message: 'You have already requested this book',
          requestCount: existingCount
        });
        return;
      }

      // Find existing request entry (might have different ISBN format)
      let existingKey = null;
      for (const storedIsbn of Object.keys(bookRequests)) {
        if (storedIsbn.replace(/-/g, '') === normalizedIsbn) {
          existingKey = storedIsbn;
          break;
        }
      }

      if (existingKey) {
        // Increment existing request
        bookRequests[existingKey].requestCount += 1;
      } else {
        // Create new request entry
        bookRequests[isbn] = {
          book: request.book,
          requestCount: 1,
          requestedDate: new Date().toISOString()
        };
      }

      // Add to user's request list
      userRequests.push(isbn);

      // Get the final count
      const finalKey = existingKey || isbn;
      const finalCount = bookRequests[finalKey].requestCount;

      chrome.storage.local.set({
        bookRequests: bookRequests,
        userRequests: userRequests
      }, () => {
        console.log('Background: Request added. New count:', finalCount);
        sendResponse({
          success: true,
          requestCount: finalCount
        });
      });
    });
    return true;
  }

  if (request.action === 'checkUserRequest') {
    // Check if user has already requested this book
    chrome.storage.local.get(['userRequests'], (result) => {
      const userRequests = result.userRequests || [];
      const isbn = request.isbn || request.title;

      // Check both exact match and normalized match (without dashes)
      let hasRequested = userRequests.includes(isbn);

      if (!hasRequested && isbn) {
        const normalizedIsbn = isbn.replace(/-/g, '');
        hasRequested = userRequests.some(storedIsbn =>
          storedIsbn.replace(/-/g, '') === normalizedIsbn
        );
      }

      sendResponse({ hasRequested: hasRequested });
    });
    return true;
  }

  if (request.action === 'getRequestCount') {
    // Get current request count for a book
    chrome.storage.local.get(['bookRequests'], (result) => {
      const bookRequests = result.bookRequests || {};
      const isbn = request.isbn || request.title;

      // Try exact match first
      let requestCount = bookRequests[isbn]?.requestCount || 0;

      // If no exact match and we have an ISBN, try normalized match (without dashes)
      if (requestCount === 0 && isbn) {
        const normalizedIsbn = isbn.replace(/-/g, '');

        // Search through all stored requests for a normalized match
        for (const [storedIsbn, data] of Object.entries(bookRequests)) {
          const normalizedStoredIsbn = storedIsbn.replace(/-/g, '');
          if (normalizedStoredIsbn === normalizedIsbn) {
            requestCount = data.requestCount;
            break;
          }
        }
      }

      console.log('Background: getRequestCount for', isbn, '=', requestCount);
      sendResponse({ requestCount: requestCount });
    });
    return true;
  }

  if (request.action === 'getSavings') {
    // Get total savings
    chrome.storage.local.get(['totalSavings'], (result) => {
      sendResponse({ totalSavings: result.totalSavings || 0 });
    });
    return true;
  }

  // ===== PERSONA MANAGEMENT =====

  if (request.action === 'switchPersona') {
    // Switch between student and professor personas
    const newPersona = request.persona; // 'student' or 'professor'
    chrome.storage.local.set({ currentPersona: newPersona }, () => {
      console.log('Background: Switched persona to', newPersona);
      sendResponse({ success: true, persona: newPersona });
    });
    return true;
  }

  if (request.action === 'getCurrentPersona') {
    // Get current persona
    chrome.storage.local.get(['currentPersona'], (result) => {
      sendResponse({ persona: result.currentPersona || 'student' });
    });
    return true;
  }

  // ===== COURSE RESERVE MANAGEMENT =====

  if (request.action === 'addToCourseReserve') {
    // Add book to a course reserve
    chrome.storage.local.get(['courseReserves'], (result) => {
      const courseReserves = result.courseReserves || {};
      const { courseCode, book, classSize } = request;

      // Initialize course array if it doesn't exist
      if (!courseReserves[courseCode]) {
        courseReserves[courseCode] = [];
      }

      // Check if book already in this course
      const normalizedIsbn = book.isbn.replace(/-/g, '');
      const alreadyInCourse = courseReserves[courseCode].some(item =>
        item.book.isbn.replace(/-/g, '') === normalizedIsbn
      );

      if (alreadyInCourse) {
        sendResponse({
          success: false,
          message: 'Book already in this course reserve'
        });
        return;
      }

      // Add book to course reserve
      courseReserves[courseCode].push({
        book: book,
        classSize: classSize,
        addedDate: new Date().toISOString(),
        addedBy: 'Dr. Sarah Johnson' // From persona data
      });

      chrome.storage.local.set({ courseReserves: courseReserves }, () => {
        console.log('Background: Added book to course reserve', courseCode);
        sendResponse({ success: true, courseCode: courseCode });
      });
    });
    return true;
  }

  if (request.action === 'removeFromCourseReserve') {
    // Remove book from a course reserve
    chrome.storage.local.get(['courseReserves'], (result) => {
      const courseReserves = result.courseReserves || {};
      const { courseCode, isbn } = request;

      if (!courseReserves[courseCode]) {
        sendResponse({ success: false, message: 'Course not found' });
        return;
      }

      // Normalize ISBN for comparison
      const normalizedIsbn = isbn.replace(/-/g, '');

      // Filter out the book
      const originalLength = courseReserves[courseCode].length;
      courseReserves[courseCode] = courseReserves[courseCode].filter(item =>
        item.book.isbn.replace(/-/g, '') !== normalizedIsbn
      );

      if (courseReserves[courseCode].length === originalLength) {
        sendResponse({ success: false, message: 'Book not found in course' });
        return;
      }

      chrome.storage.local.set({ courseReserves: courseReserves }, () => {
        console.log('Background: Removed book from course reserve', courseCode);
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'getCourseReserves') {
    // Get course reserves (all courses or specific course)
    chrome.storage.local.get(['courseReserves'], (result) => {
      const courseReserves = result.courseReserves || {};

      if (request.courseCode) {
        // Get specific course
        sendResponse({
          reserves: courseReserves[request.courseCode] || []
        });
      } else {
        // Get all courses
        sendResponse({ reserves: courseReserves });
      }
    });
    return true;
  }

  if (request.action === 'checkBookInCourseReserves') {
    // Check if a book is in any course reserves
    chrome.storage.local.get(['courseReserves'], (result) => {
      const courseReserves = result.courseReserves || {};
      const isbn = request.isbn;
      const normalizedIsbn = isbn.replace(/-/g, '');

      const coursesWithBook = [];

      for (const [courseCode, books] of Object.entries(courseReserves)) {
        const bookInCourse = books.find(item =>
          item.book.isbn.replace(/-/g, '') === normalizedIsbn
        );

        if (bookInCourse) {
          coursesWithBook.push({
            courseCode: courseCode,
            classSize: bookInCourse.classSize,
            addedDate: bookInCourse.addedDate
          });
        }
      }

      sendResponse({
        inCourseReserve: coursesWithBook.length > 0,
        courses: coursesWithBook
      });
    });
    return true;
  }

  if (request.action === 'requestBookForCourse') {
    // Request an unavailable book for a course
    chrome.storage.local.get(['bookRequests'], (result) => {
      const bookRequests = result.bookRequests || {};
      const { book, courseCode, classSize } = request;
      const isbn = book.isbn || book.title;

      // Normalize ISBN
      const normalizedIsbn = isbn.replace(/-/g, '');

      // Find existing request entry
      let existingKey = null;
      for (const storedIsbn of Object.keys(bookRequests)) {
        if (storedIsbn.replace(/-/g, '') === normalizedIsbn) {
          existingKey = storedIsbn;
          break;
        }
      }

      if (existingKey) {
        // Add course request to existing entry
        if (!bookRequests[existingKey].courseRequests) {
          bookRequests[existingKey].courseRequests = [];
        }

        // Check if already requested for this course
        const alreadyRequested = bookRequests[existingKey].courseRequests.some(
          req => req.courseCode === courseCode
        );

        if (alreadyRequested) {
          sendResponse({
            success: false,
            message: 'Already requested for this course'
          });
          return;
        }

        bookRequests[existingKey].courseRequests.push({
          courseCode: courseCode,
          classSize: classSize,
          requestedDate: new Date().toISOString(),
          requestedBy: 'Dr. Sarah Johnson'
        });

        // Increment total count
        bookRequests[existingKey].requestCount += 1;
      } else {
        // Create new request entry
        bookRequests[isbn] = {
          book: book,
          requestCount: 1,
          requestedDate: new Date().toISOString(),
          courseRequests: [{
            courseCode: courseCode,
            classSize: classSize,
            requestedDate: new Date().toISOString(),
            requestedBy: 'Dr. Sarah Johnson'
          }]
        };
      }

      const finalKey = existingKey || isbn;
      const finalCount = bookRequests[finalKey].requestCount;

      chrome.storage.local.set({ bookRequests: bookRequests }, () => {
        console.log('Background: Requested book for course', courseCode);
        sendResponse({
          success: true,
          requestCount: finalCount
        });
      });
    });
    return true;
  }
});

// Helper function to find book in library dataset
function findBook(books, bookInfo) {
  // Try to match by ISBN first (most reliable)
  if (bookInfo.isbn) {
    const byIsbn = books.find(b =>
      b.isbn === bookInfo.isbn ||
      b.isbn.replace(/-/g, '') === bookInfo.isbn.replace(/-/g, '')
    );
    if (byIsbn) return byIsbn;
  }

  // Fall back to title matching
  if (bookInfo.title) {
    const normalizedTitle = bookInfo.title.toLowerCase().trim();
    return books.find(b =>
      b.title.toLowerCase().trim() === normalizedTitle ||
      b.title.toLowerCase().includes(normalizedTitle) ||
      normalizedTitle.includes(b.title.toLowerCase())
    );
  }

  return null;
}

// Update extension badge
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#57068c' }); // NYU purple
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

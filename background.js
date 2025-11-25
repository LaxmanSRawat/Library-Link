// Background service worker for Library Link extension

// Initialize storage on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['borrowedBooks', 'bookRequests', 'totalSavings'], (result) => {
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

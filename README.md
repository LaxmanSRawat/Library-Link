# Library Link - NYU Library Browser Extension

A Chrome browser extension that helps NYU students discover books available in NYU Libraries while browsing Amazon.com. Save money by borrowing instead of buying!

![Extension Icon](icons/icon128.png)

## Features

### 📚 Book Detection
- Automatically detects when you're viewing a book on Amazon.com
- Shows a notification banner if the book is available in NYU Libraries
- Displays book details including copies available, location, and potential savings

### 💰 Savings Tracker
- Tracks total money saved by borrowing instead of buying
- Displays cumulative savings in the extension popup
- Shows individual book prices for each borrowed item

### 📖 Book Availability
**Available Books:**
- View number of copies available
- See library location
- One-click "Borrow and Pickup" button
- Prevents duplicate borrows

**Unavailable Books:**
- See pending requests from other students
- Add your request to help prioritize acquisitions
- Prevents duplicate requests per user

### 🎓 Engineering-Focused Dataset
Includes 15 popular engineering textbooks:
- Computer Science (Algorithms, AI, Databases, Operating Systems)
- Electrical Engineering (Circuits, Signals & Systems)
- Mechanical Engineering (Thermodynamics, Fluid Mechanics, Dynamics)
- Software Engineering (Design Patterns, Machine Learning)

## Installation

### Prerequisites
- Google Chrome or Chromium-based browser (Edge, Brave, etc.)
- macOS, Windows, or Linux

### Steps

1. **Download or Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Library-Link.git
   cd Library-Link
   ```

2. **Load the Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the `Library Link` folder

3. **Verify Installation**
   - You should see the Library Link icon (purple book) in your toolbar
   - Click the icon to open the popup and see "Total Savings: $0.00"

4. **Initialize Default Pending Requests (Optional)**
   - Click the extension icon to open the popup
   - Click the small **"🔧 Init Requests"** button in the top-right corner
   - This adds sample pending requests for testing (Clean Code: 3, Design Patterns: 5, Pragmatic Programmer: 2)

## Usage

### Finding Available Books

1. Go to Amazon.com
2. Search for any engineering textbook (e.g., "Introduction to Algorithms Cormen")
3. Click on a book to view its product page
4. If available in NYU Libraries, you'll see a **purple notification banner** at the top
5. **Click the banner** to expand and see:
   - Book title and author
   - Copies available
   - Library location
   - Money you'll save
   - "Borrow and Pickup" button

6. Click **"Borrow and Pickup"** to:
   - Add the book to your borrowed list
   - Update your total savings
   - Mark the book as borrowed (prevents duplicates)

### Requesting Unavailable Books

1. Search for a book not in the library (e.g., "Clean Code Robert Martin")
2. The banner will show "Request it now!"
3. **Click the banner** to expand and see:
   - Current pending requests from other students
   - "Add Request" button

4. Click **"Add Request"** to:
   - Increment the request counter
   - Help the library prioritize acquisitions
   - Mark that you've requested it (prevents duplicates)

### Using the Popup

Click the extension icon anytime to:
- View your **Total Savings**
- See book details for the current Amazon page
- Borrow or request books
- Check if you've already borrowed/requested a book

## Project Structure

```
Library Link/
├── manifest.json           # Extension configuration (Manifest V3)
├── background.js          # Service worker for message handling and storage
├── content.js             # Content script for Amazon page detection
├── content.css            # Styles for notification banner
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic and interactions
├── popup.css              # Popup styling
├── icons/                 # Extension icons (16x16, 48x48, 128x128)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── data/                  # Library dataset
│   └── library-books.json # 15 engineering textbooks
├── README.md              # This file
└── TESTING_BOOKS.md       # List of books for testing
```

## Technical Details

### Architecture
- **Manifest Version**: V3 (latest Chrome extension standard)
- **Permissions**: `storage`, `activeTab`, `scripting`
- **Host Permissions**: `*://www.amazon.com/*`
- **Storage**: Chrome's `chrome.storage.local` API

### Key Components

**Background Service Worker (`background.js`)**
- Handles messages from content script and popup
- Manages book matching logic with ISBN normalization
- Tracks borrowed books and pending requests
- Prevents duplicate borrows and requests

**Content Script (`content.js`)**
- Detects book pages on Amazon
- Extracts book information (title, author, ISBN, price)
- Injects notification banner
- Handles expandable book details and actions

**Popup (`popup.html/js/css`)**
- Displays total savings
- Shows book availability status
- Provides borrow and request functionality
- Includes "Init Requests" button for testing

### Data Storage

**`borrowedBooks`** - Array of borrowed books
```javascript
[{
  isbn: "978-0-13-468599-1",
  title: "Introduction to Algorithms",
  author: "Cormen et al.",
  price: 89.99,
  borrowedDate: "2025-01-15T10:30:00Z"
}]
```

**`bookRequests`** - Object mapping ISBN to request data
```javascript
{
  "978-0-13-235088-4": {
    book: { isbn, title, author, price },
    requestCount: 3,
    requestedDate: "2025-01-10T14:20:00Z"
  }
}
```

**`userRequests`** - Array of ISBNs the user has requested
```javascript
["978-0-13-235088-4", "978-0-201-63361-0"]
```

**`totalSavings`** - Number representing cumulative savings
```javascript
124.97
```

## Testing

### Available Books (In Library Dataset)
Search Amazon for these to test the "Available" flow:
- Introduction to Algorithms (Cormen)
- Artificial Intelligence: A Modern Approach (Russell & Norvig)
- Computer Networking: A Top-Down Approach (Kurose & Ross)
- Database System Concepts (Silberschatz)
- Operating System Concepts (Silberschatz)

See `data/library-books.json` for the complete list.

### Unavailable Books (Not in Dataset)
Search Amazon for these to test the "Request" flow:
- Clean Code (Robert C. Martin) - Has 3 default pending requests
- Design Patterns (Gang of Four) - Has 5 default pending requests
- The Pragmatic Programmer (Hunt & Thomas) - Has 2 default pending requests
- Cracking the Coding Interview (McDowell)

See `TESTING_BOOKS.md` for more details.

## Development

### Making Changes

1. Edit the relevant files
2. Go to `chrome://extensions/`
3. Click the **refresh icon** on the Library Link extension
4. Refresh any Amazon pages to see changes

### Adding Books to the Dataset

Edit `data/library-books.json`:
```json
{
  "isbn": "978-X-XX-XXXXXX-X",
  "title": "Book Title",
  "author": "Author Name",
  "copiesAvailable": 3,
  "location": "Engineering Library - Floor X, Section YYY",
  "price": 99.99
}
```

### Debugging

- **Content Script**: Open DevTools on Amazon page (F12) → Console tab
- **Popup**: Right-click popup → Inspect → Console tab
- **Background**: Go to `chrome://extensions/` → Click "service worker" link → Console tab

Look for messages starting with:
- `Library Link:` (content script)
- `Popup:` (popup script)
- `Background:` (background script)

## Known Limitations

- Only works on Amazon.com (not other Amazon domains)
- Book detection relies on Amazon's current page structure
- ISBN matching normalizes formats (with/without dashes) but may miss some edge cases
- Dataset is limited to 15 engineering textbooks (easily expandable)

## Future Enhancements

- [ ] Support for more Amazon domains (.ca, .co.uk, etc.)
- [ ] Integration with real NYU Library API
- [ ] Expanded book dataset
- [ ] Due date tracking for borrowed books
- [ ] Email notifications when requested books become available
- [ ] Export borrowed books list
- [ ] Statistics dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for educational purposes.

## Credits

Developed for NYU students to help save money and support library usage.

---

**Note**: This is a demonstration project. The library dataset is simulated and does not reflect actual NYU Library inventory. For real library availability, please check the official NYU Library catalog.

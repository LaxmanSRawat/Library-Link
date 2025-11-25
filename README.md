# Library Link - NYU Library Browser Extension

A Chrome browser extension that helps NYU students discover books available in NYU Libraries while browsing Amazon.com. Save money by borrowing instead of buying!

<img src="icons/icon128.png" width="80" alt="Extension Icon">

## Features

### 👥 Multi-Persona Support
- **Student Mode:** Find books, borrow, and request unavailable items.
- **Professor Mode:** Manage course reserves and request books for your classes.
- **Easy Switching:** Toggle between personas instantly from the extension popup.

### 📚 Book Detection & Availability
- Automatically detects books on Amazon.com
- **Available Books:**
  - View copies, location, and savings
  - **"Show Me Where"**: View interactive library floor plan
  - **"Report Missing"**: Report if a book is not found at its location
- **Unavailable Books:**
  - Request books for the library to acquire
  - **External Links**: Direct access to **EZBorrow** and **InterLibrary Loan (ILL)**

### 🎓 Professor Features
- **Course Reserves:** Add available books directly to your course reading lists.
- **Class Size Planning:** Specify expected class sizes for book requests.
- **Course Management:** Select specific courses (e.g., CS101, CS201) for your requests.

### 💰 Savings Tracker (Student)
- Tracks total money saved by borrowing instead of buying.
- Displays cumulative savings in the extension popup.

### 🎓 Engineering-Focused Dataset
Includes 15+ popular engineering textbooks across Computer Science, Electrical Engineering, and more.

## Installation

### Prerequisites
- Google Chrome or Chromium-based browser
- macOS, Windows, or Linux

### Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Library-Link.git
   cd Library-Link
   ```

2. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `Library Link` folder

3. **Verify**
   - Click the purple book icon in your toolbar.

## Usage

### For Students 🎒
1. **Find Books:** Browse Amazon. If a book is in the library, a purple banner appears.
2. **Borrow:** Click "Borrow and Pickup" to save it to your list.
3. **Locate:** Click **"Show Me Where"** to see the floor plan.
4. **Request:** If unavailable, click "Add Request". Use EZBorrow/ILL links if needed.

### For Professors 👨‍🏫
1. **Switch Persona:** Open popup, toggle to "Professor".
2. **Manage Reserves:**
   - On Amazon, the banner turns blue.
   - Select a course and class size.
   - Click **"Add to Course Reserve"**.
3. **Request Books:** Request unavailable books specifically for your courses.

## Project Structure

```
Library Link/
├── manifest.json           # Extension configuration
├── background.js          # Service worker & storage management
├── content.js             # Amazon page detection & banner logic
├── content.css            # Banner styling
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic & persona management
├── popup.css              # Popup styling
├── icons/                 # Icons & Floor Plan images
└── data/                  # Mock data
    ├── library-books.json # Book dataset
    └── persona-data.js    # Professor/Course data
```

## Technical Details

- **Manifest V3**: Uses latest Chrome extension standards.
- **Storage**: `chrome.storage.local` for persisting user data, personas, and reserves.
- **Message Passing**: Robust communication between content script, popup, and background worker.

## Development

### Adding Books
Edit `data/library-books.json` to add new titles to the mock dataset.

### Debugging
- **Content Script:** Amazon page console
- **Popup:** Right-click popup > Inspect
- **Background:** `chrome://extensions/` > service worker

## License
MIT License

---
**Note**: This is a demonstration project. The library dataset is simulated.

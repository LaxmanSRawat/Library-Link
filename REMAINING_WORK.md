# Multi-Persona Implementation - Remaining Work

## Issues to Fix

### 1. Popup Toggle Not Working
**Problem:** Persona toggle shows but doesn't switch views
**Root Cause:** JavaScript show/hide functions have syntax errors
**Solution:** Rewrite the persona toggle logic cleanly

### 2. Content Script Not Updated
**Problem:** Content script doesn't detect persona or show professor UI
**Solution:** Add persona detection and professor-specific banner content

### 3. CSS Missing for Professor Banner
**Problem:** No styles for course selection and class size inputs in banner
**Solution:** Add CSS for professor-specific banner elements

## Plan

1. Fix popup.js persona toggle (clean rewrite of show/hide functions)
2. Update content.js with persona detection
3. Add professor banner UI generation
4. Add CSS for professor banner elements
5. Test complete flow

## Files to Modify

- [x] popup.js - Fix toggle logic
- [ ] content.js - Add persona support
- [ ] content.css - Add professor banner styles

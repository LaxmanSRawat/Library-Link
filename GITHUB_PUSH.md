# GitHub Push Instructions

## Step 1: Create a New Repository on GitHub

1. Go to [GitHub](https://github.com)
2. Click the **"+"** icon in the top-right corner
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `Library-Link` (or your preferred name)
   - **Description**: "Chrome extension to find NYU Library books while browsing Amazon"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 2: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
cd "/Users/laxmansinghrawat/Documents/GitHub/Library Link"

# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/Library-Link.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Verify

1. Refresh your GitHub repository page
2. You should see all the files uploaded
3. The README.md will be displayed on the repository homepage

## Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```bash
cd "/Users/laxmansinghrawat/Documents/GitHub/Library Link"

# Create repository and push in one command
gh repo create Library-Link --public --source=. --remote=origin --push
```

## What's Included

✅ All extension files (manifest, scripts, styles, popup)
✅ Icons (PNG format)
✅ Library dataset (15 engineering books)
✅ Comprehensive README
✅ Testing documentation
✅ .gitignore file

## Next Steps After Pushing

1. Add topics/tags to your repository:
   - `chrome-extension`
   - `browser-extension`
   - `nyu`
   - `library`
   - `education`

2. Consider adding:
   - GitHub repository description
   - Repository website (if you have one)
   - License file (MIT recommended)

3. Share with others:
   - Copy the repository URL
   - Share with classmates or on social media
   - Add to your portfolio

---

**Ready to push!** Just follow Step 1 and Step 2 above.

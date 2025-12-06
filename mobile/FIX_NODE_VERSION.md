# Fix: URL.canParse is not a function

This error means your Node.js version is too old. Expo SDK 54 requires **Node.js 20+**.

## Solution: Upgrade Node.js

### Option 1: Using nvm (Recommended)

If you have `nvm` (Node Version Manager):

```bash
# Install Node.js 20 (LTS)
nvm install 20

# Use Node.js 20
nvm use 20

# Set as default
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
```

### Option 2: Using Homebrew (macOS)

```bash
# Install Node.js 20
brew install node@20

# Link it
brew link node@20

# Verify
node --version  # Should show v20.x.x
```

### Option 3: Download from Node.js Website

1. Go to https://nodejs.org/
2. Download Node.js 20 LTS
3. Install it
4. Restart your terminal

### After Upgrading

```bash
cd mobile

# Clean everything
rm -rf node_modules
rm -rf .expo
npm cache clean --force

# Reinstall
npm install

# Try again
npm run ios
```

## Verify Your Node Version

```bash
node --version
```

Should show: `v20.x.x` or higher

## If You Can't Upgrade Node.js

If you absolutely cannot upgrade Node.js, you can try using an older Expo SDK, but this is **not recommended** as it may cause other compatibility issues.

```bash
# This is NOT recommended - only if you can't upgrade Node
npx expo install expo@~51.0.0
```

But the best solution is to upgrade to Node.js 20+.


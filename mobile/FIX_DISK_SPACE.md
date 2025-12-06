# Fixing Disk Space Issue

You're getting `ENOSPC: no space left on device` error. Here's how to fix it:

## Quick Fixes

### 1. Clean Up Node Modules and Cache

```bash
cd mobile

# Remove node_modules and reinstall
rm -rf node_modules
npm cache clean --force

# Reinstall dependencies
npm install
```

### 2. Clean Expo Cache

```bash
# Clear Expo cache
npx expo start -c

# Or manually clear
rm -rf .expo
rm -rf node_modules/.cache
```

### 3. Clean iOS Simulator Cache

```bash
# Clean iOS build cache
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### 4. Check Disk Space

```bash
# Check available disk space
df -h

# Check what's taking up space
du -sh ~/Library/Developer/Xcode/DerivedData
du -sh ~/.expo
du -sh node_modules
```

### 5. Free Up Space

**Remove old iOS simulators:**

```bash
xcrun simctl delete unavailable
```

**Clean npm cache:**

```bash
npm cache clean --force
```

**Remove old Expo builds:**

```bash
rm -rf ~/.expo/cache
```

**Clean Xcode derived data:**

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### 6. After Cleaning, Reinstall

```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
npm run ios
```

## If Still Out of Space

1. **Empty Trash**
2. **Remove unused applications**
3. **Clear browser caches**
4. **Use Disk Utility to free up space**
5. **Consider using a physical device instead of simulator**

## Alternative: Use Physical Device

If disk space is limited, use a physical device:

1. Install **Expo Go** from App Store
2. Run `npm start` (not `npm run ios`)
3. Scan QR code with your phone

This avoids downloading the simulator and build files.

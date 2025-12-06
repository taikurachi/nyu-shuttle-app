# Running the Mobile App

## iOS Simulator (Recommended)

Since you have Xcode installed, you can run the app on the iOS simulator:

### 1. Start the Expo Development Server

```bash
cd mobile
npm start
```

### 2. Open iOS Simulator

**Option A: From Terminal**
```bash
npm run ios
```

This will:
- Start the Expo dev server
- Automatically open the iOS simulator
- Install and launch the app

**Option B: Manual**
1. Open Xcode
2. Go to **Xcode > Open Developer Tool > Simulator**
3. Choose a device (e.g., iPhone 15 Pro)
4. In the Expo terminal, press `i` to launch on iOS

### 3. First Time Setup

If this is your first time running:
- Expo will download and install dependencies
- The iOS simulator may take a minute to boot up
- The app will build and install automatically

## Android Emulator

If you have Android Studio installed:

```bash
npm run android
```

Or press `a` in the Expo terminal.

## Physical Device

### iOS (iPhone/iPad)

1. Install **Expo Go** from the App Store
2. Make sure your phone and computer are on the same WiFi network
3. Run `npm start`
4. Scan the QR code with your camera (iOS) or Expo Go app

### Android

1. Install **Expo Go** from Google Play Store
2. Make sure your phone and computer are on the same WiFi network
3. Run `npm start`
4. Scan the QR code with the Expo Go app

## Troubleshooting

### iOS Simulator Issues

**"Command not found: xcodebuild"**
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

**Simulator won't open**
- Make sure Xcode is fully installed (not just Command Line Tools)
- Try opening Simulator manually: `open -a Simulator`

**Build errors**
- Make sure you're in the `mobile` directory
- Try: `npx expo install --fix`
- Clear cache: `npx expo start -c`

### Location Permissions

The app will request location permissions when it first loads. Make sure to:
- Allow location access in the simulator/device settings
- For iOS simulator: Settings > Privacy > Location Services

### API Connection

The app connects to: `https://nyu-transit.vercel.app`

If you see API errors:
- Check your internet connection
- Verify the API is running and accessible
- Check the console for specific error messages

## Development Tips

- **Hot Reload**: Changes to code automatically refresh in the app
- **Shake Device**: Shake the simulator/device to open the Expo dev menu
- **Reload**: Press `r` in the terminal to reload the app
- **Clear Cache**: Press `shift+r` to clear cache and reload


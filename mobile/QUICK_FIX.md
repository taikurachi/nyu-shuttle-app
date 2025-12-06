# Quick Fix: Missing babel-preset-expo

The error `Cannot find module 'babel-preset-expo'` means this required dependency is missing.

## Fix

Run this command in the `mobile` directory:

```bash
cd mobile
npm install --save-dev babel-preset-expo@~12.0.1
```

Or if you want to reinstall everything:

```bash
cd mobile
npm install
```

The package.json has been updated to include `babel-preset-expo` in devDependencies.

## After Installing

Try running again:

```bash
npm run ios
```

## Why This Happened

When you cleaned `node_modules` earlier, some dependencies might not have been reinstalled properly. `babel-preset-expo` is a required dev dependency for Expo projects that handles Babel transformations.


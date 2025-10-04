Publishing to Play Store (Android) using EAS

Prereqs

- Expo account logged in: `npx expo login`
- EAS account/project linked: `npx expo whoami`, `npx expo init:sync` if needed
- Play Console account with an app created (package `com.hugamara.mayday` per app.config.js)
- Keystore managed by EAS (we use credentialsSource: remote)

Build (AAB for Play Store)

```bash
cd mayday/mayday_mobile_app
npx expo install # ensure deps
eas build --profile production --platform android
```

Submit to Play Console (Internal testing track)

```bash
eas submit --profile production --platform android
```

Notes

- Host is entered at runtime in the Login screen and is persisted securely.
- Microphone permission is requested at first call test/login and persisted.
- DTMF key haptics/tones require `expo-haptics` and `expo-av` (already installed).
- If using a new Play Console app, ensure the package `com.hugamara.mayday` matches and upload an initial AAB via EAS.

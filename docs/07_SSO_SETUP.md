# SSO setup (Google + Apple)

Login and Create account both support SSO via `POST /api/auth/oauth`.

## Right now (local / Expo Go)

Toggle providers in `mobile/.env`:

```bash
EXPO_PUBLIC_SSO_GOOGLE=true
EXPO_PUBLIC_SSO_APPLE=false   # set true to show Apple on iOS
EXPO_PUBLIC_AUTH_DEV_SSO=1
```

Config is read from `mobile/config/sso.ts`. Restart Expo after edits.

Backend must have `AUTH_DEV_SSO=true` for the `dev.*` token path.

## Fix: `Error 400: redirect_uri_mismatch` / Google rejects `exp://`

Google **Web** clients only allow `http://127.0.0.1` / `http://localhost` / `https://`.
They **reject** `exp://…` — that Save failed dialog is expected.

Use the API callback instead. In Google Cloud → your **Web** client → **Authorised redirect URIs**, add **only**:

```
http://127.0.0.1:3001/api/auth/google/callback
http://localhost:3001/api/auth/google/callback
```

Authorised JavaScript origins (optional):

```
http://127.0.0.1:3001
http://localhost:3001
```

Android emulator also needs port reverse so the callback reaches your Mac:

```bash
adb reverse tcp:3001 tcp:3001
```

Then reload Expo and try Google again.

From [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth client ID:

| Client type | Put in |
|-------------|--------|
| Web application | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (mobile) + include in `GOOGLE_CLIENT_IDS` (backend) |
| iOS (`com.aaspaas.app`) | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + `GOOGLE_CLIENT_IDS` |
| Android (`com.aaspaas.app` + SHA-1) | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` + `GOOGLE_CLIENT_IDS` |

Backend:

```bash
GOOGLE_CLIENT_IDS=web-id.apps.googleusercontent.com,ios-id.apps.googleusercontent.com,android-id.apps.googleusercontent.com
AUTH_DEV_SSO=false
```

Mobile: set the three `EXPO_PUBLIC_GOOGLE_*` vars and turn off `EXPO_PUBLIC_AUTH_DEV_SSO` (or leave unset once web client id is set).

There is no separate “Google API key” string for Sign-In — OAuth **client IDs** are what you need.

## Production Apple

No public API key. You need:

1. Paid Apple Developer account  
2. App ID `com.aaspaas.app` with **Sign In with Apple** enabled  
3. Capability in the iOS build (`usesAppleSignIn` + `expo-apple-authentication` plugin — already in `app.json`)  
4. Backend:

```bash
APPLE_CLIENT_ID=com.aaspaas.app
AUTH_DEV_SSO=false
```

Apple only works on real iOS (or Simulator with Apple ID). Android users use Google or email.

## Flow

1. Mobile gets Google ID token / Apple identity token  
2. `POST /api/auth/oauth` `{ provider, idToken, email?, name? }`  
3. Backend verifies token, creates or links user, returns JWT (same as email login)

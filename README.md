# ClassHub - Firebase Edition 🔒

A classroom management system with attendance tracking and peer evaluations, powered by Firebase Authentication and Firestore for secure, real-time data synchronization.

## Features

- 🔒 **Secure authentication** - Firebase Auth (encrypted passwords)
- ✅ **Real-time sync** - All users see updates instantly
- ✅ **Attendance tracking** - Time-limited codes
- ✅ **Team management** - Students form teams
- ✅ **Peer evaluations** - Anonymous teammate ratings
- ✅ **Team rankings** - Cross-team project scoring
- ✅ **Multi-class support** - Manage multiple courses

## Firebase Setup (Required)

### Step 1: Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **econclasshub**
3. Click **Build** → **Authentication** in the left sidebar
4. Click **Get started**
5. Click **Email/Password** provider
6. Toggle **Enable** to ON
7. Click **Save**

### Step 2: Create Your Admin Account

1. Still in Authentication section
2. Click **Users** tab
3. Click **Add user**
4. Enter your email and a password (min 6 chars)
5. Click **Add user**
6. Copy the **User UID** shown (you'll need this)

### Step 3: Create Admin Profile in Firestore

1. Click **Firestore Database** in the left sidebar
2. Click **Start collection** (if first time) or **+ Start collection**
3. Collection ID: `users`
4. Document ID: Paste the **User UID** from Step 2
5. Add these fields:
   - `id` (string): Same as Document ID
   - `name` (string): Your name (e.g., "Dr. Smith")
   - `email` (string): Your email
   - `role` (string): `admin`
   - `createdAt` (string): `2025-01-26T00:00:00.000Z`
6. Click **Save**

### Step 4: Create Settings Document

1. Click **+ Start collection**
2. Collection ID: `settings`
3. Document ID: `global`
4. Add these fields:
   - `registrationCode` (string): `ECON25` (or any 4-6 char code)
   - `codeExpiryMinutes` (number): `5`
5. Click **Save**

### Step 5: Set Firestore Security Rules

1. Click the **Rules** tab
2. Replace with these **secure** rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can access
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

## Deployment to Netlify

### Option 1: Replace Existing Site

1. In **GitHub Desktop**, open your repository
2. **Delete all files** in the repository folder
3. **Unzip** classhub-firebase.zip
4. **Copy all files** from `classhub-firebase/` folder into your repository
5. In GitHub Desktop:
   - Write commit message: "Add Firebase Authentication"
   - Click **Commit to main**
   - Click **Push origin**
6. Netlify will auto-rebuild (2-3 minutes)

## First Login

Use the email and password you created in Step 2 above.

## How Students Register

1. Share the website URL
2. Share the Registration Code (from Settings tab or Firestore)
3. Students click "Register" and enter the code
4. After registering, share the Class Join Code

## Security

✅ **Passwords are encrypted** by Firebase Auth
✅ **Only logged-in users** can access data
✅ **No plain-text passwords** stored in database

## View Your Data

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select **econclasshub**
3. **Authentication** → View all registered users
4. **Firestore Database** → Browse all data

## Troubleshooting

### "Invalid email or password"
- Check you created the user in Firebase Auth
- Password must be at least 6 characters

### "Registration not configured"
- Make sure `settings/global` document exists in Firestore
- It should have a `registrationCode` field

### Students can't register
- Check they're using the correct registration code
- Check you enabled Email/Password auth provider

## Tech Stack

- React 18
- Firebase Authentication (secure login)
- Firebase Firestore (real-time database)
- Tailwind CSS
- Vite (build tool)
- Netlify (hosting)

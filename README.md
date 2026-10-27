# STEMLight LabLink

**Virtual science labs for every Zimbabwean learner.** A STEMLight Academy product.

LabLink gives learners without a physical laboratory a realistic way to do O- and A-Level practicals on a phone or laptop: choose the apparatus, set it up, take readings with real measurement error, and get marked with guidance on what to improve. Teachers set practical work, see every learner's results, and confirm or adjust the mark the system gives.

- **Web app:** https://innocent-mapindu.github.io/stemlight-lablink/
- **Android app:** download `STEMLight-LabLink.apk` from the [latest Android release](../../releases/tag/android-latest)

## What is inside

| Lab | Practicals |
|---|---|
| Physics | Refraction through a glass block, simple pendulum, Hooke's law, Ohm's law and I–V characteristics, resistance of a wire |
| Chemistry | **3D titration bench**, acid–base titration, rate of reaction (magnesium and acid) |
| Biology | Osmosis in potato tissue |
| Workshop (TVET) | Centre lathe trainer: safety, speeds and feeds, tool wear, inspection |

- Each lab has levels with lessons, apparatus definitions, sample experiments and quizzes. Learners must pass a level to unlock the next.
- The question bank is marked automatically, with guidance.
- **Teachers** set practicals or their own question sets (typed, or imported from PDF or Word). They see a class summary, moderate the system's mark and comment.
- **Learners** are referred to the right tutorial when they get stuck, and get remedial recommendations after each practical.
- **Accounts:** email and password, with a teacher or learner role. Teachers get a class code, and learners join with it. Progress is saved to the account, so learners can share a phone.
- **Works offline:** after the first visit, labs, fonts and libraries are stored on the device, and the app can be installed from the browser ("Add to Home screen").

## How it is built

```
app/                 the whole web app (static files, no server code)
  index.html         LabLink app shell
  accounts.js        sign-in, classes, saving progress (Firebase), or demo mode
  firebase-config.js your Firebase project settings (empty = demo mode)
  labs/              standalone practicals, including the 3D titration bench (three.js)
  vendor/, fonts/    libraries and fonts kept locally so the app works offline
  sw.js              offline cache
firestore.rules      who can read and write what
tests/               automatic checks of the security rules
assets/              app icon and splash screen for Android
.github/workflows/   web.yml (publish website), android.yml (build APK), rules.yml (check rules)
```

Every push to `main` republishes the website, rebuilds the Android APK, and re-checks the security rules. Progress shows in the **Actions** tab.

## Switch on accounts (one time, about 10 minutes)

Until this is done, the app runs in **demo mode**. Everything is stored on the device, and a bar at the top lets you view the app as the teacher or as one of three learners. Demo mode is handy for presentations without internet.

1. Go to https://console.firebase.google.com and sign in with a Google account. Click **Create a project** and name it `stemlight-lablink`. Google Analytics is optional.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
3. **Build → Firestore Database → Create database.** Choose the location `europe-west` (or the nearest one offered), and start in **production mode**.
4. In Firestore, open the **Rules** tab. Replace everything with the contents of [`firestore.rules`](firestore.rules) and click **Publish**.
5. **Project settings** (gear icon) → **Your apps** → click the web icon `</>`. Register the app as `LabLink web`; Firebase Hosting isn't needed. Copy the values from `firebaseConfig`.
6. In this repository, open [`app/firebase-config.js`](app/firebase-config.js) and click the pencil icon. Paste the values between the quotes, then **Commit changes**.
7. **Authentication → Settings → Authorized domains → Add domain:** `innocent-mapindu.github.io`

A few minutes later, the website and a new Android build ask people to sign in or create an account.

The Firebase free (Spark) plan covers about 50,000 reads and 20,000 writes a day, and plenty of accounts. That's comfortably enough for a pilot with several schools. The `apiKey` in `firebase-config.js` is not a secret: the security rules protect the data.

## Run it on your computer

```
npm run serve        # opens the app at http://localhost:8080
```

## Android app

The APK is built automatically by GitHub Actions (Capacitor 6) and attached to the **android-latest** release.

To install it, open the release page on an Android phone, download `STEMLight-LabLink.apk`, and open it. Allow installing from your browser if asked.

This APK is signed with a development key. That's fine for demos and pilots. Publishing on Google Play needs a release signing key and a Play Console account (once-off US$25).

## Copyright

© STEMLight Academy. All rights reserved. The source is visible for review by partners and sponsors, but no licence to reuse it is granted.

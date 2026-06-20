# U.S. Visa Processing Portal — Admin Panel

## What's inside
- `index.html` — Login + full dashboard (stats, searchable/filterable applications table, detail modal, status updates, document viewing)

## Already configured
- **Firebase project:** `visa-3504e`
- **Authorized admin email:** `viccylay30@gmail.com` (set in `ADMIN_EMAILS` in `index.html`)

## New: Manage Pricing
Click **💲 Manage Pricing** in the top nav to set the MRV fee for each visa category. Saved fees write to a `settings/fees` document in Firestore and are picked up automatically by `apply.html` and the homepage — no redeploy needed, takes effect immediately for new visitors.

## Before you deploy — one step left

### Create the admin account in Firebase
1. Go to Firebase Console → `visa-3504e` project → Authentication → Users
2. Click **Add user** → enter `viccylay30@gmail.com` and set a password
3. That's it — this account will now be able to sign in to the dashboard.

If you ever want to add more admins, add their emails to the array in `index.html`:
```js
const ADMIN_EMAILS = ['viccylay30@gmail.com'];
```

### Lock down Firestore rules (important!)
Right now anyone with your Firebase config could theoretically write to Firestore directly (not through this UI) unless your rules prevent it. Recommended rules:

```
match /visa_applications/{ref} {
  allow create: if true; // public can submit applications
  allow read: if true;   // needed so applicants can check status by ref
  allow update: if request.auth != null
                && request.auth.token.email == 'viccylay30@gmail.com';
  allow delete: if false;
}

match /settings/fees {
  allow read: if true;  // apply.html and the homepage need to read current pricing
  allow write: if request.auth != null
               && request.auth.token.email == 'viccylay30@gmail.com';
}
```

This ensures only your signed-in admin account can change application status or pricing, while applicants can still create/read their own application and read current fees.

### Deploy to a separate URL
Upload this folder to its own Vercel project (different from the user-facing site) so the admin panel lives at its own subdomain, e.g. `admin-yourvisaportal.vercel.app`. Do not link to it from the public site.

## Using the dashboard
- **Stats row** — totals by status at a glance
- **Search/filter** — find applications by name, email, or reference number
- **Click a row** — opens full applicant detail: personal info, travel info, uploaded documents (click to view/download), payment & biometric status
- **Status actions** — Mark Under Review / Approve / Deny updates the application status, which the applicant sees immediately on their status tracker page.

## Security reminder
This panel uses Firebase Authentication + an email whitelist in client-side JS as a UI gate — the **real** security boundary must be your Firestore rules (above). Client-side checks alone can be bypassed by anyone reading the page source.


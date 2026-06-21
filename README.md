# U.S. Visa Processing Portal — Admin Panel

## What's inside
- `index.html` — Login + full dashboard (stats, searchable/filterable applications table, detail modal, status updates, document viewing)

## Already configured
- **Firebase project:** `visa-3504e`
- **Authorized admin email:** `viccylay30@gmail.com` (set in `ADMIN_EMAILS` in `index.html`)

## New: Manage Pricing
Click **💲 Manage Pricing** in the top nav to set the MRV fee for each visa category. Saved fees write to a `settings/fees` document in Firestore and are picked up automatically by `apply.html` and the homepage — no redeploy needed, takes effect immediately for new visitors.

## New: Mark as Paid (manual) + Approve with delivery address
- If an applicant paid you outside Flutterwave (bank transfer, cash, etc.), open their record and click **💲 Mark as Paid (Manual)** — this sets their fee as paid without needing a real transaction.
- **Approve Visa** now asks for a delivery address before confirming — this is what shows on the applicant's Track Status page once approved ("Your visa will be delivered to: ...").
- Note: applicants only see Under Review / Approved / Denied once *both* payment and biometric capture are complete, regardless of when you set the review status. Before that, they see a "pending payment" or "pending biometric" message instead.
- Once approved, a **Download Visa Document (PDF)** button appears in the applicant's detail view — same sandbox-watermarked document the applicant can download from their own Track Status page.

## New: Layout Editor
Click **🎨 Layout Editor** in the top nav to customize the visa PDF's details page:
- Tap any field chip (First Name, Last Name, Passport No., Visa Type, dates, etc.) to drop it onto the canvas — tap the same field again for a duplicate, useful if you want the same data shown in two places
- **+ Custom Text** adds any free-text label you type, positioned anywhere
- Drag any placed element to reposition it; tap to select, then **Delete Selected** to remove it
- **Upload Background Image** lets you set any image as a faint underlay behind the fields. It's automatically resized, faded, and stamped with a repeating "SAMPLE" pattern baked into the pixels before upload — this step always runs and can't be turned off, so no uploaded image (real or otherwise) can be used as a convincing security background. **Remove Background** clears it.
- **Save Layout** writes to `settings/visaLayout` in Firestore and applies to every visa PDF from then on, both from the admin panel and from applicants' Track Status page
- **Reset to Default** restores the built-in layout (and clears any background image)

One thing that's intentionally not editable here: the tiled "SANDBOX — NOT FOR REAL USE" watermark, the red header banner, and the bottom disclaimer box always render on top of whatever you build, and aren't part of the draggable canvas. That's a fixed safety backstop, not a layout choice.

## New: Visa Photo Override
In an applicant's detail view, under **Visa Photo Override**, you can upload a photo manually — it'll be used on that applicant's visa PDF instead of their biometric capture photo. Useful if biometric wasn't completed or the capture wasn't usable. **Remove Override** reverts to the biometric photo.

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
Right now anyone with your Firebase config could theoretically write to Firestore directly (not through this UI) unless your rules prevent it. Paste these into Firebase Console → Firestore → Rules:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /visa_applications/{ref} {
      allow create: if true;
      allow read: if true;

      // Admin can update anything, including reviewStatus and deliveryAddress
      allow update: if request.auth != null
                    && request.auth.token.email == 'viccylay30@gmail.com';

      // Applicants can only update payment/biometric fields, never review status or delivery address
      allow update: if request.auth == null
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
                      'feePaid', 'paymentRef',
                      'biometricScheduled', 'biometricLocation', 'biometricDate', 'biometricTime',
                      'biometricPhotos', 'biometricCaptureComplete',
                      'updatedAt'
                    ]);

      allow delete: if false;
    }

    match /settings/fees {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email == 'viccylay30@gmail.com';
    }

    match /settings/visaLayout {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email == 'viccylay30@gmail.com';
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

This ensures only your signed-in admin account can change review status, pricing, or delivery address — applicants can still create/read their own application and update their own payment/biometric progress, but can't touch the fields that decide approval.

### Deploy to a separate URL
Upload this folder to its own Vercel project (different from the user-facing site) so the admin panel lives at its own subdomain, e.g. `admin-yourvisaportal.vercel.app`. Do not link to it from the public site.

## Using the dashboard
- **Stats row** — totals by status at a glance
- **Search/filter** — find applications by name, email, or reference number
- **Click a row** — opens full applicant detail: personal info, travel info, uploaded documents (click to view/download), payment & biometric status
- **Status actions** — Mark Under Review / Approve / Deny updates the application status, which the applicant sees immediately on their status tracker page.

## Security reminder
This panel uses Firebase Authentication + an email whitelist in client-side JS as a UI gate — the **real** security boundary must be your Firestore rules (above). Client-side checks alone can be bypassed by anyone reading the page source.


# Blue Pages v3 — Public Supabase Version

This version turns Blue Pages from a browser-only prototype into a shared public directory backed by Supabase.

It also adds:
- real shared businesses
- real shared service requests
- user accounts
- admin accounts
- business approval workflow
- business priority (0–100)
- sponsored ads with priority, dates, images and links
- admin dashboard

## Files

- `index.html` — website
- `styles.css` — design
- `app.js` — application logic
- `config.js` — your Supabase URL + publishable key
- `supabase_schema.sql` — database + RLS setup
- `README.md` — this guide

## Part 1 — Create your Supabase project

1. Go to Supabase.
2. Create a new project.
3. Wait for the project to finish creating.
4. Open the project's API settings.
5. Copy:
   - Project URL
   - Publishable key (older projects may call this the `anon` key)
6. Open `config.js`.
7. Replace:

   YOUR_SUPABASE_PROJECT_URL
   YOUR_SUPABASE_PUBLISHABLE_KEY

   with your values.

### VERY IMPORTANT

The browser may contain the publishable/anon key. That is normal.

NEVER put a `service_role` key or secret key in `config.js`.

The database is protected by Row Level Security.

## Part 2 — Create the database

1. In Supabase open **SQL Editor**.
2. Create a new query.
3. Open `supabase_schema.sql` from this folder.
4. Copy the entire file.
5. Paste it into the SQL Editor.
6. Run it.
7. Make sure it finishes without errors.

The SQL creates:

- profiles
- businesses
- service_requests
- ads

It also creates the security policies.

## Part 3 — Create your Blue Pages account

1. Open your website.
2. Click **Sign In**.
3. Click **Create account**.
4. Enter your email and password.
5. Complete email confirmation if your Supabase Auth settings require it.
6. Sign in.

## Part 4 — Make yourself the administrator

This is what gives you the ability to:

- approve/manage listings
- set business priority
- create advertisements
- activate/deactivate advertisements
- delete advertisements

### Find your user ID

In Supabase:

1. Open **Authentication → Users**.
2. Find your account.
3. Copy its UUID.

Then open SQL Editor and run:

```sql
update public.profiles
set role = 'admin'
where id = 'PASTE-YOUR-USER-UUID-HERE';
```

Reload Blue Pages.

You should now see an **Admin** button in the navigation.

## Part 5 — Business listings

Players must sign in before submitting a business.

When they submit one:

- `status` starts as `pending`
- `verified` starts as false
- `priority` starts at 0

The database prevents normal users from giving themselves verification or priority.

For the first version, the admin can manage priority from the Admin page.

### How priority works

Priority is 0–100.

Example:

- 0 = normal
- 10 = slight boost
- 25 = strong boost
- 50 = major boost
- 100 = maximum priority

Higher-priority businesses appear first in directory results.

## Part 6 — Ads

Go to:

**Admin → Ads → Create ad**

You can set:

- title
- business
- description
- image URL
- destination URL
- priority
- active/inactive
- optional end date

Ads appear in the **Sponsored** section of the homepage.

### Suggested advertising system

For a real CivMC service, I recommend eventually selling:

**Basic ad**
- one week
- standard placement

**Priority ad**
- one week
- higher ad priority

**Featured business**
- business listing gets a priority boost

You can decide the actual prices yourself.

The website currently does NOT process payments.

## Part 7 — Publishing on GitHub Pages

Your repository should contain:

```text
blue-pages/
├── index.html
├── styles.css
├── app.js
├── config.js
├── supabase_schema.sql
└── README.md
```

1. Create a GitHub repository.
2. Click **Add file → Upload files**.
3. Drag all six files into the upload area.
4. Commit them.
5. Open **Settings → Pages**.
6. Choose the `main` branch.
7. Choose `/ (root)`.
8. Save.
9. Wait for GitHub Pages to deploy.

Do NOT put them inside:

```text
blue-pages/blue_pages_v3/
```

They need to be directly in the repository root.

## Part 8 — Configure Supabase Auth for your published site

In Supabase Auth URL settings, add your GitHub Pages website URL as the Site URL / allowed redirect URL as appropriate.

For example, if your published site is:

`https://YOUR-USERNAME.github.io/blue-pages/`

use that actual URL in Supabase Auth settings.

## Part 9 — What is public?

Public visitors can:

- search businesses
- browse categories
- view business pages
- view service requests
- view sponsored ads

Logged-in users can:

- submit businesses
- submit service requests
- manage their own allowed data

Admins can:

- manage business priority
- manage ads
- manage the directory

## Part 10 — Security

The SQL uses Supabase Row Level Security.

Do not remove the RLS policies just to make the site easier to set up.

Do not put secret/service-role keys into browser code.

The public website should use the publishable key.

If you later add payment processing, ad purchases, private moderation actions, or other secret operations, put those operations behind a backend/Edge Function rather than exposing secrets in `app.js`.

## Part 11 — If you want to allow unauthenticated business submissions

I recommend NOT doing that for a public directory because it makes spam much easier.

Keep account creation required for listings and requests.

## Part 12 — Testing checklist

After setup, test these:

### Public visitor

- [ ] Homepage loads
- [ ] Search works
- [ ] Category filters work
- [ ] Directory loads
- [ ] Business detail opens
- [ ] Requests load
- [ ] Ads load

### Normal account

- [ ] Can create account
- [ ] Can sign in
- [ ] Can submit business
- [ ] Cannot set business priority
- [ ] Cannot create ads

### Admin

- [ ] Admin button appears
- [ ] Business priority can be changed
- [ ] Priority changes directory ordering
- [ ] Can create an ad
- [ ] Ad appears on homepage
- [ ] Can deactivate ad
- [ ] Can reactivate ad
- [ ] Can delete ad

## Troubleshooting

### "Supabase is not connected"

Open `config.js` and make sure the two values are real:

```js
window.BLUEPAGES_CONFIG = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "your-key"
};
```

### "permission denied"

The SQL policies/grants were probably not run completely.

Run `supabase_schema.sql` again in Supabase SQL Editor.

### I created an account but cannot submit

Check whether email confirmation is required. If it is, confirm the email first.

### Admin button does not appear

Run:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR-USER-UUID';
```

Then sign out and sign back in.

### Website appears unstyled

Check that `styles.css` is next to `index.html`.

### Buttons do nothing

Check that `app.js` is next to `index.html`.

## Official Supabase documentation

Supabase's browser client can be loaded from its JavaScript CDN, and its documentation recommends using a publishable key in browser applications with Row Level Security protecting database access.

The official documentation also warns never to expose a service-role/secret key in frontend code.


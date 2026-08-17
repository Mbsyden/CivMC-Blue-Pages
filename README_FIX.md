# Blue Pages v4 — important deployment fix

This version fixes a routing/startup problem in v3.

Symptoms in v3:
- The URL hash changed when clicking navigation, but the visible page did not change.
- The Sign In button could appear to do nothing.

The cause was that the page's JavaScript could stop during startup if the Supabase browser library was unavailable. Native hash links would still change the URL, but the JavaScript router and button handlers would never finish attaching.

v4 makes the Supabase client initialization fail-safe and makes the router independent of Supabase. Navigation therefore works even if Supabase is temporarily unavailable.

## Replace your GitHub files

Upload the v4 files over the old files. Keep your existing `config.js` values if they are already correct.

Do NOT rerun the SQL schema just for this update. The database is unchanged.

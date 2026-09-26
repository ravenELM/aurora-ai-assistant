# Remove the Settings default-data flash

## Changes
- Keep the Settings page in one stable loading state until the saved profile, account email, and credit details are ready.
- Render the real Settings content only after all required account data has loaded, so “Aurora user” and default plan values never appear first.
- Preserve the existing saved profile photo preload so the photo and name appear together.

## Verification
- Open Settings with a signed-in account and confirm no default name or account values appear before the saved data.
- Check the mobile layout and current build status.

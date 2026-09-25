# Chat sidebar refinement

## Goal
Make the mobile sidebar match the supplied ChatGPT references while keeping Aurora’s black-and-gray visual language.

## Changes
- Add a smooth left-to-right opening animation, dimmed backdrop fade, and matching closing animation.
- Rework the sidebar into the reference hierarchy: New chat, Images, Library, Scheduled, Plugins, Projects, More, then Pinned and Recents.
- Add three-dot controls on chats with Share, Rename, Pin/Unpin, Archive, and Delete actions, using existing conversation capabilities where available.
- Replace the current floating footer controls with a full-width account row and a profile menu containing account details, Personalization, Profile, Settings, Help, and Log out.
- Preserve conversation selection, search, navigation, sign-out, and the existing floating chat header/composer behavior.

## Technical details
- Keep the sidebar mounted during exit so the closing transition is visible, then remove it after animation completes.
- Use existing semantic color tokens and icon/button patterns; no blue accents or glass styling.
- Do not embed the uploaded screenshots; use them only as visual references.
- Validate on the current mobile viewport and confirm the sidebar, chat menu, profile menu, backdrop dismissal, and navigation behave correctly.

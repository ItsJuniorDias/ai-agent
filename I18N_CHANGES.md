# I18n changes

This revision improves the language-selection foundation without changing the
application's existing integration credentials or environment configuration.

## Changed files

- `i18n/index.tsx`
  - Removed country/location inference, which could choose the wrong language
    and required an unnecessary sensitive permission.
  - Added `changeLanguage(language)`, which stores an explicit choice in
    `AsyncStorage` and immediately refreshes the React context.
  - Added native language labels for the selector.
- `app/(tabs)/settings.tsx`
  - Added an accessible language selector with the currently selected option.
- `app.json` and `package.json`
  - Removed the now-unused Expo Location plugin/dependency.
- `bun.lock`
  - Regenerated offline after the dependency removal.

## Important limitation

The project still contains direct visible strings in multiple integration,
onboarding, terms and assistant screens. They must be migrated to `t(...)` and
added to every language dictionary before the *entire* application is
translated. See the accompanying i18n audit for the complete coverage review.

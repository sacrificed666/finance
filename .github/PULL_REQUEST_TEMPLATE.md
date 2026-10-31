## 📝 Summary

What changes and why:

## 🔗 Related issue

Closes #

## ✅ Checklist

- [ ] The pull request targets `development` (only a hotfix targets `main`)
- [ ] The title follows Conventional Commits, for example `feat(search): remember recent cities`
- [ ] `npm run check` passes locally
- [ ] `npm run build` passes when routes, server code or configuration changed
- [ ] `npm run test:e2e` passes when pages, routes, metadata or headers changed
- [ ] New behaviour is covered by tests
- [ ] Every new function and non-obvious block has a one-line comment above it
- [ ] Texts are added to every language in `src/shared/i18n/messages/`
- [ ] `db/schema.sql` only adds tables and columns, so the data of older versions still loads
- [ ] Documentation in `docs/` is updated
- [ ] A user-visible change has a line under **Unreleased** in `CHANGELOG.md`
- [ ] The UI was checked in light and dark mode, with Full and Reduced effects, in forced colours mode, at 320 px, in a long language such as German, with the keyboard and in Safari
- [ ] The screenshots in `e2e/__screenshots__/` were taken again with the **Screenshots** workflow when the design changed

## 📸 Screenshots

Before and after, if the UI changed:

# Screen scenarios and recordings for the documentation (TODO)

> Status: to do, kept apart from testing on purpose (2026-10-17). Related:
> [E2E README, Product videos](../../apps/e2e/README.md#product-videos-demos) ·
> [Space templates](space-templates.md) · [E2E test plan](../../apps/e2e/TEST-PLAN.md)

The documentation and the website need to show how Localess is used: one written screen scenario for each feature,
recorded as a video, plus screenshots of the key pages. This matters a lot. People judge a CMS by seeing it, and a
feature page with no picture is hard to follow.

## What exists today

- **Three product videos** in `apps/e2e/demos/`: Translations, Schemas, Assets (`pnpm demos`). Playwright records them
  at 1600×900, with a title card, captions and a visible pointer (`demos/support/director.ts`). The output is
  gitignored: WebM, plus MP4 and a poster image when ffmpeg is installed.
- **Their data:** each video creates an empty "Acme Website" space (English, German, French) and fills it through the
  API with a few hand-written items. Translations adds 8 keys and Assets adds 2 folders and 2 generated images.
  Everything else in the space stays empty, so the Dashboard shows zeros and Contents is empty.
- **No screenshots** of pages in the docs, and no videos for Contents, the Visual Editor, Settings (locales, tokens,
  webhooks) or Admin.

## Decided

- **The recordings stay separate from the tests.** The e2e test templates (`LOCALESS_TEST_TEMPLATES`) are for
  testing only; the videos keep their own setup for now.
- The visual-regression screenshot tests (TEST-PLAN, "Visual regression of key pages") are a testing concern and are
  not covered here.

## To do

1. **A screen scenario per feature**, written before it is recorded: the story, the steps, the captions, and the data
   on screen at the start. Store it next to the demo, or as its first comment.
2. **The missing videos:** Contents (folders, a document, the field kinds, publish), the Visual Editor, Space
   Settings (locales, tokens, webhooks), Admin (users, spaces), and the CDN API seen from a client.
3. **Screenshots for the docs:** the key page of each feature, taken by the same scripts so they match the product,
   in light and dark themes.
4. **One realistic "Acme" space for every recording**, so the videos show a full space (documents, images, Dashboard
   counts) and the data is written once rather than in each demo. A space template is one way to do it; it must not
   already contain what a video creates on screen (a video that adds a key fails with "key already exists" if the
   template has it).
5. **Where the output goes:** recorded on demand or in CI on a release, and published to the website and docs, not
   committed to this repository.

## Open questions

- Where the docs live and how they embed media (website, `docs/`, both).
- Whether recordings are regenerated on every release or only when a screen changes.
- Captions and voice-over in other languages.

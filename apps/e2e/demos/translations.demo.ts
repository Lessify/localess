import { demo, expect } from './support/demo';

// Translations: browse, add a key, translate it, edit a text, find by label, tree view, publish.
demo.use({ videoName: 'translations' });

const SEED: { key: string; en: string; de: string; fr: string; labels: string[] }[] = [
  { key: 'nav.home', en: 'Home', de: 'Startseite', fr: 'Accueil', labels: ['navigation'] },
  { key: 'nav.products', en: 'Products', de: 'Produkte', fr: 'Produits', labels: ['navigation'] },
  { key: 'nav.pricing', en: 'Pricing', de: 'Preise', fr: 'Tarifs', labels: ['navigation'] },
  { key: 'nav.contact', en: 'Contact us', de: 'Kontakt', fr: 'Contactez-nous', labels: ['navigation'] },
  {
    key: 'home.hero.title',
    en: 'Content for every market',
    de: 'Inhalte für jeden Markt',
    fr: 'Du contenu pour chaque marché',
    labels: ['home'],
  },
  {
    key: 'home.hero.subtitle',
    en: 'Manage texts and media in one place.',
    de: 'Texte und Medien an einem Ort verwalten.',
    fr: 'Gérez textes et médias au même endroit.',
    labels: ['home'],
  },
  { key: 'checkout.title', en: 'Your cart', de: 'Ihr Warenkorb', fr: 'Votre panier', labels: ['checkout'] },
  { key: 'footer.copyright', en: '© 2026 Acme Inc.', de: '© 2026 Acme GmbH', fr: '© 2026 Acme SA', labels: ['footer'] },
];

demo('Translations: create, translate, edit and publish', async ({ page, api, space, director: d }) => {
  for (const it of SEED) {
    await api.createTranslation(space.id, { key: it.key, locales: { en: it.en, de: it.de, fr: it.fr }, labels: it.labels });
  }
  await api.publishTranslations(space.id);

  await d.titleCard('Translations', 'Create, translate and publish the texts of your apps');
  await page.goto(`/features/spaces/${space.id}/translations`);
  await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
  const row = (key: string) =>
    page
      .locator('cdk-virtual-scroll-viewport [role="listitem"]')
      .filter({ has: page.locator('[hlmItemTitle]').getByText(key, { exact: true }) });
  await expect(row('nav.home')).toBeVisible();
  await d.caption('Every text of your app, in every language', 1_600);
  await d.hover(row('home.hero.title'), 700);
  await d.hover(row('checkout.title'), 700);

  // Add a key.
  await d.caption('Add a new key with its English text');
  await d.click(page.getByRole('button', { name: 'Add Translation' }));
  const form = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Add Translation' }) });
  await d.type(form.getByLabel('Key', { exact: true }), 'checkout.pay_button');
  await d.type(form.getByLabel('Value', { exact: true }), 'Pay now');
  await d.type(form.getByLabel('Description'), 'The button that completes the order');
  await d.type(form.getByLabel('Labels'), 'checkout');
  await d.press('Enter', 600);
  await d.click(form.getByRole('button', { name: 'Save' }));
  await d.toast('Translation has been added.');
  await d.caption(undefined);

  // Translate it.
  await d.caption('Translate it: pick a language and type');
  await d.click(row('checkout.pay_button'), 700);
  for (const [locale, text] of [
    ['German', 'Jetzt bezahlen'],
    ['French', 'Payer maintenant'],
  ]) {
    await d.choose(page.getByLabel('Target Locale'), page.getByRole('option', { name: new RegExp(`^${locale}`) }));
    await d.type(page.getByRole('textbox', { name: 'Translation value' }), text, { delay: 70 });
    await d.click(page.getByRole('button', { name: /^Save/ }));
    await d.toast('Translation has been updated.', 900);
  }
  await d.caption(undefined);

  // Edit an existing text.
  await d.caption('Edit any text at any time');
  await d.type(page.getByPlaceholder('Search...'), 'hero');
  await d.click(row('home.hero.title'), 600);
  await d.choose(page.getByLabel('Target Locale'), page.getByRole('option', { name: /^English/ }));
  await d.type(page.getByRole('textbox', { name: 'Translation value' }), 'Content for every market, in minutes', { delay: 50 });
  await d.click(page.getByRole('button', { name: /^Save/ }));
  await d.toast('Translation has been updated.', 900);
  await d.caption(undefined);

  // Find by label.
  await d.caption('Find keys by label');
  await d.click(page.getByRole('button', { name: 'Reset' }));
  await d.click(page.getByRole('button', { name: 'Labels' }));
  await d.click(page.getByRole('option', { name: 'navigation', exact: true }));
  await d.press('Escape', 1_400);
  await d.click(page.getByRole('button', { name: 'Reset' }), 800);
  await d.caption(undefined);

  // Tree view.
  await d.caption('Or browse them as a tree');
  await d.click(page.getByLabel('Tree Layout', { exact: true }), 900);
  const treeRow = (name: string) =>
    page
      .locator('li[data-slot="tree-item"]')
      .filter({ has: page.locator(':scope > [data-slot="tree-item-row"]', { hasText: new RegExp(`^\\s*${name}\\s*$`) }) })
      .locator(':scope > [data-slot="tree-item-row"]');
  await d.click(treeRow('checkout'), 700);
  await d.click(treeRow('pay_button'), 1_200);
  await d.click(page.getByLabel('List Layout', { exact: true }), 600);
  await d.caption(undefined);

  // Publish.
  await d.caption('Publish: your apps get the new texts');
  await d.click(page.getByRole('button', { name: 'Publish' }));
  await d.toast('Translations have been published.', 2_000);
  await d.caption(undefined);
  await d.pause(800);
});

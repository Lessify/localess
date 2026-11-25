import { demo, expect } from './support/demo';
import { demoImage } from './support/images';

// Assets: create a folder, upload images, grid view, preview, rename, move, delete.
demo.use({ videoName: 'assets' });

demo('Assets: upload, organize, preview, rename, move and delete', async ({ page, api, space, director: d }) => {
  const brand = await api.createAssetFolder(space.id, 'Brand');
  await api.createAssetFolder(space.id, 'Products');
  await api.uploadAsset(space.id, demoImage('night-hills.png'), brand.id);
  await api.uploadAsset(space.id, demoImage('forest-morning.png'));

  await d.titleCard('Assets', 'Upload, organize and preview your media');
  await page.goto(`/features/spaces/${space.id}/assets`);
  const row = (name: string) => page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
  const card = (name: string) => page.locator('hlm-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
  await expect(row('Brand')).toBeVisible();
  await d.caption('All your images, videos and files in one place', 1_400);

  // A folder.
  await d.caption('Create folders to keep things organized');
  await d.click(page.getByRole('button', { name: 'Create Folder' }));
  const folderForm = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Create new Folder' }) });
  await d.type(folderForm.getByLabel('Name', { exact: true }), 'Spring Campaign');
  await d.click(folderForm.getByRole('button', { name: 'Save' }));
  await d.toast('Folder has been created.', 800);
  await d.click(row('Spring Campaign'), 800);
  await d.caption(undefined);

  // Upload.
  await d.caption('Upload images from your computer');
  await d.click(page.getByRole('button', { name: 'Upload Assets' }), 500);
  const chooser = page.waitForEvent('filechooser');
  await d.click(page.getByRole('menuitem', { name: 'From Local' }), 100);
  await (await chooser).setFiles([demoImage('mountain-sunrise.png'), demoImage('alpine-lake.png'), demoImage('desert-dunes.png')]);
  for (const name of ['mountain-sunrise.png', 'alpine-lake.png', 'desert-dunes.png']) await expect(row(name)).toBeVisible();
  await d.pause(1_500);
  await d.caption(undefined);

  // Grid and preview.
  await d.caption('See them as a gallery');
  await d.click(page.getByRole('button', { name: 'Grid Layout' }), 1_400);
  await d.caption('Preview any image');
  await d.click(card('mountain-sunrise.png').getByRole('button', { name: 'Open mountain-sunrise.png', exact: true }), 2_200);
  const preview = page.getByRole('dialog', { name: 'mountain-sunrise.png' });
  await d.click(preview.getByRole('button', { name: 'Close', exact: true }), 600);
  await d.caption(undefined);

  // Rename.
  await d.caption('Rename a file and describe it for screen readers');
  await d.click(card('alpine-lake.png').getByRole('button', { name: 'Edit' }));
  const fileForm = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Edit File' }) });
  await d.type(fileForm.getByLabel('Name', { exact: true }), 'spring-hero');
  await d.type(fileForm.getByLabel('Alt Text'), 'A lake between green hills under a bright sun');
  await d.click(fileForm.getByRole('button', { name: 'Save' }));
  await d.toast('File has been updated.', 800);
  await d.caption(undefined);

  // Move.
  await d.caption('Move files between folders');
  await d.click(card('desert-dunes.png').getByRole('button', { name: 'Move' }));
  const moveForm = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Move' }) });
  await d.click(moveForm.getByPlaceholder('Search folders...').first(), 600);
  await d.click(page.getByRole('option', { name: /^\s*Products\s*\|/ }), 500);
  await d.click(moveForm.getByRole('button', { name: 'Move' }));
  await d.toast('Asset has been moved.', 800);
  await d.caption(undefined);

  // Delete.
  await d.caption('Delete what you no longer need');
  await d.click(card('mountain-sunrise.png').getByRole('button', { name: 'Delete' }));
  const confirm = page.getByRole('dialog').filter({ hasText: 'Delete Asset' });
  await d.hover(confirm.getByRole('button', { name: 'OK' }), 700);
  await d.click(confirm.getByRole('button', { name: 'OK' }));
  await d.toast("Asset 'mountain-sunrise' has been deleted.", 1_000);
  await d.caption(undefined);

  // Back to the top.
  await d.click(page.getByRole('button', { name: 'Root folder' }), 1_200);
  await d.click(page.getByRole('button', { name: 'List Layout' }), 1_500);
});

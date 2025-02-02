import { logger } from 'firebase-functions/v2';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { updateMetadataByPath } from './services';

const onFileUpload = onObjectFinalized(async event => {
  logger.info(`[Storage::onFileUpload] name : ${event.data.name}`);
  // logger.info(event.data);
  const { name } = event.data;
  // Spaces Assets
  // spaces/eo42RwNL8XHD7Cdvd8eO/assets/RpMDPKkmDM66Vc1jgDpo/original
  if (name && name.startsWith('spaces/') && name.includes('assets') && name.endsWith('/original')) {
    const assetPath = name.slice(0, -9); // remove '/original'
    await updateMetadataByPath(assetPath);
  }
  return;
});

export const storage = {
  onupload: onFileUpload,
};

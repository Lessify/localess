import { Global, Logger, Module } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../config/config.js';
import { createSecretBox, SECRET_BOX, type SecretBox } from './secret-box.js';

/** The key that encrypts integration secrets saved in the UI (`SECRET_BOX`). */
@Global()
@Module({
  providers: [
    {
      provide: SECRET_BOX,
      inject: [APP_CONFIG],
      useFactory: async (config: AppConfig): Promise<SecretBox> => {
        const box = await createSecretBox(config);
        // Boots anyway: env integrations work, saving a key in the UI is refused with this reason.
        if (!box.available) new Logger('SecretBox').warn(box.reason);
        return box;
      },
    },
  ],
  exports: [SECRET_BOX],
})
export class SecretModule {}

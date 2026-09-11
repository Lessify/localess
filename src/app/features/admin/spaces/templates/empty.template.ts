import { SpaceTemplate } from '@shared/models/space-template.model';

/** The default. Applying it writes nothing at all - the space is created and that is that. */
export const EMPTY_TEMPLATE: SpaceTemplate = {
  id: 'EMPTY',
  name: 'Empty',
  description: 'A blank space. Add your own schemas.',
  icon: 'lucideFile',
  schemas: [],
};

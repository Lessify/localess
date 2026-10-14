import { DIALOG_WIDTH_FULL_SCREEN, DIALOG_WIDTH_LG, DIALOG_WIDTH_SM, DIALOG_WIDTH_XL } from './dialog-width';

/** The classes that keep a tall dialog inside the viewport (see DIALOG_WIDTH_FULL_SCREEN for why both). */
const HEIGHT_CAP = ['grid-rows-[minmax(0,1fr)]'];
const hasHeightCap = (classes: string) => /(^| )max-h-\[/.test(classes) && HEIGHT_CAP.every(it => classes.split(' ').includes(it));

describe('dialog widths', () => {
  it('caps the height of the list dialogs, so their table scrolls and the footer stays on screen', () => {
    // XL: the References picker; FULL_SCREEN: the Assets and Unsplash pickers.
    expect(hasHeightCap(DIALOG_WIDTH_XL)).toBe(true);
    expect(hasHeightCap(DIALOG_WIDTH_FULL_SCREEN)).toBe(true);
  });

  it('lets the form dialogs size to their content', () => {
    expect(hasHeightCap(DIALOG_WIDTH_SM)).toBe(false);
    expect(hasHeightCap(DIALOG_WIDTH_LG)).toBe(false);
  });
});

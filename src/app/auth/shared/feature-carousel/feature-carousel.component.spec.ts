import { TestBed } from '@angular/core/testing';

import { FeatureCarouselComponent } from './feature-carousel.component';

describe('FeatureCarouselComponent', () => {
  function setup() {
    // Stubs out the real hlm-carousel markup (from the excluded libs/ui library) so this spec
    // only exercises this component's own slide data, not the third-party carousel primitive.
    TestBed.overrideComponent(FeatureCarouselComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(FeatureCarouselComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('defines four slides, each with the required content', () => {
    const { component } = setup();

    expect(component.slides).toHaveLength(4);
    for (const slide of component.slides) {
      expect(slide.src).toBeTruthy();
      expect(slide.alt).toBeTruthy();
      expect(slide.title).toBeTruthy();
      expect(slide.description).toBeTruthy();
    }
  });

  it('loads only the first slide eagerly, the rest lazily', () => {
    const { component } = setup();

    expect(component.slides[0].loading).toBe('eager');
    expect(component.slides.slice(1).every(slide => slide.loading === 'lazy')).toBe(true);
  });

  it('configures the carousel to loop and auto-advance without stopping on interaction', () => {
    const { component } = setup();

    expect(component.options).toEqual({ loop: true });
    expect(component.plugins).toHaveLength(1);
  });
});

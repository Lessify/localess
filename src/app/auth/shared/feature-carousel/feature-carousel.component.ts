import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { HlmCarousel, HlmCarouselImports } from '@spartan-ng/helm/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { NgOptimizedImage } from '@angular/common';

interface CarouselSlide {
  src: string;
  alt: string;
  title: string;
  description: string;
  loading: 'eager' | 'lazy';
}

@Component({
  selector: 'll-feature-carousel',
  templateUrl: './feature-carousel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'absolute inset-0 flex flex-col items-center justify-center z-10',
  },
  imports: [HlmCarouselImports, NgOptimizedImage],
})
export class FeatureCarouselComponent {
  readonly carousel = viewChild.required(HlmCarousel);
  readonly plugins = [Autoplay({ delay: 4000, stopOnInteraction: false })];
  readonly options = { loop: true };

  readonly slides: CarouselSlide[] = [
    {
      src: 'assets/ui/Translations-dark.png',
      alt: 'Translation Management',
      title: 'Translation Management Tool',
      description:
        'Stop managing spreadsheets and email threads. Localess centralizes your entire translation workflow — from assigning translators to reviewing final copy — so your team ships multilingual content faster, with less back-and-forth.',
      loading: 'eager',
    },
    {
      src: 'assets/ui/Contents-dark.png',
      alt: 'Content Management',
      title: 'Content Management',
      description:
        "Your marketing team shouldn't need a developer to fix a typo. Localess gives non-technical editors full control over content — publish, update, and schedule across every channel without touching code.",
      loading: 'lazy',
    },
    {
      src: 'assets/ui/Assets-dark.png',
      alt: 'Digital Media Assets',
      title: 'Digital Media Assets',
      description:
        'Your visuals are as important as your words. Localess keeps images, videos, and documents organized alongside your content — so the right asset always reaches the right audience, in the right format.',
      loading: 'lazy',
    },
    {
      src: 'assets/ui/Schemas-dark.png',
      alt: 'Schema Definition',
      title: 'Schema Definition',
      description:
        "Your content structure shouldn't be locked in a developer's head. Localess lets anyone define and evolve content models visually — so your team stays agile as your product grows.",
      loading: 'lazy',
    },
  ];
}

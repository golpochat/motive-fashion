'use client';

import { useState } from 'react';
import { PDP_IMAGE_SIZES, StorefrontImage } from '@/components/storefront-image';

export function ProductGallery({ images }: { images: { url: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-ink/5">
        {current ? (
          <StorefrontImage src={current.url} alt={current.alt} sizes={PDP_IMAGE_SIZES} priority />
        ) : null}
      </div>
      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((image, i) => (
            <li key={`${image.url}-${i}`}>
              <button
                type="button"
                className={`relative aspect-square w-full overflow-hidden rounded-xl border ${i === index ? 'border-accent' : 'border-ink/10'}`}
                aria-label={`View image ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
              >
                <StorefrontImage src={image.url} alt={image.alt} sizes="20vw" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

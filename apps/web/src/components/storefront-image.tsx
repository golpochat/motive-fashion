import Image from 'next/image';

export function StorefrontImage({
  src,
  alt,
  sizes,
  priority = false,
  className = '',
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}

export const TILE_IMAGE_SIZES = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';
export const HERO_IMAGE_SIZES = '100vw';
export const PDP_IMAGE_SIZES = '(min-width: 1024px) 50vw, 100vw';

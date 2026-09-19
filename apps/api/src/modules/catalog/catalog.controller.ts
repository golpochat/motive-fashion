import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('collections')
  collections() {
    return this.catalog.collections();
  }

  @Get('products')
  products(
    @Query('category') category?: string,
    @Query('collection') collection?: string,
    @Query('q') q?: string,
    @Query('occasion') occasion?: string,
    @Query('sku') sku?: string,
    @Query('size') size?: string,
    @Query('color') color?: string,
    @Query('inStock') inStock?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number(limit) : undefined;
    return this.catalog.list({
      category,
      collection,
      q,
      occasion,
      sku,
      size,
      color,
      inStock: inStock === '1' || inStock === 'true',
      cursor,
      limit: Number.isFinite(parsed) ? parsed : undefined,
    });
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string) {
    return this.catalog.bySlug(slug);
  }
}

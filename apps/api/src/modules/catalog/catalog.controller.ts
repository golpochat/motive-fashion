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
  ) {
    return this.catalog.list({ category, collection, q, occasion, sku });
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string) {
    return this.catalog.bySlug(slug);
  }
}

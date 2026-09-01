import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CartService } from './modules/cart/cart.service';
import { StockService } from './modules/inventory/stock.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const carts = app.get(CartService);
  const stock = app.get(StockService);
  setInterval(() => {
    void carts.expireStale();
  }, 60_000);
  setInterval(() => {
    void stock.restockSuggestions().then((rows) => {
      if (rows.length) console.log(`Low stock SKUs: ${rows.length}`);
    });
  }, 6 * 60 * 60 * 1000);
  console.log('Motive Fashion worker running');
}

run();

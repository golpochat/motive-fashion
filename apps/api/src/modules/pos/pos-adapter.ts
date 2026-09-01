export interface PosSaleLine {
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface PosSaleInput {
  externalId: string;
  deviceId?: string;
  locationId?: string;
  email?: string;
  name?: string;
  phone?: string;
  lines: PosSaleLine[];
  totalCents: number;
}

export interface PosAdapter {
  name: string;
  onSale(input: PosSaleInput): Promise<{ orderId: string }>;
  onRefund(externalId: string, amountCents: number): Promise<void>;
  pushInventorySnapshot(): Promise<void>;
  upsertCustomer(phone: string, name: string, email?: string): Promise<void>;
  printReceipt(orderId: string): Promise<{ printed: boolean; preview: string }>;
}

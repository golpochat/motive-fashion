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
  fulfillment?: 'DELIVERY' | 'COLLECTION';
  paymentMethod?: 'CARD' | 'CASH';
  promoCode?: string;
  county?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    county: string;
    eircode: string;
    country?: string;
    label?: 'HOME' | 'WORK' | 'FAMILY' | 'OTHER';
  };
  lines: PosSaleLine[];
  totalCents: number;
}

export interface PosAdapter {
  name: string;
  onSale(
    input: PosSaleInput,
    cashierId?: string,
  ): Promise<{
    orderId: string;
    trackingToken?: string;
    paymentMethod?: 'CARD' | 'CASH';
    payUrl?: string | null;
    mock?: boolean;
  }>;
  onRefund(externalId: string, amountCents: number): Promise<void>;
  pushInventorySnapshot(): Promise<void>;
  upsertCustomer(phone: string, name: string, email?: string): Promise<void>;
  printReceipt(
    orderId: string,
    cash?: { tenderedCents?: number; changeCents?: number },
  ): Promise<{ printed: boolean; preview: string; error?: string }>;
}

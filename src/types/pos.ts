export type UnitType = 'kg' | 'pz';

export type ProductCategory = 
  | 'TODOS'
  | 'GRANEL'
  | 'ABARROTES'
  | 'LACTEOS'
  | 'BEBIDAS'
  | 'LIMPIEZA';

export interface Product {
  id: string;
  code: string; // Barcode or SKU
  name: string;
  category: ProductCategory;
  unitType: UnitType;
  price: number; // Sale price per kg or piece
  cost: number;  // Acquisition cost
  stock: number; // Current stock (kg or pieces)
  minStock: number; // Low stock threshold
  shrinkagePercent: number; // % Merma operativa estimada (e.g. 5%)
  isFrequent: boolean; // Quick selection grid on POS
  colorTheme?: string;
  emoji?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  code: string;
  name: string;
  unitType: UnitType;
  unitPrice: number;
  quantity: number; // Weight in kg or piece count
  total: number;
  shrinkageEstimated?: number;
}

export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

export interface SaleTransaction {
  id: string;
  folio: string;
  timestamp: string;
  cashier: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeDue: number;
  shiftId: string;
  hasGranel: boolean;
}

export interface CashDenominations {
  b1000: number;
  b500: number;
  b200: number;
  b100: number;
  b50: number;
  b20: number;
  m20: number;
  m10: number;
  m5: number;
  m2: number;
  m1: number;
  m050: number;
}

export type BalanceStatus = 'EXACT' | 'SURPLUS' | 'SHORTAGE';

export interface CashShift {
  id: string;
  shiftNumber: number;
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
  startingCash: number; // Fondo inicial default $500.00
  status: 'OPEN' | 'CLOSED';
  cashSales: number;
  cardSales: number;
  transferSales: number;
  bulkSalesTotal: number;
  unitSalesTotal: number;
  totalSales: number;
  expectedCash: number;
  actualCashCounted: number;
  difference: number;
  balanceStatus: BalanceStatus;
  denominations: CashDenominations;
  notes?: string;
  salesCount: number;
}

export interface StoreSettings {
  businessName: string;
  commercialName: string;
  taxId: string; // RFC
  address: string;
  cityState: string;
  phone: string;
  ticketFooter: string;
  printerPaperSize: '80mm' | '58mm';
  autoPrintReceipt: boolean;
  soundBeepEnabled: boolean;
  scannerMode: 'HID_DIRECT' | 'MANUAL';
  scaleProtocol: 'TORREY_RHINO' | 'TOLEDO' | 'MANUAL';
  scalePort: string;
  taxRatePercent: number;
  autoLockMinutes: number;
  encryptionEnabled: boolean;
  defaultStartingCash?: number;
}

export interface PeripheralStatus {
  scaleConnected: boolean;
  scaleLiveWeight: number;
  printerReady: boolean;
  scannerActive: boolean;
  isOffline: boolean;
  lastSyncTime: string;
  outboxPendingCount?: number;
}

export type CashierRole = 'CAJERO' | 'SUPERVISOR' | 'ADMIN';

export interface CashierUser {
  id: string;
  name: string;
  pin: string; // 4-digit PIN
  role: CashierRole;
  avatar?: string;
  active: boolean;
  createdAt: string;
}

export type ActiveView = 'ventas' | 'inventario' | 'turnos' | 'ajustes';

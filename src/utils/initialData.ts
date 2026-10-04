import { Product, StoreSettings, CashShift, CashierUser } from '../types/pos';

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_SETTINGS: StoreSettings = {
  businessName: 'MISCELÁNEA GÁLVEZ',
  commercialName: 'Gálvez Miscelánea',
  taxId: '',
  address: '',
  cityState: '',
  phone: '',
  ticketFooter: '¡GRACIAS POR SU COMPRA!\nConserve este ticket para cualquier aclaración',
  printerPaperSize: '58mm',
  autoPrintReceipt: true,
  soundBeepEnabled: true,
  scannerMode: 'HID_DIRECT',
  scaleProtocol: 'TORREY_RHINO',
  scalePort: 'COM3 (Báscula USB)',
  taxRatePercent: 16,
  autoLockMinutes: 3,
  encryptionEnabled: true,
  defaultStartingCash: 0
};

export const INITIAL_SHIFT: CashShift = {
  id: 'shift-101',
  shiftNumber: 1,
  cashierName: 'Cajero Principal',
  openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  closedAt: null,
  startingCash: 0.00,
  status: 'OPEN',
  cashSales: 0,
  cardSales: 0,
  transferSales: 0,
  bulkSalesTotal: 0,
  unitSalesTotal: 0,
  totalSales: 0,
  expectedCash: 0.00,
  actualCashCounted: 0.00,
  difference: 0,
  balanceStatus: 'EXACT',
  denominations: {
    b1000: 0,
    b500: 0,
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    m20: 0,
    m10: 0,
    m5: 0,
    m2: 0,
    m1: 0,
    m050: 0
  },
  salesCount: 0,
  notes: 'Turno aperturado.'
};

export const INITIAL_CASHIERS: CashierUser[] = [
  {
    id: 'user-01',
    name: 'Cajero Principal',
    pin: '1234',
    role: 'CAJERO',
    avatar: '👨‍💼',
    active: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'user-02',
    name: 'Administrador',
    pin: '9999',
    role: 'ADMIN',
    avatar: '👑',
    active: true,
    createdAt: '2026-01-01'
  }
];

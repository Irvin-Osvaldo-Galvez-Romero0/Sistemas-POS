import { Product, StoreSettings, CashShift, SaleTransaction, CashierUser } from '../types/pos';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_SHIFT, INITIAL_CASHIERS } from './initialData';

const KEYS = {
  PRODUCTS: 'pos_products_v3',
  SETTINGS: 'pos_settings_v1',
  ACTIVE_SHIFT: 'pos_active_shift_v1',
  PAST_SHIFTS: 'pos_past_shifts_v1',
  SALES: 'pos_sales_history_v1',
  CASHIERS: 'pos_cashiers_v1',
  CURRENT_USER: 'pos_current_user_v1',
};

export const loadCashiers = (): CashierUser[] => {
  try {
    const data = localStorage.getItem(KEYS.CASHIERS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore error
  }
  saveCashiers(INITIAL_CASHIERS);
  return INITIAL_CASHIERS;
};

export const saveCashiers = (cashiers: CashierUser[]): void => {
  try {
    localStorage.setItem(KEYS.CASHIERS, JSON.stringify(cashiers));
  } catch {
    // Ignore error
  }
};

export const loadCurrentUser = (): CashierUser => {
  try {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore
  }
  return INITIAL_CASHIERS[0];
};

export const saveCurrentUser = (user: CashierUser): void => {
  try {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  } catch {
    // Ignore
  }
};

export const clearAllProductsFromStorage = (): void => {
  try {
    localStorage.removeItem('pos_products_v1');
    localStorage.removeItem('pos_products_v2');
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify([]));
  } catch {
    // Ignore
  }
};

export const loadProducts = (): Product[] => {
  try {
    // Always purge previous demo versions
    if (localStorage.getItem('pos_products_v1')) localStorage.removeItem('pos_products_v1');
    if (localStorage.getItem('pos_products_v2')) localStorage.removeItem('pos_products_v2');

    const data = localStorage.getItem(KEYS.PRODUCTS);
    if (data !== null) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore error
  }
  saveProducts([]);
  return [];
};

export const saveProducts = (products: Product[]): void => {
  try {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  } catch {
    // Ignore error
  }
};

export const loadSettings = (): StoreSettings => {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      return { 
        ...INITIAL_SETTINGS, 
        ...parsed, 
        printerPaperSize: parsed.printerPaperSize === '80mm' && !localStorage.getItem('pos_printer_explicit_80mm')
          ? '58mm'
          : (parsed.printerPaperSize || '58mm')
      };
    }
  } catch {
    // Ignore
  }
  saveSettings(INITIAL_SETTINGS);
  return INITIAL_SETTINGS;
};

export const saveSettings = (settings: StoreSettings): void => {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore
  }
};

export const loadActiveShift = (): CashShift => {
  try {
    const data = localStorage.getItem(KEYS.ACTIVE_SHIFT);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore
  }
  saveActiveShift(INITIAL_SHIFT);
  return INITIAL_SHIFT;
};

export const saveActiveShift = (shift: CashShift): void => {
  try {
    localStorage.setItem(KEYS.ACTIVE_SHIFT, JSON.stringify(shift));
  } catch {
    // Ignore
  }
};

export const loadPastShifts = (): CashShift[] => {
  try {
    const data = localStorage.getItem(KEYS.PAST_SHIFTS);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore
  }
  return [];
};

/**
 * Quota-Safe LocalStorage Writer with automatic eviction & resilience.
 * Prevents QuotaExceededError data-loss in high-volume stores (ISO/IEC 25010).
 */
export const safeLocalStorageSet = (
  key: string,
  value: string,
  fallbackEviction?: () => string
): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    if (fallbackEviction) {
      try {
        const trimmed = fallbackEviction();
        localStorage.setItem(key, trimmed);
      } catch {
        // Fallback silently without crashing
      }
    }
  }
};

export const savePastShifts = (shifts: CashShift[]): void => {
  const json = JSON.stringify(shifts);
  safeLocalStorageSet(KEYS.PAST_SHIFTS, json, () => {
    // Keep latest 25 shifts in local cache
    return JSON.stringify(shifts.slice(0, 25));
  });
};

export const clearPastShiftsFromStorage = (): void => {
  try {
    localStorage.removeItem(KEYS.PAST_SHIFTS);
  } catch {
    // Ignore error
  }
};

export const loadSales = (): SaleTransaction[] => {
  try {
    const data = localStorage.getItem(KEYS.SALES);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore
  }
  return [];
};

export const saveSales = (sales: SaleTransaction[]): void => {
  const json = JSON.stringify(sales);
  safeLocalStorageSet(KEYS.SALES, json, () => {
    // Keep latest 100 sales in fast localStorage cache
    return JSON.stringify(sales.slice(0, 100));
  });
};

export const resetToFactoryDefaults = () => {
  localStorage.removeItem(KEYS.PRODUCTS);
  localStorage.removeItem(KEYS.SETTINGS);
  localStorage.removeItem(KEYS.ACTIVE_SHIFT);
  localStorage.removeItem(KEYS.PAST_SHIFTS);
  localStorage.removeItem(KEYS.SALES);
  localStorage.removeItem(KEYS.CASHIERS);
  localStorage.removeItem(KEYS.CURRENT_USER);
};

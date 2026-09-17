import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Scale, 
  CreditCard, 
  Banknote, 
  ArrowRight, 
  Sparkles, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  Percent,
  RefreshCw,
  Lock,
  UserCheck,
  Zap,
  LogOut,
  ShoppingCart
} from 'lucide-react';
import { Product, CartItem, PaymentMethod, ProductCategory, StoreSettings, CashShift, PeripheralStatus, CashierUser } from '../types/pos';
import { soundFx } from '../utils/audio';
import { formatCurrency, formatWeight } from '../utils/escpos';
import { calculateMonetaryBreakdown, toCents, fromCents, multiplyPrice } from '../utils/money';
import { sanitizeBarcodeInput } from '../utils/security';
import { runWithTransactionLock, LOCK_NAMES } from '../utils/concurrency';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
}

const CartItemRow = React.memo<CartItemRowProps>(({ item, onUpdateQuantity, onRemoveItem }) => {
  return (
    <div className="bg-white border-2 border-[#1a1a1a] p-2.5 sm:p-3 brutal-shadow-sm flex items-center justify-between gap-2.5 transition-all hover:border-black">
      {/* Product Information */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-mono-code font-black px-1.5 py-0.5 border border-[#1a1a1a] shrink-0 ${
            item.unitType === 'kg' ? 'bg-[#ffcc00] text-[#1a1a1a]' : 'bg-[#38bdf8] text-[#1a1a1a]'
          }`}>
            {item.unitType.toUpperCase()}
          </span>
          <h5 className="font-display font-black text-xs sm:text-sm text-[#1a1a1a] truncate leading-tight" title={item.name}>
            {item.name}
          </h5>
        </div>
        <div className="text-[11px] sm:text-xs font-mono-code text-stone-600 font-bold mt-1">
          {item.unitType === 'kg'
            ? `${formatWeight(item.quantity)} x ${formatCurrency(item.unitPrice)}/kg`
            : `${item.quantity} pz x ${formatCurrency(item.unitPrice)}`}
        </div>
      </div>

      {/* Tactile Quantity Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.id, -1)}
          className="w-7 h-7 sm:w-8 sm:h-8 bg-stone-100 hover:bg-[#ffcc00] active:scale-95 border-2 border-[#1a1a1a] flex items-center justify-center font-bold text-xs brutal-btn cursor-pointer transition-transform"
          title="Disminuir cantidad"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-12 sm:w-14 text-center font-mono-code font-black text-xs sm:text-sm bg-stone-50 py-1 border border-stone-300">
          {item.unitType === 'kg' ? item.quantity.toFixed(3) : item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.id, 1)}
          className="w-7 h-7 sm:w-8 sm:h-8 bg-stone-100 hover:bg-[#ffcc00] active:scale-95 border-2 border-[#1a1a1a] flex items-center justify-center font-bold text-xs brutal-btn cursor-pointer transition-transform"
          title="Aumentar cantidad"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Line Total & Trash Action */}
      <div className="text-right shrink-0 flex items-center gap-2 pl-1 border-l border-stone-200">
        <div>
          <div className="font-display font-black text-sm sm:text-base text-[#1a1a1a] leading-none">
            {formatCurrency(item.total)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemoveItem(item.id)}
          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-300 transition-colors cursor-pointer"
          title="Eliminar del ticket"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

interface ProductGridCardProps {
  product: Product;
  onProductClick: (p: Product) => void;
}

const ProductGridCard = React.memo<ProductGridCardProps>(({ product, onProductClick }) => {
  const isGranel = product.unitType === 'kg';
  const isLowStock = product.stock <= product.minStock;

  return (
    <div
      id={`product-card-${product.code}`}
      onClick={() => onProductClick(product)}
      className="bg-white border-2.5 border-[#1a1a1a] p-2.5 sm:p-3 brutal-shadow flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 hover:shadow-[4.5px_4.5px_0px_#1a1a1a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group select-none min-h-[135px]"
    >
      {/* Top Row: SKU & Unit Type Badge */}
      <div className="flex justify-between items-start gap-1 mb-1">
        <span className="font-mono-code text-[10px] text-stone-500 font-bold">
          {product.code}
        </span>
        <span
          className={`text-[9px] font-mono-code font-black px-1.5 py-0.5 border border-[#1a1a1a] ${
            isGranel ? 'bg-[#ffcc00] text-[#1a1a1a]' : 'bg-[#38bdf8] text-[#1a1a1a]'
          }`}
        >
          {isGranel ? 'GRANEL (KG)' : 'PIEZA'}
        </span>
      </div>

      {/* Product Name & Icon */}
      <div className="my-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xl shrink-0">{product.emoji || (isGranel ? '⚖️' : '📦')}</span>
          <h4 className="font-display font-black text-xs sm:text-sm text-[#1a1a1a] leading-tight line-clamp-2">
            {product.name}
          </h4>
        </div>
      </div>

      {/* Bottom Row: Price & Stock Status */}
      <div className="pt-2 border-t border-stone-200 flex justify-between items-end mt-1">
        <div>
          <span className="text-[10px] text-stone-600 block leading-none font-sans">
            {isGranel ? 'Precio / Kilo' : 'Precio / Pz'}
          </span>
          <span className="font-display font-black text-base sm:text-lg text-[#1a1a1a]">
            {formatCurrency(product.price)}
          </span>
        </div>

        <div className="text-right">
          <span
            className={`text-[9px] font-mono-code font-bold px-1 py-0.5 block ${
              isLowStock ? 'bg-red-100 text-red-700' : 'text-stone-500'
            }`}
          >
            Stock: {isGranel ? `${product.stock.toFixed(1)}kg` : `${product.stock}pz`}
          </span>
        </div>
      </div>
    </div>
  );
});

interface VentasViewProps {
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onOpenGranelModal: (product: Product) => void;
  onCompleteSale: (
    items: CartItem[], 
    paymentMethod: PaymentMethod, 
    tendered: number, 
    change: number,
    subtotal: number,
    tax: number,
    discount: number,
    total: number
  ) => void;
  settings: StoreSettings;
  activeShift: CashShift;
  peripheralStatus: PeripheralStatus;
  currentUser?: CashierUser;
  onSwitchCashier?: () => void;
  onLogout?: () => void;
}

export const VentasView: React.FC<VentasViewProps> = ({
  products,
  cart,
  setCart,
  onOpenGranelModal,
  onCompleteSale,
  settings,
  activeShift,
  peripheralStatus,
  currentUser,
  onSwitchCashier,
  onLogout,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('TODOS');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [includeTax, setIncludeTax] = useState<boolean>(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input for continuous barcode scanning ergonomics
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filter products by category & search term
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'TODOS' || p.category === selectedCategory;
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Frequent products (quick access on POS)
  const frequentProducts = useMemo(() => {
    return products.filter((p) => p.isFrequent);
  }, [products]);

  // Totals calculations with pure integer-cent engine (ISO/IEC 25010)
  const isCardOrTransfer = paymentMethod === 'TARJETA' || paymentMethod === 'TRANSFERENCIA';
  const configuredTaxRate = typeof settings.taxRatePercent === 'number' ? settings.taxRatePercent : 16;
  const activeTaxRate = (isCardOrTransfer || includeTax) ? configuredTaxRate : 0;

  const monetaryBreakdown = useMemo(() => {
    return calculateMonetaryBreakdown(cart, discountPercent, activeTaxRate);
  }, [cart, discountPercent, activeTaxRate]);

  const subtotal = monetaryBreakdown.subtotal;
  const discountAmount = monetaryBreakdown.discountAmount;
  const taxAmount = monetaryBreakdown.taxAmount;
  const finalTotal = monetaryBreakdown.total;

  // Tendered cash & change with integer-cent accuracy
  const tenderedCents = paymentMethod === 'EFECTIVO' 
    ? toCents(parseFloat(cashTenderedInput) || 0) 
    : monetaryBreakdown.totalCents;
  const changeCents = Math.max(0, tenderedCents - monetaryBreakdown.totalCents);
  const cashTendered = fromCents(tenderedCents);
  const changeDue = fromCents(changeCents);
  const isPaymentValid = paymentMethod !== 'EFECTIVO' || tenderedCents >= monetaryBreakdown.totalCents;

  // Add Product to Cart or trigger Granel modal
  const handleProductClick = useCallback((product: Product) => {
    if (product.unitType === 'kg') {
      soundFx.playKeyClick();
      onOpenGranelModal(product);
    } else {
      // Unit product (piece)
      soundFx.playScanBeep();
      setCart((prev) => {
        const existing = prev.find((item) => item.productId === product.id);
        if (existing) {
          const nextQty = existing.quantity + 1;
          return prev.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: nextQty,
                  total: multiplyPrice(item.unitPrice, nextQty),
                }
              : item
          );
        }
        return [
          ...prev,
          {
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            productId: product.id,
            code: product.code,
            name: product.name,
            unitType: 'pz',
            unitPrice: product.price,
            quantity: 1,
            total: product.price,
          },
        ];
      });
      setLastScannedFeedback(`+1 ${product.name}`);
      setTimeout(() => setLastScannedFeedback(null), 1500);
    }
  }, [onOpenGranelModal, setCart]);

  // Adjust cart item quantity (memoized)
  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    soundFx.playKeyClick();
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const step = item.unitType === 'kg' ? 0.250 : 1;
            const newQty = +(item.quantity + delta * step).toFixed(3);
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              total: multiplyPrice(item.unitPrice, newQty),
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  }, [setCart]);

  // Remove cart item (memoized)
  const handleRemoveItem = useCallback((itemId: string) => {
    soundFx.playKeyClick();
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  }, [setCart]);

  // Clear cart
  const handleClearCart = useCallback(() => {
    if (cart.length === 0) return;
    soundFx.playKeyClick();
    setCart([]);
    setCashTenderedInput('');
  }, [cart.length, setCart]);

  // Stable ref for scanner state so listeners don't re-bind on state changes
  const scannerStateRef = useRef({
    products,
    filteredProducts,
    handleProductClick,
    setSearchTerm,
    setLastScannedFeedback,
  });
  useEffect(() => {
    scannerStateRef.current = {
      products,
      filteredProducts,
      handleProductClick,
      setSearchTerm,
      setLastScannedFeedback,
    };
  });

  // Global HID Barcode Scanner buffer & timestamp tracking
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Core Barcode Processor
  const processBarcodeScan = useCallback((rawCode: string) => {
    const sanitized = sanitizeBarcodeInput(rawCode);
    if (!sanitized) return false;

    const { products, filteredProducts, handleProductClick, setSearchTerm, setLastScannedFeedback } = scannerStateRef.current;

    // 1. Direct exact match by product code (case-insensitive)
    const exactMatch = products.find(
      (p) => p.code.toLowerCase() === sanitized.toLowerCase()
    );
    if (exactMatch) {
      handleProductClick(exactMatch);
      setSearchTerm('');
      return true;
    }

    // 2. Exact match on clean alphanumeric code (ignoring spaces/dashes)
    const cleanSanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
    const cleanMatch = products.find(
      (p) => p.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanSanitized.toLowerCase()
    );
    if (cleanMatch) {
      handleProductClick(cleanMatch);
      setSearchTerm('');
      return true;
    }

    // 3. Partial match against current filtered list
    const partialMatch = filteredProducts.find(
      (p) => p.code.toLowerCase().includes(sanitized.toLowerCase()) ||
             p.name.toLowerCase().includes(sanitized.toLowerCase())
    );
    if (partialMatch) {
      handleProductClick(partialMatch);
      setSearchTerm('');
      return true;
    }

    // Product not found feedback
    soundFx.playKeyClick();
    setLastScannedFeedback(`Código no encontrado: ${sanitized}`);
    setTimeout(() => setLastScannedFeedback(null), 2500);
    return false;
  }, []);

  // Handle direct barcode search / scan submission with hardware sanitization
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTerm.trim()) {
        processBarcodeScan(searchTerm);
      }
    }
  };

  // Submit sale handler protected with Web Locks API against race conditions
  const handleCheckout = async () => {
    if (cart.length === 0 || !isPaymentValid) return;
    await runWithTransactionLock(LOCK_NAMES.CHECKOUT, async () => {
      soundFx.playCashRegisterChime();
      onCompleteSale(
        cart,
        paymentMethod,
        paymentMethod === 'EFECTIVO' ? cashTendered : finalTotal,
        paymentMethod === 'EFECTIVO' ? changeDue : 0,
        subtotal,
        taxAmount,
        discountAmount,
        finalTotal
      );
      setCashTenderedInput('');
      setDiscountPercent(0);
      setMobileTab('catalog');
    });
  };

  // Ref to hold stable checkout state to prevent thrashing window listeners
  const checkoutStateRef = useRef({ cart, isPaymentValid, handleCheckout });
  useEffect(() => {
    checkoutStateRef.current = { cart, isPaymentValid, handleCheckout };
  });

  // Continuous Global HID Barcode Scanner and Shortcuts Listener
  useEffect(() => {
    // Initial auto-focus on mount
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    // Auto-refocus on pointerdown unless clicking inside an interactive form control or button
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInteractive = target.closest('input, textarea, select, button, [role="button"], [role="dialog"]');
      if (!isInteractive) {
        setTimeout(() => {
          if (!document.querySelector('.fixed.inset-0.z-50, [id$="-modal-overlay"]')) {
            searchInputRef.current?.focus();
          }
        }, 50);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);

    // Global HID Barcode Scanner Keystroke Interceptor
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Shortcut F12 for fast checkout
      if (e.key === 'F12') {
        e.preventDefault();
        const state = checkoutStateRef.current;
        if (state.cart.length > 0 && state.isPaymentValid) {
          state.handleCheckout();
        }
        return;
      }

      // Shortcut Escape to refocus search
      if (e.key === 'Escape') {
        searchInputRef.current?.focus();
        return;
      }

      // Do NOT intercept scanner if a modal dialog is currently open
      const isModalOpen = !!document.querySelector('.fixed.inset-0.z-50, [id$="-modal-overlay"]');
      if (isModalOpen) {
        barcodeBufferRef.current = '';
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isSearchInput = activeEl?.id === 'pos-barcode-search-input';
      const isOtherInput = activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName) && !isSearchInput;

      // When the search input is focused, handleSearchKeyDown handles Enter directly
      if (isSearchInput) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;

      // Ignore modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
        return;
      }

      // Handle Enter key from barcode scanner
      if (e.key === 'Enter') {
        const buffer = barcodeBufferRef.current.trim();
        if (buffer.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          barcodeBufferRef.current = '';
          processBarcodeScan(buffer);
          searchInputRef.current?.focus();
          return;
        }
        barcodeBufferRef.current = '';
        return;
      }

      // Printable single character (numbers, letters, symbols sent by barcode scanner)
      if (e.key.length === 1) {
        // If typing slowly in another input (like cash tendered), reset buffer
        if (isOtherInput && timeDiff > 100 && barcodeBufferRef.current.length > 0) {
          barcodeBufferRef.current = '';
        }

        // If time gap between keystrokes is too long (> 350ms), start a new barcode buffer
        if (timeDiff > 350) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
        lastKeyTimeRef.current = now;

        // If NOT in any input field, prevent default space or quick navigation triggers
        if (!isOtherInput && !isSearchInput) {
          if (e.key === ' ' || e.key === '/') {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [processBarcodeScan]);

  const categories: { id: ProductCategory; label: string; icon: string }[] = [
    { id: 'TODOS', label: 'Todos', icon: '🛒' },
    { id: 'GRANEL', label: 'Granel', icon: '⚖️' },
    { id: 'ABARROTES', label: 'Abarrotes', icon: '🥫' },
    { id: 'LACTEOS', label: 'Lácteos', icon: '🥛' },
    { id: 'BEBIDAS', label: 'Bebidas', icon: '🥤' },
    { id: 'LIMPIEZA', label: 'Limpieza', icon: '🧼' },
  ];

  return (
    <div id="ventas-view-container" className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f5f0e8] animate-in fade-in duration-150">
      {/* 1. Top Peripherals Status Bar with Cashier info */}
      <header className="bg-[#1a1a1a] text-white px-3 sm:px-4 py-2 flex flex-wrap justify-between items-center border-b-4 border-[#1a1a1a] gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-[#ffcc00] text-[#1a1a1a] px-2 sm:px-2.5 py-0.5 font-display font-black text-xs">
            <span>CAJA 01</span>
          </div>

          {/* Cashier Badge & Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-base">{currentUser?.avatar || '👨‍💼'}</span>
            <div>
              <span className="font-display font-bold text-xs text-white block leading-tight">
                {currentUser?.name || activeShift.cashierName}
              </span>
              <span className="text-[10px] font-mono-code text-white/70">
                Turno #{activeShift.shiftNumber} · <span className="text-[#ffcc00] font-bold">{currentUser?.role || 'CAJERO'}</span>
              </span>
            </div>
          </div>

          {onSwitchCashier && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  soundFx.playKeyClick();
                  onSwitchCashier();
                }}
                className="px-2 py-0.5 bg-stone-800 hover:bg-[#ffcc00] hover:text-[#1a1a1a] text-stone-200 border border-stone-600 font-display font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Cambiar cajero o bloquear pantalla"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">PIN</span>
              </button>

              <button
                onClick={() => {
                  soundFx.playKeyClick();
                  if (onLogout) onLogout();
                  else onSwitchCashier();
                }}
                className="px-2 py-0.5 bg-red-950/80 hover:bg-red-600 text-red-200 hover:text-white border border-red-800 font-display font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Salir y bloquear pantalla"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          )}
        </div>

        {/* Feedback Toast */}
        {lastScannedFeedback && (
          <div className="bg-[#ffcc00] text-[#1a1a1a] px-2 py-0.5 font-bold font-display text-xs border border-white animate-bounce">
            {lastScannedFeedback}
          </div>
        )}
      </header>

      {/* Mobile Tab Switcher for Responsive Devices (< md) */}
      <div className="md:hidden flex border-b-2 border-[#1a1a1a] bg-white shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 font-display font-bold text-xs flex items-center justify-center gap-1.5 border-r-2 border-[#1a1a1a] transition-colors cursor-pointer ${
            mobileTab === 'catalog' ? 'bg-[#ffcc00] text-[#1a1a1a]' : 'bg-[#f5f0e8] text-stone-600'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catálogo</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            mobileTab === 'cart' ? 'bg-[#1a1a1a] text-[#ffcc00]' : 'bg-[#f5f0e8] text-stone-600'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Ticket</span>
          {cart.length > 0 && (
            <span className="px-1.5 py-0.2 bg-[#ef4444] text-white text-[9px] font-mono-code font-black rounded-full">
              {cart.length}
            </span>
          )}
          <span className="font-mono-code font-black ml-1 text-xs">
            {formatCurrency(finalTotal)}
          </span>
        </button>
      </div>

      {/* 2. Main Two-Panel Layout (Side-by-side on tablet/desktop, tabbed on mobile) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: Catalog & Granel Grid (55-58%) */}
        <section className={`${mobileTab === 'catalog' ? 'flex' : 'hidden'} md:flex w-full md:w-[56%] lg:w-[58%] flex-col border-r-0 md:border-r-3 lg:border-r-4 border-[#1a1a1a] bg-[#f5f0e8] overflow-hidden shrink-0 flex-1 md:flex-initial`}>
          {/* Search Bar with Continuous Scanner Receiver */}
          <div className="p-2.5 sm:p-3 bg-white border-b-3 border-[#1a1a1a] shrink-0">
            <div className="relative">
              <input
                ref={searchInputRef}
                id="pos-barcode-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Escanee código HID (automático) o busque..."
                className="w-full pl-9 pr-32 py-2 bg-[#f5f0e8] font-mono-code font-bold text-xs sm:text-sm text-[#1a1a1a] brutal-input"
                autoComplete="off"
              />
              <Search className="w-4 h-4 text-[#1a1a1a] absolute left-2.5 top-2.5" />
              <div className="absolute right-2 top-2 flex items-center gap-1.5">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs bg-stone-300 hover:bg-stone-400 px-1.5 py-0.5 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
                <span 
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 border border-green-700 font-mono-code text-[10px] font-black"
                  title="El escáner de códigos de barras está siempre activo en segundo plano sin necesidad de seleccionar este campo"
                >
                  <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
                  SCANNER ACTIVO
                </span>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pt-2 no-scrollbar pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    soundFx.playKeyClick();
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-display font-bold whitespace-nowrap border-2 border-[#1a1a1a] cursor-pointer transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-[2px_2px_0px_#ffcc00]'
                      : 'bg-white text-[#1a1a1a] hover:bg-[#ffcc00]/20 brutal-shadow-sm active:translate-x-[1px]'
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid Area */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3">
            {/* Quick Frequent Items Banner if in 'TODOS' */}
            {selectedCategory === 'TODOS' && !searchTerm && (
              <div className="mb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-display font-black uppercase text-[#1a1a1a]">
                  <Sparkles className="w-3.5 h-3.5 text-[#ffcc00]" />
                  <span>Artículos Frecuentes & Granel Rápido</span>
                </div>
              </div>
            )}

            {/* Products Grid with Memoized Cards */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
              {filteredProducts.map((product) => (
                <ProductGridCard
                  key={product.id}
                  product={product}
                  onProductClick={handleProductClick}
                />
              ))}
            </div>

            {products.length === 0 ? (
              <div className="p-8 text-center bg-white border-2 border-[#1a1a1a] brutal-shadow my-4">
                <Package className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="font-display font-black text-sm text-[#1a1a1a] uppercase">
                  Inventario Vacío
                </p>
                <p className="font-mono-code text-xs text-stone-500 mt-1">
                  No hay productos registrados en el sistema. Vaya al módulo de Inventario para registrar sus productos.
                </p>
              </div>
            ) : filteredProducts.length === 0 && (
              <div className="p-8 text-center bg-white border-2 border-[#1a1a1a] brutal-shadow my-4">
                <AlertCircle className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="font-display font-bold text-sm text-stone-700">
                  No se encontraron productos con el criterio "{searchTerm}"
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('TODOS');
                  }}
                  className="mt-3 px-3 py-1.5 bg-[#ffcc00] border-2 border-[#1a1a1a] font-display font-bold text-xs brutal-btn cursor-pointer"
                >
                  Restablecer Filtros
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Reactive Cart & Fast Checkout (Side-by-side on tablet/desktop, tabbed on mobile) */}
        <section className={`${mobileTab === 'cart' ? 'flex' : 'hidden'} md:flex flex-1 lg:w-[42%] flex-col bg-white overflow-hidden select-none`}>
          {/* Cart Header */}
          <div className="bg-[#1a1a1a] text-white p-2.5 sm:p-3 flex justify-between items-center border-b-3 border-[#1a1a1a] shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#ffcc00] text-[#1a1a1a] font-mono-code font-black text-xs flex items-center justify-center">
                {cart.length}
              </span>
              <h3 className="font-display font-black text-xs sm:text-sm text-white tracking-wide">
                TICKET DE VENTA ACTUAL
              </h3>
            </div>

            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-xs font-mono-code text-[#ef4444] hover:text-red-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar</span>
              </button>
            )}
          </div>

          {/* Cart Items List Area */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-1.5 bg-[#f5f0e8]/40">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-4 text-center text-stone-400">
                <div className="w-12 h-12 bg-white border-2 border-dashed border-stone-400 flex items-center justify-center mb-2">
                  <Package className="w-6 h-6 text-stone-400" />
                </div>
                <p className="font-display font-bold text-xs text-stone-600">
                  El ticket está vacío
                </p>
                <p className="text-[11px] text-stone-500 font-sans mt-0.5">
                  Haga clic en un producto o use el escáner HID
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                />
              ))
            )}
          </div>

          {/* Cart Breakdown & Fast Checkout Area (Ultra-Compact Low-Profile) */}
          <div className="p-1.5 sm:p-2 bg-white border-t-2 border-[#1a1a1a] shrink-0 space-y-1 sm:space-y-1.5">
            {/* 1. Quick Payment Method Selector (Low Profile) */}
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'EFECTIVO' as PaymentMethod, label: 'Efectivo', icon: Banknote },
                  { id: 'TARJETA' as PaymentMethod, label: 'Tarjeta', icon: CreditCard },
                  { id: 'TRANSFERENCIA' as PaymentMethod, label: 'Transf.', icon: RefreshCw },
                ] as const
              ).map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setPaymentMethod(method.id);
                    }}
                    className={`py-1 px-1.5 border-1.5 border-[#1a1a1a] font-display font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer brutal-btn transition-colors ${
                      isSelected
                        ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-[1.5px_1.5px_0px_#ffcc00]'
                        : 'bg-[#f5f0e8] text-stone-700 hover:bg-[#ffcc00]/20'
                    }`}
                  >
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="truncate">{method.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 1.5 Info badge when Tarjeta or Transferencia applies automatic IVA */}
            {isCardOrTransfer && configuredTaxRate > 0 && (
              <div className="bg-amber-50 border border-[#1a1a1a] px-2 py-1 flex items-center justify-between text-[11px] font-mono-code text-[#1a1a1a]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="bg-[#1a1a1a] text-[#ffcc00] font-black px-1.5 py-0.5 text-[9px] uppercase border border-[#1a1a1a] shrink-0">
                    +{configuredTaxRate}% IVA
                  </span>
                  <span className="font-bold text-stone-700 truncate">
                    {paymentMethod === 'TARJETA' ? 'Tarjeta' : 'Transferencia'} (IVA Incluido)
                  </span>
                </div>
                <span className="font-black text-amber-900 shrink-0 ml-1">
                  +{formatCurrency(taxAmount)}
                </span>
              </div>
            )}

            {/* 2. Compact Cash Section (Only if EFECTIVO) */}
            {paymentMethod === 'EFECTIVO' && (
              <div className="bg-stone-50 border border-[#1a1a1a] p-1.5 space-y-1">
                {/* Row 1: Label + Input + Live Cambio in ONE single line */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <label htmlFor="pos-cash-input" className="text-[10px] sm:text-xs font-display font-bold text-[#1a1a1a] whitespace-nowrap cursor-pointer">
                      Paga:
                    </label>
                    <div className="relative w-24 sm:w-28">
                      <span className="absolute left-1.5 top-0.5 font-bold font-mono-code text-[10px] text-stone-500">$</span>
                      <input
                        id="pos-cash-input"
                        type="number"
                        step="any"
                        min="0"
                        value={cashTenderedInput}
                        onChange={(e) => setCashTenderedInput(e.target.value)}
                        placeholder={finalTotal > 0 ? finalTotal.toFixed(2) : '0.00'}
                        className="w-full pl-4 pr-1 py-0.5 bg-white font-mono-code font-black text-xs text-right border border-[#1a1a1a] brutal-input focus:bg-yellow-50"
                      />
                    </div>
                  </div>

                  {/* Inline Cambio Feedback */}
                  <div className="text-right font-mono-code leading-none shrink-0 flex items-center gap-1">
                    <span className="text-[9px] text-stone-500 font-bold">Cambio:</span>
                    <span className={`font-black text-xs sm:text-sm ${cashTendered < finalTotal && cart.length > 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {cashTendered < finalTotal && cart.length > 0 ? 'Falta $' : formatCurrency(changeDue)}
                    </span>
                  </div>
                </div>

                {/* Row 2: Micro Quick Bills Buttons */}
                <div className="grid grid-cols-5 gap-0.5">
                  {[
                    { label: 'Exacto', short: 'Ex.', val: finalTotal },
                    { label: '$50', short: '$50', val: 50 },
                    { label: '$100', short: '$100', val: 100 },
                    { label: '$200', short: '$200', val: 200 },
                    { label: '$500', short: '$500', val: 500 },
                  ].map((b) => {
                    const currentNum = parseFloat(cashTenderedInput);
                    const isSelected = !isNaN(currentNum) && Math.abs(currentNum - b.val) < 0.01;
                    return (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => {
                          soundFx.playKeyClick();
                          setCashTenderedInput(b.val.toFixed(2));
                        }}
                        className={`py-0.5 px-0.5 border border-[#1a1a1a] font-mono-code font-bold text-[9px] sm:text-[10px] transition-colors brutal-btn truncate text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#1a1a1a] text-[#ffcc00] font-black'
                            : 'bg-white hover:bg-[#ffcc00] text-[#1a1a1a]'
                        }`}
                        title={`Pagar ${b.label}`}
                      >
                        <span className="hidden sm:inline">{b.label}</span>
                        <span className="sm:hidden">{b.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Compact Prominent Total Banner */}
            <div className="bg-[#1a1a1a] text-white px-2.5 py-1.5 border-1.5 sm:border-2 border-[#1a1a1a] brutal-shadow-sm flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[9px] font-mono-code text-white/70 uppercase font-bold">
                  TOTAL
                </span>
                <span className="text-base sm:text-lg md:text-xl font-display font-black text-[#ffcc00] leading-none">
                  {formatCurrency(finalTotal)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono-code text-stone-400">
                  ({cart.length} {cart.length === 1 ? 'partida' : 'partidas'})
                </span>
              </div>

              <div className="text-right text-[10px] font-mono-code">
                {paymentMethod === 'EFECTIVO' && cashTendered >= finalTotal ? (
                  <span className="text-[#22c55e] font-bold">
                    Cambio: {formatCurrency(changeDue)}
                  </span>
                ) : isCardOrTransfer && taxAmount > 0 ? (
                  <div className="leading-tight">
                    <span className="text-[#ffcc00] font-bold uppercase block text-[10px]">
                      {paymentMethod} • IVA {configuredTaxRate}% INC.
                    </span>
                    <span className="text-stone-300 text-[9px]">
                      Base: {formatCurrency(subtotal)} | IVA: {formatCurrency(taxAmount)}
                    </span>
                  </div>
                ) : (
                  <span className="text-stone-300 font-bold uppercase">
                    {paymentMethod}
                  </span>
                )}
              </div>
            </div>

            {/* 4. Action Button: Cobrar / Cerrar Venta */}
            <button
              id="btn-checkout-sale"
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || !isPaymentValid}
              className="w-full py-2 sm:py-2.5 bg-[#ffcc00] hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#1a1a1a] font-display font-black text-xs sm:text-sm border-2 border-[#1a1a1a] brutal-shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <span>COBRAR / CERRAR VENTA (F12)</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

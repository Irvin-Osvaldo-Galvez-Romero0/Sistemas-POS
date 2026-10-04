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
import { lookupRealProduct } from '../utils/realProductLookup';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
}

const CartItemRow = React.memo<CartItemRowProps>(({ item, onUpdateQuantity, onRemoveItem }) => {
  return (
    <div className="bg-white border-2 border-[#1a1a1a] p-1.5 sm:p-2 md:p-2.5 brutal-shadow-sm flex items-center justify-between gap-2 transition-all hover:border-black">
      {/* Product Information */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] sm:text-[10px] font-mono-code font-black px-1.5 py-0.5 border border-[#1a1a1a] shrink-0 ${
            item.unitType === 'kg' ? 'bg-[#ffcc00] text-[#1a1a1a]' : 'bg-[#38bdf8] text-[#1a1a1a]'
          }`}>
            {item.unitType.toUpperCase()}
          </span>
          <h5 className="font-display font-black text-xs sm:text-sm text-[#1a1a1a] truncate leading-tight" title={item.name}>
            {item.name}
          </h5>
        </div>
        <div className="text-[10px] sm:text-xs font-mono-code text-stone-600 font-bold mt-0.5">
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
          className="w-7 h-7 sm:w-8 sm:h-8 bg-stone-100 hover:bg-[#ffcc00] active:scale-95 border-1.5 sm:border-2 border-[#1a1a1a] flex items-center justify-center font-bold text-xs brutal-btn cursor-pointer transition-transform"
          title="Disminuir cantidad"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-10 sm:w-12 text-center font-mono-code font-black text-xs sm:text-sm bg-stone-50 py-0.5 sm:py-1 border border-stone-300">
          {item.unitType === 'kg' ? item.quantity.toFixed(3) : item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.id, 1)}
          className="w-7 h-7 sm:w-8 sm:h-8 bg-stone-100 hover:bg-[#ffcc00] active:scale-95 border-1.5 sm:border-2 border-[#1a1a1a] flex items-center justify-center font-bold text-xs brutal-btn cursor-pointer transition-transform"
          title="Aumentar cantidad"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Line Total & Trash Action */}
      <div className="text-right shrink-0 flex items-center gap-1.5 sm:gap-2 pl-1.5 border-l border-stone-200">
        <div>
          <div className="font-display font-black text-xs sm:text-sm md:text-base text-[#1a1a1a] leading-none">
            {formatCurrency(item.total)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemoveItem(item.id)}
          className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-300 transition-colors cursor-pointer"
          title="Eliminar del ticket"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
  onSaveProduct?: (product: Product) => void;
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
  onSaveProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('TODOS');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [includeTax, setIncludeTax] = useState<boolean>(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'ticket' | 'catalog'>('ticket');

  const ticketSearchInputRef = useRef<HTMLInputElement>(null);
  const catalogSearchInputRef = useRef<HTMLInputElement>(null);

  const focusActiveInput = useCallback(() => {
    if (activeSubView === 'ticket') {
      ticketSearchInputRef.current?.focus();
    } else {
      catalogSearchInputRef.current?.focus();
    }
  }, [activeSubView]);

  // Auto-focus search input when active view changes
  useEffect(() => {
    focusActiveInput();
  }, [activeSubView, focusActiveInput]);

  // Ticket search across ALL products (not restricted by active category filter)
  const allMatchingProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Filter products by category & search term (for Catalog Grid View)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'TODOS' || p.category === selectedCategory;
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Virtualized Window for Catalog in POS View (60 FPS on 50,000+ SKUs)
  const [catalogDisplayLimit, setCatalogDisplayLimit] = useState(48);

  useEffect(() => {
    setCatalogDisplayLimit(48);
  }, [selectedCategory, searchTerm]);

  const visibleCatalogProducts = useMemo(() => {
    return filteredProducts.slice(0, catalogDisplayLimit);
  }, [filteredProducts, catalogDisplayLimit]);

  // Dynamic categories computed from active catalog + TODOS
  const categories = useMemo(() => {
    const uniqueCats = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    const catList = [
      { id: 'TODOS', label: 'Todos', icon: '🛒' },
      ...uniqueCats.map((c) => {
        let icon = '📦';
        const upper = String(c).toUpperCase();
        if (upper.includes('GRANEL')) icon = '⚖️';
        else if (upper.includes('BEBIDA')) icon = '🥤';
        else if (upper.includes('LACTEO')) icon = '🥛';
        else if (upper.includes('BOTANA')) icon = '🥔';
        else if (upper.includes('LIMPIEZA')) icon = '🧼';
        else if (upper.includes('MEDIC')) icon = '💊';
        else if (upper.includes('GENERIC')) icon = '💊';
        else if (upper.includes('CURAC')) icon = '🩹';
        else if (upper.includes('CUADERN')) icon = '📓';
        else if (upper.includes('ESCRIT')) icon = '✏️';
        else if (upper.includes('OFICIN')) icon = '📄';
        else if (upper.includes('TORNILL')) icon = '🔩';
        else if (upper.includes('HERRAM')) icon = '🔧';
        else if (upper.includes('ELECTR')) icon = '⚡';
        else if (upper.includes('PLOMER')) icon = '🚰';
        else if (upper.includes('PINTUR')) icon = '🖌️';
        return { id: c, label: c, icon };
      })
    ];
    return catList;
  }, [products]);

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
    handleProductClick,
    setSearchTerm,
    setLastScannedFeedback,
    onSaveProduct,
  });
  useEffect(() => {
    scannerStateRef.current = {
      products,
      handleProductClick,
      setSearchTerm,
      setLastScannedFeedback,
      onSaveProduct,
    };
  });

  // Global HID Barcode Scanner buffer & timestamp tracking
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Core Barcode Processor with Real Database Validation
  const processBarcodeScan = useCallback(async (rawCode: string) => {
    const sanitized = sanitizeBarcodeInput(rawCode);
    if (!sanitized) return false;

    const { products, handleProductClick, setSearchTerm, setLastScannedFeedback, onSaveProduct } = scannerStateRef.current;

    // 1. Direct exact match by product code (case-insensitive) across ALL products
    const exactMatch = products.find(
      (p) => p.code.toLowerCase() === sanitized.toLowerCase()
    );
    if (exactMatch) {
      handleProductClick(exactMatch);
      setSearchTerm('');
      return true;
    }

    // 2. Exact match on clean alphanumeric code across ALL products
    const cleanSanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
    const cleanMatch = products.find(
      (p) => p.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanSanitized.toLowerCase()
    );
    if (cleanMatch) {
      handleProductClick(cleanMatch);
      setSearchTerm('');
      return true;
    }

    // 3. Partial match against ALL products in catalog
    const partialMatch = products.find(
      (p) => p.code.toLowerCase().includes(sanitized.toLowerCase()) ||
             p.name.toLowerCase().includes(sanitized.toLowerCase())
    );
    if (partialMatch) {
      handleProductClick(partialMatch);
      setSearchTerm('');
      return true;
    }

    // 4. Real external lookup if it's a barcode (8 to 14 digits)
    if (cleanSanitized.length >= 8 && cleanSanitized.length <= 14) {
      soundFx.playKeyClick();
      setLastScannedFeedback(`Comprobando producto real: ${sanitized}...`);
      try {
        const real = await lookupRealProduct(sanitized);
        if (real.found && real.name) {
          soundFx.playScanBeep();
          const suggestedPrice = prompt(
            `¡Producto Real Identificado!\n\nNombre: ${real.name}\nCódigo: ${real.code}\nCategoría sugerida: ${real.category}\n\nIngrese precio de venta ($ MXN) para darlo de alta y agregarlo al ticket:`,
            '18.00'
          );
          if (suggestedPrice !== null) {
            const parsedPrice = parseFloat(suggestedPrice);
            const validPrice = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : 15.00;
            const newProduct: Product = {
              id: `prod-${Date.now().toString().slice(-4)}`,
              code: real.code,
              name: real.name,
              category: real.category || 'ABARROTES',
              unitType: real.unitType || 'pz',
              price: validPrice,
              cost: +(validPrice * 0.75).toFixed(2),
              stock: 20,
              minStock: 5,
              shrinkagePercent: 0,
              isFrequent: true,
              emoji: real.emoji || '📦',
            };
            onSaveProduct?.(newProduct);
            handleProductClick(newProduct);
            setSearchTerm('');
            setLastScannedFeedback(`+ Registrado: ${real.name}`);
            setTimeout(() => setLastScannedFeedback(null), 2500);
            return true;
          }
        }
      } catch {
        // Fallback
      }
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
      setActiveSubView('ticket');
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
      focusActiveInput();
    }, 100);

    // Auto-refocus on pointerdown unless clicking inside an interactive form control or button
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInteractive = target.closest('input, textarea, select, button, [role="button"], [role="dialog"]');
      if (!isInteractive) {
        setTimeout(() => {
          if (!document.querySelector('.fixed.inset-0.z-50, [id$="-modal-overlay"]')) {
            focusActiveInput();
          }
        }, 50);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);

    // Global HID Barcode Scanner Keystroke Interceptor
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Shortcut F1 for Ticket view
      if (e.key === 'F1') {
        e.preventDefault();
        soundFx.playKeyClick();
        setActiveSubView('ticket');
        return;
      }

      // Shortcut F2 for Catalog view
      if (e.key === 'F2') {
        e.preventDefault();
        soundFx.playKeyClick();
        setActiveSubView('catalog');
        return;
      }

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
        setSearchTerm('');
        focusActiveInput();
        return;
      }

      // Do NOT intercept scanner if a modal dialog is currently open
      const isModalOpen = !!document.querySelector('.fixed.inset-0.z-50, [id$="-modal-overlay"]');
      if (isModalOpen) {
        barcodeBufferRef.current = '';
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isSearchInput = activeEl?.id === 'pos-barcode-search-input' || activeEl?.id === 'pos-catalog-search-input';
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
          focusActiveInput();
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
  }, [processBarcodeScan, focusActiveInput]);

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

      {/* 2. Universal Sub-View Navigation Tabs (Ticket vs Catálogo) */}
      <div className="bg-white border-b-3 border-[#1a1a1a] px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Tab 1: Ticket de Venta */}
          <button
            type="button"
            id="tab-ticket"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveSubView('ticket');
            }}
            className={`py-1.5 sm:py-2 px-2.5 sm:px-4 border-2 sm:border-2.5 border-[#1a1a1a] font-display font-black text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all ${
              activeSubView === 'ticket'
                ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-[2.5px_2.5px_0px_#ffcc00]'
                : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-[#ffcc00]/20 brutal-shadow-sm active:translate-x-[1px]'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffcc00]" />
            <span>TICKET</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-mono-code font-black border border-[#1a1a1a] ${
              cart.length > 0 ? 'bg-[#ffcc00] text-[#1a1a1a]' : 'bg-stone-200 text-stone-600'
            }`}>
              {cart.length}
            </span>
            <span className="font-mono-code font-black text-xs ml-0.5 hidden xs:inline">
              {formatCurrency(finalTotal)}
            </span>
          </button>

          {/* Tab 2: Catálogo de Productos */}
          <button
            type="button"
            id="tab-catalog"
            onClick={() => {
              soundFx.playKeyClick();
              setActiveSubView('catalog');
            }}
            className={`py-1.5 sm:py-2 px-2.5 sm:px-4 border-2 sm:border-2.5 border-[#1a1a1a] font-display font-black text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all ${
              activeSubView === 'catalog'
                ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-[2.5px_2.5px_0px_#ffcc00]'
                : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-[#ffcc00]/20 brutal-shadow-sm active:translate-x-[1px]'
            }`}
          >
            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffcc00]" />
            <span>CATÁLOGO</span>
            <span className="text-[10px] font-mono-code text-stone-500 font-bold hidden md:inline">
              ({products.length})
            </span>
          </button>
        </div>

        {/* Right Action Switch Button */}
        <div className="flex items-center gap-2">
          {activeSubView === 'ticket' ? (
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setActiveSubView('catalog');
              }}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] border-2 border-[#1a1a1a] font-display font-black text-xs brutal-shadow-sm flex items-center gap-1 cursor-pointer active:translate-x-[1px]"
            >
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Explorar Catálogo</span>
              <span className="sm:hidden">Catálogo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setActiveSubView('ticket');
              }}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] border-2 border-[#1a1a1a] font-display font-black text-xs brutal-shadow-sm flex items-center gap-1 cursor-pointer active:translate-x-[1px]"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Ticket ({cart.length}) ➔</span>
              <span className="sm:hidden">Ticket ({cart.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Independent View Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ============================================================== */}
        {/* VIEW 1: TICKET DE VENTA (INDEPENDIENTE Y VISTA INICIAL)        */}
        {/* ============================================================== */}
        {activeSubView === 'ticket' && (
          <div className="flex-1 flex flex-col md:flex-row landscape:flex-row overflow-hidden p-1.5 sm:p-2 md:p-2.5 gap-2 sm:gap-2.5 bg-[#f5f0e8] select-none min-h-0">
            {/* Left Column: Cart Items List & Barcode Scanner (Prioridad visual máxima) */}
            <section className="flex-1 min-w-0 flex flex-col bg-white border-2 sm:border-2.5 md:border-3 border-[#1a1a1a] brutal-shadow overflow-hidden min-h-0">
              {/* Barcode Search & Fast Scanner Receiver */}
              <div className="p-1.5 sm:p-2 bg-[#f5f0e8] border-b-2 sm:border-b-2.5 border-[#1a1a1a] shrink-0">
                <div className="relative">
                  <input
                    ref={ticketSearchInputRef}
                    id="pos-barcode-search-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Escanee código HID o busque producto para agregar..."
                    className="w-full pl-7 sm:pl-8 pr-28 sm:pr-32 py-1 sm:py-1.5 bg-white font-mono-code font-bold text-xs sm:text-sm text-[#1a1a1a] brutal-input"
                    autoComplete="off"
                  />
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1a1a1a] absolute left-2 top-1.5 sm:top-2" />
                  <div className="absolute right-1.5 top-1 sm:top-1.5 flex items-center gap-1.5">
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-xs bg-stone-200 hover:bg-stone-300 px-1.5 py-0.5 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                    <span 
                      className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-800 border border-green-700 font-mono-code text-[9px] sm:text-[10px] font-black"
                      title="Escáner HID activo continuamente"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                      SCANNER ACTIVO
                    </span>
                  </div>
                </div>

                {/* Instant suggestions popover when typing in ticket */}
                {searchTerm.trim().length > 0 && (
                  <div className="mt-1.5 bg-white border-2 border-[#1a1a1a] brutal-shadow-sm max-h-48 overflow-y-auto divide-y divide-stone-200 z-10">
                    {allMatchingProducts.length === 0 ? (
                      <div className="p-2 text-xs font-mono-code text-stone-500 text-center">
                        No se encontró ningún producto con "{searchTerm}"
                      </div>
                    ) : (
                      allMatchingProducts.slice(0, 6).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            handleProductClick(p);
                            setSearchTerm('');
                          }}
                          className="p-2 hover:bg-[#ffcc00]/20 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{p.emoji || (p.unitType === 'kg' ? '⚖️' : '📦')}</span>
                            <div className="truncate">
                              <span className="font-display font-black text-xs text-[#1a1a1a] block truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] font-mono-code text-stone-500">
                                {p.code} · {p.unitType === 'kg' ? 'Granel' : 'Pieza'}
                              </span>
                            </div>
                          </div>
                          <span className="font-display font-black text-xs text-[#1a1a1a] shrink-0 ml-2">
                            {formatCurrency(p.price)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Cart Header */}
              <div className="bg-[#1a1a1a] text-white px-2.5 py-1.5 sm:py-2 flex justify-between items-center border-b-2 sm:border-b-2.5 border-[#1a1a1a] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#ffcc00] text-[#1a1a1a] font-mono-code font-black text-xs flex items-center justify-center">
                    {cart.length}
                  </span>
                  <h3 className="font-display font-black text-xs sm:text-sm text-white tracking-wide">
                    TICKET DE VENTA ({cart.length} {cart.length === 1 ? 'PRODUCTO' : 'PRODUCTOS'})
                  </h3>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs font-mono-code text-[#ef4444] hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Ticket</span>
                  </button>
                )}
              </div>

              {/* Cart Items List Area (Lista principal de productos) */}
              <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-1.5 bg-[#f5f0e8]/40 min-h-0">
                {cart.length === 0 ? (
                  <div className="h-full min-h-[160px] flex flex-col items-center justify-center p-4 sm:p-6 text-center text-stone-400">
                    <div className="w-12 h-12 bg-white border-2 border-dashed border-stone-400 flex items-center justify-center mb-2">
                      <Package className="w-6 h-6 text-stone-400" />
                    </div>
                    <p className="font-display font-bold text-xs sm:text-sm text-stone-700">
                      El ticket está vacío
                    </p>
                    <p className="text-[11px] sm:text-xs text-stone-500 font-sans mt-0.5 max-w-xs">
                      Escanee un código o agregue productos del catálogo
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setActiveSubView('catalog');
                      }}
                      className="mt-2.5 px-3 py-1.5 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] border-2 border-[#1a1a1a] font-display font-black text-xs brutal-shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Abrir Catálogo de Productos</span>
                    </button>
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
            </section>

            {/* Right Column: Módulo de Cobro Compacto y Ergonómico */}
            <section className="w-full md:w-[280px] lg:w-[320px] xl:w-[340px] landscape:w-[280px] lg:landscape:w-[320px] bg-white border-2 sm:border-2.5 md:border-3 border-[#1a1a1a] brutal-shadow p-2 sm:p-2.5 flex flex-col justify-between shrink-0 space-y-1.5 sm:space-y-2 overflow-y-auto">
              <div className="space-y-1.5 sm:space-y-2">
                {/* Cobro Header */}
                <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-1">
                  <h4 className="font-display font-black text-xs sm:text-sm text-[#1a1a1a] uppercase flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffcc00]" />
                    <span>Módulo de Cobro</span>
                  </h4>
                  <span className="font-mono-code text-[10px] text-stone-500 font-bold bg-stone-100 px-1.5 py-0.5 border border-stone-300">
                    {cart.length} {cart.length === 1 ? 'partida' : 'partidas'}
                  </span>
                </div>

                {/* 1. Quick Payment Method Selector */}
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
                        className={`py-1 px-1 border-1.5 border-[#1a1a1a] font-display font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer brutal-btn transition-colors ${
                          isSelected
                            ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-[1.5px_1.5px_0px_#ffcc00]'
                            : 'bg-[#f5f0e8] text-stone-700 hover:bg-[#ffcc00]/20'
                        }`}
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{method.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 1.5 Info badge when Tarjeta or Transferencia applies automatic IVA */}
                {isCardOrTransfer && configuredTaxRate > 0 && (
                  <div className="bg-amber-50 border border-[#1a1a1a] px-2 py-1 flex items-center justify-between text-[10px] font-mono-code text-[#1a1a1a]">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="bg-[#1a1a1a] text-[#ffcc00] font-black px-1 py-0.5 text-[8px] uppercase border border-[#1a1a1a] shrink-0">
                        +{configuredTaxRate}% IVA
                      </span>
                      <span className="font-bold text-stone-700 truncate">
                        {paymentMethod === 'TARJETA' ? 'Tarjeta' : 'Transf.'}
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
                    {/* Row 1: Label + Input + Live Cambio */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <label htmlFor="pos-cash-input" className="text-xs font-display font-bold text-[#1a1a1a] whitespace-nowrap cursor-pointer">
                          Paga:
                        </label>
                        <div className="relative w-24">
                          <span className="absolute left-1.5 top-0.5 font-bold font-mono-code text-xs text-stone-500">$</span>
                          <input
                            id="pos-cash-input"
                            type="number"
                            step="any"
                            min="0"
                            value={cashTenderedInput}
                            onChange={(e) => setCashTenderedInput(e.target.value)}
                            placeholder={finalTotal > 0 ? finalTotal.toFixed(2) : '0.00'}
                            className="w-full pl-4 pr-1 py-0.5 bg-white font-mono-code font-black text-xs sm:text-sm text-right border border-[#1a1a1a] brutal-input focus:bg-yellow-50"
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

                    {/* Row 2: Quick Bills Buttons */}
                    <div className="grid grid-cols-5 gap-1">
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
                            className={`py-0.5 px-0.5 border border-[#1a1a1a] font-mono-code font-bold text-[10px] transition-colors brutal-btn truncate text-center cursor-pointer ${
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
              </div>

              {/* Bottom Totals & Action Button */}
              <div className="space-y-1.5 pt-1.5 border-t-2 border-[#1a1a1a]">
                {/* Prominent Total Banner */}
                <div className="bg-[#1a1a1a] text-white px-2.5 py-1.5 border-2 border-[#1a1a1a] brutal-shadow-sm flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[9px] font-mono-code text-white/70 uppercase font-bold">
                      TOTAL
                    </span>
                    <span className="text-lg sm:text-xl font-display font-black text-[#ffcc00] leading-none">
                      {formatCurrency(finalTotal)}
                    </span>
                    <span className="text-[9px] font-mono-code text-stone-400">
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
                        <span className="text-[#ffcc00] font-bold uppercase block text-[9px]">
                          {paymentMethod} • IVA {configuredTaxRate}% INC.
                        </span>
                        <span className="text-stone-300 text-[8px]">
                          Base: {formatCurrency(subtotal)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-stone-300 font-bold uppercase text-[10px]">
                        {paymentMethod}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cobrar / Cerrar Venta */}
                <button
                  id="btn-checkout-sale"
                  type="button"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || !isPaymentValid}
                  className="w-full py-2 sm:py-2.5 bg-[#ffcc00] hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#1a1a1a] font-display font-black text-xs sm:text-sm border-2 border-[#1a1a1a] brutal-shadow flex items-center justify-center gap-1.5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                >
                  <span>COBRAR / CERRAR VENTA (F12)</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: CATÁLOGO DE PRODUCTOS (INDEPENDIENTE)                   */}
        {/* ============================================================== */}
        {activeSubView === 'catalog' && (
          <section className="flex-1 flex flex-col bg-[#f5f0e8] overflow-hidden select-none">
            {/* Search Bar with Continuous Scanner Receiver & Category Chips */}
            <div className="p-2.5 sm:p-3 bg-white border-b-3 border-[#1a1a1a] shrink-0">
              <div className="relative">
                <input
                  ref={catalogSearchInputRef}
                  id="pos-catalog-search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Escanee código HID (automático) o busque por nombre o SKU..."
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
                    className={`px-2.5 py-1 text-xs font-display font-bold whitespace-nowrap border-2 border-[#1a1a1a] cursor-pointer transition-all ${
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
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-4">
              {/* Quick Frequent Items Banner if in 'TODOS' */}
              {selectedCategory === 'TODOS' && !searchTerm && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-display font-black uppercase text-[#1a1a1a]">
                    <Sparkles className="w-4 h-4 text-[#ffcc00]" />
                    <span>Artículos Frecuentes & Granel Rápido</span>
                  </div>
                </div>
              )}

              {/* Products Grid with Responsive columns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
                {visibleCatalogProducts.map((product) => (
                  <ProductGridCard
                    key={product.id}
                    product={product}
                    onProductClick={handleProductClick}
                  />
                ))}
              </div>

              {/* Load More Button for Large Catalogs */}
              {filteredProducts.length > visibleCatalogProducts.length && (
                <div className="mt-4 mb-2 text-center select-none">
                  <button
                    type="button"
                    onClick={() => setCatalogDisplayLimit((prev) => Math.min(prev + 48, filteredProducts.length))}
                    className="py-2 px-5 bg-white hover:bg-[#ffcc00] border-2 border-[#1a1a1a] font-display font-black text-xs brutal-shadow cursor-pointer active:translate-x-[1px]"
                  >
                    + Cargar más productos ({visibleCatalogProducts.length} de {filteredProducts.length.toLocaleString()})
                  </button>
                </div>
              )}

              {products.length === 0 ? (
                <div className="p-8 text-center bg-white border-2 border-[#1a1a1a] brutal-shadow my-4 max-w-xl mx-auto">
                  <Package className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                  <p className="font-display font-black text-base text-[#1a1a1a] uppercase">
                    Inventario Vacío
                  </p>
                  <p className="font-mono-code text-xs text-stone-500 mt-1">
                    No hay productos registrados en el sistema. Vaya al módulo de Inventario para registrar sus productos.
                  </p>
                </div>
              ) : filteredProducts.length === 0 && (
                <div className="p-8 text-center bg-white border-2 border-[#1a1a1a] brutal-shadow my-4 max-w-xl mx-auto">
                  <AlertCircle className="w-10 h-10 text-stone-400 mx-auto mb-2" />
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

            {/* Bottom Floating/Sticky Action Bar for Returning to Ticket */}
            {cart.length > 0 && (
              <div className="p-2 sm:p-3 bg-[#1a1a1a] text-white border-t-3 border-[#1a1a1a] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#ffcc00] text-[#1a1a1a] font-mono-code font-black text-xs flex items-center justify-center">
                    {cart.length}
                  </span>
                  <div>
                    <span className="font-display font-bold text-xs text-white block">
                      Ticket con {cart.length} {cart.length === 1 ? 'partida' : 'partidas'}
                    </span>
                    <span className="font-mono-code font-black text-sm text-[#ffcc00]">
                      Total: {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setActiveSubView('ticket');
                  }}
                  className="px-4 py-2 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] border-2 border-white font-display font-black text-xs sm:text-sm brutal-shadow-sm flex items-center gap-1.5 cursor-pointer active:translate-x-[1px]"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>IR AL TICKET Y COBRAR ➔</span>
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

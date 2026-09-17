import React, { useState, useEffect, useCallback } from 'react';
import { Product, CartItem, PaymentMethod, CashShift, StoreSettings, SaleTransaction, ActiveView, PeripheralStatus, CashierUser } from './types/pos';
import { 
  loadProducts, 
  saveProducts, 
  loadSettings, 
  saveSettings, 
  loadActiveShift, 
  saveActiveShift, 
  loadPastShifts, 
  savePastShifts, 
  loadSales, 
  saveSales, 
  loadCashiers,
  saveCashiers,
  loadCurrentUser,
  saveCurrentUser,
  resetToFactoryDefaults,
  clearAllProductsFromStorage,
  clearPastShiftsFromStorage
} from './utils/storage';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_SHIFT, INITIAL_CASHIERS } from './utils/initialData';
import { toCents, fromCents, addCents, compareMonetaryBalance } from './utils/money';
import { enqueueTransaction, getOutboxStats } from './utils/outbox';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SideNavBar } from './components/SideNavBar';
import { GranelModal } from './components/GranelModal';
import { TicketModal } from './components/TicketModal';
import { ShiftCutModal } from './components/ShiftCutModal';
import { ProductFormModal } from './components/ProductFormModal';
import { LoginModal } from './components/LoginModal';
import { VentasView } from './views/VentasView';
import { InventarioView } from './views/InventarioView';
import { TurnosView } from './views/TurnosView';
import { AjustesView } from './views/AjustesView';
import { soundFx } from './utils/audio';

export default function App() {
  // Global State
  const [products, setProducts] = useState<Product[]>(() => loadProducts());
  const [settings, setSettings] = useState<StoreSettings>(() => loadSettings());
  const [activeShift, setActiveShift] = useState<CashShift>(() => loadActiveShift());
  const [pastShifts, setPastShifts] = useState<CashShift[]>(() => loadPastShifts());
  const [salesHistory, setSalesHistory] = useState<SaleTransaction[]>(() => loadSales());
  const [cashiers, setCashiers] = useState<CashierUser[]>(() => loadCashiers());
  const [currentUser, setCurrentUser] = useState<CashierUser>(() => loadCurrentUser());

  // Active View & Cart
  const [activeView, setActiveView] = useState<ActiveView>('ventas');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modals state
  const [granelProduct, setGranelProduct] = useState<Product | null>(null);
  const [isGranelModalOpen, setIsGranelModalOpen] = useState(false);

  const [lastCompletedSale, setLastCompletedSale] = useState<SaleTransaction | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const [cutModalType, setCutModalType] = useState<'X' | 'Z'>('X');
  const [isShiftCutModalOpen, setIsShiftCutModalOpen] = useState(false);

  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);

  // Authentication & First Screen Login State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(true);

  // Peripherals live status
  const [peripheralStatus, setPeripheralStatus] = useState<PeripheralStatus>({
    scaleConnected: true,
    scaleLiveWeight: 0.0,
    printerReady: true,
    scannerActive: true,
    isOffline: false,
    lastSyncTime: new Date().toLocaleTimeString(),
    outboxPendingCount: 0,
  });

  // Outbox initial stats
  useEffect(() => {
    getOutboxStats().then((stats) => {
      setPeripheralStatus((prev) => ({
        ...prev,
        outboxPendingCount: stats.pending,
      }));
    }).catch(() => {});
  }, []);

  // Auto-purge all products from database/localStorage to ensure a 100% empty inventory
  useEffect(() => {
    if (localStorage.getItem('pos_inventory_purged_flag_v4') !== 'true') {
      localStorage.setItem('pos_inventory_purged_flag_v4', 'true');
      clearAllProductsFromStorage();
      setProducts([]);
      saveProducts([]);
    }
  }, []);

  // Set default printer paper size to 58mm
  useEffect(() => {
    if (localStorage.getItem('pos_printer_default_58mm_flag_v1') !== 'true') {
      localStorage.setItem('pos_printer_default_58mm_flag_v1', 'true');
      setSettings((prev) => ({ ...prev, printerPaperSize: '58mm' }));
    }
  }, []);

  // Auto-clear past shifts history to ensure clean initial state
  useEffect(() => {
    if (localStorage.getItem('pos_past_shifts_cleared_flag_v2') !== 'true') {
      localStorage.setItem('pos_past_shifts_cleared_flag_v2', 'true');
      clearPastShiftsFromStorage();
      setPastShifts([]);
      savePastShifts([]);
    }
  }, []);

  // Auto-lock by inactivity (ISO/IEC 27001)
  useEffect(() => {
    if (!isAuthenticated || !settings.autoLockMinutes || settings.autoLockMinutes <= 0) return;

    let timer: ReturnType<typeof setTimeout>;
    const lockDelayMs = settings.autoLockMinutes * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsAuthenticated(false);
        setIsLoginModalOpen(true);
      }, lockDelayMs);
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [isAuthenticated, settings.autoLockMinutes]);

  // Save changes to localStorage
  useEffect(() => {
    saveProducts(products);
  }, [products]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveActiveShift(activeShift);
  }, [activeShift]);

  useEffect(() => {
    savePastShifts(pastShifts);
  }, [pastShifts]);

  useEffect(() => {
    saveSales(salesHistory);
  }, [salesHistory]);

  useEffect(() => {
    saveCashiers(cashiers);
  }, [cashiers]);

  useEffect(() => {
    saveCurrentUser(currentUser);
  }, [currentUser]);

  // Guard: Restrict Ajustes to ADMIN only
  useEffect(() => {
    if (currentUser?.role !== 'ADMIN' && activeView === 'ajustes') {
      setActiveView('ventas');
    }
  }, [currentUser, activeView]);

  // Handle Login / Switch Cashier
  const handleLoginSuccess = useCallback((user: CashierUser) => {
    setCurrentUser(user);
    setActiveShift((prev) => ({
      ...prev,
      cashierName: user.name,
    }));
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
  }, []);

  // Handle Logout / Salir
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setIsLoginModalOpen(true);
    setActiveView((curr) => (curr === 'ajustes' ? 'ventas' : curr));
  }, []);

  // Cashier management
  const handleSaveCashier = (cashier: CashierUser) => {
    setCashiers((prev) => {
      const exists = prev.some((c) => c.id === cashier.id);
      if (exists) {
        return prev.map((c) => (c.id === cashier.id ? cashier : c));
      }
      return [...prev, cashier];
    });

    if (currentUser.id === cashier.id) {
      setCurrentUser(cashier);
      setActiveShift((prev) => ({
        ...prev,
        cashierName: cashier.name,
      }));
    }
  };

  const handleDeleteCashier = (cashierId: string) => {
    setCashiers((prev) => prev.filter((c) => c.id !== cashierId));
    if (currentUser.id === cashierId) {
      const remaining = cashiers.filter((c) => c.id !== cashierId);
      if (remaining.length > 0) {
        handleLoginSuccess(remaining[0]);
      }
    }
  };

  // Open Granel Modal
  const handleOpenGranelModal = (product: Product) => {
    setGranelProduct(product);
    setIsGranelModalOpen(true);
  };

  // Confirm Granel Item Addition to Cart
  const handleConfirmGranel = (product: Product, quantityKg: number, totalAmount: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = +(existing.quantity + quantityKg).toFixed(3);
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: newQty,
                total: +(newQty * item.unitPrice).toFixed(2),
              }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `item-granel-${Date.now()}`,
          productId: product.id,
          code: product.code,
          name: product.name,
          unitType: 'kg',
          unitPrice: product.price,
          quantity: quantityKg,
          total: totalAmount,
          shrinkageEstimated: product.shrinkagePercent,
        },
      ];
    });

    setIsGranelModalOpen(false);
    setGranelProduct(null);
  };

  // Complete Sale transaction
  const handleCompleteSale = useCallback(
    (
      items: CartItem[],
      paymentMethod: PaymentMethod,
      tendered: number,
      change: number,
      subtotal: number,
      tax: number,
      discount: number,
      total: number
    ) => {
      // Snapshot state for safe transactional rollback (ISO/IEC 25010)
      const prevProductsSnapshot = [...products];
      const prevShiftSnapshot = { ...activeShift };

      try {
        const folioNumber = (1000 + salesHistory.length + 1).toString();
        const hasGranel = items.some((i) => i.unitType === 'kg');

        const newSale: SaleTransaction = {
          id: `sale-${Date.now()}`,
          folio: folioNumber,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cashier: activeShift.cashierName,
          items: [...items],
          subtotal,
          tax,
          discount,
          total,
          paymentMethod,
          amountTendered: tendered,
          changeDue: change,
          shiftId: activeShift.id,
          hasGranel,
        };

        // 1. Deduct Stock from Products Catalog
        setProducts((prev) => {
          return prev.map((prod) => {
            const soldItem = items.find((it) => it.productId === prod.id);
            if (soldItem) {
              const updatedStock = Math.max(0, +(prod.stock - soldItem.quantity).toFixed(3));
              return { ...prod, stock: updatedStock };
            }
            return prod;
          });
        });

        // 2. Update Active Shift Financials with exact integer cents (ISO/IEC 25010)
        setActiveShift((prev) => {
          const cashAdd = paymentMethod === 'EFECTIVO' ? total : 0;
          const cardAdd = paymentMethod === 'TARJETA' ? total : 0;
          const transferAdd = paymentMethod === 'TRANSFERENCIA' ? total : 0;

          const granelAdd = items
            .filter((i) => i.unitType === 'kg')
            .reduce((acc, it) => addCents(acc, it.total), 0);
          const unitAdd = items
            .filter((i) => i.unitType === 'pz')
            .reduce((acc, it) => addCents(acc, it.total), 0);

          const newCashSales = addCents(prev.cashSales, cashAdd);
          const newCardSales = addCents(prev.cardSales, cardAdd);
          const newTransferSales = addCents(prev.transferSales, transferAdd);
          const newTotalSales = addCents(prev.totalSales, total);
          const newExpectedCash = addCents(prev.startingCash, newCashSales);

          const balance = compareMonetaryBalance(prev.actualCashCounted, newExpectedCash);

          return {
            ...prev,
            cashSales: newCashSales,
            cardSales: newCardSales,
            transferSales: newTransferSales,
            bulkSalesTotal: addCents(prev.bulkSalesTotal, granelAdd),
            unitSalesTotal: addCents(prev.unitSalesTotal, unitAdd),
            totalSales: newTotalSales,
            expectedCash: newExpectedCash,
            difference: balance.difference,
            balanceStatus: balance.status,
            salesCount: prev.salesCount + 1,
          };
        });

        // 3. Save Sale History & Open Ticket
        setSalesHistory((prev) => [newSale, ...prev]);
        setLastCompletedSale(newSale);
        setCart([]);
        setIsTicketModalOpen(true);

        // 4. Enqueue into Outbox (IndexedDB + AES-GCM-256)
        enqueueTransaction(newSale)
          .then(() => getOutboxStats())
          .then((stats) => {
            setPeripheralStatus((prev) => ({
              ...prev,
              outboxPendingCount: stats.pending,
              lastSyncTime: new Date().toLocaleTimeString(),
            }));
          })
          .catch(console.error);
      } catch (err) {
        console.error('[POS Transactional Error]: Fallo al completar la venta. Ejecutando rollback:', err);
        setProducts(prevProductsSnapshot);
        setActiveShift(prevShiftSnapshot);
        alert('Error al registrar la transacción. Se aplicó un rollback seguro para mantener la integridad del inventario.');
      }
    },
    [activeShift, products, salesHistory.length]
  );

  // Open Shift Cut Modal (Corte X / Z)
  const handleOpenCutModal = (type: 'X' | 'Z') => {
    setCutModalType(type);
    setIsShiftCutModalOpen(true);
  };

  // Confirm Closure of Shift (Corte Z)
  const handleConfirmCloseShift = (nextStartingCash: number = 0) => {
    const validStartingCash = Math.max(0, isNaN(nextStartingCash) ? 0 : nextStartingCash);
    const closedShift: CashShift = {
      ...activeShift,
      status: 'CLOSED',
      closedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Archive shift
    setPastShifts((prev) => [closedShift, ...prev]);

    // Open a fresh new shift
    const nextShift: CashShift = {
      id: `shift-${Date.now()}`,
      shiftNumber: activeShift.shiftNumber + 1,
      cashierName: activeShift.cashierName,
      openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      closedAt: null,
      startingCash: validStartingCash,
      status: 'OPEN',
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      bulkSalesTotal: 0,
      unitSalesTotal: 0,
      totalSales: 0,
      expectedCash: validStartingCash,
      actualCashCounted: validStartingCash,
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
        m050: 0,
      },
      salesCount: 0,
      notes: `Turno #${activeShift.shiftNumber + 1} aperturado con fondo de $${validStartingCash.toFixed(2)} MXN.`,
    };

    setActiveShift(nextShift);
    setIsShiftCutModalOpen(false);
    setActiveView('ventas');
  };

  // Save / Add Product
  const handleSaveProduct = (prod: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === prod.id);
      if (exists) {
        return prev.map((p) => (p.id === prod.id ? prod : p));
      }
      return [prod, ...prev];
    });
    setIsProductFormOpen(false);
    setProductToEdit(null);
  };

  // Delete Product
  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Quick adjust stock
  const handleQuickAdjustStock = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );
  };

  // Clear all products completely from database
  const handleClearAllProducts = () => {
    clearAllProductsFromStorage();
    setProducts([]);
    saveProducts([]);
    setCart([]);
    soundFx.playCashRegisterChime();
  };

  // Factory reset demo
  const handleResetFactory = () => {
    resetToFactoryDefaults();
    setProducts(INITIAL_PRODUCTS);
    setSettings(INITIAL_SETTINGS);
    setActiveShift(INITIAL_SHIFT);
    setPastShifts([]);
    setSalesHistory([]);
    setCart([]);
    soundFx.playCashRegisterChime();
  };

  // Import JSON data
  const handleImportData = (data: {
    products?: Product[];
    settings?: StoreSettings;
    pastShifts?: CashShift[];
    salesHistory?: SaleTransaction[];
  }) => {
    if (data.products) setProducts(data.products);
    if (data.settings) setSettings(data.settings);
    if (data.pastShifts) setPastShifts(data.pastShifts);
    if (data.salesHistory) setSalesHistory(data.salesHistory);
  };

  const handleClearPastShifts = useCallback(() => {
    clearPastShiftsFromStorage();
    setPastShifts([]);
    savePastShifts([]);
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen bg-[#f5f0e8] text-[#1a1a1a] overflow-hidden font-sans select-none">
      {/* 1. Fixed Left Navigation Bar */}
      <SideNavBar
        activeView={activeView}
        setActiveView={setActiveView}
        activeShift={activeShift}
        onOpenShiftCut={() => handleOpenCutModal('Z')}
        cartCount={cart.length}
        currentUser={currentUser}
        onSwitchCashier={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. Main View Container with Fast Transitions */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {activeView === 'ventas' && (
          <VentasView
            products={products}
            cart={cart}
            setCart={setCart}
            onOpenGranelModal={handleOpenGranelModal}
            onCompleteSale={handleCompleteSale}
            settings={settings}
            activeShift={activeShift}
            peripheralStatus={peripheralStatus}
            currentUser={currentUser}
            onSwitchCashier={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
          />
        )}

        {activeView === 'inventario' && (
          <InventarioView
            products={products}
            onAddProduct={() => {
              setProductToEdit(null);
              setIsProductFormOpen(true);
            }}
            onEditProduct={(prod) => {
              setProductToEdit(prod);
              setIsProductFormOpen(true);
            }}
            onDeleteProduct={handleDeleteProduct}
            onQuickAdjustStock={handleQuickAdjustStock}
            onClearAllProducts={handleClearAllProducts}
            currentUser={currentUser}
          />
        )}

        {activeView === 'turnos' && (
          <TurnosView
            activeShift={activeShift}
            setActiveShift={setActiveShift}
            pastShifts={pastShifts}
            onOpenCutModal={handleOpenCutModal}
            settings={settings}
            onClearPastShifts={handleClearPastShifts}
            currentUser={currentUser}
          />
        )}

        {activeView === 'ajustes' && currentUser?.role === 'ADMIN' && (
          <AjustesView
            settings={settings}
            setSettings={setSettings}
            products={products}
            activeShift={activeShift}
            pastShifts={pastShifts}
            salesHistory={salesHistory}
            onResetFactory={handleResetFactory}
            onImportData={handleImportData}
            cashiers={cashiers}
            onSaveCashier={handleSaveCashier}
            onDeleteCashier={handleDeleteCashier}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* 3. Granel Modal */}
      <GranelModal
        product={granelProduct}
        isOpen={isGranelModalOpen}
        onClose={() => {
          setIsGranelModalOpen(false);
          setGranelProduct(null);
        }}
        onConfirm={handleConfirmGranel}
      />

      {/* 4. Thermal Ticket Modal */}
      <TicketModal
        sale={lastCompletedSale}
        settings={settings}
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onNewSale={() => {
          setIsTicketModalOpen(false);
          setLastCompletedSale(null);
          setActiveView('ventas');
        }}
      />

      {/* 5. Shift Cut Modal (Corte X / Z) */}
      <ShiftCutModal
        shift={activeShift}
        settings={settings}
        isOpen={isShiftCutModalOpen}
        cutType={cutModalType}
        onClose={() => setIsShiftCutModalOpen(false)}
        onConfirmCloseShift={handleConfirmCloseShift}
      />

      {/* 6. Product Form Modal */}
      <ProductFormModal
        productToEdit={productToEdit}
        isOpen={isProductFormOpen}
        onClose={() => {
          setIsProductFormOpen(false);
          setProductToEdit(null);
        }}
        onSave={handleSaveProduct}
      />

      {/* 7. Cashier Login / Switch Modal */}
      <LoginModal
        isOpen={!isAuthenticated || isLoginModalOpen}
        canCancel={isAuthenticated}
        cashiers={cashiers}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => {
          if (isAuthenticated) {
            setIsLoginModalOpen(false);
          }
        }}
      />
    </div>
  </ErrorBoundary>
);
}


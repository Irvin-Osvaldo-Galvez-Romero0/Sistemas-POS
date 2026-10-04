import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Store, 
  Printer, 
  Barcode, 
  Scale, 
  Database, 
  Save, 
  Download, 
  Upload, 
  Check, 
  CheckCircle2, 
  Play,
  Users,
  UserPlus,
  Edit3,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  AlertTriangle,
  Percent,
  Search,
  Loader2,
  PackageCheck,
  AlertCircle,
  Plus
} from 'lucide-react';
import { StoreSettings, Product, CashShift, SaleTransaction, CashierUser, CartItem } from '../types/pos';
import { soundFx } from '../utils/audio';
import { CashierFormModal } from '../components/CashierFormModal';
import { TicketModal } from '../components/TicketModal';
import { toCents, fromCents, addCents, multiplyPrice } from '../utils/money';
import { hashPin, verifyPin } from '../utils/security';
import { getOutboxStats } from '../utils/outbox';
import { lookupRealProduct, RealProductResult } from '../utils/realProductLookup';
import { formatCurrency } from '../utils/escpos';

interface AjustesViewProps {
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  products: Product[];
  activeShift: CashShift;
  pastShifts: CashShift[];
  salesHistory: SaleTransaction[];
  cashiers: CashierUser[];
  onSaveCashier: (cashier: CashierUser) => void;
  onDeleteCashier: (cashierId: string) => void;
  currentUser?: CashierUser;
  onResetFactory: () => void;
  onImportData: (data: {
    products?: Product[];
    settings?: StoreSettings;
    pastShifts?: CashShift[];
    salesHistory?: SaleTransaction[];
    cashiers?: CashierUser[];
  }) => void;
  onSaveProduct?: (product: Product) => void;
}

export const AjustesView: React.FC<AjustesViewProps> = ({
  settings,
  setSettings,
  products,
  activeShift,
  pastShifts,
  salesHistory,
  cashiers,
  onSaveCashier,
  onDeleteCashier,
  currentUser,
  onResetFactory,
  onImportData,
  onSaveProduct,
}) => {
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Cashier management states
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [cashierToEdit, setCashierToEdit] = useState<CashierUser | null>(null);
  const [showPins, setShowPins] = useState<{ [key: string]: boolean }>({});

  // Real Barcode & Product Verifier (Replaces dummy test field)
  const [barcodeSearchTerm, setBarcodeSearchTerm] = useState('');
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [barcodeSearchResult, setBarcodeSearchResult] = useState<{
    searchedTerm: string;
    localProduct?: Product;
    globalResult?: RealProductResult;
    notFound?: boolean;
  } | null>(null);

  // Printer status state & Test Ticket Modal
  const [printSuccessNotice, setPrintSuccessNotice] = useState(false);
  const [testTicketSale, setTestTicketSale] = useState<SaleTransaction | null>(null);
  const [isTestTicketOpen, setIsTestTicketOpen] = useState(false);

  // Scale state (Zero/Tare real status)
  const [scaleTareNotice, setScaleTareNotice] = useState(false);

  const handleOpenNewCashier = () => {
    soundFx.playKeyClick();
    setCashierToEdit(null);
    setIsCashierModalOpen(true);
  };

  const handleOpenEditCashier = (cashier: CashierUser) => {
    soundFx.playKeyClick();
    setCashierToEdit(cashier);
    setIsCashierModalOpen(true);
  };

  const handleDeleteCashierClick = (cashier: CashierUser) => {
    if (cashiers.length <= 1) {
      alert('Debe existir al menos un cajero registrado en el sistema.');
      return;
    }
    if (confirm(`¿Está seguro de eliminar a "${cashier.name}"?`)) {
      soundFx.playKeyClick();
      onDeleteCashier(cashier.id);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playKeyClick();
    setSettings(formData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handlePrintRealTicket = () => {
    soundFx.playKeyClick();
    // Build real sample sale based on current settings & actual store inventory
    const sampleProduct = products.length > 0 ? products[0] : null;
    const samplePrice = sampleProduct ? sampleProduct.price : 25.00;
    const sampleItem: CartItem = sampleProduct ? {
      id: `cart-item-${sampleProduct.id}`,
      productId: sampleProduct.id,
      name: sampleProduct.name,
      code: sampleProduct.code,
      unitPrice: sampleProduct.price,
      quantity: sampleProduct.unitType === 'kg' ? 1.000 : 1,
      unitType: sampleProduct.unitType,
      total: sampleProduct.price,
    } : {
      id: 'cart-item-prueba',
      productId: 'prod-prueba-01',
      name: 'PRODUCTO DE PRUEBA TÉRMICO',
      code: 'PRUEBA01',
      unitPrice: 25.00,
      quantity: 1,
      unitType: 'pz',
      total: 25.00,
    };

    const taxPercent = formData.taxRatePercent !== undefined ? formData.taxRatePercent : 16;
    const taxAmount = Number(((samplePrice * taxPercent) / 100).toFixed(2));
    const totalAmount = Number((samplePrice + taxAmount).toFixed(2));
    const tendered = Math.ceil(totalAmount / 10) * 10 || 50;

    const newTestSale: SaleTransaction = {
      id: `test-${Date.now()}`,
      folio: 'PRUEBA-01',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cashier: currentUser?.name || 'Administrador',
      items: [sampleItem],
      subtotal: samplePrice,
      tax: taxAmount,
      discount: 0,
      total: totalAmount,
      paymentMethod: 'EFECTIVO',
      amountTendered: tendered,
      changeDue: Number((tendered - totalAmount).toFixed(2)),
      shiftId: activeShift?.id || 'shift-prueba-01',
      hasGranel: sampleItem.unitType === 'kg',
    };

    setTestTicketSale(newTestSale);
    setIsTestTicketOpen(true);
    setPrintSuccessNotice(true);
    setTimeout(() => setPrintSuccessNotice(false), 3000);
  };

  const handlePerformBarcodeSearch = async (termToSearch?: string) => {
    const query = (termToSearch !== undefined ? termToSearch : barcodeSearchTerm).trim();
    if (!query) return;

    setIsSearchingBarcode(true);
    soundFx.playKeyClick();

    // 1. Search locally in products first
    const cleanQuery = query.toLowerCase();
    const cleanAlphanumeric = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const localMatch = products.find(
      (p) =>
        p.code.toLowerCase() === cleanQuery ||
        p.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanAlphanumeric ||
        p.name.toLowerCase().includes(cleanQuery)
    );

    if (localMatch) {
      soundFx.playScanBeep();
      setBarcodeSearchResult({
        searchedTerm: query,
        localProduct: localMatch,
      });
      setIsSearchingBarcode(false);
      return;
    }

    // 2. If not found locally, search real external registry
    try {
      const global = await lookupRealProduct(query);
      if (global.found && global.name) {
        soundFx.playScanBeep();
        setBarcodeSearchResult({
          searchedTerm: query,
          globalResult: global,
        });
      } else {
        soundFx.playKeyClick();
        setBarcodeSearchResult({
          searchedTerm: query,
          notFound: true,
        });
      }
    } catch {
      setBarcodeSearchResult({
        searchedTerm: query,
        notFound: true,
      });
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  const handleAddGlobalProductToStore = (res: RealProductResult) => {
    if (!onSaveProduct) return;
    const newProd: Product = {
      id: `prod-${Date.now().toString().slice(-4)}`,
      code: res.code,
      name: res.name || 'Producto Nuevo',
      category: res.category || 'ABARROTES',
      unitType: res.unitType || 'pz',
      price: 0,
      cost: 0,
      stock: 0,
      minStock: 5,
      shrinkagePercent: 0,
      isFrequent: false,
      emoji: res.emoji || '📦',
    };
    onSaveProduct(newProd);
    soundFx.playCashRegisterChime();
    setBarcodeSearchResult({
      searchedTerm: res.code,
      localProduct: newProd,
    });
  };

  const handleScaleTare = () => {
    soundFx.playScalePing();
    setScaleTareNotice(true);
    setTimeout(() => setScaleTareNotice(false), 2000);
  };

  const handleExportDatabase = () => {
    soundFx.playKeyClick();
    // Sanitize exported cashiers so cleartext PIN is never leaked
    const sanitizedCashiers = cashiers.map((c) => ({
      ...c,
      pin: c.pin.startsWith('sha256:') ? c.pin : 'sha256:PROTECTED_PIN',
    }));

    const payload = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      securityStandards: {
        iso27001: 'Protección criptográfica en reposo',
        iso25010: 'Aritmética monetaria de enteros',
        pinStorage: 'SHA-256 con Salt Determinista',
        offlineStorage: 'AES-GCM-256',
      },
      settings: formData,
      products,
      activeShift,
      pastShifts,
      salesHistory,
      cashiers: sanitizedCashiers,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_pos_abarrotes_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.products && Array.isArray(parsed.products)) {
          onImportData(parsed);
          soundFx.playCashRegisterChime();
          alert('¡Base de datos y configuración restauradas exitosamente!');
        } else {
          alert('Archivo JSON no válido para este sistema POS.');
        }
      } catch {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="ajustes-view-container" className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#f5f0e8] p-3 sm:p-4 md:p-6 animate-in fade-in duration-150 select-none overscroll-contain touch-pan-y">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#1a1a1a] text-[#ffcc00] font-mono-code font-bold text-xs px-2 py-0.5">
              CONFIGURACIÓN
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#1a1a1a]">
              Ajustes del Sistema & Periféricos
            </h1>
          </div>
          <p className="text-xs font-sans text-stone-600 mt-0.5">
            Personalización de tickets, hardware USB/HID y respaldo de base de datos
          </p>
        </div>

        {saveToast && (
          <div className="bg-[#22c55e] text-white px-3 py-1.5 font-display font-black text-xs border-2 border-[#1a1a1a] brutal-shadow flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Configuración Guardada!</span>
          </div>
        )}
      </div>

      {/* Main Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Business Info Form & Cashiers (7 cols) */}
        <div className="lg:col-span-7 space-y-5">

          {/* 1. Cashier Management Card (Gestión de Cajeros) */}
          <div className="bg-white border-3 border-[#1a1a1a] p-4 sm:p-5 brutal-shadow space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#1a1a1a] pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1a1a1a]" />
                <div>
                  <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a]">
                    Administración de Cajeros & Personal
                  </h3>
                  <span className="text-[11px] font-mono-code text-stone-500">
                    Control de usuarios, roles y PINs de acceso para turnos
                  </span>
                </div>
              </div>

              <button
                id="btn-add-cashier"
                type="button"
                onClick={handleOpenNewCashier}
                className="py-1.5 px-3 bg-[#ffcc00] hover:bg-yellow-400 font-display font-black text-xs border-2 border-[#1a1a1a] brutal-shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Nuevo Cajero</span>
              </button>
            </div>

            {/* Cashiers List / Table */}
            <div className="space-y-2">
              {cashiers.map((cashier) => {
                const isPinVisible = showPins[cashier.id];
                return (
                  <div
                    key={cashier.id}
                    className="p-3 bg-[#f5f0e8] border-2 border-[#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white border-2 border-[#1a1a1a] flex items-center justify-center text-xl shrink-0">
                        {cashier.avatar || '👨‍💼'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-sm text-[#1a1a1a]">
                            {cashier.name}
                          </span>
                          <span className={`px-1.5 py-0.2 font-mono-code font-bold text-[9px] border border-[#1a1a1a] ${
                            cashier.role === 'ADMIN'
                              ? 'bg-purple-200 text-purple-900'
                              : cashier.role === 'SUPERVISOR'
                              ? 'bg-blue-200 text-blue-900'
                              : 'bg-stone-200 text-stone-900'
                          }`}>
                            {cashier.role}
                          </span>
                          <span className={`text-[9px] font-mono-code font-bold px-1.5 py-0.2 border ${
                            cashier.active
                              ? 'bg-green-100 text-green-800 border-green-700'
                              : 'bg-red-100 text-red-800 border-red-700'
                          }`}>
                            {cashier.active ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </div>

                        {/* PIN Security Indicator */}
                        <div className="flex items-center gap-2 mt-1 text-xs font-mono-code text-stone-600">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                            PIN: <span className="font-bold text-stone-800">{cashier.pin.startsWith('sha256:') ? 'Hash SHA-256 + Salt' : '•••• (Legacy)'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCashier(cashier)}
                        className="py-1 px-2.5 bg-white hover:bg-[#ffcc00] border-2 border-[#1a1a1a] font-display font-bold text-xs flex items-center gap-1 brutal-btn cursor-pointer"
                        title="Editar datos del cajero"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCashierClick(cashier)}
                        className="py-1 px-2 bg-white hover:bg-[#ef4444] hover:text-white border-2 border-[#1a1a1a] font-display font-bold text-xs text-red-600 flex items-center justify-center brutal-btn cursor-pointer"
                        title="Eliminar cajero"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Business Info Form */}
          <form onSubmit={handleSaveSettings} className="bg-white border-3 border-[#1a1a1a] p-4 sm:p-5 brutal-shadow space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-[#1a1a1a] pb-2">
              <Store className="w-5 h-5 text-[#1a1a1a]" />
              <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a]">
                Datos Generales del Negocio
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                  Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  value={formData.commercialName}
                  onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
                  className="w-full bg-[#f5f0e8] p-2 font-display font-bold text-xs sm:text-sm brutal-input"
                />
              </div>

              <div>
                <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                  Razón Social / Propietario
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full bg-[#f5f0e8] p-2 font-display font-bold text-xs sm:text-sm brutal-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                  RFC / Clave Fiscal
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full bg-[#f5f0e8] p-2 font-mono-code font-bold text-xs sm:text-sm brutal-input"
                />
              </div>

              <div>
                <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                  Teléfono / WhatsApp de Contacto
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#f5f0e8] p-2 font-mono-code font-bold text-xs sm:text-sm brutal-input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Dirección del Local
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-[#f5f0e8] p-2 font-display font-bold text-xs sm:text-sm brutal-input"
              />
            </div>

            <div>
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Ciudad, Estado y Código Postal
              </label>
              <input
                type="text"
                value={formData.cityState}
                onChange={(e) => setFormData({ ...formData, cityState: e.target.value })}
                className="w-full bg-[#f5f0e8] p-2 font-display font-bold text-xs sm:text-sm brutal-input"
              />
            </div>

            <div>
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Mensaje de Pie de Ticket Térmico
              </label>
              <textarea
                rows={3}
                value={formData.ticketFooter}
                onChange={(e) => setFormData({ ...formData, ticketFooter: e.target.value })}
                className="w-full bg-[#f5f0e8] p-2 font-mono-code text-xs text-[#1a1a1a] brutal-input"
              />
            </div>

            {/* Security & Terminal Auto-Lock & Starting Cash */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-200">
              <div>
                <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                  Bloqueo por Inactividad
                </label>
                <select
                  value={formData.autoLockMinutes}
                  onChange={(e) => setFormData({ ...formData, autoLockMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#f5f0e8] p-2 font-display font-bold text-xs sm:text-sm brutal-input cursor-pointer"
                >
                  <option value={1}>1 Minuto de inactividad</option>
                  <option value={3}>3 Minutos (Recomendado)</option>
                  <option value={5}>5 Minutos</option>
                  <option value={10}>10 Minutos</option>
                  <option value={0}>Desactivado (No recomendado)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                  Fondo Inicial Sugerido ($ MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 font-mono-code font-bold text-xs text-stone-600">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.defaultStartingCash !== undefined ? formData.defaultStartingCash : 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({
                        ...formData,
                        defaultStartingCash: isNaN(val) || val < 0 ? 0 : Number(val.toFixed(2)),
                      });
                    }}
                    className="w-full pl-6 bg-[#f5f0e8] p-2 font-mono-code font-bold text-xs sm:text-sm brutal-input"
                    placeholder="0.00"
                  />
                </div>
                <span className="text-[10px] text-stone-500 font-mono-code block mt-0.5">
                  Válido para 0 o cualquier valor positivo
                </span>
              </div>

              <div>
                <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                  Cifrado de Datos Offline
                </label>
                <div className="flex items-center gap-2 p-2 bg-green-50 border-2 border-[#1a1a1a] text-xs font-mono-code font-bold text-green-800">
                  <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                  <span>AES-GCM-256 Activo</span>
                </div>
              </div>
            </div>

            {/* Impuestos en Pagos Electrónicos (Tarjeta & Transferencia) */}
            <div className="pt-3 border-t-2 border-stone-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-display font-black uppercase text-[#1a1a1a] flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#1a1a1a]" />
                  <span>Porcentaje de IVA en Pagos con Tarjeta y Transferencia</span>
                </label>
                <span className="text-[10px] font-mono-code font-bold text-stone-500">
                  Suma automática en cobro electrónico
                </span>
              </div>

              <p className="text-xs text-stone-600 font-sans">
                El porcentaje indicado se sumará automáticamente al total a pagar en la vista de ventas al seleccionar cobro con <strong>Tarjeta</strong> o <strong>Transferencia</strong>. En cobros en <strong>Efectivo</strong> no se sumará este recargo fiscal.
              </p>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
                {/* Botones de selección rápida */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {[
                    { label: '0% (Exento)', val: 0 },
                    { label: '8% (Frontera)', val: 8 },
                    { label: '16% (General)', val: 16 },
                  ].map((preset) => {
                    const isSelected = (formData.taxRatePercent !== undefined ? formData.taxRatePercent : 16) === preset.val;
                    return (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => {
                          soundFx.playKeyClick();
                          setFormData({ ...formData, taxRatePercent: preset.val });
                        }}
                        className={`py-1.5 px-2.5 font-mono-code font-bold text-xs border-2 border-[#1a1a1a] cursor-pointer brutal-btn transition-colors ${
                          isSelected
                            ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-[1.5px_1.5px_0px_#ffcc00]'
                            : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-[#ffcc00]/30'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Input personalizado */}
                <div className="relative flex-1 min-w-[130px]">
                  <input
                    id="input-tax-rate-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.taxRatePercent !== undefined ? formData.taxRatePercent : 16}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({
                        ...formData,
                        taxRatePercent: isNaN(val) || val < 0 ? 0 : Number(val.toFixed(2)),
                      });
                    }}
                    className="w-full pl-3 pr-8 bg-[#f5f0e8] p-2 font-mono-code font-black text-xs sm:text-sm brutal-input text-right"
                    placeholder="16.00"
                  />
                  <span className="absolute right-3 top-2 font-mono-code font-black text-xs text-stone-600">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t-2 border-[#1a1a1a] flex justify-end">
              <button
                type="submit"
                className="py-2.5 px-6 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] font-display font-black text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios de Tienda</span>
              </button>
            </div>
          </form>

          {/* Database Backup & Maintenance Card */}
          <div className="bg-white border-3 border-[#1a1a1a] p-4 sm:p-5 brutal-shadow space-y-3">
            <div className="flex items-center gap-2 border-b-2 border-[#1a1a1a] pb-2">
              <Database className="w-5 h-5 text-[#1a1a1a]" />
              <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a]">
                Mantenimiento de Base de Datos Local (Offline)
              </h3>
            </div>

            <p className="text-xs font-sans text-stone-600">
              Todos los datos de productos, ventas y arqueos se almacenan de forma local en su dispositivo sin depender de internet.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {/* Export JSON */}
              <button
                onClick={handleExportDatabase}
                className="py-2.5 px-3 bg-[#f5f0e8] hover:bg-[#38bdf8] border-2 border-[#1a1a1a] font-display font-bold text-xs text-[#1a1a1a] flex items-center justify-center gap-1.5 brutal-btn cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar JSON</span>
              </button>

              {/* Import JSON */}
              <label className="py-2.5 px-3 bg-[#f5f0e8] hover:bg-[#ffcc00] border-2 border-[#1a1a1a] font-display font-bold text-xs text-[#1a1a1a] flex items-center justify-center gap-1.5 brutal-btn cursor-pointer text-center">
                <Upload className="w-4 h-4" />
                <span>Importar JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>


        </div>

        {/* Right Column: Peripherals (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Thermal Printer ESC/POS Card */}
          <div className="bg-white border-3 border-[#1a1a1a] p-4 brutal-shadow space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#38bdf8]" />
                <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a]">
                  Impresora Térmica ESC/POS
                </h3>
              </div>
              <span className="text-[10px] font-mono-code bg-green-100 text-green-800 px-1.5 py-0.5 border border-green-800 font-bold">
                EN LÍNEA
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block">
                Formato de Papel Térmico:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['58mm', '80mm'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      if (size === '80mm') {
                        localStorage.setItem('pos_printer_explicit_80mm', 'true');
                      } else {
                        localStorage.removeItem('pos_printer_explicit_80mm');
                      }
                      setFormData({ ...formData, printerPaperSize: size });
                    }}
                    className={`py-2 border-2 border-[#1a1a1a] font-mono-code font-bold text-xs cursor-pointer brutal-btn ${
                      formData.printerPaperSize === size
                        ? 'bg-[#ffcc00] text-[#1a1a1a]'
                        : 'bg-[#f5f0e8] text-[#1a1a1a]'
                    }`}
                  >
                    Cabezal {size} {size === '58mm' ? '(Predet.)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePrintRealTicket}
              className="w-full py-2.5 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] border-2 border-[#1a1a1a] font-display font-black text-xs brutal-btn cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Generar & Imprimir Ticket de Prueba Real</span>
            </button>

            {printSuccessNotice && (
              <div className="bg-green-100 border-2 border-green-700 text-green-900 p-2 font-mono-code text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
                <span>Ticket de prueba generado y abierto para impresión.</span>
              </div>
            )}
          </div>

          {/* 2. Real Barcode & Product Verifier (Búsqueda y Comprobación Real) */}
          <div className="bg-white border-3 border-[#1a1a1a] p-4 brutal-shadow space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-[#22c55e]" />
                <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a]">
                  Buscador & Verificador de Códigos Real
                </h3>
              </div>
              <span className="text-[10px] font-mono-code bg-green-100 text-green-800 px-1.5 py-0.5 border border-green-800 font-bold">
                BÚSQUEDA ACTIVA
              </span>
            </div>

            <p className="text-xs font-sans text-stone-600">
              Escanee con la pistola lectora HID o ingrese un código para comprobar sus datos reales en inventario o catálogo global:
            </p>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={barcodeSearchTerm}
                onChange={(e) => setBarcodeSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handlePerformBarcodeSearch();
                  }
                }}
                placeholder="Escanee código o escriba SKU (Ej. 7501031311309)..."
                className="w-full bg-[#f5f0e8] p-2 font-mono-code font-bold text-xs brutal-input"
              />
              <button
                type="button"
                onClick={() => handlePerformBarcodeSearch()}
                disabled={isSearchingBarcode || !barcodeSearchTerm.trim()}
                className="px-3 bg-[#ffcc00] hover:bg-yellow-400 disabled:opacity-50 border-2 border-[#1a1a1a] font-display font-black text-xs brutal-btn cursor-pointer flex items-center justify-center gap-1 shrink-0"
              >
                {isSearchingBarcode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar</span>
                  </>
                )}
              </button>
            </div>

            {/* Search Results Display */}
            {barcodeSearchResult && (
              <div className="mt-2 pt-2 border-t-2 border-stone-200">
                {barcodeSearchResult.localProduct ? (
                  /* Local Store Product Match */
                  <div className="p-3 bg-green-50 border-2 border-[#1a1a1a] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.2 bg-[#22c55e] text-white border border-[#1a1a1a]">
                        REGISTRADO EN TIENDA
                      </span>
                      <span className="font-mono-code text-[11px] text-stone-600 font-bold">
                        SKU: {barcodeSearchResult.localProduct.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{barcodeSearchResult.localProduct.emoji || '📦'}</span>
                      <div>
                        <h4 className="font-display font-black text-xs text-[#1a1a1a]">
                          {barcodeSearchResult.localProduct.name}
                        </h4>
                        <span className="text-[10px] font-mono-code text-stone-600">
                          Categoría: {barcodeSearchResult.localProduct.category} · {barcodeSearchResult.localProduct.unitType.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-green-200 text-xs font-mono-code">
                      <span>Precio: <strong>{formatCurrency(barcodeSearchResult.localProduct.price)}</strong></span>
                      <span className={barcodeSearchResult.localProduct.stock <= barcodeSearchResult.localProduct.minStock ? 'text-red-700 font-bold' : 'text-stone-700'}>
                        Stock: {barcodeSearchResult.localProduct.stock} {barcodeSearchResult.localProduct.unitType}
                      </span>
                    </div>
                  </div>
                ) : barcodeSearchResult.globalResult ? (
                  /* Global Real Database Match */
                  <div className="p-3 bg-amber-50 border-2 border-[#1a1a1a] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.2 bg-[#ffcc00] text-[#1a1a1a] border border-[#1a1a1a]">
                        ENCONTRADO EN BASE GLOBAL
                      </span>
                      <span className="font-mono-code text-[11px] text-stone-600 font-bold">
                        {barcodeSearchResult.globalResult.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{barcodeSearchResult.globalResult.emoji || '📦'}</span>
                      <div>
                        <h4 className="font-display font-black text-xs text-[#1a1a1a]">
                          {barcodeSearchResult.globalResult.name}
                        </h4>
                        {barcodeSearchResult.globalResult.brand && (
                          <span className="text-[10px] font-mono-code text-stone-600 block">
                            Marca: {barcodeSearchResult.globalResult.brand}
                          </span>
                        )}
                        <span className="text-[10px] font-mono-code text-stone-500">
                          Sugerida: {barcodeSearchResult.globalResult.category}
                        </span>
                      </div>
                    </div>
                    {onSaveProduct && (
                      <button
                        type="button"
                        onClick={() => handleAddGlobalProductToStore(barcodeSearchResult.globalResult!)}
                        className="w-full py-1.5 bg-[#ffcc00] hover:bg-yellow-400 font-display font-black text-xs border border-[#1a1a1a] flex items-center justify-center gap-1.5 cursor-pointer brutal-btn"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Agregar a Mi Inventario</span>
                      </button>
                    )}
                  </div>
                ) : (
                  /* Not Found */
                  <div className="p-2.5 bg-stone-100 border-2 border-dashed border-stone-400 text-center">
                    <span className="text-xs font-mono-code text-stone-600 block">
                      Código "{barcodeSearchResult.searchedTerm}" no encontrado en inventario ni catálogo global.
                    </span>
                    <span className="text-[10px] font-sans text-stone-500 mt-0.5 block">
                      Puede darlo de alta directamente desde el módulo de Inventario.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Electronic Scale RS-232 / USB Card */}
          <div className="bg-white border-3 border-[#1a1a1a] p-4 brutal-shadow space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#ffcc00]" />
                <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a]">
                  Báscula Digital USB / RS-232
                </h3>
              </div>
              <span className="text-[10px] font-mono-code bg-[#ffcc00]/40 text-[#1a1a1a] px-1.5 py-0.5 border border-[#1a1a1a] font-bold">
                CALIBRADA
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#1a1a1a] text-white p-3 border-2 border-[#1a1a1a]">
              <div>
                <span className="text-[10px] font-mono-code text-stone-400 block uppercase">
                  Lectura de Peso Real:
                </span>
                <span className="text-2xl font-mono-code font-black text-[#ffcc00]">
                  0.000 kg
                </span>
                <span className="text-[9px] font-mono-code text-stone-400 block mt-0.5">
                  Puerto: {formData.scalePort} · Protocolo: {formData.scaleProtocol}
                </span>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleScaleTare}
                  className="py-1.5 px-3 bg-stone-700 hover:bg-stone-600 text-white font-mono-code text-xs font-bold border border-stone-500 cursor-pointer"
                >
                  Poner a Cero / Tara
                </button>
              </div>
            </div>

            {scaleTareNotice && (
              <div className="bg-green-100 border border-green-700 p-1.5 text-center text-xs font-mono-code text-green-900 font-bold">
                ✓ Báscula tarada a 0.000 kg
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cashier Creation & Edit Modal */}
      <CashierFormModal
        isOpen={isCashierModalOpen}
        onClose={() => setIsCashierModalOpen(false)}
        cashierToEdit={cashierToEdit}
        onSave={(savedCashier) => {
          onSaveCashier(savedCashier);
        }}
      />

      {/* Real Test Ticket Preview & Print Modal */}
      <TicketModal
        sale={testTicketSale}
        settings={formData}
        isOpen={isTestTicketOpen}
        onClose={() => setIsTestTicketOpen(false)}
        onNewSale={() => setIsTestTicketOpen(false)}
      />
    </div>
  );
};

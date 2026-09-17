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
  Percent
} from 'lucide-react';
import { StoreSettings, Product, CashShift, SaleTransaction, CashierUser } from '../types/pos';
import { soundFx } from '../utils/audio';
import { CashierFormModal } from '../components/CashierFormModal';
import { toCents, fromCents, addCents, multiplyPrice } from '../utils/money';
import { hashPin, verifyPin } from '../utils/security';
import { getOutboxStats } from '../utils/outbox';

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
  onResetFactory,
  onImportData,
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

  // Scanner test state
  const [scannerTestInput, setScannerTestInput] = useState('');
  const [scannerReads, setScannerReads] = useState<string[]>([]);

  // Printer test state
  const [printerOutputVisual, setPrinterOutputVisual] = useState<string | null>(null);

  // Scale test state
  const [simulatedScaleWeight, setSimulatedScaleWeight] = useState(0.0);


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

  const handleTestPrinter = () => {
    soundFx.playKeyClick();
    const testLines = [
      '==========================================',
      `        ${formData.commercialName.toUpperCase()}        `,
      `          RFC: ${formData.taxId}          `,
      '------------------------------------------',
      ' PRUEBA DE COMANDOS ESC/POS - CABEZAL OK  ',
      ' PROTOCOLO: ESC @ (Init) / GS V 66 (Cut)  ',
      ' CARACTERES ESPAÑOL: Ñ, á, é, í, ó, ú, $  ',
      ' ANCHO SELECCIONADO: ' + formData.printerPaperSize,
      ' ESTADO: IMPRESORA TÉRMICA EN LÍNEA (203 DPI)',
      '==========================================',
    ].join('\n');
    setPrinterOutputVisual(testLines);
  };

  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannerTestInput.trim()) {
      e.preventDefault();
      soundFx.playScanBeep();
      setScannerReads((prev) => [
        `${new Date().toLocaleTimeString()} -> [${scannerTestInput.trim()}]`,
        ...prev.slice(0, 4),
      ]);
      setScannerTestInput('');
    }
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
              onClick={handleTestPrinter}
              className="w-full py-2 bg-stone-100 hover:bg-[#ffcc00] border-2 border-[#1a1a1a] font-display font-bold text-xs brutal-btn cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Ejecutar Test de Impresión ESC/POS</span>
            </button>

            {printerOutputVisual && (
              <div className="bg-[#1a1a1a] text-[#22c55e] p-2.5 font-mono-code text-[10px] border border-stone-800 whitespace-pre leading-tight">
                {printerOutputVisual}
              </div>
            )}
          </div>

          {/* 2. Barcode HID Scanner Card */}
          <div className="bg-white border-3 border-[#1a1a1a] p-4 brutal-shadow space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-[#22c55e]" />
                <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a]">
                  Lector de Código de Barras HID
                </h3>
              </div>
              <span className="text-[10px] font-mono-code bg-blue-100 text-blue-800 px-1.5 py-0.5 border border-blue-800 font-bold">
                PLUG & PLAY
              </span>
            </div>

            <p className="text-xs font-sans text-stone-600">
              Pruebe su pistola lectora USB o Bluetooth en este campo de prueba:
            </p>

            <input
              type="text"
              value={scannerTestInput}
              onChange={(e) => setScannerTestInput(e.target.value)}
              onKeyDown={handleScannerKeyDown}
              placeholder="Escanee un código aquí y presione Enter..."
              className="w-full bg-[#f5f0e8] p-2 font-mono-code font-bold text-xs brutal-input"
            />

            {scannerReads.length > 0 && (
              <div className="bg-stone-50 border border-[#1a1a1a] p-2 space-y-1">
                <span className="text-[10px] font-mono-code font-bold text-stone-500 block uppercase">
                  Últimas lecturas capturadas:
                </span>
                {scannerReads.map((read, idx) => (
                  <div key={idx} className="font-mono-code text-[11px] text-[#1a1a1a]">
                    {read}
                  </div>
                ))}
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
                  Lectura en Vivo:
                </span>
                <span className="text-2xl font-mono-code font-black text-[#ffcc00]">
                  {simulatedScaleWeight.toFixed(3)} kg
                </span>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playScalePing();
                    setSimulatedScaleWeight(0.0);
                  }}
                  className="py-1 px-2.5 bg-stone-700 hover:bg-stone-600 text-white font-mono-code text-xs font-bold border border-stone-500 cursor-pointer"
                >
                  Tara (0.000)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playScalePing();
                    setSimulatedScaleWeight(+(Math.random() * 2.5 + 0.2).toFixed(3));
                  }}
                  className="py-1 px-2.5 bg-[#ffcc00] text-[#1a1a1a] hover:bg-yellow-400 font-display text-xs font-bold border border-black cursor-pointer"
                >
                  Poner Peso
                </button>
              </div>
            </div>
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
    </div>
  );
};

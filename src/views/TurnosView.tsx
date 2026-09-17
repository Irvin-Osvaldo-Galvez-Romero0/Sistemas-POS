import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  Coins, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Power, 
  Printer, 
  History, 
  Calculator,
  UserCheck,
  CreditCard,
  Banknote,
  Scale,
  Edit3,
  Trash2
} from 'lucide-react';
import { CashShift, CashDenominations, BalanceStatus, StoreSettings, CashierUser } from '../types/pos';
import { soundFx } from '../utils/audio';
import { formatCurrency } from '../utils/escpos';
import { compareMonetaryBalance, fromCents, toCents, addCents } from '../utils/money';

interface TurnosViewProps {
  activeShift: CashShift;
  setActiveShift: React.Dispatch<React.SetStateAction<CashShift>>;
  pastShifts: CashShift[];
  onOpenCutModal: (type: 'X' | 'Z') => void;
  settings: StoreSettings;
  onClearPastShifts?: () => void;
  currentUser?: CashierUser;
}

export const TurnosView: React.FC<TurnosViewProps> = ({
  activeShift,
  setActiveShift,
  pastShifts,
  onOpenCutModal,
  settings,
  onClearPastShifts,
  currentUser,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  // Local denominations state for live counting
  const [denoms, setDenoms] = useState<CashDenominations>(activeShift.denominations);
  const [manualTotalCount, setManualTotalCount] = useState<string>('');
  const [countingMode, setCountingMode] = useState<'DENOMINATIONS' | 'DIRECT_TOTAL'>('DENOMINATIONS');
  const [shiftNotes, setShiftNotes] = useState<string>(activeShift.notes || '');

  // Starting cash modal state
  const [isStartingCashModalOpen, setIsStartingCashModalOpen] = useState<boolean>(false);
  const [inputStartingCash, setInputStartingCash] = useState<string>(activeShift.startingCash.toString());
  const [startingCashError, setStartingCashError] = useState<string | null>(null);

  const handleOpenStartingCashModal = () => {
    if (!isAdmin) return;
    soundFx.playKeyClick();
    setInputStartingCash(activeShift.startingCash.toString());
    setStartingCashError(null);
    setIsStartingCashModalOpen(true);
  };

  const handleStartingCashInputChange = (val: string) => {
    setInputStartingCash(val);
    const num = parseFloat(val);
    if (val.trim() === '') {
      setStartingCashError('Ingrese un número (0 o superior).');
    } else if (isNaN(num) || num < 0) {
      setStartingCashError('Todos los valores deben ser mayores o iguales a 0.');
    } else {
      setStartingCashError(null);
    }
  };

  const handleSaveStartingCash = (newAmount: number) => {
    if (!isAdmin) return;
    if (isNaN(newAmount) || newAmount < 0) return;
    soundFx.playCashRegisterChime();

    // Recalculate expected cash with integer cents
    const newExpectedCash = addCents(newAmount, activeShift.cashSales);
    const bal = compareMonetaryBalance(effectiveCountedCash, newExpectedCash);

    setActiveShift((prev) => ({
      ...prev,
      startingCash: newAmount,
      expectedCash: newExpectedCash,
      difference: bal.difference,
      balanceStatus: bal.status,
      notes: `Turno #${prev.shiftNumber} con fondo de ${formatCurrency(newAmount)}.`,
    }));

    setIsStartingCashModalOpen(false);
  };

  const handleConfirmStartingCashSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(inputStartingCash);
    if (isNaN(num) || num < 0) {
      setStartingCashError('Ingrese un monto válido (0 o superior).');
      return;
    }
    const cleanAmount = Number(num.toFixed(2));
    handleSaveStartingCash(cleanAmount);
  };

  // Denominations config
  const billsConfig = [
    { key: 'b1000' as keyof CashDenominations, label: '$1,000 MXN', val: 1000 },
    { key: 'b500' as keyof CashDenominations, label: '$500 MXN', val: 500 },
    { key: 'b200' as keyof CashDenominations, label: '$200 MXN', val: 200 },
    { key: 'b100' as keyof CashDenominations, label: '$100 MXN', val: 100 },
    { key: 'b50' as keyof CashDenominations, label: '$50 MXN', val: 50 },
    { key: 'b20' as keyof CashDenominations, label: '$20 MXN', val: 20 },
  ];

  const coinsConfig = [
    { key: 'm20' as keyof CashDenominations, label: '$20 Moneda', val: 20 },
    { key: 'm10' as keyof CashDenominations, label: '$10 Moneda', val: 10 },
    { key: 'm5' as keyof CashDenominations, label: '$5 Moneda', val: 5 },
    { key: 'm2' as keyof CashDenominations, label: '$2 Moneda', val: 2 },
    { key: 'm1' as keyof CashDenominations, label: '$1 Moneda', val: 1 },
    { key: 'm050' as keyof CashDenominations, label: '$0.50 Moneda', val: 0.5 },
  ];

  // Calculate total from denominations
  const totalCountedFromDenoms = useMemo(() => {
    let sum = 0;
    billsConfig.forEach((b) => {
      sum += (denoms[b.key] || 0) * b.val;
    });
    coinsConfig.forEach((c) => {
      sum += (denoms[c.key] || 0) * c.val;
    });
    return sum;
  }, [denoms]);

  const effectiveCountedCash = useMemo(() => {
    if (countingMode === 'DIRECT_TOTAL') {
      return parseFloat(manualTotalCount) || 0;
    }
    return totalCountedFromDenoms;
  }, [countingMode, manualTotalCount, totalCountedFromDenoms]);

  // Balance difference using integer cents
  const balance = useMemo(() => {
    return compareMonetaryBalance(effectiveCountedCash, activeShift.expectedCash);
  }, [effectiveCountedCash, activeShift.expectedCash]);

  const difference = balance.difference;
  const balanceStatus: BalanceStatus = balance.status;

  // Update shift when counting or notes change
  const syncToActiveShift = (
    countedCash: number,
    updatedDenoms: CashDenominations,
    notes: string
  ) => {
    const bal = compareMonetaryBalance(countedCash, activeShift.expectedCash);
    setActiveShift((prev) => ({
      ...prev,
      actualCashCounted: countedCash,
      difference: bal.difference,
      balanceStatus: bal.status,
      denominations: updatedDenoms,
      notes,
    }));
  };

  const handleDenomChange = (key: keyof CashDenominations, delta: number) => {
    soundFx.playKeyClick();
    const current = denoms[key] || 0;
    const next = Math.max(0, current + delta);
    const updatedDenoms = { ...denoms, [key]: next };
    setDenoms(updatedDenoms);

    let sum = 0;
    billsConfig.forEach((b) => {
      sum += (updatedDenoms[b.key] || 0) * b.val;
    });
    coinsConfig.forEach((c) => {
      sum += (updatedDenoms[c.key] || 0) * c.val;
    });

    syncToActiveShift(sum, updatedDenoms, shiftNotes);
  };

  const handleDenomDirectInput = (key: keyof CashDenominations, valStr: string) => {
    const parsed = parseInt(valStr, 10) || 0;
    const updatedDenoms = { ...denoms, [key]: Math.max(0, parsed) };
    setDenoms(updatedDenoms);

    let sum = 0;
    billsConfig.forEach((b) => {
      sum += (updatedDenoms[b.key] || 0) * b.val;
    });
    coinsConfig.forEach((c) => {
      sum += (updatedDenoms[c.key] || 0) * c.val;
    });

    syncToActiveShift(sum, updatedDenoms, shiftNotes);
  };

  const handleManualCountChange = (valStr: string) => {
    setManualTotalCount(valStr);
    const parsed = parseFloat(valStr) || 0;
    syncToActiveShift(parsed, denoms, shiftNotes);
  };

  return (
    <div id="turnos-view-container" className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#f5f0e8] p-4 md:p-6 animate-in fade-in duration-150 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#1a1a1a] text-[#ffcc00] font-mono-code font-bold text-xs px-2 py-0.5">
              CAJA
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#1a1a1a]">
              Arqueo de Caja & Control de Turnos
            </h1>
          </div>
          <p className="text-xs font-sans text-stone-600 mt-0.5">
            Monitoreo en vivo de flujo de efectivo, balance de arqueo y emisión de cortes X / Z
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Ingresar Monto Dejado (Fondo Inicial) */}
          <button
            id="btn-ingresar-monto-dejado"
            onClick={handleOpenStartingCashModal}
            className="py-2.5 px-3.5 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] font-display font-black text-xs border-2.5 border-[#1a1a1a] brutal-shadow flex items-center gap-1.5 cursor-pointer"
            title="Ingresar o modificar el monto que se dejó en caja"
          >
            <DollarSign className="w-4 h-4 text-[#1a1a1a]" />
            <span>Monto Dejado: {formatCurrency(activeShift.startingCash)}</span>
          </button>

          {/* Corte X (Parcial) */}
          <button
            id="btn-corte-x"
            onClick={() => {
              soundFx.playKeyClick();
              onOpenCutModal('X');
            }}
            className="py-2.5 px-4 bg-white hover:bg-stone-100 text-[#1a1a1a] font-display font-bold text-xs border-2.5 border-[#1a1a1a] brutal-shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Corte X (Parcial)</span>
          </button>

          {/* Corte Z (Cierre definitivo) */}
          <button
            id="btn-corte-z"
            onClick={() => {
              soundFx.playKeyClick();
              onOpenCutModal('Z');
            }}
            className="py-2.5 px-5 bg-[#ef4444] hover:bg-red-600 text-white font-display font-black text-xs border-2.5 border-[#1a1a1a] brutal-shadow flex items-center gap-1.5 cursor-pointer active:translate-x-[2px] active:translate-y-[2px]"
          >
            <Power className="w-4 h-4" />
            <span>Corte Z (Cierre de Turno)</span>
          </button>
        </div>
      </div>

      {/* Turno Activo Overview Banner */}
      <div className="bg-[#1a1a1a] text-white border-3 border-[#1a1a1a] p-4 brutal-shadow mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#ffcc00] border-2 border-white flex items-center justify-center text-[#1a1a1a] font-black text-xl">
              T{activeShift.shiftNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-code text-[10px] bg-[#22c55e] text-[#1a1a1a] px-1.5 py-0.2 font-black uppercase">
                  TURNO EN CURSO
                </span>
                <span className="font-mono-code text-xs text-white/70">
                  Apertura: {activeShift.openedAt}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                {activeShift.cashierName}
              </h2>
            </div>
          </div>

          {/* Key Totals Mini Cards */}
          <div className="flex flex-wrap items-center gap-3 font-mono-code text-xs">
            <div className="bg-stone-800 p-2 border border-stone-700 flex flex-col justify-between">
              <span className="text-stone-400 block text-[10px]">Fondo Inicial:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{formatCurrency(activeShift.startingCash)}</span>
                {isAdmin && (
                  <button
                    onClick={handleOpenStartingCashModal}
                    className="text-[10px] text-[#ffcc00] hover:underline font-bold font-mono-code cursor-pointer"
                    title="Modificar monto que se dejó en caja"
                  >
                    [Editar]
                  </button>
                )}
              </div>
            </div>
            <div className="bg-stone-800 p-2 border border-stone-700">
              <span className="text-stone-400 block text-[10px]">Ventas Totales:</span>
              <span className="font-black text-[#ffcc00] text-sm">{formatCurrency(activeShift.totalSales)}</span>
            </div>
            <div className="bg-stone-800 p-2 border border-stone-700">
              <span className="text-stone-400 block text-[10px]">Tickets Emitidos:</span>
              <span className="font-bold text-white text-sm">{activeShift.salesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns (Real-Time Financials 5 Cols | Cash Arqueo 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left Column: Financial Breakdown (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border-3 border-[#1a1a1a] p-4 brutal-shadow">
            <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2 mb-3">
              <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#22c55e]" />
                Desglose Financiero del Turno
              </h3>
              <span className="text-[11px] font-mono-code font-bold text-stone-500">
                En vivo
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono-code">
              {/* Fondo Inicial */}
              <div className="flex justify-between items-center p-2 bg-[#f5f0e8] border border-[#1a1a1a]/30">
                <div>
                  <span className="font-bold text-stone-700 block">Fondo Inicial de Caja:</span>
                  <span className="text-[10px] text-stone-500">Monto dejado al aperturar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-stone-900 text-sm">{formatCurrency(activeShift.startingCash)}</span>
                  {isAdmin && (
                    <button
                      onClick={handleOpenStartingCashModal}
                      className="px-2 py-0.5 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] font-display font-black text-[11px] border border-[#1a1a1a] brutal-btn cursor-pointer flex items-center gap-1"
                      title="Modificar monto que se dejó en caja"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Cambiar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ventas Efectivo */}
              <div className="flex justify-between p-2 bg-green-50 border border-green-200">
                <span className="font-bold text-green-900 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" /> (+) Ventas en Efectivo:
                </span>
                <span className="font-black text-green-800">{formatCurrency(activeShift.cashSales)}</span>
              </div>

              {/* Ventas Tarjeta */}
              <div className="flex justify-between p-2 bg-blue-50 border border-blue-200">
                <span className="font-bold text-blue-900 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> (+) Ventas con Tarjeta:
                </span>
                <span className="font-black text-blue-800">{formatCurrency(activeShift.cardSales)}</span>
              </div>

              {/* Ventas Transferencia */}
              <div className="flex justify-between p-2 bg-purple-50 border border-purple-200">
                <span className="font-bold text-purple-900">
                  (+) Ventas Transferencia:
                </span>
                <span className="font-black text-purple-800">{formatCurrency(activeShift.transferSales)}</span>
              </div>

              {/* Expected Total Cash in Drawer */}
              <div className="p-3 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a] mt-3">
                <div className="text-[10px] text-white/70 uppercase">
                  Efectivo Teórico Esperado en Cajón
                </div>
                <div className="text-xl sm:text-2xl font-display font-black text-[#ffcc00]">
                  {formatCurrency(activeShift.expectedCash)}
                </div>
                <div className="text-[10px] text-stone-300 mt-0.5">
                  Fondo Inicial ({formatCurrency(activeShift.startingCash)}) + Cobros en Efectivo ({formatCurrency(activeShift.cashSales)})
                </div>
              </div>

              {/* Granel vs Unidades breakdown */}
              <div className="pt-2 border-t border-stone-200 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-stone-50 p-2 border border-stone-200">
                  <span className="text-stone-500 block">Ventas a Granel:</span>
                  <span className="font-bold text-[#1a1a1a]">{formatCurrency(activeShift.bulkSalesTotal)}</span>
                </div>
                <div className="bg-stone-50 p-2 border border-stone-200">
                  <span className="text-stone-500 block">Ventas por Pieza:</span>
                  <span className="font-bold text-[#1a1a1a]">{formatCurrency(activeShift.unitSalesTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Cash Counting & Balance Badge (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border-3 border-[#1a1a1a] p-4 brutal-shadow">
            {/* Header & Mode Switch */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b-2 border-[#1a1a1a] pb-3 mb-3">
              <div>
                <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a] flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-[#ffcc00]" />
                  Arqueo Físico de Efectivo
                </h3>
                <span className="text-xs text-stone-500 font-sans">
                  Conteo de billetes y monedas en gaveta
                </span>
              </div>

              <div className="flex gap-1 font-mono-code text-xs">
                <button
                  onClick={() => setCountingMode('DENOMINATIONS')}
                  className={`px-2.5 py-1 border-2 border-[#1a1a1a] font-bold cursor-pointer brutal-btn ${
                    countingMode === 'DENOMINATIONS' ? 'bg-[#ffcc00]' : 'bg-stone-100'
                  }`}
                >
                  Por Denominación
                </button>
                <button
                  onClick={() => setCountingMode('DIRECT_TOTAL')}
                  className={`px-2.5 py-1 border-2 border-[#1a1a1a] font-bold cursor-pointer brutal-btn ${
                    countingMode === 'DIRECT_TOTAL' ? 'bg-[#ffcc00]' : 'bg-stone-100'
                  }`}
                >
                  Monto Directo
                </button>
              </div>
            </div>

            {/* Mode 1: Denominations Matrix */}
            {countingMode === 'DENOMINATIONS' ? (
              <div className="space-y-4">
                {/* Bills Grid */}
                <div>
                  <span className="text-[11px] font-display font-bold uppercase text-stone-700 block mb-1.5">
                    Billetes
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {billsConfig.map((b) => (
                      <div key={b.key} className="bg-[#f5f0e8] border-2 border-[#1a1a1a] p-2 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-xs font-mono-code font-bold">
                          <span>{b.label}</span>
                          <span className="text-stone-500">x{denoms[b.key]}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <button
                            onClick={() => handleDenomChange(b.key, -1)}
                            className="w-7 h-7 bg-white hover:bg-stone-200 border border-[#1a1a1a] font-bold font-mono-code text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={denoms[b.key] || ''}
                            onChange={(e) => handleDenomDirectInput(b.key, e.target.value)}
                            placeholder="0"
                            className="w-full text-center font-mono-code font-bold text-xs bg-white border border-[#1a1a1a] py-1"
                          />
                          <button
                            onClick={() => handleDenomChange(b.key, 1)}
                            className="w-7 h-7 bg-white hover:bg-stone-200 border border-[#1a1a1a] font-bold font-mono-code text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right text-[10px] font-mono-code text-stone-600 mt-1">
                          = {formatCurrency((denoms[b.key] || 0) * b.val)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coins Grid */}
                <div>
                  <span className="text-[11px] font-display font-bold uppercase text-stone-700 block mb-1.5">
                    Monedas
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {coinsConfig.map((c) => (
                      <div key={c.key} className="bg-[#f5f0e8] border-2 border-[#1a1a1a] p-2 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-xs font-mono-code font-bold">
                          <span>{c.label}</span>
                          <span className="text-stone-500">x{denoms[c.key]}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <button
                            onClick={() => handleDenomChange(c.key, -1)}
                            className="w-7 h-7 bg-white hover:bg-stone-200 border border-[#1a1a1a] font-bold font-mono-code text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={denoms[c.key] || ''}
                            onChange={(e) => handleDenomDirectInput(c.key, e.target.value)}
                            placeholder="0"
                            className="w-full text-center font-mono-code font-bold text-xs bg-white border border-[#1a1a1a] py-1"
                          />
                          <button
                            onClick={() => handleDenomChange(c.key, 1)}
                            className="w-7 h-7 bg-white hover:bg-stone-200 border border-[#1a1a1a] font-bold font-mono-code text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right text-[10px] font-mono-code text-stone-600 mt-1">
                          = {formatCurrency((denoms[c.key] || 0) * c.val)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Direct Total Input */
              <div className="p-4 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                  Ingrese el Total de Efectivo Contado ($):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 font-mono-code font-bold text-lg">$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={manualTotalCount}
                    onChange={(e) => handleManualCountChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-3 bg-white font-mono-code font-black text-2xl text-[#1a1a1a] brutal-input"
                  />
                </div>
              </div>
            )}

            {/* LIVE ARQUEO BALANCE BANNER */}
            <div className="mt-5 p-4 border-3 border-[#1a1a1a] brutal-shadow bg-[#f5f0e8]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-center">
                {/* Total Contado */}
                <div>
                  <span className="text-[10px] font-mono-code text-stone-600 uppercase block">
                    Total Físico Contado:
                  </span>
                  <span className="font-display font-black text-xl text-[#1a1a1a]">
                    {formatCurrency(effectiveCountedCash)}
                  </span>
                </div>

                {/* Esperado */}
                <div>
                  <span className="text-[10px] font-mono-code text-stone-600 uppercase block">
                    Total Esperado:
                  </span>
                  <span className="font-display font-black text-xl text-stone-700">
                    {formatCurrency(activeShift.expectedCash)}
                  </span>
                </div>

                {/* Live Status Badge */}
                <div className="col-span-2 sm:col-span-1 text-center sm:text-right">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#1a1a1a] font-display font-black text-xs ${
                      balanceStatus === 'EXACT'
                        ? 'bg-[#22c55e] text-white shadow-[2px_2px_0px_#1a1a1a]'
                        : balanceStatus === 'SURPLUS'
                        ? 'bg-[#38bdf8] text-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a]'
                        : 'bg-[#ef4444] text-white shadow-[2px_2px_0px_#1a1a1a]'
                    }`}
                  >
                    {balanceStatus === 'EXACT' && <CheckCircle2 className="w-4 h-4" />}
                    {balanceStatus === 'SURPLUS' && <AlertCircle className="w-4 h-4" />}
                    {balanceStatus === 'SHORTAGE' && <AlertTriangle className="w-4 h-4" />}
                    <span>
                      {balanceStatus === 'EXACT'
                        ? '✓ CORTE EXACTO'
                        : balanceStatus === 'SURPLUS'
                        ? `▲ SOBRANTE +${formatCurrency(difference)}`
                        : `▼ FALTANTE ${formatCurrency(difference)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shift History Table - Solo visible para el Administrador */}
      {isAdmin && (
        <div className="bg-white border-3 border-[#1a1a1a] p-4 brutal-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#1a1a1a]" />
              <h3 className="font-display font-black text-sm uppercase text-[#1a1a1a]">
                Historial de Cortes de Turno Anteriores
              </h3>
              <span className="text-xs font-mono-code font-bold bg-stone-100 text-stone-700 px-1.5 py-0.5 border border-stone-300">
                {pastShifts.length} {pastShifts.length === 1 ? 'corte' : 'cortes'}
              </span>
            </div>

            {pastShifts.length > 0 && onClearPastShifts && (
              <button
                id="btn-clear-past-shifts"
                onClick={() => {
                  if (confirm('¿Está seguro de limpiar todo el historial de cortes de turnos anteriores? Esta acción no se puede deshacer.')) {
                    soundFx.playKeyClick();
                    onClearPastShifts();
                  }
                }}
                className="px-2.5 py-1 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white border border-red-700 font-display font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors brutal-btn self-start sm:self-auto"
                title="Limpiar todos los registros de cortes pasados"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar Historial</span>
              </button>
            )}
          </div>

          {pastShifts.length === 0 ? (
            <div className="p-4 text-center text-xs font-sans text-stone-500">
              No hay turnos archivados aún. Al realizar el "Corte Z", los turnos cerrados se registrarán aquí.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1a1a1a] text-white font-display text-[10px] uppercase">
                    <th className="p-2.5">Turno #</th>
                    <th className="p-2.5">Cajero</th>
                    <th className="p-2.5">Apertura</th>
                    <th className="p-2.5">Cierre</th>
                    <th className="p-2.5 text-right">Ventas Totales</th>
                    <th className="p-2.5 text-right">Efectivo Contado</th>
                    <th className="p-2.5 text-center">Diferencia</th>
                    <th className="p-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-mono-code text-[11px]">
                  {pastShifts.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50">
                      <td className="p-2.5 font-bold">#{s.shiftNumber}</td>
                      <td className="p-2.5 font-sans font-medium">{s.cashierName}</td>
                      <td className="p-2.5 text-stone-600">{s.openedAt}</td>
                      <td className="p-2.5 text-stone-600">{s.closedAt}</td>
                      <td className="p-2.5 text-right font-black">{formatCurrency(s.totalSales)}</td>
                      <td className="p-2.5 text-right">{formatCurrency(s.actualCashCounted)}</td>
                      <td className={`p-2.5 text-center font-black ${
                        s.difference === 0 ? 'text-green-700' : s.difference > 0 ? 'text-blue-700' : 'text-red-600'
                      }`}>
                        {s.difference > 0 ? `+${formatCurrency(s.difference)}` : formatCurrency(s.difference)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold border ${
                          s.balanceStatus === 'EXACT'
                            ? 'bg-green-100 text-green-800 border-green-800'
                            : s.balanceStatus === 'SURPLUS'
                            ? 'bg-blue-100 text-blue-800 border-blue-800'
                            : 'bg-red-100 text-red-800 border-red-800'
                        }`}>
                          {s.balanceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Ingresar Monto Dejado (Fondo Inicial) */}
      {isStartingCashModalOpen && (
        <div 
          id="starting-cash-modal-overlay"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
        >
          <div 
            id="starting-cash-modal"
            className="w-full max-w-md bg-[#f5f0e8] border-4 border-[#1a1a1a] brutal-shadow-lg p-5"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b-3 border-[#1a1a1a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#ffcc00] border-2 border-[#1a1a1a]">
                  <DollarSign className="w-5 h-5 text-[#1a1a1a]" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-[#1a1a1a]">
                    Ingresar Monto Dejado
                  </h3>
                  <span className="text-[11px] font-mono-code text-stone-600 block">
                    Fondo Inicial de Caja (Apertura)
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  soundFx.playKeyClick();
                  setIsStartingCashModalOpen(false);
                }}
                className="w-8 h-8 bg-stone-200 hover:bg-stone-300 border-2 border-[#1a1a1a] font-bold text-sm flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmStartingCashSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-black text-[#1a1a1a] uppercase mb-1">
                  Monto que se dejó en caja ($ MXN):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono-code font-black text-lg text-stone-600">
                    $
                  </span>
                  <input
                    id="input-starting-cash-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    autoFocus
                    value={inputStartingCash}
                    onChange={(e) => handleStartingCashInputChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 bg-white border-3 border-[#1a1a1a] font-mono-code font-black text-xl text-[#1a1a1a] brutal-input focus:ring-2 focus:ring-[#ffcc00]"
                  />
                </div>
                {startingCashError ? (
                  <p className="text-xs font-mono-code font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {startingCashError}
                  </p>
                ) : (
                  <p className="text-[11px] font-mono-code text-stone-600 mt-1">
                    ✓ Todos los valores positivos incluyendo $0.00 son válidos.
                  </p>
                )}
              </div>

              {/* Preset chips */}
              <div>
                <label className="block text-[10px] font-display font-bold text-stone-600 uppercase mb-1.5">
                  Montos rápidos sugeridos:
                </label>
                <div className="grid grid-cols-4 gap-1.5 font-mono-code text-xs">
                  {[0, 50, 100, 200, 300, 500, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        soundFx.playKeyClick();
                        setInputStartingCash(val.toString());
                        setStartingCashError(null);
                      }}
                      className={`py-1.5 px-2 border-2 border-[#1a1a1a] font-bold text-center cursor-pointer transition-colors ${
                        parseFloat(inputStartingCash) === val
                          ? 'bg-[#1a1a1a] text-[#ffcc00]'
                          : 'bg-white hover:bg-stone-100 text-[#1a1a1a]'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setInputStartingCash('0');
                      setStartingCashError(null);
                    }}
                    className="py-1.5 px-2 border-2 border-[#1a1a1a] font-bold text-center bg-stone-100 hover:bg-stone-200 text-stone-800 cursor-pointer"
                  >
                    $0.00
                  </button>
                </div>
              </div>

              {/* Simulation / Preview Box */}
              {(() => {
                const parsedVal = Math.max(0, parseFloat(inputStartingCash) || 0);
                const simExpected = addCents(parsedVal, activeShift.cashSales);
                return (
                  <div className="p-3 bg-white border-2 border-[#1a1a1a] text-xs font-mono-code space-y-1">
                    <div className="flex justify-between text-stone-600">
                      <span>Fondo inicial a registrar:</span>
                      <span className="font-bold text-[#1a1a1a]">{formatCurrency(parsedVal)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Ventas en efectivo acumuladas:</span>
                      <span className="font-bold text-green-700">{formatCurrency(activeShift.cashSales)}</span>
                    </div>
                    <div className="flex justify-between border-t border-stone-200 pt-1 font-bold text-[#1a1a1a]">
                      <span>Nuevo Efectivo Esperado:</span>
                      <span className="text-[#ffcc00] bg-[#1a1a1a] px-1">{formatCurrency(simExpected)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setIsStartingCashModalOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-stone-200 hover:bg-stone-300 border-2 border-[#1a1a1a] font-display font-bold text-xs brutal-btn cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-starting-cash"
                  type="submit"
                  disabled={!!startingCashError}
                  className="flex-1 py-2.5 bg-[#22c55e] hover:bg-green-600 disabled:opacity-50 text-white font-display font-black text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Fondo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Power, Printer, Check, Copy, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { CashShift, StoreSettings } from '../types/pos';
import { soundFx } from '../utils/audio';
import { formatCurrency, generateShiftCutReceiptText } from '../utils/escpos';

interface ShiftCutModalProps {
  shift: CashShift;
  settings: StoreSettings;
  isOpen: boolean;
  cutType: 'X' | 'Z';
  onClose: () => void;
  onConfirmCloseShift?: (nextStartingCash: number) => void;
}

export const ShiftCutModal: React.FC<ShiftCutModalProps> = ({
  shift,
  settings,
  isOpen,
  cutType,
  onClose,
  onConfirmCloseShift,
}) => {
  const [copied, setCopied] = useState(false);
  const [nextStartingCash, setNextStartingCash] = useState<string>(
    settings.defaultStartingCash !== undefined ? settings.defaultStartingCash.toString() : '0'
  );
  const rawReceipt = generateShiftCutReceiptText(shift, settings, cutType);

  const handlePrint = () => {
    soundFx.playKeyClick();
    window.print();
  };

  const handleCopy = () => {
    soundFx.playKeyClick();
    navigator.clipboard.writeText(rawReceipt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="shift-cut-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150"
    >
      <div 
        id="shift-cut-modal"
        className="w-full max-w-lg bg-[#f5f0e8] border-4 border-[#1a1a1a] brutal-shadow-lg flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className={`p-4 text-white border-b-3 border-[#1a1a1a] flex justify-between items-center ${
          cutType === 'Z' ? 'bg-[#ef4444]' : 'bg-[#1a1a1a]'
        }`}>
          <div className="flex items-center gap-2">
            <Power className="w-6 h-6 text-[#ffcc00]" />
            <div>
              <h3 className="font-display font-black text-lg text-white leading-none">
                {cutType === 'Z' ? 'CORTE Z (CIERRE DEFINITIVO)' : 'CORTE X (INFORME PARCIAL)'}
              </h3>
              <span className="font-mono-code text-xs text-white/80">
                Turno #{shift.shiftNumber} · {shift.cashierName}
              </span>
            </div>
          </div>
        </div>

        {/* Paper visualizer */}
        <div className="p-4 overflow-y-auto bg-stone-200 flex justify-center">
          <div className="bg-white border-2 border-[#1a1a1a] p-4 w-full max-w-sm font-mono-code text-xs text-[#1a1a1a] brutal-shadow-sm">
            <div className="text-center mb-3">
              <h4 className="font-bold text-sm uppercase">{settings.commercialName}</h4>
              <p className="text-[11px] font-bold text-stone-700">*** REPORTE CORTE {cutType} DE CAJA ***</p>
              <p className="text-[10px] text-stone-500">RFC: {settings.taxId}</p>
            </div>

            <div className="border-t border-b border-dashed border-stone-800 py-1.5 mb-2 text-[11px]">
              <div className="flex justify-between">
                <span>TURNO: #{shift.shiftNumber}</span>
                <span>ESTADO: {shift.status}</span>
              </div>
              <div className="flex justify-between">
                <span>APERTURA:</span>
                <span>{shift.openedAt}</span>
              </div>
              <div className="flex justify-between">
                <span>CIERRE:</span>
                <span>{shift.closedAt || 'EN PROCESO'}</span>
              </div>
            </div>

            {/* Incomes Breakdown */}
            <div className="space-y-1 mb-2 text-[11px]">
              <div className="flex justify-between text-stone-700">
                <span>Fondo Inicial de Caja:</span>
                <span>{formatCurrency(shift.startingCash)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>(+) Ventas Efectivo:</span>
                <span>{formatCurrency(shift.cashSales)}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>(+) Ventas Tarjeta:</span>
                <span>{formatCurrency(shift.cardSales)}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>(+) Ventas Transferencia:</span>
                <span>{formatCurrency(shift.transferSales)}</span>
              </div>
              <div className="flex justify-between font-black border-t border-stone-400 pt-1 text-stone-900">
                <span>TOTAL VENTAS ({shift.salesCount} tickets):</span>
                <span>{formatCurrency(shift.totalSales)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-stone-600 pl-2">
                <span>· Desglose Granel:</span>
                <span>{formatCurrency(shift.bulkSalesTotal)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-stone-600 pl-2">
                <span>· Desglose Unidades (Pz):</span>
                <span>{formatCurrency(shift.unitSalesTotal)}</span>
              </div>
            </div>

            {/* Cash count and balance */}
            <div className="border-t-2 border-b-2 border-stone-900 py-2 my-2 bg-stone-50 p-2">
              <div className="flex justify-between font-bold text-[11px]">
                <span>EFECTIVO ESPERADO:</span>
                <span>{formatCurrency(shift.expectedCash)}</span>
              </div>
              <div className="flex justify-between font-bold text-[11px]">
                <span>EFECTIVO CONTADO:</span>
                <span>{formatCurrency(shift.actualCashCounted)}</span>
              </div>
              
              <div className="flex justify-between font-black text-sm pt-1 mt-1 border-t border-dashed border-stone-400">
                <span>DIFERENCIA:</span>
                <span className={shift.difference === 0 ? 'text-green-700' : shift.difference > 0 ? 'text-blue-700' : 'text-red-600'}>
                  {shift.difference > 0 ? `+${formatCurrency(shift.difference)}` : formatCurrency(shift.difference)}
                </span>
              </div>

              {/* Status Badge */}
              <div className="mt-2 text-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-bold text-xs border ${
                  shift.balanceStatus === 'EXACT'
                    ? 'bg-green-100 text-green-800 border-green-800'
                    : shift.balanceStatus === 'SURPLUS'
                    ? 'bg-blue-100 text-blue-800 border-blue-800'
                    : 'bg-red-100 text-red-800 border-red-800'
                }`}>
                  {shift.balanceStatus === 'EXACT' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {shift.balanceStatus === 'SURPLUS' && <AlertCircle className="w-3.5 h-3.5" />}
                  {shift.balanceStatus === 'SHORTAGE' && <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>
                    {shift.balanceStatus === 'EXACT'
                      ? 'CORTE EXACTO (0.00)'
                      : shift.balanceStatus === 'SURPLUS'
                      ? `SOBRANTE (+${formatCurrency(shift.difference)})`
                      : `FALTANTE (${formatCurrency(shift.difference)})`}
                  </span>
                </span>
              </div>
            </div>

            {/* Signature lines */}
            <div className="mt-4 pt-2 text-[10px] space-y-4">
              <div className="border-t border-stone-800 pt-1 text-center">
                Firma de Cajero: {shift.cashierName}
              </div>
              <div className="border-t border-stone-800 pt-1 text-center">
                Firma de Supervisor / Gerente
              </div>
            </div>
          </div>
        </div>

        {/* Corte Z: Input for starting cash for the next shift */}
        {cutType === 'Z' && onConfirmCloseShift && (
          <div className="bg-[#ffcc00]/20 border-t-2 border-b-2 border-[#1a1a1a] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="font-display font-black text-xs text-[#1a1a1a] uppercase block">
                Monto que se deja para el siguiente turno ($ MXN):
              </label>
              <span className="text-[10px] font-mono-code text-stone-600 block">
                Todos los valores positivos incluyendo $0 son válidos.
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative w-28">
                <span className="absolute left-2 top-1.5 font-mono-code font-bold text-xs text-stone-700">$</span>
                <input
                  id="input-next-shift-starting-cash"
                  type="number"
                  min="0"
                  step="0.01"
                  value={nextStartingCash}
                  onChange={(e) => setNextStartingCash(e.target.value)}
                  className="w-full pl-5 pr-2 py-1 font-mono-code font-black text-xs bg-white border-2 border-[#1a1a1a] brutal-input"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-1">
                {[0, 100, 200, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setNextStartingCash(val.toString());
                    }}
                    className={`px-1.5 py-1 text-[10px] font-mono-code font-bold border border-[#1a1a1a] cursor-pointer ${
                      parseFloat(nextStartingCash) === val ? 'bg-[#1a1a1a] text-[#ffcc00]' : 'bg-white hover:bg-stone-100'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="bg-[#f5f0e8] p-4 border-t-2 border-[#1a1a1a] flex flex-col sm:flex-row gap-2 justify-between">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="py-2.5 px-3.5 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] font-display font-black text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Corte</span>
            </button>

            <button
              onClick={handleCopy}
              className="py-2.5 px-3 bg-white hover:bg-stone-100 text-[#1a1a1a] font-display font-bold text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center gap-1"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="py-2.5 px-4 bg-white hover:bg-stone-100 text-[#1a1a1a] font-display font-bold text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer"
            >
              Cerrar Vista
            </button>

            {cutType === 'Z' && onConfirmCloseShift && (
              <button
                onClick={() => {
                  soundFx.playCashRegisterChime();
                  const parsed = parseFloat(nextStartingCash);
                  const validStarting = isNaN(parsed) || parsed < 0 ? 0 : Number(parsed.toFixed(2));
                  onConfirmCloseShift(validStarting);
                }}
                className="py-2.5 px-4 bg-[#ef4444] hover:bg-red-600 text-white font-display font-black text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center gap-1.5"
              >
                <Power className="w-4 h-4" />
                <span>Confirmar Cierre de Turno</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

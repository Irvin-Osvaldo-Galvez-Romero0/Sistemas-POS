import React, { useState, useEffect } from 'react';
import { Printer, Check, Copy, CheckCircle2, FileText, Code2 } from 'lucide-react';
import { SaleTransaction, StoreSettings } from '../types/pos';
import { soundFx } from '../utils/audio';
import { formatCurrency, generateSaleReceiptText } from '../utils/escpos';
import { Barcode } from './Barcode';

interface TicketModalProps {
  sale: SaleTransaction | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onNewSale: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  sale,
  settings,
  isOpen,
  onClose,
  onNewSale,
}) => {
  const [activeTab, setActiveTab] = useState<'VISUAL' | 'ESCPOS'>('VISUAL');
  const [copied, setCopied] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(settings.printerPaperSize || '58mm');

  useEffect(() => {
    if (isOpen) {
      setPaperWidth(settings.printerPaperSize || '58mm');
    }
  }, [isOpen, settings.printerPaperSize]);

  const rawReceiptText = sale
    ? generateSaleReceiptText(sale, { ...settings, printerPaperSize: paperWidth })
    : '';

  const handlePrint = () => {
    soundFx.playKeyClick();
    window.print();
  };

  const handleCopyEscPos = () => {
    soundFx.playKeyClick();
    navigator.clipboard.writeText(rawReceiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onNewSale();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewSale, isOpen]);

  if (!isOpen || !sale) return null;

  return (
    <div 
      id="ticket-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150"
    >
      <div 
        id="ticket-modal-container"
        className="w-full max-w-lg bg-[#f5f0e8] border-4 border-[#1a1a1a] brutal-shadow-lg flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="bg-[#1a1a1a] text-white p-3.5 flex justify-between items-center border-b-3 border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#22c55e] border-2 border-white flex items-center justify-center text-white font-bold text-xs">
              ✓
            </div>
            <div>
              <h3 className="font-display font-black text-base text-[#ffcc00] leading-none">
                VENTA COMPLETADA
              </h3>
              <span className="font-mono-code text-[11px] text-white/70">
                Folio #{sale.folio}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab(activeTab === 'VISUAL' ? 'ESCPOS' : 'VISUAL')}
              className="py-1 px-2.5 bg-stone-800 hover:bg-stone-700 text-xs font-mono-code text-[#ffcc00] border border-stone-600 flex items-center gap-1 cursor-pointer"
            >
              {activeTab === 'VISUAL' ? <Code2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{activeTab === 'VISUAL' ? 'Ver ESC/POS' : 'Ver Ticket'}</span>
            </button>
          </div>
        </div>

        {/* Modal Content / Paper Container */}
        <div className="p-4 overflow-y-auto bg-stone-200/70 flex justify-center">
          {activeTab === 'VISUAL' ? (
            /* Thermal Paper Visual Receipt */
            <div 
              id="printable-ticket"
              className={`bg-white border-2 border-[#1a1a1a] p-4 font-mono-code text-xs text-[#1a1a1a] brutal-shadow-sm transition-all ${
                paperWidth === '80mm' ? 'w-full max-w-sm' : 'w-full max-w-[280px]'
              }`}
            >
              {/* Paper Top Jagged/Dashed Notch */}
              <div className="text-center font-mono-code text-[10px] text-stone-400 mb-2 border-b border-dashed border-stone-400 pb-1">
                --- INICIO DE TICKET TÉRMICO ---
              </div>

              {/* Store Metadata */}
              <div className="text-center mb-3">
                <h4 className="font-bold text-sm tracking-tight uppercase">
                  {settings.commercialName}
                </h4>
                <p className="text-[10px] text-stone-600 uppercase font-sans">
                  {settings.businessName}
                </p>
                <p className="text-[10px] font-mono-code">RFC: {settings.taxId}</p>
                <p className="text-[10px] text-stone-600 leading-tight">
                  {settings.address}
                </p>
                <p className="text-[10px] text-stone-600">{settings.phone}</p>
              </div>

              {/* Sale Info */}
              <div className="border-t border-b border-dashed border-stone-800 py-1.5 mb-2 text-[11px]">
                <div className="flex justify-between">
                  <span>FOLIO: #{sale.folio}</span>
                  <span>{sale.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAJERO: {sale.cashier.split(' ')[0]}</span>
                  <span className="font-bold">PAGO: {sale.paymentMethod}</span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border-b border-dashed border-stone-800 pb-2 mb-2">
                <div className="grid grid-cols-12 font-bold text-[10px] border-b border-stone-300 pb-0.5 mb-1">
                  <span className="col-span-8">DESCRIPCIÓN</span>
                  <span className="col-span-4 text-right">TOTAL</span>
                </div>
                {sale.items.map((item) => (
                  <div key={item.id} className="py-0.5 text-[11px]">
                    <div className="font-bold truncate">{item.name}</div>
                    <div className="flex justify-between text-[10px] text-stone-600">
                      <span>
                        {item.unitType === 'kg' 
                          ? `${item.quantity.toFixed(3)} kg x ${formatCurrency(item.unitPrice)}`
                          : `${item.quantity} pz x ${formatCurrency(item.unitPrice)}`}
                      </span>
                      <span className="font-bold text-[#1a1a1a]">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-0.5 text-[11px] mb-3">
                <div className="flex justify-between text-stone-700">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-[#ef4444]">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                {sale.tax > 0 && (
                  <div className="flex justify-between text-stone-700">
                    <span>IVA ({settings.taxRatePercent !== undefined ? settings.taxRatePercent : 16}%):</span>
                    <span>{formatCurrency(sale.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t-2 border-b-2 border-stone-900 py-1 my-1">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>

                {sale.paymentMethod === 'EFECTIVO' && (
                  <>
                    <div className="flex justify-between text-stone-700">
                      <span>Recibido:</span>
                      <span>{formatCurrency(sale.amountTendered)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-stone-900">
                      <span>Cambio entregado:</span>
                      <span>{formatCurrency(sale.changeDue)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Receipt Footer & Barcode Simulation */}
              <div className="text-center text-[10px] text-stone-700 space-y-2 pt-2 border-t border-dashed border-stone-400">
                <p className="whitespace-pre-line leading-tight">
                  {settings.ticketFooter}
                </p>
                {/* Real Code 128 Ticket Barcode */}
                <div className="pt-2 flex flex-col items-center w-full">
                  <Barcode value={sale.folio} height={38} showText={true} />
                </div>
              </div>
            </div>
          ) : (
            /* ESC/POS Raw Command Feed View */
            <div className="w-full bg-[#1a1a1a] text-[#22c55e] p-3 font-mono-code text-[11px] border-2 border-[#1a1a1a] overflow-x-auto whitespace-pre leading-relaxed">
              {rawReceiptText}
            </div>
          )}
        </div>

        {/* Paper Size selector bar */}
        <div className="bg-white border-t-2 border-b-2 border-[#1a1a1a] px-4 py-2 flex justify-between items-center text-xs">
          <span className="font-display font-bold text-[#1a1a1a]">
            Ancho de cabezal térmico:
          </span>
          <div className="flex gap-2">
            {(['58mm', '80mm'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setPaperWidth(w)}
                className={`px-2 py-0.5 font-mono-code text-xs font-bold border-2 border-[#1a1a1a] cursor-pointer ${
                  paperWidth === w ? 'bg-[#ffcc00]' : 'bg-stone-100 hover:bg-stone-200'
                }`}
              >
                {w} {w === '58mm' ? '(Predet.)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="bg-[#f5f0e8] p-4 flex flex-col sm:flex-row gap-2.5 justify-between">
          <div className="flex gap-2">
            <button
              id="btn-print-ticket"
              onClick={handlePrint}
              className="py-2.5 px-4 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] font-display font-black text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket (Ctrl+P)</span>
            </button>

            {activeTab === 'ESCPOS' && (
              <button
                onClick={handleCopyEscPos}
                className="py-2.5 px-3 bg-white hover:bg-stone-100 text-[#1a1a1a] font-display font-bold text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center gap-1"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado' : 'Copiar Raw'}</span>
              </button>
            )}
          </div>

          <button
            id="btn-new-sale-done"
            onClick={() => {
              soundFx.playKeyClick();
              onNewSale();
            }}
            className="py-2.5 px-5 bg-[#22c55e] hover:bg-green-600 text-white font-display font-black text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Nueva Venta (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

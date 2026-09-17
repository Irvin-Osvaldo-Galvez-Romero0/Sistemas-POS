import { SaleTransaction, CashShift, StoreSettings } from '../types/pos';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatWeight = (kg: number): string => {
  return `${kg.toFixed(3)} kg`;
};

export const generateSaleReceiptText = (
  sale: SaleTransaction,
  settings: StoreSettings
): string => {
  const width = settings.printerPaperSize === '80mm' ? 42 : 32;
  const line = '='.repeat(width);
  const dashed = '-'.repeat(width);

  const center = (text: string): string => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const row = (left: string, right: string): string => {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  let out = '';
  out += center(settings.businessName) + '\n';
  out += center(settings.commercialName) + '\n';
  out += center(`RFC: ${settings.taxId}`) + '\n';
  out += center(settings.address) + '\n';
  out += center(settings.cityState) + '\n';
  out += center(settings.phone) + '\n';
  out += line + '\n';
  out += row(`FOLIO: #${sale.folio}`, `FECHA: ${sale.timestamp}`) + '\n';
  out += `CAJERO: ${sale.cashier}\n`;
  out += `PAGO: ${sale.paymentMethod}\n`;
  out += dashed + '\n';
  out += row('CANT/DESCRIPCION', 'IMPORTE') + '\n';
  out += dashed + '\n';

  sale.items.forEach((item) => {
    const qtyStr = item.unitType === 'kg' ? `${item.quantity.toFixed(3)}kg @ $${item.unitPrice.toFixed(2)}` : `${item.quantity} pz @ $${item.unitPrice.toFixed(2)}`;
    out += `${item.name.substring(0, width)}\n`;
    out += row(`  ${qtyStr}`, formatCurrency(item.total)) + '\n';
  });

  out += dashed + '\n';
  out += row('SUBTOTAL:', formatCurrency(sale.subtotal)) + '\n';
  if (sale.discount > 0) {
    out += row('DESCUENTO:', `-${formatCurrency(sale.discount)}`) + '\n';
  }
  if (sale.tax > 0) {
    const taxRateDisplay = settings.taxRatePercent !== undefined ? settings.taxRatePercent : 16;
    out += row(`IVA (${taxRateDisplay}%):`, formatCurrency(sale.tax)) + '\n';
  }
  out += line + '\n';
  out += row('TOTAL A PAGAR:', formatCurrency(sale.total)) + '\n';
  out += line + '\n';
  
  if (sale.paymentMethod === 'EFECTIVO') {
    out += row('RECIBIDO (EFECTIVO):', formatCurrency(sale.amountTendered)) + '\n';
    out += row('CAMBIO:', formatCurrency(sale.changeDue)) + '\n';
  }

  out += '\n' + center(settings.ticketFooter.replace(/\n/g, '\n' + ' '.repeat(Math.floor(width/6)))) + '\n';
  out += center('||| || ||||| |||| || ||||| |||') + '\n';
  out += center(`*${sale.folio}*`) + '\n';
  out += '\n[ESC/POS: GS V 66 0 (PAPER CUT)]\n';

  return out;
};

export const generateShiftCutReceiptText = (
  shift: CashShift,
  settings: StoreSettings,
  type: 'X' | 'Z' = 'Z'
): string => {
  const width = settings.printerPaperSize === '80mm' ? 42 : 32;
  const line = '='.repeat(width);
  const dashed = '-'.repeat(width);

  const center = (text: string): string => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const row = (left: string, right: string): string => {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  let out = '';
  out += center(settings.commercialName) + '\n';
  out += center(`*** INFORME DE CORTE ${type} DE CAJA ***`) + '\n';
  out += line + '\n';
  out += `TURNO: #${shift.shiftNumber} | CAJERO: ${shift.cashierName}\n`;
  out += `APERTURA: ${shift.openedAt}\n`;
  out += `CIERRE  : ${shift.closedAt || 'EN CURSO (CORTE PARCIAL X)'}\n`;
  out += dashed + '\n';
  out += center('--- DESGLOSE DE INGRESOS ---') + '\n';
  out += row('FONDO INICIAL:', formatCurrency(shift.startingCash)) + '\n';
  out += row('VENTAS EN EFECTIVO:', formatCurrency(shift.cashSales)) + '\n';
  out += row('VENTAS CON TARJETA:', formatCurrency(shift.cardSales)) + '\n';
  out += row('VENTAS TRANSFERENCIA:', formatCurrency(shift.transferSales)) + '\n';
  out += dashed + '\n';
  out += row('TOTAL VENTAS DEL TURNO:', formatCurrency(shift.totalSales)) + '\n';
  out += row('No. DE TRANSACCIONES:', `${shift.salesCount} tickets`) + '\n';
  out += row('VENTAS POR PESO (GRANEL):', formatCurrency(shift.bulkSalesTotal)) + '\n';
  out += row('VENTAS POR UNIDAD (PZ):', formatCurrency(shift.unitSalesTotal)) + '\n';
  out += line + '\n';
  out += center('--- ARQUEO FISICO DE EFECTIVO ---') + '\n';
  out += row('EFECTIVO ESPERADO EN CAJA:', formatCurrency(shift.expectedCash)) + '\n';
  out += row('EFECTIVO CONTADO FISICO:', formatCurrency(shift.actualCashCounted)) + '\n';
  
  const diffSign = shift.difference > 0 ? '+' : '';
  out += row('DIFERENCIA / BALANCE:', `${diffSign}${formatCurrency(shift.difference)}`) + '\n';
  out += center(`ESTADO: [ ${shift.balanceStatus === 'EXACT' ? 'CORTE EXACTO' : shift.balanceStatus === 'SURPLUS' ? 'SOBRANTE DE CAJA' : 'FALTANTE DE CAJA'} ]`) + '\n';
  out += line + '\n';
  out += '\nFIRMA DE CAJERO: _____________________\n';
  out += 'FIRMA DE SUPERVISOR: _________________\n';
  out += '\n[ESC/POS: GS V 66 0 (PAPER CUT)]\n';

  return out;
};

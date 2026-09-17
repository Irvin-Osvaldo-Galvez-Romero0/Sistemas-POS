import React, { useState, useEffect } from 'react';
import { X, Check, QrCode, Percent, Sparkles, Scale, Package } from 'lucide-react';
import { Product, ProductCategory, UnitType } from '../types/pos';
import { soundFx } from '../utils/audio';
import { Barcode } from './Barcode';

interface ProductFormModalProps {
  productToEdit: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  productToEdit,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Product>({
    id: `prod-${Date.now().toString().slice(-4)}`,
    code: '',
    name: '',
    category: 'GRANEL',
    unitType: 'kg',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 5,
    shrinkagePercent: 0,
    isFrequent: false,
    emoji: '📦',
  });

  const [showQRPreview, setShowQRPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (productToEdit) {
      setFormData(productToEdit);
    } else {
      // Auto-generate SKU
      const randomSKU = '750' + Math.floor(1000 + Math.random() * 9000);
      setFormData({
        id: `prod-${Date.now().toString().slice(-4)}`,
        code: randomSKU,
        name: '',
        category: 'ABARROTES',
        unitType: 'pz',
        price: 0,
        cost: 0,
        stock: 10,
        minStock: 5,
        shrinkagePercent: 0,
        isFrequent: false,
        emoji: '📦',
      });
    }
    setShowQRPreview(false);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || formData.price <= 0) return;

    soundFx.playScanBeep();
    onSave(formData);
  };

  const categories: { id: ProductCategory; label: string }[] = [
    { id: 'GRANEL', label: 'Granel & Semillas' },
    { id: 'ABARROTES', label: 'Abarrotes' },
    { id: 'LACTEOS', label: 'Lácteos' },
    { id: 'BEBIDAS', label: 'Bebidas' },
    { id: 'LIMPIEZA', label: 'Limpieza' },
  ];

  return (
    <div 
      id="product-form-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 select-none animate-in fade-in duration-150"
    >
      <div 
        id="product-form-container"
        className="w-full max-w-2xl bg-[#f5f0e8] border-3 sm:border-4 border-[#1a1a1a] brutal-shadow-lg flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#1a1a1a] text-white p-3.5 sm:p-4 flex justify-between items-center border-b-3 border-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#ffcc00] border border-white flex items-center justify-center text-lg shrink-0">
              {formData.emoji || '📦'}
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-white leading-none">
                {productToEdit ? 'EDITAR PRODUCTO' : 'ALTA DE NUEVO PRODUCTO'}
              </h3>
              <span className="font-mono-code text-[11px] sm:text-xs text-white/70">
                Catálogo Central de Inventario
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playKeyClick();
              onClose();
            }}
            className="p-1.5 bg-white hover:bg-[#ef4444] text-[#1a1a1a] hover:text-white border-2 border-[#1a1a1a] cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable with dedicated scrollbar) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain inventory-scrollbar touch-pan-y">
          {/* Unit Type Selection Bar */}
          <div className="bg-white border-2 border-[#1a1a1a] p-3 brutal-shadow-sm">
            <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-2">
              Tipo de Despacho y Venta:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setFormData({ ...formData, unitType: 'kg', category: 'GRANEL', emoji: '⚖️' });
                }}
                className={`py-3 px-3 border-2 border-[#1a1a1a] flex items-center justify-center gap-2 font-display font-bold text-sm cursor-pointer brutal-btn ${
                  formData.unitType === 'kg'
                    ? 'bg-[#ffcc00] text-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a]'
                    : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-stone-100'
                }`}
              >
                <Scale className="w-5 h-5 text-[#1a1a1a]" />
                <span>VENTA A GRANEL (POR KG)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setFormData({ ...formData, unitType: 'pz', category: 'ABARROTES', emoji: '📦' });
                }}
                className={`py-3 px-3 border-2 border-[#1a1a1a] flex items-center justify-center gap-2 font-display font-bold text-sm cursor-pointer brutal-btn ${
                  formData.unitType === 'pz'
                    ? 'bg-[#38bdf8] text-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a]'
                    : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-stone-100'
                }`}
              >
                <Package className="w-5 h-5 text-[#1a1a1a]" />
                <span>VENTA POR PIEZA (UNIDAD)</span>
              </button>
            </div>
          </div>

          {/* Basic Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code / SKU */}
            <div>
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Código de Barras / SKU *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ej. 7501001..."
                  className="w-full bg-white p-2.5 font-mono-code font-bold text-sm brutal-input"
                />
                <button
                  type="button"
                  onClick={() => setShowQRPreview(!showQRPreview)}
                  className="px-3 bg-white hover:bg-[#ffcc00] border-2 border-[#1a1a1a] brutal-btn flex items-center gap-1 cursor-pointer"
                  title="Ver QR / Código de Barras"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Categoría de Producto
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                className="w-full bg-white p-2.5 font-display font-bold text-sm brutal-input cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Name & Emoji Icon */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-10">
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Frijol Flor de Mayo Selección..."
                className="w-full bg-white p-2.5 font-display font-bold text-sm brutal-input"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Ícono
              </label>
              <input
                type="text"
                maxLength={2}
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                className="w-full bg-white p-2.5 text-center text-lg font-bold brutal-input"
              />
            </div>
          </div>

          {/* Financial & Stock Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Sale Price */}
            <div>
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Precio Venta ({formData.unitType === 'kg' ? '$/kg' : '$/pz'}) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white p-2.5 font-mono-code font-bold text-sm brutal-input"
                placeholder="0.00"
              />
            </div>

            {/* Cost */}
            <div>
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Costo Compra
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white p-2.5 font-mono-code font-bold text-sm brutal-input"
                placeholder="0.00"
              />
            </div>

            {/* Stock Actual */}
            <div>
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Stock Actual ({formData.unitType})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white p-2.5 font-mono-code font-bold text-sm brutal-input"
              />
            </div>

            {/* Stock Min */}
            <div>
              <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
                Alerta Resurtir
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 1 })}
                className="w-full bg-white p-2.5 font-mono-code font-bold text-sm brutal-input"
              />
            </div>
          </div>

          {/* Operational Shrinkage (Merma Operativa) Slider */}
          <div className="bg-amber-50/70 border-2 border-amber-900/40 p-3 brutal-shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-display font-bold uppercase text-[#1a1a1a] flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-orange-600" />
                Merma Operativa Estimada (% Desperdicio / Humedad / Manipulación)
              </span>
              <span className="font-mono-code font-black text-sm text-orange-700 bg-white px-2 py-0.5 border border-orange-700">
                {formData.shrinkagePercent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={formData.shrinkagePercent}
              onChange={(e) => setFormData({ ...formData, shrinkagePercent: parseFloat(e.target.value) })}
              className="w-full h-2 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-[#1a1a1a]"
            />
            <div className="flex justify-between text-[10px] font-mono-code text-stone-600 mt-1">
              <span>0% (Sin merma)</span>
              <span>Recomendado granos/semillas (3% - 8%)</span>
              <span>15% (Alta perecedero)</span>
            </div>
          </div>

          {/* Frequent / Quick Suggestion Toggle */}
          <div className="flex items-center gap-2 p-2 bg-white border-2 border-[#1a1a1a]">
            <input
              type="checkbox"
              id="isFrequentCheck"
              checked={formData.isFrequent}
              onChange={(e) => setFormData({ ...formData, isFrequent: e.target.checked })}
              className="w-5 h-5 accent-[#1a1a1a] cursor-pointer"
            />
            <label htmlFor="isFrequentCheck" className="text-xs font-display font-bold text-[#1a1a1a] cursor-pointer">
              Fijar en la cuadrícula de productos frecuentes de la pantalla de Ventas
            </label>
          </div>

          {/* QR / Barcode Label Preview Box */}
          {showQRPreview && (
            <div className="bg-white border-3 border-[#1a1a1a] p-4 text-center animate-in fade-in duration-100">
              <div className="text-xs font-display font-bold uppercase mb-2">
                Etiqueta Térmica de Góndola / Báscula
              </div>
              <div className="inline-block p-4 border-2 border-dashed border-stone-800 bg-stone-50">
                <div className="font-display font-bold text-sm">{formData.name || 'NOMBRE PRODUCTO'}</div>
                <div className="font-mono-code text-xs text-stone-600">
                  {formData.unitType === 'kg' ? 'PRECIO X KILO:' : 'PRECIO UNITARIO:'}
                </div>
                <div className="font-display font-black text-2xl text-[#1a1a1a] my-1">
                  ${formData.price.toFixed(2)} {formData.unitType === 'kg' ? '/ kg' : 'c/u'}
                </div>
                {/* Professional SVG Code 128 Barcode */}
                <div className="py-2 px-3 bg-white border border-stone-300 my-2 rounded-none">
                  <Barcode value={formData.code || '7501001'} height={46} showText={true} />
                </div>
              </div>
            </div>
          )}

          {/* Actions (Sticky footer full-width) */}
          <div className="flex justify-end gap-3 pt-3 pb-1 sticky -bottom-4 sm:-bottom-5 bg-[#f5f0e8] px-4 sm:px-5 -mx-4 sm:-mx-5 border-t-2 border-[#1a1a1a] z-10 shadow-[0_-3px_5px_rgba(0,0,0,0.06)]">
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="py-2.5 px-4 bg-white hover:bg-stone-100 text-[#1a1a1a] font-display font-bold text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="py-2.5 px-6 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] font-display font-black text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Producto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

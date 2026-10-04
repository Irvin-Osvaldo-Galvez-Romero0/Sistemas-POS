import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  Percent, 
  DollarSign, 
  QrCode, 
  ArrowUpDown 
} from 'lucide-react';
import { Product, ProductCategory, CashierUser } from '../types/pos';
import { soundFx } from '../utils/audio';
import { formatCurrency } from '../utils/escpos';
import { Barcode } from '../components/Barcode';

interface InventarioViewProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onQuickAdjustStock: (productId: string, newStock: number) => void;
  onClearAllProducts?: () => void;
  currentUser?: CashierUser;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onQuickAdjustStock,
  onClearAllProducts,
  currentUser,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('TODOS');
  const [filterStockStatus, setFilterStockStatus] = useState<'ALL' | 'LOW' | 'OPTIMAL' | 'GRANEL'>('ALL');
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);

  // Manage label-modal-open class on body for clean print isolation
  useEffect(() => {
    if (selectedProductForQR) {
      document.body.classList.add('label-modal-open');
      return () => {
        document.body.classList.remove('label-modal-open');
      };
    }
  }, [selectedProductForQR]);

  // Dynamic available categories from products catalog
  const availableCategories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    return ['TODOS', ...list];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === 'TODOS' || p.category === filterCategory;
      
      let matchStock = true;
      if (filterStockStatus === 'LOW') matchStock = p.stock <= p.minStock;
      else if (filterStockStatus === 'OPTIMAL') matchStock = p.stock > p.minStock;
      else if (filterStockStatus === 'GRANEL') matchStock = p.unitType === 'kg';

      return matchSearch && matchCat && matchStock;
    });
  }, [products, searchTerm, filterCategory, filterStockStatus]);

  // Virtualized Pagination Window for High-Scale Inventories (50,000+ SKUs at 60 FPS)
  const [displayLimit, setDisplayLimit] = useState(50);

  useEffect(() => {
    setDisplayLimit(50);
  }, [searchTerm, filterCategory, filterStockStatus]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayLimit);
  }, [filteredProducts, displayLimit]);

  // Overall Inventory Metrics (Without cost valuation)
  const metrics = useMemo(() => {
    const totalSkus = products.length;
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    const totalGranelKg = products
      .filter((p) => p.unitType === 'kg')
      .reduce((acc, p) => acc + p.stock, 0);
    const totalPiezas = products
      .filter((p) => p.unitType === 'pz')
      .reduce((acc, p) => acc + p.stock, 0);
    const avgShrinkage = (
      products.reduce((acc, p) => acc + p.shrinkagePercent, 0) / (products.length || 1)
    ).toFixed(1);

    return { totalSkus, lowStockCount, totalGranelKg, totalPiezas, avgShrinkage };
  }, [products]);

  return (
    <div id="inventario-view-container" className="flex-1 flex flex-col min-h-screen md:h-screen overflow-y-auto bg-[#f5f0e8] p-3 sm:p-4 md:p-6 animate-in fade-in duration-150 select-none overscroll-contain touch-pan-y">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#1a1a1a] text-[#ffcc00] font-mono-code font-bold text-xs px-2 py-0.5">
              CATÁLOGO
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#1a1a1a]">
              Control de Inventario & Mermas
            </h1>
          </div>
          <p className="text-xs font-sans text-stone-600 mt-0.5">
            Gestión de stock, precios por kilo/pieza, mermas operativas y etiquetado
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && products.length > 0 && onClearAllProducts && (
            <button
              id="btn-clear-all-products"
              onClick={() => {
                if (confirm('¿Está seguro de que desea eliminar TODOS los productos de la base de datos? Esta acción dejará el inventario completamente vacío.')) {
                  soundFx.playKeyClick();
                  onClearAllProducts();
                }
              }}
              className="py-2 sm:py-2.5 px-3 sm:px-4 bg-red-50 hover:bg-[#ef4444] hover:text-white text-red-700 font-display font-bold text-xs sm:text-sm border-2 sm:border-2.5 border-[#1a1a1a] brutal-shadow flex items-center gap-2 cursor-pointer transition-colors active:translate-x-[2px] active:translate-y-[2px]"
              title="Eliminar todos los productos de la base de datos"
            >
              <Trash2 className="w-4 h-4" />
              <span>Vaciar Inventario</span>
            </button>
          )}

          <button
            id="btn-add-product"
            onClick={() => {
              soundFx.playKeyClick();
              onAddProduct();
            }}
            className="py-2 sm:py-2.5 px-4 sm:px-5 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] font-display font-black text-xs sm:text-sm border-2 sm:border-2.5 border-[#1a1a1a] brutal-shadow flex items-center gap-2 cursor-pointer active:translate-x-[2px] active:translate-y-[2px]"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* 4 Neo-Brutalist Metric Cards (No Cost metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4 shrink-0">
        {/* Metric 1: Total Catálogo */}
        <div className="bg-white border-2.5 border-[#1a1a1a] p-3 brutal-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono-code uppercase text-stone-500 font-bold">
              Total Catálogo
            </span>
            <Package className="w-4 h-4 text-[#1a1a1a]" />
          </div>
          <div className="text-2xl font-display font-black text-[#1a1a1a] mt-1">
            {metrics.totalSkus} <span className="text-xs font-normal text-stone-600">SKUs</span>
          </div>
          <div className="text-[11px] font-mono-code text-stone-600 mt-0.5">
            Productos registrados
          </div>
        </div>

        {/* Metric 2: Stock Granel & Piezas */}
        <div className="bg-white border-2.5 border-[#1a1a1a] p-3 brutal-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono-code uppercase text-stone-500 font-bold">
              Existencias Físicas
            </span>
            <Scale className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="text-2xl font-display font-black text-[#1a1a1a] mt-1">
            {metrics.totalGranelKg.toFixed(1)} <span className="text-xs font-normal text-stone-600">kg</span>
          </div>
          <div className="text-[11px] font-mono-code text-stone-600 mt-0.5">
            + {metrics.totalPiezas} piezas en estante
          </div>
        </div>

        {/* Metric 3: Resurtir */}
        <div className="bg-white border-2.5 border-[#1a1a1a] p-3 brutal-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono-code uppercase text-stone-500 font-bold">
              Alertas de Resurtir
            </span>
            <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
          </div>
          <div className="text-2xl font-display font-black text-[#ef4444] mt-1">
            {metrics.lowStockCount}{' '}
            <span className="text-xs font-normal text-stone-600">críticos</span>
          </div>
          <div className="text-[11px] font-mono-code text-stone-600 mt-0.5">
            Por debajo del stock mínimo
          </div>
        </div>

        {/* Metric 4: Merma Operativa */}
        <div className="bg-white border-2.5 border-[#1a1a1a] p-3 brutal-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono-code uppercase text-stone-500 font-bold">
              Merma Operativa Promedio
            </span>
            <Percent className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-display font-black text-orange-600 mt-1">
            {metrics.avgShrinkage}%
          </div>
          <div className="text-[11px] font-mono-code text-stone-600 mt-0.5">
            Desperdicio en báscula / estante
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white border-3 border-[#1a1a1a] p-3 sm:p-3.5 brutal-shadow mb-3 sm:mb-4 space-y-3 shrink-0">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre de producto o código SKU..."
              className="w-full pl-9 pr-3 py-2 bg-[#f5f0e8] font-mono-code font-bold text-xs sm:text-sm text-[#1a1a1a] brutal-input"
            />
            <Search className="w-4 h-4 text-stone-600 absolute left-3 top-2.5" />
          </div>

          {/* Stock Quick Filters */}
          <div className="flex gap-1.5 overflow-x-auto shrink-0">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'LOW', label: '⚠️ Resurtir' },
              { id: 'OPTIMAL', label: '✓ Óptimo' },
              { id: 'GRANEL', label: '⚖️ Solo Granel' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  soundFx.playKeyClick();
                  setFilterStockStatus(f.id as typeof filterStockStatus);
                }}
                className={`px-3 py-1.5 text-xs font-display font-bold border-2 border-[#1a1a1a] cursor-pointer whitespace-nowrap brutal-btn ${
                  filterStockStatus === f.id
                    ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-[2px_2px_0px_#ffcc00]'
                    : 'bg-white text-[#1a1a1a] hover:bg-stone-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Category Filter Chips */}
        {availableCategories.length > 2 && (
          <div className="flex gap-1.5 overflow-x-auto pt-2 no-scrollbar pb-0.5 border-t border-stone-200">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setFilterCategory(cat);
                }}
                className={`px-2.5 py-1 text-xs font-display font-bold border-2 border-[#1a1a1a] cursor-pointer whitespace-nowrap brutal-btn ${
                  filterCategory === cat
                    ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-[2px_2px_0px_#ffcc00]'
                    : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-[#ffcc00]/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Reactive Data Table with Dedicated Scrollbar and Sticky Header */}
      <div className="bg-white border-2.5 sm:border-3 border-[#1a1a1a] brutal-shadow overflow-hidden flex flex-col flex-1 min-h-[300px] mb-4 md:mb-0">
        {/* Mobile horizontal scroll hint */}
        <div className="md:hidden px-3 py-1.5 bg-amber-50 border-b-2 border-[#1a1a1a] text-[10px] font-mono-code font-bold text-amber-900 flex items-center justify-between shrink-0">
          <span>⇄ Deslice la tabla para ver todas las columnas</span>
          <span className="bg-[#1a1a1a] text-[#ffcc00] px-1.5 py-0.5">{filteredProducts.length} productos</span>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1 h-full min-h-[260px] max-h-[60vh] md:max-h-none inventory-scrollbar touch-pan-x touch-pan-y overscroll-contain">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-[#1a1a1a] shadow-sm">
              <tr className="bg-[#1a1a1a] text-white font-display uppercase text-[11px] border-b-2 border-[#1a1a1a]">
                <th className="p-3">SKU / Código</th>
                <th className="p-3">Producto</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Precio Venta</th>
                <th className="p-3 text-right">Stock Actual</th>
                <th className="p-3 text-center">Merma %</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#1a1a1a]/10 font-sans">
              {visibleProducts.map((prod) => {
                const isLow = prod.stock <= prod.minStock;
                const isGranel = prod.unitType === 'kg';

                return (
                  <tr key={prod.id} className="hover:bg-stone-50 transition-colors font-medium">
                    {/* SKU */}
                    <td className="p-3 font-mono-code font-bold text-stone-700">
                      {prod.code}
                    </td>

                    {/* Product Name & Icon */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{prod.emoji || '📦'}</span>
                        <div>
                          <span className="font-display font-bold text-sm text-[#1a1a1a] block">
                            {prod.name}
                          </span>
                          {prod.isFrequent && (
                            <span className="text-[9px] bg-[#ffcc00] text-[#1a1a1a] px-1 font-bold border border-[#1a1a1a]">
                              POS Rápido
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-3 font-mono-code text-[11px] text-stone-600">
                      {prod.category}
                    </td>

                    {/* Unit Type */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 font-mono-code font-bold text-[10px] border border-[#1a1a1a] ${
                        isGranel ? 'bg-[#ffcc00] text-[#1a1a1a]' : 'bg-[#38bdf8] text-[#1a1a1a]'
                      }`}>
                        {isGranel ? 'GRANEL (KG)' : 'PIEZA'}
                      </span>
                    </td>

                    {/* Sale Price */}
                    <td className="p-3 text-right font-display font-black text-sm text-[#1a1a1a]">
                      {formatCurrency(prod.price)}
                    </td>

                    {/* Current Stock with Quick Adjusters */}
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1 font-mono-code font-bold">
                        <span className={isLow ? 'text-red-700 font-black' : 'text-stone-900'}>
                          {isGranel ? `${prod.stock.toFixed(2)} kg` : `${prod.stock} pz`}
                        </span>
                      </div>
                    </td>

                    {/* Shrinkage % */}
                    <td className="p-3 text-center font-mono-code font-bold text-orange-700">
                      {prod.shrinkagePercent > 0 ? `${prod.shrinkagePercent}%` : '-'}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-display font-bold border ${
                        isLow
                          ? 'bg-red-100 text-red-800 border-red-800'
                          : 'bg-green-100 text-green-800 border-green-800'
                      }`}>
                        {isLow ? 'Resurtir' : 'Óptimo'}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedProductForQR(prod)}
                          className="p-1.5 bg-stone-100 hover:bg-[#ffcc00] border border-[#1a1a1a] brutal-btn cursor-pointer"
                          title="Ver Etiqueta QR / Código de Barras"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            soundFx.playKeyClick();
                            onEditProduct(prod);
                          }}
                          className="p-1.5 bg-stone-100 hover:bg-[#38bdf8] border border-[#1a1a1a] brutal-btn cursor-pointer"
                          title="Editar Producto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar ${prod.name} del inventario?`)) {
                              soundFx.playKeyClick();
                              onDeleteProduct(prod.id);
                            }
                          }}
                          className="p-1.5 bg-stone-100 hover:bg-[#ef4444] hover:text-white border border-[#1a1a1a] brutal-btn cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* High-Scale Pagination Bar (50,000+ SKUs Support) */}
        {filteredProducts.length > 50 && (
          <div className="p-3 bg-white border-t-2 border-[#1a1a1a] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono-code shrink-0 select-none">
            <span className="text-stone-700 font-bold text-center sm:text-left">
              Mostrando <span className="text-[#1a1a1a] font-black">{visibleProducts.length}</span> de <span className="text-[#1a1a1a] font-black">{filteredProducts.length.toLocaleString()}</span> productos (Búsqueda activa sobre catálogo completo)
            </span>
            {filteredProducts.length > visibleProducts.length && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => Math.min(prev + 50, filteredProducts.length))}
                  className="py-1.5 px-3 bg-stone-100 hover:bg-[#ffcc00] border-2 border-[#1a1a1a] font-display font-black text-xs brutal-shadow-sm cursor-pointer active:translate-x-[1px]"
                >
                  + Cargar 50 más
                </button>
                {filteredProducts.length > visibleProducts.length + 50 && (
                  <button
                    type="button"
                    onClick={() => setDisplayLimit((prev) => Math.min(prev + 200, filteredProducts.length))}
                    className="py-1.5 px-3 bg-[#1a1a1a] text-[#ffcc00] hover:bg-stone-800 border-2 border-[#1a1a1a] font-display font-black text-xs brutal-shadow-sm cursor-pointer active:translate-x-[1px]"
                  >
                    + Cargar 200 más
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="p-10 text-center text-stone-500">
            <Package className="w-10 h-10 mx-auto mb-2 text-stone-400" />
            <p className="font-display font-black text-sm uppercase text-[#1a1a1a]">
              {products.length === 0 ? 'Inventario Vacío' : 'Sin Resultados'}
            </p>
            <p className="text-xs font-mono-code text-stone-500 mt-1">
              {products.length === 0 
                ? 'No hay productos registrados en el inventario. Presione "+ Nuevo Producto" para comenzar.'
                : 'No se encontraron productos con los filtros aplicados.'}
            </p>
          </div>
        )}
      </div>

      {/* QR & Barcode Preview Modal */}
      {selectedProductForQR && createPortal(
        <div id="label-modal-overlay" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div id="label-modal-container" className="bg-white border-4 border-[#1a1a1a] p-6 max-w-sm w-full brutal-shadow-lg text-center animate-in fade-in">
            <div className="no-print flex justify-between items-center mb-3">
              <span className="font-display font-black text-sm uppercase">Etiqueta de Góndola</span>
              <button
                onClick={() => setSelectedProductForQR(null)}
                className="text-stone-500 hover:text-black font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div id="printable-label" className="border-2 border-dashed border-[#1a1a1a] p-4 bg-stone-50 my-2">
              <div className="text-2xl mb-1">{selectedProductForQR.emoji || '📦'}</div>
              <h4 className="font-display font-black text-base leading-tight mb-1">
                {selectedProductForQR.name}
              </h4>
              <div className="text-xs font-mono-code text-stone-600">
                PRECIO AL PÚBLICO:
              </div>
              <div className="text-3xl font-display font-black text-[#1a1a1a] my-2">
                ${selectedProductForQR.price.toFixed(2)}{' '}
                <span className="text-xs font-mono-code">{selectedProductForQR.unitType === 'kg' ? '/ kg' : 'c/u'}</span>
              </div>
              {/* Professional SVG Code 128 Barcode */}
              <div className="py-2 px-3 bg-white border border-stone-300 my-2">
                <Barcode value={selectedProductForQR.code} height={48} showText={true} />
              </div>
            </div>
            <button
              onClick={() => {
                soundFx.playKeyClick();
                window.print();
              }}
              className="no-print w-full mt-3 py-2 bg-[#ffcc00] hover:bg-yellow-400 font-display font-black text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer"
            >
              Imprimir Etiqueta Térmica
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

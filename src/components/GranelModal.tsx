import React, { useState, useEffect, useCallback } from 'react';
import { Scale, DollarSign, X, Check, ArrowRightLeft, Sparkles, Delete } from 'lucide-react';
import { Product } from '../types/pos';
import { soundFx } from '../utils/audio';
import { formatCurrency } from '../utils/escpos';

interface GranelModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (product: Product, quantityKg: number, totalAmount: number) => void;
}

export const GranelModal: React.FC<GranelModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
}) => {
  // Active entry mode: 'WEIGHT' (entering kg) vs 'MONEY' (entering $)
  const [inputMode, setInputMode] = useState<'WEIGHT' | 'MONEY'>('WEIGHT');
  const [weightInput, setWeightInput] = useState<string>('1.000');
  const [moneyInput, setMoneyInput] = useState<string>('0.00');


  // Sync inputs whenever product changes
  useEffect(() => {
    if (product) {
      setWeightInput('1.000');
      setMoneyInput(product.price.toFixed(2));
      setInputMode('WEIGHT');
    }
  }, [product]);

  // Bidirectional calculations
  const handleWeightChange = (newWeightStr: string) => {
    setWeightInput(newWeightStr);
    const weightNum = parseFloat(newWeightStr) || 0;
    const price = product?.price || 0;
    const calculatedMoney = weightNum * price;
    setMoneyInput(calculatedMoney > 0 ? calculatedMoney.toFixed(2) : '0.00');
  };

  const handleMoneyChange = (newMoneyStr: string) => {
    setMoneyInput(newMoneyStr);
    const moneyNum = parseFloat(newMoneyStr) || 0;
    const price = product?.price || 0;
    const calculatedWeight = price > 0 ? moneyNum / price : 0;
    setWeightInput(calculatedWeight > 0 ? calculatedWeight.toFixed(3) : '0.000');
  };

  // Preset buttons
  const applyWeightPreset = (kg: number) => {
    soundFx.playKeyClick();
    setInputMode('WEIGHT');
    handleWeightChange(kg.toFixed(3));
  };

  const applyMoneyPreset = (amount: number) => {
    soundFx.playKeyClick();
    setInputMode('MONEY');
    handleMoneyChange(amount.toFixed(2));
  };



  // Tactile Keypad buttons click
  const handleKeypadPress = (val: string) => {
    soundFx.playKeyClick();
    const currentVal = inputMode === 'WEIGHT' ? weightInput : moneyInput;

    if (val === 'C') {
      if (inputMode === 'WEIGHT') handleWeightChange('0');
      else handleMoneyChange('0');
      return;
    }

    if (val === 'BACK') {
      const nextVal = currentVal.length > 1 ? currentVal.slice(0, -1) : '0';
      if (inputMode === 'WEIGHT') handleWeightChange(nextVal);
      else handleMoneyChange(nextVal);
      return;
    }

    if (val === '.') {
      if (!currentVal.includes('.')) {
        const nextVal = currentVal + '.';
        if (inputMode === 'WEIGHT') setWeightInput(nextVal);
        else setMoneyInput(nextVal);
      }
      return;
    }

    // Numbers 0-9
    let nextVal = currentVal;
    if (currentVal === '0' || currentVal === '0.000' || currentVal === '0.00') {
      nextVal = val;
    } else {
      nextVal = currentVal + val;
    }

    if (inputMode === 'WEIGHT') {
      handleWeightChange(nextVal);
    } else {
      handleMoneyChange(nextVal);
    }
  };

  const handleConfirmSubmit = useCallback(() => {
    if (!product) return;
    const finalKg = parseFloat(weightInput) || 0;
    const finalTotal = parseFloat(moneyInput) || 0;
    if (finalKg <= 0 || finalTotal <= 0) return;
    
    soundFx.playScanBeep();
    onConfirm(product, finalKg, finalTotal);
  }, [weightInput, moneyInput, onConfirm, product]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleConfirmSubmit, onClose, isOpen]);

  if (!isOpen || !product) return null;

  const currentKg = parseFloat(weightInput) || 0;
  const currentTotal = parseFloat(moneyInput) || 0;

  return (
    <div 
      id="granel-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 select-none animate-in fade-in duration-150"
    >
      <div 
        id="granel-modal-content"
        className="w-full max-w-4xl bg-[#f5f0e8] border-4 border-[#1a1a1a] brutal-shadow-lg flex flex-col max-h-[95vh] overflow-y-auto"
      >
        {/* Modal Top Header */}
        <div className="bg-[#1a1a1a] text-white p-4 flex justify-between items-center border-b-4 border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ffcc00] border-2 border-white flex items-center justify-center text-2xl">
              {product.emoji || '⚖️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-code text-xs bg-[#ffcc00] text-[#1a1a1a] px-2 py-0.5 font-black uppercase">
                  GRANEL
                </span>
                <span className="font-mono-code text-xs text-white/70">
                  SKU: {product.code}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-display font-black text-white leading-tight">
                {product.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-white/70 font-mono-code uppercase block">Precio Base</span>
              <span className="font-display font-black text-lg text-[#ffcc00]">
                {formatCurrency(product.price)} / kg
              </span>
            </div>
            <button
              id="btn-close-granel"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="p-2 bg-white hover:bg-[#ef4444] text-[#1a1a1a] hover:text-white border-2 border-[#1a1a1a] cursor-pointer transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Bidirectional Inputs & Presets (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Live Mode Toggle Banner */}
            <div className="grid grid-cols-2 gap-3">
              {/* Peso Input Box */}
              <div 
                onClick={() => {
                  soundFx.playKeyClick();
                  setInputMode('WEIGHT');
                }}
                className={`p-3 border-3 border-[#1a1a1a] cursor-pointer transition-all ${
                  inputMode === 'WEIGHT' 
                    ? 'bg-[#ffcc00] shadow-[3px_3px_0px_#1a1a1a] -translate-y-0.5' 
                    : 'bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-display font-bold uppercase text-[#1a1a1a] flex items-center gap-1">
                    <Scale className="w-4 h-4" /> Peso a Granel
                  </span>
                  {inputMode === 'WEIGHT' && (
                    <span className="text-[9px] bg-[#1a1a1a] text-white px-1.5 py-0.5 font-bold uppercase">
                      Activo
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono-code text-3xl font-black text-[#1a1a1a]">
                    {weightInput}
                  </span>
                  <span className="font-display font-bold text-sm text-[#1a1a1a]/80">
                    KILOGRAMOS
                  </span>
                </div>
              </div>

              {/* Importe Input Box */}
              <div 
                onClick={() => {
                  soundFx.playKeyClick();
                  setInputMode('MONEY');
                }}
                className={`p-3 border-3 border-[#1a1a1a] cursor-pointer transition-all ${
                  inputMode === 'MONEY' 
                    ? 'bg-[#38bdf8] shadow-[3px_3px_0px_#1a1a1a] -translate-y-0.5' 
                    : 'bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-display font-bold uppercase text-[#1a1a1a] flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> Importe Exacto
                  </span>
                  {inputMode === 'MONEY' && (
                    <span className="text-[9px] bg-[#1a1a1a] text-white px-1.5 py-0.5 font-bold uppercase">
                      Activo
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono-code text-3xl font-black text-[#1a1a1a]">
                    ${moneyInput}
                  </span>
                  <span className="font-display font-bold text-sm text-[#1a1a1a]/80">
                    MXN
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Weight Preset Buttons */}
            <div className="bg-white border-2 border-[#1a1a1a] p-3 brutal-shadow-sm">
              <span className="text-[11px] font-display font-bold uppercase text-[#1a1a1a]/80 block mb-2">
                Pesos Rápidos Táctiles (Kg)
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: '¼ kg', kg: 0.25 },
                  { label: '½ kg', kg: 0.50 },
                  { label: '¾ kg', kg: 0.75 },
                  { label: '1.0 kg', kg: 1.00 },
                  { label: '1.5 kg', kg: 1.50 },
                  { label: '2.0 kg', kg: 2.00 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyWeightPreset(preset.kg)}
                    className="py-2 px-1 bg-[#f5f0e8] hover:bg-[#ffcc00] border-2 border-[#1a1a1a] font-display font-black text-sm text-[#1a1a1a] brutal-btn"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Money Preset Buttons */}
            <div className="bg-white border-2 border-[#1a1a1a] p-3 brutal-shadow-sm">
              <span className="text-[11px] font-display font-bold uppercase text-[#1a1a1a]/80 block mb-2">
                Importes Rápidos Táctiles ($ Dinero)
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => applyMoneyPreset(amt)}
                    className="py-2 bg-[#f5f0e8] hover:bg-[#38bdf8] border-2 border-[#1a1a1a] font-mono-code font-black text-sm text-[#1a1a1a] brutal-btn"
                  >
                    ${amt}.00
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Tactile Numeric Keypad & Live Result Summary (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            {/* Keypad */}
            <div className="bg-white border-3 border-[#1a1a1a] p-3 brutal-shadow">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="font-display font-bold text-xs uppercase text-[#1a1a1a]">
                  Teclado Táctil ({inputMode === 'WEIGHT' ? 'Kg Peso' : '$ Importe'})
                </span>
                <button
                  onClick={() => {
                    soundFx.playKeyClick();
                    setInputMode(inputMode === 'WEIGHT' ? 'MONEY' : 'WEIGHT');
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 underline cursor-pointer"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  Cambiar a {inputMode === 'WEIGHT' ? 'Importe ($)' : 'Peso (kg)'}
                </button>
              </div>

              {/* 4x3 Keypad Grid */}
              <div className="grid grid-cols-3 gap-2">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypadPress(key)}
                    className={`h-13 border-2 border-[#1a1a1a] font-mono-code text-xl font-black brutal-btn ${
                      key === 'C'
                        ? 'bg-[#ef4444] text-white hover:bg-red-600'
                        : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-[#ffcc00]'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Backspace Row */}
              <button
                onClick={() => handleKeypadPress('BACK')}
                className="w-full mt-2 h-11 bg-stone-200 hover:bg-stone-300 border-2 border-[#1a1a1a] font-display font-bold text-xs text-[#1a1a1a] flex items-center justify-center gap-2 brutal-btn"
              >
                <Delete className="w-4 h-4" />
                <span>Borrar Último Dígito</span>
              </button>
            </div>

            {/* Total calculation banner */}
            <div className="bg-[#1a1a1a] text-white border-3 border-[#1a1a1a] p-4 brutal-shadow">
              <div className="flex justify-between items-center text-xs text-white/70 font-mono-code mb-1">
                <span>TOTAL A COBRAR POR ESTA PARTIDA</span>
                <span>{currentKg.toFixed(3)} kg</span>
              </div>
              <div className="text-3xl sm:text-4xl font-display font-black text-[#ffcc00]">
                {formatCurrency(currentTotal)}
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-cancel-granel"
                onClick={() => {
                  soundFx.playKeyClick();
                  onClose();
                }}
                className="py-3.5 bg-white hover:bg-stone-100 text-[#1a1a1a] font-display font-bold text-sm border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-5 h-5 text-[#ef4444]" />
                <span>Cancelar (Esc)</span>
              </button>

              <button
                id="btn-confirm-granel"
                onClick={handleConfirmSubmit}
                disabled={currentKg <= 0 || currentTotal <= 0}
                className="py-3.5 bg-[#22c55e] hover:bg-green-600 disabled:opacity-50 text-white font-display font-black text-sm border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-5 h-5" />
                <span>Agregar al Ticket</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

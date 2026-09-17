import React, { useState, useEffect } from 'react';
import { X, Check, KeyRound, Shield, User, Sparkles } from 'lucide-react';
import { CashierUser, CashierRole } from '../types/pos';
import { soundFx } from '../utils/audio';
import { hashPin } from '../utils/security';

interface CashierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashierToEdit: CashierUser | null;
  onSave: (cashier: CashierUser) => void;
}

export const CashierFormModal: React.FC<CashierFormModalProps> = ({
  isOpen,
  onClose,
  cashierToEdit,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<CashierRole>('CAJERO');
  const [avatar, setAvatar] = useState('👨‍💼');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableAvatars = ['👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🌾', '👩‍🌾', '👑', '🏪', '⚡'];

  useEffect(() => {
    if (!isOpen) return;
    if (cashierToEdit) {
      setName(cashierToEdit.name);
      setPin(cashierToEdit.pin.startsWith('sha256:') ? '' : cashierToEdit.pin);
      setRole(cashierToEdit.role);
      setAvatar(cashierToEdit.avatar || '👨‍💼');
      setActive(cashierToEdit.active);
    } else {
      setName('');
      setPin('');
      setRole('CAJERO');
      setAvatar('👨‍💼');
      setActive(true);
    }
    setError(null);
  }, [isOpen, cashierToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ingrese el nombre del cajero');
      return;
    }

    const cashierId = cashierToEdit ? cashierToEdit.id : `user-${Date.now().toString().slice(-4)}`;
    let finalPin = cashierToEdit?.pin || '';

    if (/^\d{4}$/.test(pin)) {
      finalPin = await hashPin(pin, cashierId);
    } else if (cashierToEdit && !pin && cashierToEdit.pin) {
      finalPin = cashierToEdit.pin;
    } else {
      setError('El PIN debe contener exactamente 4 dígitos numéricos');
      return;
    }

    soundFx.playCashRegisterChime();
    const newOrUpdatedCashier: CashierUser = {
      id: cashierId,
      name: name.trim(),
      pin: finalPin,
      role,
      avatar,
      active,
      createdAt: cashierToEdit ? cashierToEdit.createdAt : new Date().toISOString().split('T')[0],
    };

    onSave(newOrUpdatedCashier);
    onClose();
  };

  return (
    <div 
      id="cashier-form-modal-overlay" 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150"
    >
      <div 
        id="cashier-form-box"
        className="w-full max-w-md bg-[#f5f0e8] border-3 sm:border-4 border-[#1a1a1a] brutal-shadow-lg flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden"
      >
        {/* Header (Fixed) */}
        <div className="bg-[#1a1a1a] text-white p-3.5 sm:p-4 flex justify-between items-center border-b-3 border-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#ffcc00] border border-white flex items-center justify-center text-lg shrink-0">
              {avatar}
            </div>
            <div>
              <h3 className="font-display font-black text-sm sm:text-base md:text-lg text-white leading-none">
                {cashierToEdit ? 'EDITAR CAJERO / USUARIO' : 'NUEVO CAJERO'}
              </h3>
              <span className="font-mono-code text-[11px] sm:text-xs text-white/70">
                Control de Acceso y Turnos
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
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body (Scrollable with dedicated scrollbar and touch pan) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain inventory-scrollbar touch-pan-y">
          {error && (
            <div className="p-2 bg-red-100 border-2 border-red-600 text-red-800 text-xs font-mono-code font-bold">
              {error}
            </div>
          )}

          {/* Name Input */}
          <div>
            <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Roberto Sánchez (Cajero Tarde)"
              className="w-full bg-white p-2.5 font-display font-bold text-sm brutal-input"
            />
          </div>

          {/* 4-digit PIN */}
          <div>
            <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
              PIN de Acceso (4 Dígitos Numéricos) *
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                }}
                placeholder="****"
                className="w-full bg-white pl-9 pr-3 py-2.5 font-mono-code font-black text-base tracking-widest brutal-input"
              />
              <KeyRound className="w-4 h-4 text-stone-600 absolute left-3 top-3" />
            </div>
            <span className="text-[11px] font-mono-code text-stone-500 mt-0.5 block">
              Código confidencial para desbloquear el POS al iniciar turno
            </span>
          </div>

          {/* Role selector */}
          <div>
            <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
              Rol / Nivel de Permiso
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CAJERO' as CashierRole, label: 'Cajero', desc: 'Ventas y Arqueo' },
                { id: 'SUPERVISOR' as CashierRole, label: 'Supervisor', desc: 'Precios y Cortes' },
                { id: 'ADMIN' as CashierRole, label: 'Administrador', desc: 'Acceso Total' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setRole(r.id);
                  }}
                  className={`p-2 border-2 border-[#1a1a1a] text-center cursor-pointer brutal-btn ${
                    role === r.id
                      ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-[2px_2px_0px_#ffcc00]'
                      : 'bg-white text-[#1a1a1a] hover:bg-stone-100'
                  }`}
                >
                  <span className="font-display font-black text-xs block">{r.label}</span>
                  <span className="text-[9px] font-mono-code text-stone-400 block mt-0.5">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Emoji Selector */}
          <div>
            <label className="text-xs font-display font-bold uppercase text-[#1a1a1a] block mb-1">
              Ícono de Perfil
            </label>
            <div className="flex gap-2 overflow-x-auto p-1 bg-white border-2 border-[#1a1a1a]">
              {availableAvatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setAvatar(av);
                  }}
                  className={`w-9 h-9 text-lg flex items-center justify-center border-2 cursor-pointer transition-all ${
                    avatar === av
                      ? 'border-[#1a1a1a] bg-[#ffcc00] scale-110'
                      : 'border-transparent hover:bg-stone-100'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Active status */}
          <div className="bg-white border-2 border-[#1a1a1a] p-3 flex items-center justify-between">
            <div>
              <span className="font-display font-bold text-xs text-[#1a1a1a] block">
                Estado del Cajero
              </span>
              <span className="text-[10px] font-mono-code text-stone-500">
                {active ? 'Habilitado para iniciar sesión' : 'Desactivado temporalmente'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setActive(!active);
              }}
              className={`px-3 py-1 text-xs font-display font-bold border-2 border-[#1a1a1a] brutal-btn cursor-pointer ${
                active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {active ? 'ACTIVO' : 'INACTIVO'}
            </button>
          </div>

          {/* Submit buttons (Sticky at bottom, docked full-width) */}
          <div className="flex gap-2 pt-3 pb-1 sticky -bottom-4 sm:-bottom-5 bg-[#f5f0e8] px-4 sm:px-5 -mx-4 sm:-mx-5 border-t-2 border-[#1a1a1a] z-10 shadow-[0_-3px_5px_rgba(0,0,0,0.06)]">
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="flex-1 py-2.5 bg-stone-200 hover:bg-stone-300 font-display font-bold text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#ffcc00] hover:bg-yellow-400 font-display font-black text-xs border-2 border-[#1a1a1a] brutal-shadow flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Cajero</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

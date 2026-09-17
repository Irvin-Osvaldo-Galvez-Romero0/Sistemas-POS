import React from 'react';
import { 
  ShoppingCart, 
  Package, 
  Clock, 
  Settings, 
  Power, 
  Scale, 
  CheckCircle2,
  LogOut
} from 'lucide-react';
import { ActiveView, CashShift, CashierUser } from '../types/pos';
import { soundFx } from '../utils/audio';

interface SideNavBarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  activeShift: CashShift;
  onOpenShiftCut: () => void;
  cartCount: number;
  currentUser?: CashierUser;
  onSwitchCashier?: () => void;
  onLogout?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  activeView,
  setActiveView,
  activeShift,
  onOpenShiftCut,
  cartCount,
  currentUser,
  onSwitchCashier,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';

  const navItems = [
    {
      id: 'ventas' as ActiveView,
      label: 'Ventas',
      icon: ShoppingCart,
      badge: cartCount > 0 ? `${cartCount}` : undefined,
    },
    {
      id: 'inventario' as ActiveView,
      label: 'Inventario',
      icon: Package,
    },
    {
      id: 'turnos' as ActiveView,
      label: 'Turnos',
      icon: Clock,
    },
    // Only Admin can see and access Ajustes
    ...(isAdmin
      ? [
          {
            id: 'ajustes' as ActiveView,
            label: 'Ajustes',
            icon: Settings,
          },
        ]
      : []),
  ];

  return (
    <aside 
      id="pos-sidebar" 
      className="w-16 sm:w-20 md:w-24 bg-[#f5f0e8] border-r-2 sm:border-r-3 md:border-r-4 border-[#1a1a1a] flex flex-col justify-between items-center py-2 sm:py-3 px-1 sm:px-1.5 select-none z-20 shrink-0 h-screen sticky top-0"
    >
      {/* Brand & Logo Header */}
      <div className="flex flex-col items-center w-full">
        <div 
          onClick={() => {
            soundFx.playKeyClick();
            setActiveView('ventas');
          }}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-[#1a1a1a] border-2 md:border-2.5 border-[#1a1a1a] brutal-shadow flex items-center justify-center cursor-pointer mb-2 sm:mb-2.5 group hover:rotate-2 transition-transform overflow-hidden p-0.5"
          title="Gálvez Miscelánea POS"
        >
          <img src="./favicon-64.png" alt="Gálvez Miscelánea" className="w-full h-full object-cover rounded-none" />
        </div>


        {/* Navigation buttons */}
        <nav className="w-full flex flex-col gap-1.5 sm:gap-2">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveView(item.id);
                }}
                className={`relative w-full py-2 sm:py-2.5 px-0.5 sm:px-1 flex flex-col items-center justify-center rounded-none font-display text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1a1a1a] text-[#ffcc00] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#ffcc00]'
                    : 'bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] hover:bg-[#ffcc00]/20 brutal-shadow-sm active:translate-x-[1px] active:translate-y-[1px]'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-0.5 ${isActive ? 'text-[#ffcc00]' : 'text-[#1a1a1a]'}`} />
                <span className="tracking-tight text-[9px] sm:text-[10px] leading-tight text-center">
                  {item.label}
                </span>

                {item.badge && (
                  <span className="absolute -top-1.5 -right-1 bg-[#ef4444] text-white font-mono-code text-[8px] sm:text-[9px] font-bold px-1 py-0.1 border border-[#1a1a1a] rounded-full animate-bounce">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Actions */}
      <div className="flex flex-col items-center w-full gap-2">
        {/* Offline & PWA Status Pill */}
        <div 
          className="w-full bg-white border-2 border-[#1a1a1a] p-1 flex flex-col items-center text-center brutal-shadow-sm"
          title="PWA Offline First: Datos sincronizados en LocalStorage"
        >
          <div className="flex items-center gap-1 text-[9px] font-bold text-[#22c55e]">
            <CheckCircle2 className="w-3 h-3" />
            <span>OFFLINE</span>
          </div>
          <span className="text-[8px] font-mono-code text-[#1a1a1a]/70">
            T#{activeShift.shiftNumber}
          </span>
        </div>

        {/* Salir / Cerrar Sesión Button */}
        <button
          id="btn-sidebar-logout"
          onClick={() => {
            soundFx.playKeyClick();
            if (onLogout) onLogout();
            else if (onSwitchCashier) onSwitchCashier();
          }}
          className="w-full py-2 px-1 bg-stone-800 hover:bg-[#ffcc00] hover:text-[#1a1a1a] text-white font-display text-[9px] font-bold border-2 border-[#1a1a1a] brutal-shadow-sm flex flex-col items-center justify-center cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-colors"
          title="Salir / Bloquear pantalla con PIN"
        >
          <LogOut className="w-3.5 h-3.5 mb-0.5" />
          <span>SALIR</span>
        </button>

        {/* Quick Shift Close Button */}
        <button
          id="btn-quick-close-shift"
          onClick={() => {
            soundFx.playKeyClick();
            onOpenShiftCut();
          }}
          className="w-full py-2 px-1 bg-[#ef4444] hover:bg-[#dc2626] text-white font-display text-[9px] font-black border-2 border-[#1a1a1a] brutal-shadow-sm flex flex-col items-center justify-center cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          title="Cerrar Turno / Arqueo de Caja"
        >
          <Power className="w-3.5 h-3.5 mb-0.5" />
          <span>CORTE</span>
        </button>
      </div>
    </aside>
  );
};

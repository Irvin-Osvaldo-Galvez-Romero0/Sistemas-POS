import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  UserCheck, 
  Delete, 
  KeyRound, 
  X, 
  Sparkles,
  Store,
  Scale,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { CashierUser } from '../types/pos';
import { soundFx } from '../utils/audio';
import { verifyPin as checkPinSecure, hashPin, pinRateLimiter } from '../utils/security';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  cashiers: CashierUser[];
  currentUser?: CashierUser;
  currentUserId?: string;
  onLoginSuccess: (user: CashierUser) => void;
  canCancel?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  cashiers = [],
  currentUser,
  currentUserId,
  onLoginSuccess,
  canCancel = true,
}) => {
  const activeCashiers = cashiers.filter((c) => c?.active);
  const initialUser = (currentUser?.active ? currentUser : undefined) ||
    cashiers.find((c) => (currentUser?.id ? c.id === currentUser.id : c.id === currentUserId) && c?.active) ||
    activeCashiers[0] ||
    cashiers[0];

  const [selectedUser, setSelectedUser] = useState<CashierUser | undefined>(initialUser);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Sync selected user when modal opens
  useEffect(() => {
    if (isOpen) {
      const active = (currentUser?.active ? currentUser : undefined) ||
        cashiers.find((c) => (currentUser?.id ? c.id === currentUser.id : c.id === currentUserId) && c?.active) ||
        cashiers.find(c => c?.active) ||
        cashiers[0];
      setSelectedUser(active);
      setEnteredPin('');
      setErrorMsg(null);

      // Check if user is locked out
      if (active) {
        const { allowed, waitSeconds } = pinRateLimiter.checkAllowed(active.id);
        if (!allowed) {
          setLockoutSeconds(waitSeconds);
        } else {
          setLockoutSeconds(0);
        }
      }
    }
  }, [isOpen, currentUser?.id, currentUserId]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleKeyPress = useCallback((digit: string) => {
    if (lockoutSeconds > 0) return;
    soundFx.playKeyClick();
    setErrorMsg(null);
    setEnteredPin((prev) => {
      if (prev.length < 4) {
        const next = prev + digit;
        return next;
      }
      return prev;
    });
  }, [lockoutSeconds]);

  const handleDelete = useCallback(() => {
    if (lockoutSeconds > 0) return;
    soundFx.playKeyClick();
    setErrorMsg(null);
    setEnteredPin((prev) => prev.slice(0, -1));
  }, [lockoutSeconds]);

  const handleClear = useCallback(() => {
    soundFx.playKeyClick();
    setErrorMsg(null);
    setEnteredPin('');
  }, []);

  const verifyPinAttempt = useCallback(async (pinToVerify: string, userToVerify: CashierUser) => {
    // 1. Rate limiter check
    const check = pinRateLimiter.checkAllowed(userToVerify.id);
    if (!check.allowed) {
      setLockoutSeconds(check.waitSeconds);
      setErrorMsg(`Terminal bloqueado por seguridad (${check.waitSeconds}s).`);
      setEnteredPin('');
      return;
    }

    // 2. Cryptographic verification (SHA-256 with salt)
    const isMatch = await checkPinSecure(pinToVerify, userToVerify.pin, userToVerify.id);

    if (isMatch) {
      pinRateLimiter.recordSuccess(userToVerify.id);
      setEnteredPin('');
      setErrorMsg(null);

      // Transparent upgrade to hashed PIN if stored as cleartext
      if (!userToVerify.pin.startsWith('sha256:')) {
        const hashed = await hashPin(pinToVerify, userToVerify.id);
        userToVerify = { ...userToVerify, pin: hashed };
      }

      onLoginSuccess(userToVerify);
    } else {
      soundFx.playKeyClick();
      const fail = pinRateLimiter.recordFailure(userToVerify.id);
      if (fail.locked) {
        setLockoutSeconds(fail.waitSeconds);
        setErrorMsg(`Bloqueado por 5 intentos fallidos (${fail.waitSeconds}s restantes).`);
      } else {
        setErrorMsg('PIN incorrecto. Intente nuevamente.');
      }
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setEnteredPin('');
      }, 600);
    }
  }, [onLoginSuccess]);

  // Auto-verify when 4 digits are entered
  useEffect(() => {
    if (enteredPin.length === 4 && selectedUser) {
      verifyPinAttempt(enteredPin, selectedUser);
    }
  }, [enteredPin, selectedUser, verifyPinAttempt]);

  // Keyboard hardware listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape' && canCancel && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canCancel, onClose, handleKeyPress, handleDelete]);

  if (!isOpen) return null;

  return (
    <div 
      id="login-modal-overlay" 
      className="fixed inset-0 z-50 bg-[#1a1a1a]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div 
        id="login-modal-box"
        className={`w-full max-w-md bg-[#f5f0e8] border-4 border-[#1a1a1a] brutal-shadow-lg flex flex-col overflow-hidden transition-transform ${
          isShaking ? 'translate-x-2' : ''
        }`}
      >
        {/* Header */}
        <div className="bg-[#1a1a1a] text-white p-4 flex justify-between items-center border-b-3 border-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#1a1a1a] border border-[#ffcc00] flex items-center justify-center overflow-hidden shrink-0">
              <img src="./favicon-64.png" alt="Gálvez Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-white leading-none">
                ACCESO DE CAJEROS & TURNO
              </h3>
              <span className="font-mono-code text-[11px] text-[#ffcc00]">
                Gálvez Miscelánea • POS
              </span>
            </div>
          </div>

          {canCancel && onClose && (
            <button
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="p-1.5 bg-white hover:bg-[#ef4444] text-[#1a1a1a] hover:text-white border-2 border-[#1a1a1a] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* User Selection List */}
          <div>
            <label className="text-xs font-display font-bold uppercase text-stone-700 block mb-1.5">
              1. Seleccione al Cajero / Usuario:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {activeCashiers.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      soundFx.playKeyClick();
                      setSelectedUser(user);
                      setEnteredPin('');
                      setErrorMsg(null);
                    }}
                    className={`p-2 border-2.5 border-[#1a1a1a] flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#ffcc00] shadow-[3px_3px_0px_#1a1a1a] -translate-y-0.5'
                        : 'bg-white hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-2xl mb-1">{user.avatar || '👨‍💼'}</span>
                    <span className="font-display font-bold text-xs text-[#1a1a1a] leading-tight line-clamp-1">
                      {user.name.split(' ')[0]}
                    </span>
                    <span className={`text-[9px] font-mono-code font-bold px-1 mt-1 border border-[#1a1a1a] ${
                      user.role === 'ADMIN' ? 'bg-purple-200' : user.role === 'SUPERVISOR' ? 'bg-blue-200' : 'bg-stone-200'
                    }`}>
                      {user.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Display */}
          <div className="bg-white border-3 border-[#1a1a1a] p-3 text-center brutal-shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-xs font-display font-bold text-stone-600 mb-2">
              <KeyRound className="w-3.5 h-3.5 text-[#1a1a1a]" />
              <span>2. Ingrese PIN de 4 dígitos para {selectedUser?.name.split(' ')[0] || 'Cajero'}:</span>
            </div>

            {/* PIN Dots */}
            <div className="flex justify-center items-center gap-3 my-1">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = enteredPin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-5 h-5 rounded-full border-2 border-[#1a1a1a] transition-all ${
                      isFilled ? 'bg-[#1a1a1a] scale-110' : 'bg-[#f5f0e8]'
                    }`}
                  />
                );
              })}
            </div>

            {lockoutSeconds > 0 ? (
              <div className="bg-red-100 border-2 border-red-600 p-2 text-center text-xs font-mono-code font-bold text-red-700 flex items-center justify-center gap-1.5 mt-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span>TERMINAL BLOQUEADO: Reintente en {lockoutSeconds}s</span>
              </div>
            ) : errorMsg ? (
              <p className="text-xs font-mono-code font-bold text-red-600 mt-2 animate-pulse">
                {errorMsg}
              </p>
            ) : null}
          </div>

          {/* Virtual Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                disabled={lockoutSeconds > 0}
                onClick={() => handleKeyPress(digit)}
                className={`py-3 bg-white hover:bg-[#ffcc00] border-2.5 border-[#1a1a1a] font-display font-black text-xl text-[#1a1a1a] brutal-btn cursor-pointer active:translate-x-[2px] active:translate-y-[2px] ${
                  lockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                {digit}
              </button>
            ))}
            <button
              disabled={lockoutSeconds > 0}
              onClick={handleClear}
              className={`py-3 bg-stone-200 hover:bg-stone-300 border-2.5 border-[#1a1a1a] font-display font-bold text-xs text-[#1a1a1a] brutal-btn cursor-pointer ${
                lockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              LIMPIAR
            </button>
            <button
              disabled={lockoutSeconds > 0}
              onClick={() => handleKeyPress('0')}
              className={`py-3 bg-white hover:bg-[#ffcc00] border-2.5 border-[#1a1a1a] font-display font-black text-xl text-[#1a1a1a] brutal-btn cursor-pointer active:translate-x-[2px] active:translate-y-[2px] ${
                lockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              0
            </button>
            <button
              disabled={lockoutSeconds > 0}
              onClick={handleDelete}
              className={`py-3 bg-stone-200 hover:bg-[#ef4444] hover:text-white border-2.5 border-[#1a1a1a] font-display font-bold text-xs flex items-center justify-center brutal-btn cursor-pointer ${
                lockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

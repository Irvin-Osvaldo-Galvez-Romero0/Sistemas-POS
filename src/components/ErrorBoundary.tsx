import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[POS ErrorBoundary]: Error de ejecución capturado de forma segura:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#f5f0e8] flex items-center justify-center p-4 font-sans select-none">
          <div className="w-full max-w-lg bg-white border-4 border-[#1a1a1a] brutal-shadow-lg p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 border-b-3 border-[#1a1a1a] pb-3 bg-red-50 p-3 -mx-6 -mt-6">
              <div className="w-10 h-10 bg-[#ef4444] border-2 border-[#1a1a1a] flex items-center justify-center text-white shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display font-black text-lg text-[#1a1a1a] uppercase leading-none">
                  Protección de Terminal Activada
                </h2>
                <span className="font-mono-code text-xs text-red-700 font-bold">
                  Error de ejecución neutralizado sin pérdida de datos
                </span>
              </div>
            </div>

            {/* Message */}
            <p className="text-xs font-sans text-stone-700 leading-relaxed">
              El sistema POS ha interceptado una anomalía inesperada. Los datos del turno activo, el arqueo de caja y las ventas previas permanecen seguros en la base de datos local y memoria protegida.
            </p>

            {/* Error detail */}
            <div className="p-3 bg-[#1a1a1a] text-[#ffcc00] font-mono-code text-xs border-2 border-[#1a1a1a] overflow-x-auto max-h-36">
              <div className="font-bold text-red-400 mb-1">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Error desconocido'}
              </div>
              {this.state.errorInfo?.componentStack && (
                <div className="text-[10px] text-stone-400 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack.slice(0, 300)}...
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t-2 border-[#1a1a1a]">
              <button
                type="button"
                onClick={this.handleReset}
                className="py-2.5 px-4 bg-[#ffcc00] hover:bg-yellow-400 text-[#1a1a1a] font-display font-black text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Recuperar Terminal</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReload}
                className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-[#1a1a1a] font-display font-bold text-xs border-2 border-[#1a1a1a] brutal-btn cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reiniciar Pantalla</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

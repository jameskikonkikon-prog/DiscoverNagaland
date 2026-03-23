'use client';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error';
interface Toast { id: number; message: string; type: ToastType; }
interface ToastCtx { showToast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastCtx>({ showToast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position:'fixed', bottom:28, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end', pointerEvents:'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'success' ? '#1a3a2a' : '#3a1a1a',
            border: `1px solid ${t.type === 'success' ? '#2d6a4f' : '#6a2d2d'}`,
            color: t.type === 'success' ? '#52b788' : '#e57373',
            padding:'11px 18px',
            borderRadius:10,
            fontSize:14,
            fontFamily:'Sora,sans-serif',
            fontWeight:500,
            boxShadow:'0 4px 24px rgba(0,0,0,0.45)',
            animation:'toastIn 0.22s ease',
            pointerEvents:'auto',
            maxWidth:320,
          }}>
            {t.type === 'success' ? '✓ ' : '✕ '}{t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastContext.Provider>
  );
}

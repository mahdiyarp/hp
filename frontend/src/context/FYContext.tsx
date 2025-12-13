import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet } from '../services/api';

type FYState = {
  activeFyId: number | null;
  setActiveFyId: (fid: number | null) => void;
  years: Array<{ id: number; name: string }>;
  reload: () => Promise<void>;
  activeFy: { id: number; name: string } | null;
};

const Ctx = createContext<FYState | null>(null);

export function FYProvider({ children }: { children: React.ReactNode }) {
  const [activeFyId, setActiveFyId] = useState<number | null>(null);
  const [years, setYears] = useState<Array<{ id: number; name: string }>>([]);
  const activeFy = years.find(y => y.id === (activeFyId ?? -1)) ?? null;

  const reload = async () => {
    try {
      // فقط لیست سال‌های مالی را می‌گیریم؛ activeFyId از localStorage خوانده می‌شود
      const list = await apiGet<any[]>('/api/financial-years');
      setYears((list || []).map((y: any) => ({ id: y.id, name: y.name })));
      const stored = localStorage.getItem('hesabpak_active_fy_id');
      if (stored) setActiveFyId(Number(stored));
    } catch (_) {}
  };

  useEffect(() => { reload(); }, []);

  return (
    <Ctx.Provider value={{ activeFyId, setActiveFyId, years, reload, activeFy }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFY() {
  const v = useContext(Ctx);
  // If provider is missing, return null to avoid hard crash; UI can render gracefully.
  return v;
}

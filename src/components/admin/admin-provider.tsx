'use client';
import { createContext, useContext } from 'react';
import type { SafeUser } from '@/lib/dto/user';

const AdminContext = createContext<SafeUser | null>(null);

export function AdminProvider({ user, children }: { user: SafeUser; children: React.ReactNode }) {
  return <AdminContext.Provider value={user}>{children}</AdminContext.Provider>;
}

export function useAdminUser() {
  const user = useContext(AdminContext);
  if (!user) throw new Error('useAdminUser must be used within an AdminProvider');
  return user;
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Package, 
  Users, 
  Building2, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown, 
  ShieldCheck,
  RefreshCw,
  User,
  Key,
  Bell,
  Shield,
  BarChart3
} from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useFirestore } from '../hooks/useFirestore';
import { Company } from '../types';

import NotificationBell from './NotificationBell';
import { clearOldNotifications } from '../lib/notifications';

interface LayoutProps {
  profile: any;
  selectedCompanyId: string;
  onClearCompany: () => void;
}

export default function Layout({ profile, selectedCompanyId, onClearCompany }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: BarChart3, label: 'Relatórios', path: '/reports' },
    { icon: CheckSquare, label: 'Checklists', path: '/checklists' },
    { icon: Package, label: 'Inventário', path: '/inventory' },
    ...(profile?.role === 'admin' ? [
      { icon: Users, label: 'Analistas', path: '/analysts' },
    ] : []),
    { icon: MessageSquare, label: 'Chat Suporte', path: '/chat' },
    ...(profile?.role === 'admin' ? [
      { icon: Building2, label: 'Empresas', path: '/admin/companies' },
    ] : []),
  ];

  useEffect(() => {
    clearOldNotifications();
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem('superAdminSession');
    localStorage.removeItem('selectedCompanyId');
    await signOut(auth);
    window.location.href = '/login';
  };

  const { data: companies, loading: companiesLoading } = useFirestore<Company>('companies');
  const currentCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar Desktop */}
      <aside className={`hidden md:flex flex-col bg-[#1e293b] border-r border-white/5 fixed h-full z-30 shadow-2xl transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20 flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <span className="font-bold text-white text-xl tracking-tighter uppercase whitespace-nowrap">SISTEMA <span className="text-primary">TI</span></span>
              )}
            </div>
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hidden lg:block"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
 
          {!isSidebarCollapsed ? (
            <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 mb-10">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Unidade Ativa</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white truncate uppercase tracking-tight">
                  {companiesLoading ? 'Carregando...' : (currentCompany?.name || (selectedCompanyId ? 'Não Encontrada' : 'Nenhuma Unidade'))}
                </p>
                <button 
                  onClick={onClearCompany}
                  className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white/60 hover:text-white border border-white/10"
                  title="Trocar Unidade"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-10">
              <button 
                onClick={onClearCompany}
                className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-white/40 hover:text-white"
                title="Trocar Unidade"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

            <nav className="flex-1 px-6 space-y-3 overflow-y-auto">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[16px] font-bold transition-all group min-h-[56px] relative ${
                    location.pathname === item.path
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-white hover:bg-white/5'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title={isSidebarCollapsed ? item.label : ''}
                >
                  {location.pathname === item.path && !isSidebarCollapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full" />
                  )}
                  <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110 flex-shrink-0 ${location.pathname === item.path ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
                  {!isSidebarCollapsed && <span className="tracking-tight">{item.label}</span>}
                </button>
              ))}
            </nav>

        <div className="p-6 border-t border-white/5">
          <button
            onClick={() => handleNavigation('/config')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[16px] font-bold transition-all group relative ${
              location.pathname === '/config'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-white hover:bg-white/5'
            } ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Configurações' : ''}
          >
            {location.pathname === '/config' && !isSidebarCollapsed && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full" />
            )}
            <Settings className={`w-6 h-6 transition-all flex-shrink-0 ${location.pathname === '/config' ? 'text-white' : 'text-white/60 group-hover:text-white group-hover:rotate-45'}`} />
            {!isSidebarCollapsed && <span className="tracking-tight">Configurações</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        {/* Top Header */}
        <header className="h-20 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
          <div className="md:hidden flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-3 bg-bg rounded-2xl text-text active:scale-95 transition-all border border-border">
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-text tracking-tighter uppercase">SISTEMA <span className="text-primary">TI</span></span>
          </div>

          <div className="hidden md:block">
            <h2 className="text-text-soft font-bold text-[11px] uppercase tracking-[0.3em]">Painel de Controle Administrativo</h2>
          </div>

          <div className="flex items-center gap-8">
            <NotificationBell />

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-4 p-1 transition-all active:scale-95 group"
              >
                <div className="w-11 h-11 rounded-full bg-primary border-2 border-surface overflow-hidden shadow-lg group-hover:ring-4 group-hover:ring-primary/10 transition-all">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-base">
                      {profile?.displayName?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-bold text-text leading-none mb-1.5 tracking-tight">{profile?.displayName}</p>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{profile?.role || 'Acesso'}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-text-soft transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-4 w-72 bg-surface rounded-[2rem] shadow-2xl border border-border py-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="px-8 py-5 border-b border-border mb-3">
                    <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest mb-1.5">Logado como</p>
                    <p className="text-sm font-bold text-text truncate">{profile?.email}</p>
                  </div>
                  <button 
                    onClick={() => { handleNavigation('/config'); setIsUserDropdownOpen(false); }}
                    className="w-full flex items-center gap-4 px-8 py-4 text-sm font-semibold text-text-muted hover:bg-bg hover:text-text transition-all group"
                  >
                    <User className="w-5 h-5 text-text-soft group-hover:text-primary" />
                    Meu Perfil
                  </button>
                  <button 
                    onClick={() => { handleNavigation('/config'); setIsUserDropdownOpen(false); }}
                    className="w-full flex items-center gap-4 px-8 py-4 text-sm font-semibold text-text-muted hover:bg-bg hover:text-text transition-all group"
                  >
                    <Shield className="w-5 h-5 text-text-soft group-hover:text-primary" />
                    Segurança 2FA
                  </button>
                  <div className="h-px bg-border my-3 mx-6"></div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-8 py-4 text-sm font-bold text-danger hover:bg-danger-soft transition-all group"
                  >
                    <LogOut className="w-5 h-5 text-danger group-hover:translate-x-1 transition-transform" />
                    Sair do Sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-8 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-text/60 backdrop-blur-md z-50 md:hidden">
          <div className="w-80 h-full bg-[#1e293b] shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-10 flex items-center justify-between border-b border-white/5">
              <span className="font-bold text-white text-2xl tracking-tighter uppercase">SISTEMA <span className="text-primary">TI</span></span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                <X className="w-7 h-7 text-white/40" />
              </button>
            </div>
            <nav className="p-8 space-y-3">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl text-[16px] font-bold transition-all relative ${
                    location.pathname === item.path
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-white hover:bg-white/5'
                  }`}
                >
                  {location.pathname === item.path && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full" />
                  )}
                  <item.icon className={`w-6 h-6 ${location.pathname === item.path ? 'text-white' : 'text-white/60'}`} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

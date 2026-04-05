import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Info, Trash2, Settings, Check } from 'lucide-react';
import { Notification } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    let data = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    // Add sample notifications if empty for demonstration
    if (data.length === 0) {
      data = [
        {
          id: 'sample-1',
          type: 'success',
          title: 'Checklist "Diária" concluído',
          message: 'O checklist de rotina diária foi finalizado por Analista.',
          timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 mins ago
          read: false
        },
        {
          id: 'sample-2',
          type: 'info',
          title: 'Novo ativo "Switch Cisco" criado',
          message: 'Um novo Switch Cisco foi adicionado ao inventário de Telecom.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          read: false
        },
        {
          id: 'sample-3',
          type: 'warning',
          title: '3 checklists pendentes >24h',
          message: 'Atenção: Existem procedimentos atrasados que requerem sua atenção.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          read: false
        }
      ];
      localStorage.setItem('notifications', JSON.stringify(data));
    }
    
    setNotifications(data);
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener('notifications-updated', loadNotifications);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('notifications-updated', loadNotifications);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem('notifications', JSON.stringify(updated));
    setNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('notifications', JSON.stringify(updated));
    setNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    localStorage.setItem('notifications', JSON.stringify(updated));
    setNotifications(updated);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all relative active:scale-95"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Desktop Dropdown */}
          <div className="hidden md:block absolute right-0 mt-3 w-[400px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-[#1E293B] uppercase tracking-tight">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black rounded-full uppercase tracking-widest">
                    {unreadCount} Novas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={markAllAsRead}
                  className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  Marcar todas
                </button>
                <button className="p-2 hover:bg-white rounded-xl transition-all text-slate-400">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[450px] overflow-y-auto divide-y divide-slate-50">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-5 flex gap-4 hover:bg-slate-50 transition-all group relative ${!n.read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className={`mt-1 p-2 rounded-xl flex-shrink-0 ${
                      n.type === 'success' ? 'bg-emerald-50' : 
                      n.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                    }`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-black uppercase tracking-tight truncate ${!n.read ? 'text-blue-600' : 'text-slate-900'}`}>
                          {n.title}
                        </p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {format(new Date(n.timestamp), 'HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {!n.read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="p-1.5 hover:bg-white rounded-lg text-blue-600 shadow-sm transition-all"
                          title="Marcar como lida"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(n.id)}
                        className="p-1.5 hover:bg-white rounded-lg text-red-500 shadow-sm transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma notificação</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50/50 border-t border-slate-50 text-center">
              <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-all">
                Ver histórico completo
              </button>
            </div>
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="md:hidden fixed inset-0 z-[100] animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[3rem] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-500">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4" />
              
              <div className="px-8 pb-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#1E293B] uppercase tracking-tight">Notificações</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {unreadCount} novas mensagens
                  </p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-3 bg-slate-100 rounded-2xl">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-5 rounded-3xl border transition-all flex gap-4 ${
                        !n.read ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'
                      }`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className={`p-3 rounded-2xl h-fit ${
                        n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                        n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-black uppercase tracking-tight text-slate-900">{n.title}</p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(new Date(n.timestamp), 'HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Tudo limpo por aqui!</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4">
                <button 
                  onClick={markAllAsRead}
                  className="py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                >
                  Marcar todas
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

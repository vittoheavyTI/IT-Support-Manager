import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  CheckSquare, 
  Package, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
  Network,
  Smartphone,
  Database,
  MessageSquare,
  CheckCircle2,
  Calendar,
  BarChart3,
  Radio,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { where } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { usePermissions } from '../hooks/usePermissions';
import { ChecklistItem, Company, Asset } from '../types';
import { format, parseISO, isToday, differenceInDays, startOfDay, isBefore, setHours, setMinutes } from 'date-fns';

export default function Dashboard({ selectedCompanyId }: { selectedCompanyId?: string }) {
  const navigate = useNavigate();
  const { permissions, loading: loadingPerms, isAdmin } = usePermissions(selectedCompanyId || null);
  const { data: checklists } = useFirestore<ChecklistItem>('checklists', 
    selectedCompanyId ? [where('companyId', '==', selectedCompanyId)] : [],
    !loadingPerms && (isAdmin || permissions?.checklists),
    [selectedCompanyId]
  );
  const { data: companies } = useFirestore<Company>('companies');
  const { data: assets } = useFirestore<Asset>('inventory_assets',
    selectedCompanyId ? [where('companyId', '==', selectedCompanyId)] : [],
    !loadingPerms && (isAdmin || permissions?.inventario),
    [selectedCompanyId]
  );

  const [analystStats, setAnalystStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    blocked: 0,
    inpasa: 0,
    outras: 0
  });

  const calculateAnalystStats = () => {
    const analysts = JSON.parse(localStorage.getItem('analysts') || '[]');
    const now = Date.now();
    const online = analysts.filter((a: any) => now - (a.last_seen || 0) < 5 * 60 * 1000).length;
    const offline = analysts.filter((a: any) => now - (a.last_seen || 0) >= 5 * 60 * 1000 && now - (a.last_seen || 0) < 30 * 60 * 1000 && !a.blocked).length;
    const blocked = analysts.filter((a: any) => a.blocked).length;
    const inpasa = analysts.filter((a: any) => a.unidades?.includes('Inpasa')).length;
    const total = analysts.length;
    const outras = total - inpasa;

    setAnalystStats({ total, online, offline, blocked, inpasa, outras });
  };

  useEffect(() => {
    calculateAnalystStats();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'analysts') calculateAnalystStats();
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(calculateAnalystStats, 30000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const inventoryStats = useMemo(() => {
    const safeAssets = Array.isArray(assets) ? assets : [];
    const filtered = safeAssets.filter(a => !selectedCompanyId || a.companyId === selectedCompanyId);
    
    const ti = filtered.filter(a => {
      const div = String(a.divisao || a.division || '').toLowerCase();
      return div === 'ti' || div === 'informatica' || div === 'informática';
    });
    const telecom = filtered.filter(a => String(a.divisao || a.division || '').toLowerCase() === 'telecom');
    const ativos = filtered.filter(a => a.status === 'ativo');
    const manutencao = filtered.filter(a => a.status === 'manutencao');
    const inativos = filtered.filter(a => a.status === 'inativo');

    return {
      total: filtered.length,
      ti: ti.length,
      telecom: telecom.length,
      ativos: ativos.length,
      manutencao: manutencao.length,
      inativos: inativos.length
    };
  }, [assets, selectedCompanyId]);

  const stats = useMemo(() => {
    const safeChecklists = Array.isArray(checklists) ? checklists : [];
    const filtered = safeChecklists.filter(c => !selectedCompanyId || c.companyId === selectedCompanyId);
    const total = filtered.length;
    const completed = filtered.filter(c => c.completed).length;
    const pending = total - completed;
    const completedPercent = total ? Math.round((completed / total) * 100) : 0;
    const pendingPercent = total ? Math.round((pending / total) * 100) : 0;

    // SLA Calculation: completed before or on nextDate
    const itemsWithDate = filtered.filter(c => c.nextDate);
    const totalWithDate = itemsWithDate.length;
    const slaOnTime = itemsWithDate.filter(c => 
      c.completed && 
      c.completedAt && 
      new Date(c.completedAt) <= new Date(c.nextDate)
    ).length;
    
    const slaPercent = totalWithDate ? Math.round((slaOnTime / totalWithDate) * 100) : 0;

    // Calcula o próximo reset mais próximo
    const nextResets = filtered.map(item => {
      const now = new Date();
      const today = startOfDay(now);
      let resetHorarios = item.resetHorarios || ['00:00'];
      
      if (!item.resetHorarios) {
        if (item.frequencia === 'manhã') resetHorarios = ['08:00'];
        else if (item.frequencia === 'tarde') resetHorarios = ['14:00'];
        else if (item.frequencia === 'noite') resetHorarios = ['20:00'];
        else if (item.frequencia === 'manhã_tarde') resetHorarios = ['08:00', '14:00'];
        else if (item.frequencia === 'manhã_noite') resetHorarios = ['08:00', '20:00'];
        else if (item.frequencia === 'tarde_noite') resetHorarios = ['14:00', '20:00'];
        else if (item.frequencia === '3x_dia') resetHorarios = ['08:00', '14:00', '20:00'];
        else resetHorarios = ['00:00'];
      }

      const times = resetHorarios.map(h => {
        const [hours, minutes] = h.split(':').map(Number);
        let resetTime = setMinutes(setHours(today, hours), minutes);
        if (isBefore(resetTime, now)) {
          resetTime = setMinutes(setHours(startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000)), hours), minutes);
        }
        return resetTime;
      });

      times.sort((a, b) => a.getTime() - b.getTime());
      return times[0];
    });

    const nextResetDate = nextResets.length > 0 ? new Date(Math.min(...nextResets.map(d => d.getTime()))) : null;

    return {
      total,
      completed,
      completedPercent,
      pending,
      pendingPercent,
      slaPercent,
      slaOnTime,
      totalWithDate,
      nextReset: nextResetDate ? format(nextResetDate, 'HH:mm') : '--:--'
    };
  }, [checklists, selectedCompanyId]);

  const slaDetails = useMemo(() => {
    const safeChecklists = Array.isArray(checklists) ? checklists : [];
    const filtered = safeChecklists.filter(c => !selectedCompanyId || c.companyId === selectedCompanyId);
    const total = filtered.length;
    const onTime = filtered.filter(c => 
      c.completed && 
      c.completedAt && 
      c.nextDate && 
      new Date(c.completedAt) <= new Date(c.nextDate)
    ).length;

    const delayed = filtered.filter(c => 
      c.completed && 
      c.completedAt && 
      c.nextDate && 
      new Date(c.completedAt) > new Date(c.nextDate)
    );

    const noNextDate = filtered.filter(c => c.completed && !c.nextDate).length;

    const maxDelay = delayed.length > 0 
      ? Math.max(...delayed.map(c => differenceInDays(new Date(c.completedAt!), new Date(c.nextDate!))))
      : 0;

    return {
      onTime,
      total,
      delayedCount: delayed.length,
      maxDelay,
      noNextDate
    };
  }, [checklists, selectedCompanyId]);

  const recentActivities = useMemo(() => {
    const safeChecklists = Array.isArray(checklists) ? checklists : [];
    const filtered = safeChecklists.filter(c => !selectedCompanyId || c.companyId === selectedCompanyId);
    
    const activities: any[] = [];

    // Add completions
    filtered.filter(c => c.completed && c.completedAt).forEach(c => {
      activities.push({
        id: `comp-${c.id}`,
        type: 'checklist',
        user: 'Analista',
        action: 'concluiu',
        target: c.title,
        time: format(parseISO(c.completedAt!), 'dd/MM HH:mm'),
        timestamp: new Date(c.completedAt!).getTime(),
        icon: CheckCircle2,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600'
      });
    });

    // Add creations
    filtered.forEach(c => {
      activities.push({
        id: `create-${c.id}`,
        type: 'creation',
        user: 'Sistema',
        action: 'criou checklist',
        target: c.title,
        time: format(parseISO(c.createdAt), 'dd/MM HH:mm'),
        timestamp: new Date(c.createdAt).getTime(),
        icon: Plus,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
      });
    });

    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }, [checklists, selectedCompanyId]);

  const dashboardCards = [
    { label: 'Total de Checklists', value: stats.total.toString(), icon: CheckSquare, color: 'text-primary', bg: 'bg-primary-soft', trend: `Reset: ${stats.nextReset}`, trendUp: true },
    { label: 'Concluídos', value: stats.completed.toString(), icon: CheckCircle2, color: 'text-success', bg: 'bg-success-soft', trend: `${stats.completedPercent}% do total`, trendUp: true },
    { label: 'Pendentes', value: stats.pending.toString(), icon: Clock, color: 'text-warning', bg: 'bg-warning-soft', trend: `${stats.pendingPercent}% do total`, trendUp: false },
    { label: 'SLA no Prazo', value: `${stats.slaPercent}%`, icon: BarChart3, color: stats.slaPercent >= 90 ? 'text-success' : stats.slaPercent >= 70 ? 'text-warning' : 'text-danger', bg: stats.slaPercent >= 90 ? 'bg-success-soft' : stats.slaPercent >= 70 ? 'bg-warning-soft' : 'bg-danger-soft', trend: 'Métrica de SLA', trendUp: stats.slaPercent > 80 },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text uppercase tracking-tighter">DASHBOARD <span className="text-primary">GERAL</span></h1>
          <p className="text-text-muted font-semibold text-[10px] uppercase tracking-wider mt-2">Visão consolidada da infraestrutura de TI</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-semibold text-text-muted/40 uppercase tracking-wider">Status do Sistema</p>
            <p className="text-xs font-semibold text-success uppercase">100% Operacional</p>
          </div>
          <div className="w-3 h-3 bg-success rounded-full animate-pulse shadow-lg shadow-success/50"></div>
        </div>
      </div>

      {/* SECTION: CHECKLISTS */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 border-b border-border pb-5">
          <div className="p-4 bg-primary-soft rounded-2xl border border-primary/10">
            <CheckSquare className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-sm font-black text-text uppercase tracking-widest">Checklists Diários</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {dashboardCards.map((stat, index) => (
            <div key={index} className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="flex items-center justify-between mb-8">
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 border border-current/10`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                {stat.trendUp !== null && (
                  <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${stat.trendUp ? 'text-success' : 'text-danger'} bg-bg px-3 py-1.5 rounded-xl border border-border`}>
                    {stat.trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {stat.trend}
                  </div>
                )}
              </div>
              <p className="text-text-muted font-black text-[10px] uppercase tracking-widest mb-2">{stat.label}</p>
              <h3 className="text-4xl font-black text-text tracking-tighter">{stat.value}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: INVENTÁRIO */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 border-b border-border pb-5">
          <div className="p-4 bg-secondary-soft rounded-2xl border border-secondary/10">
            <Package className="w-6 h-6 text-secondary" />
          </div>
          <h2 className="text-sm font-black text-text uppercase tracking-widest">Inventário de Ativos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
            <div>
              <p className="text-text-muted font-black text-[10px] uppercase tracking-widest mb-2">Total de Ativos</p>
              <h3 className="text-4xl font-black text-text tracking-tighter">{inventoryStats.total}</h3>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary-soft px-3 py-1 rounded-lg border border-primary/10">TI: {inventoryStats.ti}</span>
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest bg-secondary-soft px-3 py-1 rounded-lg border border-secondary/10">Telecom: {inventoryStats.telecom}</span>
            </div>
          </div>
          <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
            <div>
              <p className="text-text-muted font-black text-[10px] uppercase tracking-widest mb-2">Status Operacional</p>
              <h3 className="text-4xl font-black text-success tracking-tighter">{inventoryStats.ativos}</h3>
            </div>
            <div className="p-4 bg-success-soft rounded-2xl text-success border border-success/10">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          </div>
          <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
            <div>
              <p className="text-text-muted font-black text-[10px] uppercase tracking-widest mb-2">Atenção Necessária</p>
              <div className="flex items-baseline gap-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-warning uppercase tracking-widest mb-1">Manutenção</span>
                  <h3 className="text-4xl font-black text-warning tracking-tighter">{inventoryStats.manutencao}</h3>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-danger uppercase tracking-widest mb-1">Inativos</span>
                  <h3 className="text-4xl font-black text-danger tracking-tighter">{inventoryStats.inativos}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: ANALISTAS */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 border-b border-border pb-5">
          <div className="p-4 bg-info-soft rounded-2xl border border-info/10">
            <Users className="w-6 h-6 text-info" />
          </div>
          <h2 className="text-sm font-black text-text uppercase tracking-widest">Equipe de Analistas</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm hover:shadow-xl transition-all group">
            <p className="text-text-muted font-black text-[10px] uppercase tracking-widest mb-2">Total Analistas</p>
            <h3 className="text-4xl font-black text-text tracking-tighter">{analystStats.total}</h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest bg-bg px-2 py-1 rounded-lg border border-border">Inpasa: {analystStats.inpasa}</span>
              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest bg-bg px-2 py-1 rounded-lg border border-border">Outras: {analystStats.outras}</span>
            </div>
          </div>
          <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-text-muted font-black text-[10px] uppercase tracking-widest">Online</p>
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            </div>
            <h3 className="text-4xl font-black text-success tracking-tighter">{analystStats.online}</h3>
            <p className="mt-4 text-[9px] font-black text-text-muted uppercase tracking-widest bg-success-soft px-2 py-1 rounded-lg border border-success/10 w-fit">Visto &lt; 5min</p>
          </div>
          <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm hover:shadow-xl transition-all group">
            <p className="text-text-muted font-black text-[10px] uppercase tracking-widest mb-2">Offline</p>
            <h3 className="text-4xl font-black text-text-muted tracking-tighter">{analystStats.offline}</h3>
            <p className="mt-4 text-[9px] font-black text-text-muted uppercase tracking-widest bg-bg px-2 py-1 rounded-lg border border-border w-fit">Visto &gt; 30min</p>
          </div>
          <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm hover:shadow-xl transition-all group">
            <p className="text-text-muted font-black text-[10px] uppercase tracking-widest mb-2">Bloqueados</p>
            <h3 className="text-4xl font-black text-danger tracking-tighter">{analystStats.blocked}</h3>
            <p className="mt-4 text-[9px] font-black text-danger uppercase tracking-widest bg-danger-soft px-2 py-1 rounded-lg border border-danger/10 w-fit">Acesso Restrito</p>
          </div>
        </div>
      </section>

      {/* SECTION: ATIVIDADES RECENTES & SLA */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 border-b border-border pb-5">
          <div className="p-4 bg-bg rounded-2xl border border-border">
            <Activity className="w-6 h-6 text-text-muted/40" />
          </div>
          <h2 className="text-sm font-black text-text uppercase tracking-widest">Monitoramento & SLA</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* SLA Card */}
            <div className="bg-surface p-10 rounded-[3rem] border border-border shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="flex items-center justify-between mb-12 relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-text tracking-tighter uppercase">SLA de Checklists</h3>
                  <p className="text-text-muted font-black text-[10px] uppercase tracking-widest mt-2">Desempenho de entrega no prazo</p>
                </div>
                <div className={`p-6 rounded-[2rem] ${stats.slaPercent >= 90 ? 'bg-success-soft' : stats.slaPercent >= 70 ? 'bg-warning-soft' : 'bg-danger-soft'} border border-current/10`}>
                  <BarChart3 className={`w-10 h-10 ${stats.slaPercent >= 90 ? 'text-success' : stats.slaPercent >= 70 ? 'text-warning' : 'text-danger'}`} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                <div className="space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-success-soft flex items-center justify-center border border-success/10">
                        <CheckCircle2 className="w-8 h-8 text-success" />
                      </div>
                      <div>
                        <p className="text-4xl font-black text-success tracking-tighter">{stats.slaPercent}%</p>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">No Prazo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-danger-soft flex items-center justify-center border border-danger/10">
                        <Clock className="w-8 h-8 text-danger" />
                      </div>
                      <div>
                        <p className="text-4xl font-black text-danger tracking-tighter">{100 - stats.slaPercent}%</p>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Atrasados</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-4 bg-bg rounded-full overflow-hidden flex border border-border p-1">
                    <div className={`h-full rounded-full transition-all duration-1000 ${stats.slaPercent >= 90 ? 'bg-success' : stats.slaPercent >= 70 ? 'bg-warning' : 'bg-danger'} shadow-lg shadow-current/20`} style={{ width: `${stats.slaPercent}%` }} />
                  </div>
                </div>

                <div className="bg-bg p-10 rounded-[2rem] space-y-6 border border-border shadow-inner">
                  <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-border pb-4">Métricas Detalhadas</h4>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-muted">Cumpridos no prazo</span>
                      <span className="text-xs font-black text-success bg-success-soft px-3 py-1 rounded-lg border border-success/10">{stats.slaOnTime}/{stats.totalWithDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-muted">Atraso máximo</span>
                      <span className="text-xs font-black text-danger bg-danger-soft px-3 py-1 rounded-lg border border-danger/10">{slaDetails.maxDelay} dias</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-muted">Sem data fim</span>
                      <span className="text-xs font-black text-text-muted/40 bg-bg px-3 py-1 rounded-lg border border-border">{slaDetails.noNextDate} itens</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-surface rounded-[3rem] border border-border shadow-sm overflow-hidden">
              <div className="p-10 border-b border-border flex items-center justify-between bg-bg/30">
                <h3 className="text-2xl font-black text-text tracking-tighter uppercase">Atividade Recente</h3>
                <button onClick={() => navigate('/checklists')} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline bg-primary-soft px-4 py-2 rounded-xl border border-primary/10">Ver Tudo</button>
              </div>
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto custom-scrollbar">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div key={activity.id} className="p-10 flex items-center justify-between hover:bg-bg transition-all group cursor-pointer border-l-4 border-transparent hover:border-primary">
                      <div className="flex items-center gap-8">
                        <div className={`p-5 rounded-2xl ${activity.iconBg} ${activity.iconColor} border border-current/10 shadow-sm group-hover:scale-110 transition-transform`}>
                          <activity.icon className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-base font-medium text-text leading-relaxed">
                            <span className="font-black text-text uppercase text-xs tracking-tight">{activity.user}</span> <span className="text-text-muted">{activity.action}</span> <span className="text-primary font-black uppercase text-xs tracking-tight">{activity.target}</span>
                          </p>
                          <p className="text-[10px] font-black text-text-muted/40 uppercase tracking-widest mt-2 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {activity.time}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-7 h-7 text-text-muted/20 group-hover:text-primary group-hover:translate-x-2 transition-all" />
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center">
                    <div className="w-20 h-20 bg-bg rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-border">
                      <Activity className="w-10 h-10 text-text-muted/20" />
                    </div>
                    <p className="text-text-muted font-black uppercase text-[10px] tracking-widest">Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Categories */}
          <div className="space-y-10">
            <div className="bg-surface p-10 rounded-[3rem] border border-border shadow-sm">
              <h3 className="text-2xl font-black text-text tracking-tighter uppercase mb-10">Ações Rápidas</h3>
              <div className="space-y-5">
                <button 
                  onClick={() => navigate('/checklists')}
                  className="w-full flex items-center justify-between p-6 bg-primary hover:bg-primary-hover text-white rounded-[1.5rem] transition-all shadow-xl shadow-primary/20 active:scale-95 group"
                >
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Novo Checklist</span>
                  </div>
                  <ChevronRight className="w-6 h-6 opacity-50 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('/inventory')}
                  className="w-full flex items-center justify-between p-6 bg-surface border border-border text-text-muted hover:bg-bg rounded-[1.5rem] transition-all active:scale-95 group"
                >
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-secondary-soft rounded-xl border border-secondary/10">
                      <Package className="w-6 h-6 text-secondary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Ativo</span>
                  </div>
                  <ChevronRight className="w-6 h-6 opacity-30 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('/chat')}
                  className="w-full flex items-center justify-between p-6 bg-surface border border-border text-text-muted hover:bg-bg rounded-[1.5rem] transition-all active:scale-95 group"
                >
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-warning-soft rounded-xl border border-warning/10">
                      <MessageSquare className="w-6 h-6 text-warning" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Chat Suporte</span>
                  </div>
                  <ChevronRight className="w-6 h-6 opacity-30 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="bg-surface p-10 rounded-[3rem] border border-border shadow-sm">
              <h3 className="text-2xl font-black text-text tracking-tighter uppercase mb-10">Categorias TI</h3>
              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: 'Desktop', icon: Monitor, color: 'text-primary', bg: 'bg-primary-soft' },
                  { label: 'Rede', icon: Network, color: 'text-secondary', bg: 'bg-secondary-soft' },
                  { label: 'Mobile', icon: Smartphone, color: 'text-warning', bg: 'bg-warning-soft' },
                  { label: 'Backup', icon: Database, color: 'text-danger', bg: 'bg-danger-soft' },
                ].map((cat, i) => (
                  <div key={i} className="p-6 rounded-[2rem] bg-bg border border-border flex flex-col items-center gap-4 hover:bg-surface hover:shadow-xl transition-all cursor-pointer group hover:border-primary/20">
                    <div className={`p-4 rounded-2xl ${cat.bg} border border-current/10 group-hover:scale-110 transition-transform`}>
                      <cat.icon className={`w-8 h-8 ${cat.color}`} />
                    </div>
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

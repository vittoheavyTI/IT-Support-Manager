import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  User as UserIcon,
  Shield, 
  Bell, 
  Key, 
  Database, 
  Globe, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  XCircle,
  Download,
  FileJson,
  FileSpreadsheet,
  Cloud,
  RefreshCw,
  Activity,
  AlertTriangle,
  History,
  HardDrive,
  Lock,
  Copy,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  ChevronRight,
  Check,
  X,
  Building2,
  LayoutGrid,
  List,
  Zap,
  Briefcase,
  CheckSquare,
  FileText,
  Users,
  Settings2,
  Mail,
  MoreVertical,
  ChevronDown,
  Package
} from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  getDocs, 
  addDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { UserProfile, Asset, ChecklistItem, Company, ImportLog, SystemBackup, AuditLog, DataIntegrityLog, UserCompanyPermission } from '../types';
import { logAudit } from '../hooks/useFirestore';
import { fetchAddressByCEP } from '../lib/cep';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const PERMISSION_KEYS = [
  'inventario', 'checklists', 'relatorios', 'analistas', 'notificacoes', 'configuracoes', 'backups', 'auditoria',
  'inventario_visualizar', 'inventario_criar', 'inventario_editar', 'inventario_excluir', 'inventario_importar', 'inventario_exportar', 'inventario_historico',
  'checklists_visualizar', 'checklists_criar', 'checklists_editar', 'checklists_excluir', 'checklists_executar', 'checklists_concluir', 'checklists_resetar',
  'relatorios_visualizar', 'relatorios_gerar', 'relatorios_exportar', 'relatorios_metricas',
  'analistas_visualizar', 'analistas_criar', 'analistas_editar', 'analistas_bloquear', 'analistas_excluir',
  'empresas_visualizar', 'empresas_criar', 'empresas_editar', 'empresas_excluir', 'empresas_vincular',
  'notificacoes_visualizar', 'notificacoes_criar', 'notificacoes_enviar', 'notificacoes_excluir',
  'admin_visualizar_configs', 'admin_editar_configs', 'admin_database', 'admin_permissoes', 'admin_backup', 'admin_auditoria'
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'database' | 'permissions'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as UserProfile;
        setProfile(data);
        setName(data.displayName || '');
        setPosition(data.position || '');
        setCep(data.cep || '');
        setStreet(data.street || '');
        setNumber(data.number || '');
        setComplement(data.complement || '');
        setNeighborhood(data.neighborhood || '');
        setCity(data.city || '');
        setState(data.state || '');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCep = e.target.value.replace(/\D/g, '');
    setCep(newCep);
    
    if (newCep.length === 8) {
      setSaving(true);
      try {
        const addressData = await fetchAddressByCEP(newCep);
        if (addressData) {
          setStreet(addressData.logradouro);
          setNeighborhood(addressData.bairro);
          setCity(addressData.localidade);
          setState(addressData.uf);
        }
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profile) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: name,
        position,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {showSuccess && (
        <div className="fixed bottom-8 right-8 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-300 z-50 font-bold">
          <CheckCircle2 className="w-6 h-6" />
          PERFIL ATUALIZADO COM SUCESSO!
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">Configurações do Sistema</h1>
          <p className="text-slate-500 font-medium text-sm">Gerencie seu perfil, segurança e preferências do sistema.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Perfil
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'database' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Banco de Dados
          </button>
          <button 
            onClick={() => setActiveTab('permissions')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'permissions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Permissões
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Perfil do Usuário */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-50 rounded-2xl">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Perfil do Usuário</h3>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                  <input
                    type="text"
                    value={name || ''}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                    placeholder="Seu Nome"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Profissional</label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 opacity-50"
                    placeholder="seu@email.com"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Função</label>
                <input
                  type="text"
                  value={position || ''}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                  placeholder="Ex: Analista de TI"
                  required
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Endereço Residencial
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CEP</label>
                    <input type="text" value={cep || ''} onChange={handleCEPChange} placeholder="00000-000" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Rua</label>
                    <input type="text" value={street || ''} onChange={(e) => setStreet(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Número</label>
                    <input type="text" value={number || ''} onChange={(e) => setNumber(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Complemento</label>
                    <input type="text" value={complement || ''} onChange={(e) => setComplement(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Bairro</label>
                    <input type="text" value={neighborhood || ''} onChange={(e) => setNeighborhood(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Cidade</label>
                    <input type="text" value={city || ''} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Estado</label>
                  <input type="text" value={state || ''} onChange={(e) => setState(e.target.value)} placeholder="UF" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                </div>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-50 rounded-2xl">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Segurança e Acesso</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Key className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Autenticação 2FA</p>
                    <p className="text-xs text-slate-500 font-medium">Adicione uma camada extra de segurança.</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all">
                  Configurar
                </button>
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Database className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Logs de Atividade</p>
                    <p className="text-xs text-slate-500 font-medium">Veja quem acessou o sistema e quando.</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all">
                  Visualizar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preferências */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Preferências</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">Notificações Push</span>
                </div>
                <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">Idioma do Sistema</span>
                </div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Português (BR)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck className="w-24 h-24 text-white" />
            </div>
            <h4 className="text-white font-black text-lg uppercase tracking-tight mb-2 relative z-10">Suporte Premium</h4>
            <p className="text-slate-400 text-xs font-medium mb-6 relative z-10">Precisa de ajuda com as configurações avançadas?</p>
            <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all relative z-10">
              Falar com Especialista
            </button>
          </div>
        </div>
      </div>
    ) : activeTab === 'database' ? (
      <DatabaseSettings />
    ) : (
      <PermissionSettings />
    )}
    </div>
  );
}

function DatabaseSettings() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [integrityLogs, setIntegrityLogs] = useState<DataIntegrityLog[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    integrity: string;
    latency: string;
    lastSync: string;
    issues: string[];
  }>({
    integrity: 'Não verificado',
    latency: '0ms',
    lastSync: 'Nunca',
    issues: []
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const collections = [
        'inventory_assets', 
        'checklists', 
        'companies', 
        'inventory_import_logs', 
        'notifications',
        'audit_logs',
        'data_integrity_logs',
        'system_backups'
      ];
      const newStats: Record<string, number> = {};
      
      for (const col of collections) {
        const snapshot = await getDocs(collection(db, col));
        newStats[col] = snapshot.size;
      }
      
      setStats(newStats);

      // Fetch recent import logs
      const logsQuery = query(collection(db, 'inventory_import_logs'), orderBy('criadoEm', 'desc'), limit(5));
      const logsSnapshot = await getDocs(logsQuery);
      setImportLogs(logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImportLog)));

      // Fetch recent audit logs
      const auditQuery = query(collection(db, 'audit_logs'), orderBy('criadoEm', 'desc'), limit(10));
      const auditSnapshot = await getDocs(auditQuery);
      setAuditLogs(auditSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));

      // Fetch recent integrity logs
      const integrityQuery = query(collection(db, 'data_integrity_logs'), orderBy('criadoEm', 'desc'), limit(5));
      const integritySnapshot = await getDocs(integrityQuery);
      setIntegrityLogs(integritySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DataIntegrityLog)));
      
      setConnectionStatus('online');
      setDiagnostics(prev => ({ ...prev, lastSync: new Date().toLocaleTimeString() }));
    } catch (error) {
      console.error('Error fetching database stats:', error);
      setConnectionStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const runDiagnostics = async () => {
    setDiagnosing(true);
    const start = Date.now();
    const issues: string[] = [];
    
    try {
      // Latency check
      await getDocs(query(collection(db, 'system_settings'), limit(1)));
      const latency = Date.now() - start;

      // Integrity check (sample)
      const assetsSnapshot = await getDocs(query(collection(db, 'inventory_assets'), limit(50)));
      let invalidCount = 0;
      assetsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!data.uniqueKey || !data.divisao || !data.status) invalidCount++;
      });

      if (invalidCount > 0) {
        issues.push(`${invalidCount} ativos com campos obrigatórios ausentes ou inválidos.`);
      }

      setDiagnostics({
        latency: `${latency}ms`,
        integrity: invalidCount === 0 ? '100% OK' : `${((assetsSnapshot.size - invalidCount) / assetsSnapshot.size * 100).toFixed(0)}%`,
        lastSync: new Date().toLocaleTimeString(),
        issues
      });

      if (issues.length > 0) {
        toast.warning('Diagnóstico concluído com alertas.');
      } else {
        toast.success('Sistema íntegro e sincronizado!');
      }
    } catch (error) {
      toast.error('Falha ao executar diagnóstico.');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleLocalBackup = async () => {
    setBackingUp(true);
    try {
      const backupData: any = {
        metadata: {
          geradoEm: new Date().toISOString(),
          versaoSistema: '3.0.0',
          origem: 'manual',
          totalRegistros: Object.values(stats).reduce((a: number, b: number) => a + b, 0)
        },
        data: {}
      };

      const collections = ['inventory_assets', 'checklists', 'companies', 'inventory_import_logs', 'notifications', 'users'];
      for (const col of collections) {
        const snapshot = await getDocs(collection(db, col));
        backupData.data[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_profissional_inpasa_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      // Log backup
      await addDoc(collection(db, 'system_backups'), {
        tipo: 'manual',
        destino: 'local',
        status: 'sucesso',
        resumo: 'Backup JSON completo exportado localmente',
        totalRegistros: backupData.metadata.totalRegistros,
        tamanhoEstimado: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        criadoEm: new Date().toISOString(),
        usuario: auth.currentUser?.email,
        metadata: backupData.metadata
      });

      toast.success('Backup JSON gerado e registrado!');
      fetchStats();
    } catch (error) {
      console.error('Backup Error:', error);
      toast.error('Erro ao gerar backup.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleExcelBackup = async () => {
    setBackingUp(true);
    try {
      const wb = XLSX.utils.book_new();
      
      const collections = ['inventory_assets', 'checklists', 'companies', 'users'];
      let total = 0;
      for (const col of collections) {
        const snapshot = await getDocs(collection(db, col));
        total += snapshot.size;
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          delete d.photo;
          delete d.imagemUrl;
          return d;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, col.replace('inventory_', ''));
      }

      XLSX.writeFile(wb, `backup_excel_profissional_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Log backup
      await addDoc(collection(db, 'system_backups'), {
        tipo: 'manual',
        destino: 'local',
        status: 'sucesso',
        resumo: 'Backup Excel exportado localmente',
        totalRegistros: total,
        tamanhoEstimado: 'N/A',
        criadoEm: new Date().toISOString(),
        usuario: auth.currentUser?.email,
        metadata: {
          geradoEm: new Date().toISOString(),
          versaoSistema: '3.0.0',
          origem: 'manual',
          counts: stats
        }
      });

      toast.success('Backup Excel gerado e registrado!');
      fetchStats();
    } catch (error) {
      console.error('Excel Backup Error:', error);
      toast.error('Erro ao gerar backup Excel.');
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Visão Geral do Banco */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Arquitetura de Dados</h3>
                  <p className="text-xs text-slate-500 font-medium">Firebase Firestore como Fonte Principal da Verdade</p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${connectionStatus === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${connectionStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{connectionStatus}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inventário</p>
                <p className="text-2xl font-black text-slate-900">{stats.inventory_assets || 0}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Checklists</p>
                <p className="text-2xl font-black text-slate-900">{stats.checklists || 0}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresas</p>
                <p className="text-2xl font-black text-slate-900">{stats.companies || 0}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logs</p>
                <p className="text-2xl font-black text-slate-900">{(stats.audit_logs || 0) + (stats.data_integrity_logs || 0)}</p>
              </div>
            </div>
          </div>

          {/* Logs de Auditoria */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 rounded-2xl">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Logs de Auditoria</h3>
                  <p className="text-xs text-slate-500 font-medium">Rastreabilidade total de operações críticas</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {auditLogs.length > 0 ? auditLogs.map(log => (
                <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        log.acao === 'CREATE' ? 'bg-emerald-100 text-emerald-600' :
                        log.acao === 'UPDATE' ? 'bg-blue-100 text-blue-600' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        {log.acao}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.modulo}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{new Date(log.criadoEm).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mb-1">{log.resumo}</p>
                  <p className="text-[9px] font-medium text-slate-400">Usuário: {log.usuario}</p>
                </div>
              )) : (
                <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum log de auditoria</p>
                </div>
              )}
            </div>
          </div>

          {/* Integridade dos Dados */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-50 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Integridade dos Dados</h3>
                  <p className="text-xs text-slate-500 font-medium">Inconsistências e falhas de validação detectadas</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {integrityLogs.length > 0 ? integrityLogs.map(log => (
                <div key={log.id} className="flex items-start gap-4 p-6 bg-rose-50/30 rounded-3xl border border-rose-100">
                  <div className={`p-2 rounded-xl ${
                    log.severidade === 'alta' ? 'bg-rose-100 text-rose-600' :
                    log.severidade === 'media' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{log.tipoProblema}</p>
                      <span className="text-[9px] font-bold text-slate-400">{new Date(log.criadoEm).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mb-2">{log.descricao}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Módulo: {log.modulo}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        log.resolvido ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {log.resolvido ? 'Resolvido' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 bg-emerald-50 rounded-3xl border border-dashed border-emerald-200">
                  <p className="text-emerald-600 font-black text-xs uppercase tracking-widest">Nenhuma inconsistência detectada</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Backup e Restauração */}
          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <HardDrive className="w-32 h-32 text-white" />
            </div>
            
            <h3 className="text-xl font-black uppercase tracking-tight mb-2 relative z-10">Backup Profissional</h3>
            <p className="text-slate-400 text-xs font-medium mb-8 relative z-10">Versionamento e persistência de cópias de segurança.</p>
            
            <div className="space-y-4 relative z-10">
              <button 
                onClick={handleLocalBackup}
                disabled={backingUp}
                className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <FileJson className="w-5 h-5 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Exportar JSON</span>
                </div>
                <Download className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button 
                onClick={handleExcelBackup}
                disabled={backingUp}
                className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Exportar Excel</span>
                </div>
                <Download className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <div className="pt-4 border-t border-white/5 mt-4">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Cloud className="w-5 h-5 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">OneDrive</span>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded text-[8px] font-black uppercase tracking-widest">Desconectado</span>
                  </div>
                  <button 
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                  >
                    Conectar OneDrive
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnóstico de Sincronização */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Diagnóstico de Sincronização
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integridade</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${diagnostics.integrity === '100% OK' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {diagnostics.integrity}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latência</span>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{diagnostics.latency}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Sinc.</span>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{diagnostics.lastSync}</span>
              </div>

              {diagnostics.issues.length > 0 && (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2">Problemas Detectados:</p>
                  <ul className="space-y-1">
                    {diagnostics.issues.map((issue, idx) => (
                      <li key={idx} className="text-[9px] text-rose-500 font-bold leading-tight">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2 mt-4">
                <button 
                  onClick={runDiagnostics}
                  disabled={diagnosing}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <RefreshCw className={`w-4 h-4 ${diagnosing ? 'animate-spin' : ''}`} />
                  {diagnosing ? 'Diagnosticando...' : 'Validar Integridade'}
                </button>
                <button 
                  onClick={fetchStats}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Reprocessar Sincronização
                </button>
              </div>
            </div>
          </div>

          {/* Segurança e Permissões */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Segurança
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Regras Firestore</p>
                <p className="text-xs font-bold text-slate-700">V3.0 - Acesso Restrito por Perfil</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Backup Automático</p>
                <p className="text-xs font-bold text-slate-700">Preparado para Cron Job Diário</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionSettings() {
  const [permissions, setPermissions] = useState<UserCompanyPermission[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [analysts, setAnalysts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Partial<UserCompanyPermission> | null>(null);
  
  // UX States
  const [viewMode, setViewMode] = useState<'company' | 'analyst'>('company');
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterAnalyst, setFilterAnalyst] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);


    useEffect(() => {
      setLoading(true);
      const unsubPerms = onSnapshot(collection(db, 'user_company_permissions'), (snapshot) => {
        setPermissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserCompanyPermission)));
        setLoading(false);
      }, (err) => { 
        console.error("Erro Permissões:", err);
        setLoading(false);
      });
  
      const unsubCompanies = onSnapshot(collection(db, 'companies'), (snapshot) => {
        setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
      }, (err) => console.error("Erro Empresas:", err));
  
      const unsubAnalysts = onSnapshot(collection(db, 'users'), (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        console.log(`[DEBUG] Settings: ${users.length} usuários carregados.`);
        setAnalysts(users);
      }, (err) => { 
        console.warn("Analistas: Acesso limitado. Tentando fallback...", err);
        // Fallback: Se não puder listar todos, pelo menos o usuário atual deve aparecer via Auth se ele existir no banco
        if (auth.currentUser) {
          const currentDoc = doc(db, 'users', auth.currentUser.uid);
          getDoc(currentDoc).then(d => {
            if (d.exists()) setAnalysts([{ id: d.id, ...d.data() } as UserProfile]);
          });
        }
      });
  
      return () => { unsubPerms(); unsubCompanies(); unsubAnalysts(); };
    }, []);

  const CATEGORIES = [
    { id: 'inventario', label: 'Inventário', icon: Package, perms: [{ id: 'inventario_visualizar', label: 'Visualizar' }, { id: 'inventario_criar', label: 'Criar' }, { id: 'inventario_editar', label: 'Editar' }, { id: 'inventario_excluir', label: 'Excluir' }, { id: 'inventario_importar', label: 'Importar' }, { id: 'inventario_exportar', label: 'Exportar' }, { id: 'inventario_historico', label: 'Histórico' }] },
    { id: 'checklists', label: 'Checklists', icon: CheckSquare, perms: [{ id: 'checklists_visualizar', label: 'Visualizar' }, { id: 'checklists_criar', label: 'Criar' }, { id: 'checklists_editar', label: 'Editar' }, { id: 'checklists_excluir', label: 'Excluir' }, { id: 'checklists_executar', label: 'Executar' }, { id: 'checklists_concluir', label: 'Concluir' }, { id: 'checklists_resetar', label: 'Resetar' }] },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, perms: [{ id: 'relatorios_visualizar', label: 'Visualizar' }, { id: 'relatorios_gerar', label: 'Gerar' }, { id: 'relatorios_exportar', label: 'Exportar' }, { id: 'relatorios_metricas', label: 'Métricas' }] },
    { id: 'analistas', label: 'Analistas', icon: Users, perms: [{ id: 'analistas_visualizar', label: 'Visualizar' }, { id: 'analistas_criar', label: 'Criar' }, { id: 'analistas_editar', label: 'Editar' }, { id: 'analistas_bloquear', label: 'Bloquear' }, { id: 'analistas_excluir', label: 'Excluir' }] },
    { id: 'empresas', label: 'Empresas', icon: Building2, perms: [{ id: 'empresas_visualizar', label: 'Visualizar' }, { id: 'empresas_criar', label: 'Criar' }, { id: 'empresas_editar', label: 'Editar' }, { id: 'empresas_excluir', label: 'Excluir' }, { id: 'empresas_vincular', label: 'Vincular Analista' }] },
    { id: 'notificacoes', label: 'Notificações', icon: Mail, perms: [{ id: 'notificacoes_visualizar', label: 'Visualizar' }, { id: 'notificacoes_criar', label: 'Criar' }, { id: 'notificacoes_enviar', label: 'Enviar' }, { id: 'notificacoes_excluir', label: 'Excluir' }] },
    { id: 'admin', label: 'Administração', icon: Settings2, perms: [{ id: 'admin_visualizar_configs', label: 'Ver Configs' }, { id: 'admin_editar_configs', label: 'Editar Configs' }, { id: 'admin_database', label: 'Banco de Dados' }, { id: 'admin_permissoes', label: 'Permissões' }, { id: 'admin_backup', label: 'Backup' }, { id: 'admin_auditoria', label: 'Auditoria' }] }
  ];

  const PACKAGES = {
    'Completo': { isAdmin: true, desc: 'Acesso total a todos os módulos e configurações.' },
    'Operacional': { permissions: ['inventario_visualizar', 'checklists_visualizar', 'checklists_executar', 'checklists_concluir', 'relatorios_visualizar', 'notificacoes_visualizar'], desc: 'Equilíbrio entre consulta e execução diária.' },
    'Somente Leitura': { permissions: ['inventario_visualizar', 'checklists_visualizar', 'relatorios_visualizar'], desc: 'Acesso seguro apenas para visualização de dados.' },
    'Inventário Avançado': { permissions: ['inventario_visualizar', 'inventario_criar', 'inventario_editar', 'inventario_importar', 'inventario_exportar'], desc: 'Foco total na gestão de ativos e estoques.' },
    'Checklists Operacionais': { permissions: ['checklists_visualizar', 'checklists_executar', 'checklists_concluir'], desc: 'Específico para execução de rotinas de suporte.' },
    'Gestão de Analistas': { permissions: ['analistas_visualizar', 'analistas_criar', 'analistas_editar', 'analistas_bloquear'], desc: 'Administração de recursos humanos e acessos.' },
    'Gestão de Empresas': { permissions: ['empresas_visualizar', 'empresas_criar', 'empresas_editar', 'empresas_vincular'], desc: 'Configuração e vínculo de novas unidades.' },
    'Banco + Auditoria': { permissions: ['admin_database', 'admin_backup', 'admin_auditoria'], desc: 'Manutenção técnica e segurança dos dados.' }
  };

  const applyPackage = (packageName: keyof typeof PACKAGES) => {
    const pkg = PACKAGES[packageName];
    const newPerms: any = {};
    PERMISSION_KEYS.forEach(k => newPerms[k] = false);
    
    if ((pkg as any).isAdmin) {
      PERMISSION_KEYS.forEach(k => newPerms[k] = true);
    } else {
      (pkg as any).permissions.forEach((p: string) => { newPerms[p] = true; });
    }
    setEditingPerm(prev => ({ ...prev, permissoes: newPerms }));
    toast.success(`Pacote ${packageName} aplicado`);
  };

  const cleanObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
          newObj[key] = cleanObject(val);
        } else {
          newObj[key] = val;
        }
      }
    });
    return newObj;
  };

  const handleSave = async () => {
    if (!editingPerm?.userId || !editingPerm?.companyId) {
      toast.error('Selecione analista e empresa'); return;
    }

    // Sanitização rigorosa dos IDs para evitar erros de path no Firestore
    const cleanUserId = String(editingPerm.userId).trim().replace(/[/ \s]/g, '_');
    const cleanCompanyId = String(editingPerm.companyId).trim().replace(/[/ \s]/g, '_');
    
    if (!cleanUserId || !cleanCompanyId) {
      toast.error('IDs de analista ou empresa inválidos'); return;
    }

    const permId = `${cleanUserId}_${cleanCompanyId}`;
    const now = new Date().toISOString();
    
    try {
      setSaving(true);
      
      // Normalização de Role
      const roleInput = String(editingPerm.role || 'analyst').toLowerCase();
      const finalRole = (roleInput === 'administrador' || roleInput === 'admin') ? 'admin' : 
                        (roleInput === 'gerente' || roleInput === 'manager') ? 'manager' : 'analyst';
      
      // Normalização de Permissões (Booleans garantidos)
      const normalizedPerms: any = {};
      PERMISSION_KEYS.forEach(k => { 
        normalizedPerms[k] = Boolean((editingPerm.permissoes as any)?.[k]); 
      });

      const rawData = {
        userId: cleanUserId,
        companyId: cleanCompanyId,
        id: permId,
        role: finalRole as 'admin' | 'manager' | 'analyst',
        permissoes: normalizedPerms,
        criadoEm: editingPerm.criadoEm || now,
        atualizadoEm: now,
        version: Number(editingPerm.version || 0) + 1
      };

      const saveData = cleanObject(rawData);
      console.log("[DEBUG] Salvando permissão:", permId, saveData);
      
      // Validação de segurança no Client
      if (saveData.id !== permId) {
        throw new Error("Mismatch detectado no ID do documento.");
      }

      // Escrita Principal
      await setDoc(doc(db, 'user_company_permissions', permId), saveData);
      
      // Atualização do Perfil do Analista (Sincronização de campos de acesso)
      const analyst = analysts.find(a => a.id === cleanUserId);
      if (analyst) {
        const setCompanies = new Set([
          ...Array.isArray(analyst.assignedCompanies) ? analyst.assignedCompanies : [],
          ...Array.isArray(analyst.empresasComAcesso) ? analyst.empresasComAcesso : [],
          cleanCompanyId
        ]);
        
        const updatedList = Array.from(setCompanies);
        
        console.log("[DEBUG] Sincronizando perfil do analista:", analyst.id, updatedList);
        try {
          await updateDoc(doc(db, 'users', analyst.id), { 
            assignedCompanies: updatedList,
            empresasComAcesso: updatedList,
            atualizadoEm: now
          });
        } catch (updateErr) {
          console.warn("[DEBUG] Erro ao sincronizar perfil (não impeditivo):", updateErr);
        }
      }

      toast.success('Permissões salvas com sucesso'); 
      setShowModal(false); 
      setEditingPerm(null);
    } catch (error: any) { 
      console.error("[ERRO CRÍTICO] Falha no handleSave:", error);
      let errorMsg = `Erro ao salvar: ${error.message || 'Erro de rede ou permissão'}`;
      
      if (error.message?.includes('assertion failed')) {
        errorMsg = "Erro interno do Firestore (Assertion Failure). Verifique se o banco de dados está online.";
      } else if (error.code === 'permission-denied') {
        errorMsg = "Você não tem permissão administrativa para salvar alterações.";
      }
      
      toast.error(errorMsg); 
    } finally { 
      setSaving(false); 
    }
  };

  const stats = useMemo(() => ({
    companies: new Set(permissions.map(p => p.companyId)).size,
    analysts: new Set(permissions.map(p => p.userId)).size,
    activePerms: permissions.length,
    mostUsedPkg: 'Operacional'
  }), [permissions]);

  const filteredPermissions = permissions.filter(p => {
    const analyst = analysts.find(a => a.id === p.userId);
    const company = companies.find(c => c.id === p.companyId);
    const matchesSearch = !searchQuery || analyst?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = filterCompany === 'all' || p.companyId === filterCompany;
    const matchesAnalyst = filterAnalyst === 'all' || p.userId === filterAnalyst;
    const matchesRole = filterRole === 'all' || p.role === filterRole;
    return matchesSearch && matchesCompany && matchesAnalyst && matchesRole;
  });

  const toggleExpand = (id: string) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* PAINEL DE DIAGNÓSTICO (Ocultável) */}
      <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Zap className="w-24 h-24" /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500 rounded-xl"><Shield className="w-5 h-5 text-white" /></div>
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Console de Diagnóstico de Acesso</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Logado como</p>
              <p className="text-xs font-bold truncate">{auth.currentUser?.email || 'Nenhum e-mail'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">ID do Banco</p>
              <p className="text-[10px] font-mono text-blue-300 truncate">ai-studio-67e4ee0a...</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sua UID</p>
              <p className="text-[10px] font-mono text-slate-400 truncate">{auth.currentUser?.uid}</p>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl">
              <div className={`w-3 h-3 rounded-full ${analysts.find(a => a.id === auth.currentUser?.uid)?.role === 'admin' || auth.currentUser?.email === 'admin@ti.com' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Status Admin: {analysts.find(a => a.id === auth.currentUser?.uid)?.role === 'admin' || auth.currentUser?.email === 'admin@ti.com' ? 'ATIVO' : 'BLOQUEADO'}
              </p>
            </div>
          </div>
          {auth.currentUser?.email !== 'admin@ti.com' && (
            <p className="mt-4 text-[9px] text-amber-300 font-bold uppercase italic">
              * Aviso: Seu e-mail não corresponde ao Administrador Master configurado nas regras.
            </p>
          )}
        </div>
      </div>

      {/* BLOCO 1: FILTROS E AÇÕES */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou empresa..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <select onChange={e => setFilterCompany(e.target.value)} value={filterCompany} className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none">
          <option value="all">Unidades</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.nome || c.name}</option>)}
        </select>
        <select onChange={e => setFilterRole(e.target.value)} value={filterRole} className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none">
          <option value="all">Role</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="analyst">Analyst</option>
        </select>
        <div className="flex gap-2 ml-auto">
          <button 
            onClick={() => { 
              const initialPerms: any = {};
              PERMISSION_KEYS.forEach(k => initialPerms[k] = false);
              setEditingPerm({ role: 'analyst', permissoes: initialPerms }); 
              setShowModal(true); 
            }} 
            className="flex items-center gap-2 px-6 h-12 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100/50 hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Nova Permissão
          </button>
        </div>
      </div>

      {/* BLOCO 2: RESUMO EXECUTIVO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Unidades Configuradas', value: stats.companies, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Analistas Vinculados', value: stats.analysts, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Permissões Ativas', value: stats.activePerms, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pacote Sugerido', value: stats.mostUsedPkg, icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-50' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
            <div className={`p-3 ${item.bg} rounded-2xl`}> <item.icon className={`w-5 h-5 ${item.color}`} /> </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-lg font-black text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* BLOCO 3: LISTA ORGANIZADA */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('company')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'company' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Por Unidade</button>
            <button onClick={() => setViewMode('analyst')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'analyst' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Por Analista</button>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setLayoutMode('list')} className={`p-1.5 rounded-lg transition-all ${layoutMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><List className="w-3.5 h-3.5" /></button>
            <button onClick={() => setLayoutMode('grid')} className={`p-1.5 rounded-lg transition-all ${layoutMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="p-0">
          {viewMode === 'company' ? (
            <div className="divide-y divide-slate-50">
              {companies.filter(c => filterCompany === 'all' || c.id === filterCompany).map(company => {
                const perms = filteredPermissions.filter(p => p.companyId === company.id);
                if (perms.length === 0) return null;
                return (
                  <div key={company.id} className="group">
                    <button onClick={() => toggleExpand(company.id)} className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Building2 className="w-5 h-5" /></div>
                        <div className="text-left">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{company.nome || company.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{perms.length} Analistas com Acesso</span>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expandedItems[company.id] ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedItems[company.id] && (
                      <div className="px-8 pb-6 bg-slate-50/20 space-y-3 animate-in slide-in-from-top-2 duration-300">
                        {perms.map(p => (
                          <PermissionRow 
                            key={p.id}
                            perm={p} 
                            analysts={analysts} 
                            companies={companies} 
                            onEdit={() => { setEditingPerm(p); setShowModal(true); }} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {analysts.filter(a => filterAnalyst === 'all' || a.id === filterAnalyst).map(analyst => {
                const perms = filteredPermissions.filter(p => p.userId === analyst.id);
                if (perms.length === 0) return null;
                return (
                  <div key={analyst.id} className="group">
                    <button onClick={() => toggleExpand(analyst.id)} className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xs uppercase">{analyst.displayName?.charAt(0)}</div>
                        <div className="text-left">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{analyst.displayName}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{perms.length} Unidades Vinculadas</span>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expandedItems[analyst.id] ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedItems[analyst.id] && (
                      <div className="px-8 pb-6 bg-slate-50/20 space-y-3 animate-in slide-in-from-top-2 duration-300">
                        {perms.map(p => (
                          <PermissionRow 
                            key={p.id}
                            perm={p} 
                            analysts={analysts} 
                            companies={companies} 
                            showCompany 
                            onEdit={() => { setEditingPerm(p); setShowModal(true); }} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* EDITOR MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden">
            {/* Header - Fixo */}
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingPerm?.id ? 'Configuração Profissional' : 'Novo Alinhamento de Acessos'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defina o nível de controle com precisão granular.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"> <X className="w-6 h-6 text-slate-400" /> </button>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
              {/* Identificação */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <UserIcon className="w-4 h-4 text-blue-500" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação do Acesso</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Analista</label>
                    <select 
                      disabled={!!editingPerm?.id} 
                      value={editingPerm?.userId || ''} 
                      onChange={e => setEditingPerm(p => ({...p, userId: e.target.value}))} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">{analysts.length === 0 ? 'Carregando usuários...' : 'Selecione...'}</option>
                      {Array.isArray(analysts) && analysts.map(a => (
                        <option key={a.id} value={a.id}>{a.displayName || a.email || a.id}</option>
                      ))}
                    </select>
                    {analysts.length === 1 && analysts[0].id === auth.currentUser?.uid && (
                      <p className="text-[8px] text-amber-600 font-bold px-2 uppercase">Aviso: Apenas seu usuário visível (Pode ser falta de permissão de Admin)</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Unidade</label>
                    <select disabled={!!editingPerm?.id} value={editingPerm?.companyId || ''} onChange={e => setEditingPerm(p => ({...p, companyId: e.target.value}))} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                      <option value="">Selecione...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.nome || c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nível (Role)</label>
                    <select value={editingPerm?.role || 'analyst'} onChange={e => setEditingPerm(p => ({...p, role: e.target.value as any}))} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="admin">Administrador</option>
                      <option value="manager">Gerente</option>
                      <option value="analyst">Analista</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Pacotes Rápidos */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações Rápidas por Pacote</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.keys(PACKAGES).map(pkg => (
                    <button key={pkg} onClick={() => applyPackage(pkg as any)} className="group px-4 py-3 bg-white hover:bg-blue-600 border border-slate-100 hover:border-blue-500 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all text-center relative shadow-sm">
                      {pkg}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-[8px] text-white rounded-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all text-center z-50">{(PACKAGES as any)[pkg].desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Categorias Granulares */}
              <section className="space-y-10">
                {CATEGORIES.map(cat => (
                  <div key={cat.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><cat.icon className="w-4 h-4" /></div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{cat.label}</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-3xl border border-slate-50">
                      {cat.perms.map(p => {
                        const active = !!(editingPerm?.permissoes as any)?.[p.id];
                        return (
                          <button 
                            key={p.id} onClick={() => setEditingPerm(prev => ({ ...prev, permissoes: { ...prev?.permissoes, [p.id]: !active } }))}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-[9.5px] font-black uppercase tracking-tight ${active ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-white border-white text-slate-400 hover:border-blue-200 shadow-sm'}`}
                          >
                            {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />}
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            </div>

            {/* Footer - Fixo */}
            <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
              <button onClick={() => setShowModal(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all px-4 py-2">Descartar</button>
              <button 
                onClick={handleSave}
                className="px-12 py-5 bg-slate-900 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionRow({ perm, analysts, companies, onEdit, showCompany = false }: { perm: UserCompanyPermission, analysts: UserProfile[], companies: Company[], onEdit: () => void, showCompany?: boolean }) {
  const analyst = analysts.find(a => a.id === perm.userId);
  const company = companies.find(c => c.id === perm.companyId);
  const activeCount = Object.values(perm.permissoes).filter(v => v === true).length;
  
  return (
    <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 hover:border-blue-200 shadow-sm transition-all group/row">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-xs uppercase border border-slate-100">
          {(showCompany ? company?.name : analyst?.displayName)?.charAt(0)}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <div className="min-w-[140px]">
            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{showCompany ? (company?.nome || company?.name) : analyst?.displayName}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{perm.role}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{activeCount} Permissões</span>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            {['inventario', 'checklists', 'relatorios'].map(m => {
              const has = !!(perm.permissoes as any)[m];
              return (
                <div key={m} className={`flex items-center gap-1.5 ${has ? 'opacity-100' : 'opacity-20'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${has ? 'bg-blue-600' : 'bg-slate-300'}`} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{m}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onEdit} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Edit2 className="w-4 h-4" /></button>
        <div className="relative group/actions p-3">
          <button className="text-slate-300 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-20 overflow-hidden">
            <button className="w-full text-left px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-blue-600 border-b border-slate-50">Copiar Acessos</button>
            <button onClick={async () => { if(confirm('Remover?')) await deleteDoc(doc(db, 'user_company_permissions', perm.id)); }} className="w-full text-left px-5 py-3 text-[9px] font-black text-rose-400 uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600">Excluir Vínculo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { UserProfile, Company, Checklist } from '../types';
import { Users, Mail, Shield, Trash2, Edit2, Plus, Fingerprint, ExternalLink, CheckCircle2, XCircle, MapPin, Phone, Bell, Briefcase, Calendar } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { fetchAddressByCEP } from '../lib/cep';

// Secondary Firebase app to create users without logging out the current admin

export default function Analysts() {
  const secondaryAuth = React.useMemo(() => {
    try {
      const app = getApps().find(a => a.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
      return getAuth(app);
    } catch (e) {
      console.error("Erro ao inicializar App Secundário:", e);
      return getAuth(); // Fallback ao auth principal
    }
  }, []);

  const { data: analystsData } = useFirestore<UserProfile>('users');
  const { data: companiesData } = useFirestore<Company>('companies');
  
  // Garantir que os dados sempre sejam arrays, mesmo durante o carregamento inicial
  const analysts = Array.isArray(analystsData) ? analystsData : [];
  const companies = Array.isArray(companiesData) ? companiesData : [];
  
  const { remove, update } = useFirestore<UserProfile>('users'); // Hooks específicos apenas para ações
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAnalyst, setSelectedAnalyst] = useState<UserProfile | null>(null);
  const [editingAnalyst, setEditingAnalyst] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'analyst' | 'admin'>('analyst');
  const [status, setStatus] = useState<'online' | 'offline'>('offline');
  
  // Address states
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCep = e.target.value.replace(/\D/g, '');
    setCep(newCep);
    
    if (newCep.length === 8) {
      setCepLoading(true);
      setError(null);
      try {
        const addressData = await fetchAddressByCEP(newCep);
        if (addressData) {
          setStreet(addressData.logradouro);
          setNeighborhood(addressData.bairro);
          setCity(addressData.localidade);
          setState(addressData.uf);
        } else {
          setError('CEP não encontrado.');
        }
      } catch (err) {
        setError('Erro ao buscar CEP.');
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editingAnalyst) {
        await update(editingAnalyst.id, {
          displayName: name,
          email,
          position,
          phone,
          role,
          status,
          cep,
          street,
          number,
          complement,
          neighborhood,
          city,
          state
        });
      } else {
        // Create user in Firebase Auth with default password
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, 'user123');
        const uid = userCredential.user.uid;
        
        const analystId = `ANA-${Math.floor(Math.random() * 900000 + 100000)}`;
        
        // Create profile in Firestore
        const newProfile: Omit<UserProfile, 'id'> = {
          uid,
          displayName: name,
          email,
          position,
          phone,
          role,
          status,
          analystId,
          cep,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          createdAt: new Date().toISOString(),
          assignedCompanies: [],
          mustResetPassword: true
        };

        // Use setDoc to use the UID as the document ID for consistency
        await setDoc(doc(db, 'users', uid), newProfile);
        
        // Sign out from secondary auth immediately to clean up
        await secondaryAuth.signOut();
      }
      
      setIsAdding(false);
      setEditingAnalyst(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      resetForm();
    } catch (err: any) {
      console.error('Erro ao salvar analista:', err);
      setError(err.message || 'Erro ao salvar analista. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPosition('');
    setPhone('');
    setRole('analyst');
    setStatus('offline');
    setCep('');
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
  };

  const openEdit = (analyst: UserProfile) => {
    setEditingAnalyst(analyst);
    setName(analyst.displayName || '');
    setEmail(analyst.email || '');
    setPosition(analyst.position || '');
    setPhone(analyst.phone || '');
    setRole(analyst.role as any || 'analyst');
    setStatus(analyst.status as any || 'offline');
    setCep(analyst.cep || '');
    setStreet(analyst.street || '');
    setNumber(analyst.number || '');
    setComplement(analyst.complement || '');
    setNeighborhood(analyst.neighborhood || '');
    setCity(analyst.city || '');
    setState(analyst.state || '');
    setIsAdding(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">Equipe de Suporte</h1>
          <p className="text-slate-500 font-medium text-sm">Gestão de talentos e acessos do sistema.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-black uppercase text-xs tracking-widest active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Adicionar Analista
        </button>
      </div>

      {showSuccess && (
        <div className="fixed bottom-8 right-8 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-300 z-50 font-bold">
          <CheckCircle2 className="w-6 h-6" />
          ANALISTA SALVO COM SUCESSO!
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {editingAnalyst ? 'Editar Analista' : 'Novo Analista'}
              </h2>
              <button type="button" onClick={() => { setIsAdding(false); setEditingAnalyst(null); setError(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Informações Básicas</h3>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                  <input type="text" value={name || ''} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Email</label>
                  <input type="email" value={email || ''} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Cargo / Função</label>
                  <input type="text" value={position || ''} onChange={(e) => setPosition(e.target.value)} placeholder="Ex: Analista N1, Especialista Redes" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Telefone</label>
                  <input type="text" value={phone || ''} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nível de Acesso</label>
                    <select value={role || 'analyst'} onChange={(e) => setRole(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold">
                      <option value="analyst">Analista</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Status</label>
                    <select value={status || 'offline'} onChange={(e) => setStatus(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold">
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CEP</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={cep || ''} 
                        onChange={handleCEPChange} 
                        placeholder="00000-000" 
                        className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold ${cepLoading ? 'opacity-50' : ''}`} 
                      />
                      {cepLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
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
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Bairro</label>
                  <input type="text" value={neighborhood || ''} onChange={(e) => setNeighborhood(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Cidade</label>
                    <input type="text" value={city || ''} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Estado</label>
                    <input type="text" value={state || ''} onChange={(e) => setState(e.target.value)} placeholder="UF" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => { setIsAdding(false); setEditingAnalyst(null); }} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all uppercase text-xs">CANCELAR</button>
              <button type="submit" disabled={loading} className="px-10 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 uppercase text-xs tracking-widest">
                {loading ? 'SALVANDO...' : 'SALVAR ANALISTA'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {analysts.map((analyst) => (
          <div key={analyst.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-start justify-between mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md group-hover:scale-105 transition-transform">
                  {analyst.photoURL ? (
                    <img src={analyst.photoURL} alt={analyst.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${analyst.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(analyst)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button onClick={() => remove(analyst.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{analyst.displayName}</h3>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{analyst.position || 'Analista de TI'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold truncate">{analyst.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">{analyst.analystId || 'ANA-000000'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${analyst.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                    {analyst.role === 'admin' ? 'Administrador' : 'Analista'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Empresas</span>
                <span className="text-sm font-black text-slate-900">{analyst.assignedCompanies?.length || 0}</span>
              </div>
              <button 
                onClick={() => setSelectedAnalyst(analyst)}
                className="flex items-center justify-center gap-2 text-[10px] font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 transition-all h-12 px-6 rounded-xl shadow-lg shadow-blue-100 active:scale-95"
              >
                Ver Perfil
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Modal de Perfil do Analista */}
        {selectedAnalyst && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative">
              <button 
                onClick={() => setSelectedAnalyst(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-all z-10"
              >
                <XCircle className="w-6 h-6" />
              </button>
              
              <div className="p-8 pt-12 flex flex-col items-center">
                <div className="w-[120px] h-[120px] rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl mb-6">
                  {selectedAnalyst.photoURL ? (
                    <img src={selectedAnalyst.photoURL} alt={selectedAnalyst.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-16 h-16 text-slate-300" />
                  )}
                </div>

                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                    {selectedAnalyst.displayName?.split(' ')[0]}<br/>
                    {selectedAnalyst.displayName?.split(' ').slice(1).join(' ')}
                  </h2>
                  <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px] mt-2">
                    {selectedAnalyst.position || 'Técnico Suporte Pleno'}
                  </p>
                </div>

                <div className="w-full space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-slate-100 py-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-bold truncate">{selectedAnalyst.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-bold">{selectedAnalyst.phone || '(77) 91034-0123'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      EMPRESAS: {selectedAnalyst?.assignedCompanies?.length ? (
                        companies.filter(c => selectedAnalyst.assignedCompanies?.includes(c.id)).map(c => c.name).join(', ')
                      ) : 'Acesso Padrão'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">SLA: 96% | Média: 14min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Checklists: 0 pendentes</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 w-full mt-8">
                  <button 
                    onClick={() => { setSelectedAnalyst(null); openEdit(selectedAnalyst); }}
                    className="flex-1 h-12 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    className="flex-1 h-12 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center"
                    title="Notificar"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSelectedAnalyst(null)}
                    className="flex-1 h-12 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 transition-all flex items-center justify-center"
                    title="Fechar"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {analysts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Nenhum Analista</h3>
            <p className="text-slate-400 font-medium">Sua equipe ainda não tem membros cadastrados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

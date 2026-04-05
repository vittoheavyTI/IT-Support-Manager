import React, { useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Company, UserProfile, Checklist, Asset } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchAddressByCEP } from '../lib/cep';
import { 
  Building2, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Trash2, 
  Edit2, 
  Users, 
  CheckCircle2, 
  XCircle,
  Upload,
  Globe,
  ChevronRight,
  X,
  FileText,
  Package,
  ClipboardList
} from 'lucide-react';

export default function AdminCompanies() {
  const { data: companies, add, remove, update } = useFirestore<Company>('companies');
  const { data: analysts } = useFirestore<UserProfile>('users');
  const { data: checklists } = useFirestore<Checklist>('checklists');
  const { data: assets } = useFirestore<Asset>('inventory_assets');
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [selectedAnalysts, setSelectedAnalysts] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleAnalyst = (uid: string) => {
    setSelectedAnalysts(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fullAddress = `${street}, ${number}${complement ? ' - ' + complement : ''}, ${neighborhood}, ${city} - ${state}, CEP: ${cep}`;
      
      const companyData: Omit<Company, 'id'> = {
        name,
        cnpj,
        address: fullAddress,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        responsibleName,
        website,
        phone,
        contactEmail: email,
        logoURL: logoBase64 || null,
        assignedAnalysts: selectedAnalysts,
        status: 'active',
        createdAt: editingCompany ? editingCompany.createdAt : new Date().toISOString()
      };
      
      if (editingCompany) {
        await update(editingCompany.id, companyData);
        
        // Atualiza os analistas vinculados (remove os antigos e adiciona os novos)
        const oldAnalysts = editingCompany.assignedAnalysts || [];
        const removedAnalysts = oldAnalysts.filter(id => !selectedAnalysts.includes(id));
        const addedAnalysts = selectedAnalysts.filter(id => !oldAnalysts.includes(id));

        // Use Promise.all for parallel updates
        await Promise.all([
          ...removedAnalysts.map(async (analystUid) => {
            const analyst = analysts.find(a => a.uid === analystUid);
            if (analyst) {
              const updatedCompanies = (analyst.assignedCompanies || []).filter(id => id !== editingCompany.id);
              return updateDoc(doc(db, 'users', analyst.id), { assignedCompanies: updatedCompanies });
            }
          }),
          ...addedAnalysts.map(async (analystUid) => {
            const analyst = analysts.find(a => a.uid === analystUid);
            if (analyst) {
              const updatedCompanies = Array.from(new Set([...(analyst.assignedCompanies || []), editingCompany.id]));
              return updateDoc(doc(db, 'users', analyst.id), { assignedCompanies: updatedCompanies });
            }
          })
        ]);
      } else {
        const docRef = await add(companyData);
        if (!docRef) throw new Error("Falha ao criar empresa");
        
        // Atualiza os analistas vinculados
        await Promise.all(selectedAnalysts.map(async (analystUid) => {
          const analyst = analysts.find(a => a.uid === analystUid);
          if (analyst) {
            const updatedCompanies = Array.from(new Set([...(analyst.assignedCompanies || []), docRef.id]));
            return updateDoc(doc(db, 'users', analyst.id), { assignedCompanies: updatedCompanies });
          }
        }));
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setIsAdding(false);
      setEditingCompany(null);
      resetForm();
    } catch (err: any) {
      console.error('Erro ao salvar empresa:', err);
      setError(err.message || 'Erro ao salvar empresa. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setName(company.name);
    setCnpj(company.cnpj);
    setCep(company.cep || '');
    setStreet(company.street || '');
    setNumber(company.number || '');
    setComplement(company.complement || '');
    setNeighborhood(company.neighborhood || '');
    setCity(company.city || '');
    setState(company.state || '');
    setResponsibleName(company.responsibleName || '');
    setWebsite(company.website || '');
    setPhone(company.phone);
    setEmail(company.contactEmail);
    setLogoBase64(company.logoURL);
    setSelectedAnalysts(company.assignedAnalysts || []);
    setIsAdding(true);
  };

  const handleDelete = async (companyId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) return;
    
    try {
      // Remove a empresa da lista de empresas vinculadas de todos os analistas
      for (const analyst of analysts) {
        if (analyst.assignedCompanies?.includes(companyId)) {
          const updatedCompanies = analyst.assignedCompanies.filter(id => id !== companyId);
          await updateDoc(doc(db, 'users', analyst.id), { assignedCompanies: updatedCompanies });
        }
      }
      await remove(companyId);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setName('');
    setCnpj('');
    setCep('');
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setResponsibleName('');
    setWebsite('');
    setPhone('');
    setEmail('');
    setLogoBase64(null);
    setSelectedAnalysts([]);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">GESTÃO DE EMPRESAS</h1>
          <p className="text-slate-500 font-medium text-sm">Administre os clientes e atribua analistas de suporte.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-black uppercase text-xs tracking-widest active:scale-95"
        >
          <Plus className="w-4 h-4" />
          CADASTRAR EMPRESA
        </button>
      </div>

      {showSuccess && (
        <div className="fixed bottom-8 right-8 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-300 z-50 font-bold">
          <CheckCircle2 className="w-6 h-6" />
          EMPRESA CADASTRADA COM SUCESSO!
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAdd} className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto rounded-3xl shadow-2xl p-8 space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 uppercase">{editingCompany ? 'EDITAR EMPRESA' : 'NOVA EMPRESA'}</h2>
              <button type="button" onClick={() => { setIsAdding(false); setEditingCompany(null); resetForm(); setError(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Coluna 1: Informações Básicas e Logo */}
              <div className="space-y-6">
                <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group relative shadow-sm">
                    {logoBase64 ? (
                      <img src={logoBase64} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-8 h-8 text-slate-300" />
                    )}
                    <input type="file" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-900 uppercase mb-1">Logomarca</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">Clique para fazer upload da logo da empresa.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome da Empresa</label>
                    <input type="text" value={name || ''} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CNPJ</label>
                    <input type="text" value={cnpj || ''} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Responsável</label>
                    <input type="text" value={responsibleName || ''} onChange={(e) => setResponsibleName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={website || ''} onChange={(e) => setWebsite(e.target.value)} placeholder="www.empresa.com" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Email de Contato</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" value={email || ''} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={phone || ''} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 0000-0000" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Endereço e Analistas */}
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Endereço Completo
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
                          className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 ${cepLoading ? 'opacity-50' : ''}`} 
                          required 
                        />
                        {cepLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Rua / Logradouro</label>
                      <input type="text" value={street || ''} onChange={(e) => setStreet(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Número</label>
                      <input type="text" value={number || ''} onChange={(e) => setNumber(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Complemento</label>
                      <input type="text" value={complement || ''} onChange={(e) => setComplement(e.target.value)} placeholder="Apto, Sala, Bloco..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Bairro</label>
                      <input type="text" value={neighborhood || ''} onChange={(e) => setNeighborhood(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Cidade</label>
                      <input type="text" value={city || ''} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Estado (UF)</label>
                    <input type="text" value={state || ''} onChange={(e) => setState(e.target.value)} placeholder="Ex: SP, RJ, MG..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" required />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Vincular Analistas
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl h-[200px] overflow-auto p-2 space-y-1">
                    {analysts.filter(a => a.role === 'analyst').map(analyst => (
                      <button
                        key={analyst.uid}
                        type="button"
                        onClick={() => toggleAnalyst(analyst.uid)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                          selectedAnalysts.includes(analyst.uid) ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden">
                            {analyst.photoURL && <img src={analyst.photoURL} className="w-full h-full object-cover" />}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold truncate">{analyst.displayName}</p>
                            <p className={`text-[10px] ${selectedAnalysts.includes(analyst.uid) ? 'text-blue-100' : 'text-slate-400'}`}>{analyst.analystId}</p>
                          </div>
                        </div>
                        {selectedAnalysts.includes(analyst.uid) && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
              <button type="button" onClick={() => { setIsAdding(false); setEditingCompany(null); resetForm(); }} className="px-8 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all uppercase text-xs">CANCELAR</button>
              <button type="submit" disabled={loading} className="px-12 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 uppercase text-xs tracking-widest">
                {loading ? 'SALVANDO...' : editingCompany ? 'ATUALIZAR EMPRESA' : 'SALVAR EMPRESA'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {companies.map((company, i) => (
          <div key={company.id} className={`bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden ${
            i % 3 === 0 ? 'card-shadow-blue' : i % 3 === 1 ? 'card-shadow-green' : 'card-shadow-purple'
          }`}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  {company.logoURL ? (
                    <img src={company.logoURL} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    company.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {company.status === 'active' ? 'ATIVA' : 'INATIVA'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(company)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(company.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-1">{company.name}</h3>
              <p className="text-xs font-bold text-slate-400 mb-6">{company.cnpj}</p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <div className="p-2 bg-slate-50 rounded-lg"><Mail className="w-4 h-4 text-slate-400" /></div>
                  {company.contactEmail}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <div className="p-2 bg-slate-50 rounded-lg"><Phone className="w-4 h-4 text-slate-400" /></div>
                  {company.phone}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <div className="p-2 bg-slate-50 rounded-lg"><MapPin className="w-4 h-4 text-slate-400" /></div>
                  <span className="truncate">{company.address}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                <div className="flex -space-x-2">
                  {company.assignedAnalysts?.slice(0, 3).map((uid, i) => {
                    const analyst = analysts.find(a => a.uid === uid);
                    return (
                      <div key={uid} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white overflow-hidden" title={analyst?.displayName}>
                        {analyst?.photoURL ? <img src={analyst.photoURL} className="w-full h-full object-cover" /> : <Users className="w-4 h-4 m-2 text-slate-400" />}
                      </div>
                    );
                  })}
                  {company.assignedAnalysts?.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                      +{company.assignedAnalysts.length - 3}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedCompany(company)}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  DETALHES <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Detalhes da Empresa */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="relative h-40 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
              <button 
                onClick={() => setSelectedCompany(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all z-10"
              >
                <XCircle className="w-6 h-6" />
              </button>
              
              <div className="absolute -bottom-12 left-10 flex items-end gap-6">
                <div className="w-32 h-32 rounded-3xl bg-white p-1.5 shadow-2xl">
                  <div className="w-full h-full rounded-[1.25rem] bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                    {selectedCompany.logoURL ? (
                      <img src={selectedCompany.logoURL} alt={selectedCompany.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-16 h-16 text-slate-200" />
                    )}
                  </div>
                </div>
                <div className="pb-4">
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-1">{selectedCompany.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                      {selectedCompany.status === 'active' ? 'Ativa' : 'Inativa'}
                    </span>
                    <span className="text-slate-400 text-xs font-bold">{selectedCompany.cnpj}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 pt-20 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Informações de Contato</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 group">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <Mail className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Corporativo</p>
                            <p className="text-sm font-bold text-slate-700">{selectedCompany.contactEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <Phone className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
                            <p className="text-sm font-bold text-slate-700">{selectedCompany.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <Globe className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Website</p>
                            <p className="text-sm font-bold text-slate-700">{selectedCompany.website || 'Não informado'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Localização</h3>
                      <div className="flex items-start gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors flex-shrink-0">
                          <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Endereço Completo</p>
                          <p className="text-sm font-bold text-slate-700 leading-relaxed">{selectedCompany.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Analistas Responsáveis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedCompany.assignedAnalysts?.length ? (
                        selectedCompany.assignedAnalysts.map(uid => {
                          const analyst = analysts.find(a => a.uid === uid);
                          return (
                            <div key={uid} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="w-10 h-10 rounded-xl bg-white overflow-hidden border border-slate-200">
                                {analyst?.photoURL ? <img src={analyst.photoURL} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 m-2.5 text-slate-300" />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{analyst?.displayName || 'Analista'}</p>
                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{analyst?.analystId}</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 font-bold italic">Nenhum analista vinculado.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 text-center">
                      <ClipboardList className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-[24px] font-black text-blue-900 leading-none">{checklists.filter(c => c.companyId === selectedCompany.id).length}</p>
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">Checklists</p>
                    </div>
                    <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 text-center">
                      <Package className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                      <p className="text-[24px] font-black text-indigo-900 leading-none">{assets.filter(a => a.companyId === selectedCompany.id).length}</p>
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1">Ativos</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Ações Rápidas</h3>
                    <div className="space-y-3">
                      <button 
                        onClick={() => { setSelectedCompany(null); handleEdit(selectedCompany); }}
                        className="w-full h-14 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center gap-3 transition-all group"
                      >
                        <Edit2 className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Editar Cadastro</span>
                      </button>
                      <button className="w-full h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl flex items-center justify-center gap-3 transition-all group shadow-xl shadow-blue-500/20">
                        <FileText className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ver Relatório</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

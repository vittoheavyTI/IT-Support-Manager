import React, { useState, useEffect } from 'react';
import { Building2, ArrowRight, LogOut, ShieldCheck, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { Company, UserProfile } from '../types';

interface SelectCompanyProps {
  profile: UserProfile | null;
  onSelect: (companyId: string) => void;
}

export default function SelectCompany({ profile, onSelect }: SelectCompanyProps) {
  const { data: companies, loading: loadingData } = useFirestore<Company>('companies');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSelect = async (companyId: string) => {
    setLoading(companyId);
    // Simulate loading as requested
    await new Promise(resolve => setTimeout(resolve, 800));
    onSelect(companyId);
  };

  const userCompanies = profile?.role === 'admin' 
    ? companies 
    : companies.filter(c => 
        profile?.assignedCompanies?.includes(c.id) || 
        profile?.empresasComAcesso?.includes(c.id)
      );

  const filteredCompanies = userCompanies.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cnpj || '').includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-bg p-6 sm:p-10 flex flex-col items-center">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-16 gap-8">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-primary rounded-[2rem] shadow-2xl shadow-primary/20">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-text tracking-tighter uppercase">Escolher Empresa</h1>
              <p className="text-text-muted text-xs font-bold uppercase tracking-widest mt-1">Selecione a unidade de operação</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-12">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-text-soft" />
          <input 
            type="text"
            placeholder="Buscar empresa por nome ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-20 pr-8 py-6 bg-surface border border-border rounded-[2.5rem] shadow-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-text"
          />
        </div>

        {/* Grid */}
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-6"></div>
            <p className="text-text-soft font-bold uppercase tracking-widest text-xs">Carregando empresas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCompanies.map((company) => (
              <div 
                key={company.id}
                className="group bg-surface rounded-[3rem] border border-border shadow-sm hover:shadow-2xl hover:border-primary/30 transition-all duration-500 overflow-hidden flex flex-col"
              >
                <div className="p-10 flex-1">
                  <div className="w-16 h-16 bg-bg rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:bg-primary-soft transition-colors overflow-hidden border border-border">
                    {company.logoURL ? (
                      <img src={company.logoURL} alt={company.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-text-soft group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-text mb-2 uppercase tracking-tight leading-tight">{company.name}</h3>
                  <p className="text-text-soft text-[11px] font-bold uppercase tracking-widest mb-6">CNPJ: {company.cnpj}</p>
                  <div className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                    company.status === 'active' ? 'bg-success-soft text-success border-success/10' : 'bg-danger-soft text-danger border-danger/10'
                  }`}>
                    {company.status === 'active' ? 'ATIVA' : 'INATIVA'}
                  </div>
                </div>
                
                <div className="p-8 bg-bg border-t border-border group-hover:bg-primary transition-colors">
                  <button 
                    onClick={() => handleSelect(company.id)}
                    disabled={!!loading}
                    className="w-full flex items-center justify-between text-text-muted group-hover:text-white font-bold text-xs uppercase tracking-widest transition-all min-h-[56px]"
                  >
                    {loading === company.id ? (
                      <div className="flex items-center gap-3 mx-auto">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                        <span>Acessando...</span>
                      </div>
                    ) : (
                      <>
                        <span>Acessar Unidade</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredCompanies.length === 0 && (
          <div className="text-center py-24 bg-surface rounded-[4rem] border border-dashed border-border">
            <Building2 className="w-20 h-20 text-border mx-auto mb-6" />
            <p className="text-text-soft font-bold uppercase tracking-widest text-sm">Nenhuma empresa encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}

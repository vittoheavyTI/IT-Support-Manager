import { useState } from 'react';
import { where } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { Automation, Company } from '../types';
import { Zap, Plus, Play, Trash2, Code, Settings, ChevronRight, X, Sparkles } from 'lucide-react';

interface AutomationProps {
  selectedCompanyId: string;
}

export default function AutomationPage({ selectedCompanyId }: AutomationProps) {
  const { data: automations, add, remove, update } = useFirestore<Automation>('automations', 
    selectedCompanyId ? [where('companyId', '==', selectedCompanyId)] : [],
    true,
    [selectedCompanyId]
  );
  const { data: companies } = useFirestore<Company>('companies');
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('Novo Chamado');
  const [action, setAction] = useState('Notificar Teams');

  const triggers = ['Novo Chamado', 'Checklist Concluído', 'Ativo Adicionado', 'Erro de Rede'];
  const actions = ['Notificar Teams', 'Enviar WhatsApp', 'Atualizar SharePoint', 'Executar Script'];

  const handleAdd = async () => {
    if (!name || !selectedCompanyId) return;
    await add({
      name,
      trigger,
      action,
      active: true,
      companyId: selectedCompanyId,
      script: '// Código personalizado aqui\nconsole.log("Executando automação...");'
    });
    setName('');
    setIsAdding(false);
  };

  const filteredAutomations = automations.filter(a => a.companyId === selectedCompanyId);
  const currentCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">Automação Inteligente</h1>
          <p className="text-slate-500 font-medium">Fluxos de trabalho para <span className="text-blue-600 font-bold">{currentCompany?.name || 'Empresa'}</span></p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-black uppercase text-xs tracking-widest"
        >
          <Plus className="w-5 h-5" />
          Novo Fluxo
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Configurar Novo Gatilho</h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nome da Automação</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Alerta de Chamado Crítico"
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                />
              </div>
              
              <div className="flex items-center gap-4 col-span-2">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Se (Gatilho)</label>
                  <select 
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none cursor-pointer"
                  >
                    {triggers.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="p-3 bg-blue-50 rounded-full mt-6">
                  <ChevronRight className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Então (Ação)</label>
                  <select 
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none cursor-pointer"
                  >
                    {actions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
              <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
              <button onClick={handleAdd} className="px-8 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all uppercase text-xs tracking-widest">Ativar Fluxo</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAutomations.map((flow) => (
          <div key={flow.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="flex items-start justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  flow.active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Zap className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">{flow.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${flow.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{flow.active ? 'Ativo' : 'Pausado'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                  <Settings className="w-5 h-5" />
                </button>
                <button onClick={() => remove(flow.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl mb-8 relative z-10 border border-slate-100/50">
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gatilho</p>
                <p className="text-xs font-black text-slate-700">{flow.trigger}</p>
              </div>
              <div className="p-2 bg-white rounded-full shadow-sm">
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ação</p>
                <p className="text-xs font-black text-slate-700">{flow.action}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50 relative z-10">
              <button className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                <Code className="w-4 h-4" />
                Script Personalizado
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest shadow-lg shadow-slate-200">
                <Play className="w-3 h-3" />
                Testar Fluxo
              </button>
            </div>
          </div>
        ))}

        {filteredAutomations.length === 0 && !isAdding && (
          <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sem Automações</h3>
            <p className="text-slate-400 font-medium mt-1">Automatize tarefas repetitivas para ganhar produtividade.</p>
            <button onClick={() => setIsAdding(true)} className="mt-8 px-8 py-3 bg-blue-50 text-blue-600 font-black rounded-2xl hover:bg-blue-100 transition-all uppercase text-xs tracking-widest">
              Criar Primeiro Fluxo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

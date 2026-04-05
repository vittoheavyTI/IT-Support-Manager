export interface UserProfile {
  id: string;
  uid: string;
  analystId: string;
  displayName: string;
  email: string;
  role: 'admin' | 'manager' | 'analyst';
  position: string;
  phone?: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'blocked';
  blocked?: boolean;
  assignedCompanies?: string[];
  empresasComAcesso?: string[]; // IDs das empresas
  unidades?: string[];
  ultimoAcessoEm?: string | null;
  criadoEm?: string;
  atualizadoEm?: string;
  version?: number;
  // Legacy fields
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  mustResetPassword?: boolean;
  createdAt?: string;
}

export interface UserCompanyPermission {
  id: string; // userId + '_' + companyId
  userId: string;
  companyId: string;
  role: 'analyst' | 'manager' | 'admin';
  permissoes: {
    // Módulos mestres (retrocompatibilidade)
    inventario: boolean;
    checklists: boolean;
    relatorios: boolean;
    analistas: boolean;
    notificacoes: boolean;
    configuracoes: boolean;
    backups: boolean;
    auditoria: boolean;
    
    // Inventário
    inventario_visualizar: boolean;
    inventario_criar: boolean;
    inventario_editar: boolean;
    inventario_excluir: boolean;
    inventario_importar: boolean;
    inventario_exportar: boolean;
    inventario_historico: boolean;
    
    // Checklists
    checklists_visualizar: boolean;
    checklists_criar: boolean;
    checklists_editar: boolean;
    checklists_excluir: boolean;
    checklists_executar: boolean;
    checklists_concluir: boolean;
    checklists_resetar: boolean;
    
    // Relatórios
    relatorios_visualizar: boolean;
    relatorios_gerar: boolean;
    relatorios_exportar: boolean;
    relatorios_metricas: boolean;
    
    // Analistas
    analistas_visualizar: boolean;
    analistas_criar: boolean;
    analistas_editar: boolean;
    analistas_bloquear: boolean;
    analistas_excluir: boolean;
    
    // Empresas
    empresas_visualizar: boolean;
    empresas_criar: boolean;
    empresas_editar: boolean;
    empresas_excluir: boolean;
    empresas_vincular: boolean;
    
    // Notificações
    notificacoes_visualizar: boolean;
    notificacoes_criar: boolean;
    notificacoes_enviar: boolean;
    notificacoes_excluir: boolean;
    
    // Administração
    admin_visualizar_configs: boolean;
    admin_editar_configs: boolean;
    admin_database: boolean;
    admin_permissoes: boolean;
    admin_backup: boolean;
    admin_auditoria: boolean;
  };
  criadoEm: string;
  atualizadoEm: string;
  version: number;
}

export interface Company {
  id: string;
  name: string;
  nome?: string;
  cnpj: string;
  status: 'active' | 'inactive' | 'ativa' | 'inativa';
  version?: number;
  criadoEm?: string;
  atualizadoEm?: string;
  // Legacy fields
  email?: string;
  telefone?: string;
  phone?: string;
  endereco?: string;
  address?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  responsibleName?: string;
  website?: string;
  contactEmail?: string;
  logoURL?: string;
  assignedAnalysts?: string[];
  createdAt?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  nome?: string;
  description: string;
  type: 'imediato' | 'semanal' | 'mensal' | 'permanente';
  priority: 'Baixa' | 'Média' | 'Alta';
  category: 'Infraestrutura' | 'Segurança' | 'Backup' | 'Software';
  categoria?: string;
  completed: boolean;
  subtasks: Subtask[];
  order: number;
  companyId: string;
  empresaId?: string | null;
  version?: number;
  criadoEm?: string;
  atualizadoEm?: string;
  // Legacy fields
  frequencia?: string;
  ativo?: boolean;
  createdAt?: string;
  nextDate?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  ultimaExecucao?: string;
  resetHorarios?: any;
  completedAt?: string;
}

export type ChecklistItem = Checklist;

export interface ChecklistExecution {
  id: string;
  checklistId: string;
  analystId: string | null;
  companyId: string;
  empresaId?: string | null;
  status: 'concluido' | 'parcial' | 'pendente';
  resumo: string;
  concluidoEm: string | null;
  subtasksSnapshot?: Subtask[];
  // Legacy fields
  dataReferencia?: string;
  resetPrevistoEm?: string | null;
  observacoes?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Asset {
  id: string;
  uniqueKey: string;
  nome: string;
  equipamento: string;
  divisao: 'TI' | 'Telecom';
  categoria: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  patrimonio: string;
  status: 'ativo' | 'manutencao' | 'inativo';
  tipo: 'proprio' | 'alugado' | 'na';
  companyId: string;
  criadoEm?: string;
  atualizadoEm?: string;
  version?: number;
  // Legacy fields
  name?: string;
  serial?: string;
  brand?: string;
  model?: string;
  category?: string;
  division?: string;
  location?: string;
  localizacao?: string;
  notes?: string;
  observacoes?: string;
  photo?: string;
  imagemUrl?: string | null;
  responsavel?: string;
  ip?: string;
  origemImportacao?: string | null;
  type?: string;
}

export interface ImportLog {
  id: string;
  nomeArquivo: string;
  totalImportados: number;
  criadoEm: string;
  usuario: string | null;
  companyId?: string;
  // Legacy fields
  tipoArquivo?: string;
  totalLidos?: number;
  duplicados?: number;
  erros?: number;
  strategy?: 'ignore' | 'update' | 'both';
  estrategiaDuplicidade?: 'ignore' | 'update' | 'both';
  detalhes?: any;
}

export interface AuditLog {
  id: string;
  modulo: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  resumo: string;
  usuario: string | null;
  antes: any | null;
  depois: any | null;
  criadoEm: string;
}

export interface SystemBackup {
  id: string;
  tipo: 'manual' | 'automatico';
  destino: 'local' | 'onedrive' | 'firebase_export';
  status: 'sucesso' | 'erro' | 'processando' | 'falha';
  resumo: string;
  totalRegistros: number;
  tamanhoEstimado: string;
  criadoEm: string;
  usuario: string | null;
  metadata: {
    geradoEm: string;
    versaoSistema: string;
    origem: 'manual' | 'automatico';
    counts: Record<string, number>;
  };
}

export interface DataIntegrityLog {
  id: string;
  modulo: string;
  tipoProblema: string;
  descricao: string;
  severidade: 'baixa' | 'media' | 'alta';
  resolvido: boolean;
  criadoEm: string;
  resolvidoEm: string | null;
}

export interface SystemSettings {
  id: string;
  key?: string;
  value?: any;
  oneDriveConnected?: boolean;
  lastBackupAt?: string | null;
  version: number;
  atualizadoEm: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt?: string;
  timestamp?: string;
  userId?: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  companyId: string;
  type: 'text' | 'image' | 'file';
  fileURL?: string;
  createdAt: string;
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  script: string;
  active: boolean;
  companyId?: string;
}

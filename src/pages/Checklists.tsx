import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { usePermissions } from '../hooks/usePermissions';
import { ChecklistItem, Company, Subtask } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  X,
  ChevronRight,
  ListTodo,
  Monitor,
  Network,
  Database,
  Edit2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  Calendar,
  Repeat,
  Infinity,
  Zap
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nextMonday, startOfMonth, addMonths, format, parseISO, isWithinInterval, setHours, setMinutes, startOfDay, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { where } from 'firebase/firestore';

import { addNotification } from '../lib/notifications';

interface ChecklistsProps {
  selectedCompanyId: string;
}

const TYPE_ICONS = {
  imediato: Zap,
  semanal: Calendar,
  mensal: Repeat,
  permanente: Infinity
};

const TYPE_LABELS = {
  imediato: 'Imediato',
  semanal: 'Semanal',
  mensal: 'Mensal',
  permanente: 'Permanente'
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return '';
  }
};

const formatTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'HH:mm');
  } catch (e) {
    return '';
  }
};

const getNextReset = (item: ChecklistItem) => {
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
};

interface SortableItemProps {
  item: ChecklistItem;
  toggleComplete: (item: ChecklistItem) => void | Promise<void>;
  toggleSubtask: (itemId: string, subtaskId: string) => void | Promise<void>;
  remove: (id: string) => void | Promise<void>;
  openEdit: (item: ChecklistItem) => void;
  isExpanded: boolean;
  toggleExpand: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ 
  item, 
  toggleComplete, 
  toggleSubtask,
  remove, 
  openEdit,
  isExpanded,
  toggleExpand
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1
  };

  const TypeIcon = TYPE_ICONS[item.type || 'imediato'];
  const completedSubtasks = item.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = item.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`group bg-surface rounded-[2rem] border border-border shadow-sm transition-all hover:shadow-xl hover:border-primary/20 overflow-hidden ${item.completed && item.type !== 'permanente' ? 'bg-bg/50 opacity-80' : ''}`}
    >
      <div className="p-6 flex items-center gap-6">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-text-muted/20 hover:text-primary transition-colors">
          <GripVertical className="w-5 h-5" />
        </div>

        <button 
          onClick={() => item.type !== 'permanente' && toggleComplete(item)}
          disabled={item.type === 'permanente'}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0 border-2 ${
            item.completed && item.type !== 'permanente' 
              ? 'bg-success border-success text-white shadow-lg shadow-success/20' 
              : item.type === 'permanente'
                ? 'bg-primary-soft border-primary/10 text-primary'
                : 'bg-bg border-border text-text-muted/20 hover:border-primary/30'
          }`}
        >
          {item.completed && item.type !== 'permanente' ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
        </button>

        <div 
          className="flex-1 min-w-0 cursor-pointer group/content"
          onClick={() => item.type !== 'permanente' && toggleComplete(item)}
        >
          <div className="flex items-center gap-3">
            <h3 className={`font-black text-lg tracking-tighter truncate transition-colors ${item.completed && item.type !== 'permanente' ? 'text-text-muted/50 line-through' : 'text-text group-hover/content:text-primary'}`}>
              {item.title}
            </h3>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg flex items-center gap-1.5 border ${
              item.priority === 'Alta' ? 'bg-danger-soft border-danger/10 text-danger' :
              item.priority === 'Média' ? 'bg-warning-soft border-warning/10 text-warning' :
              'bg-success-soft border-success/10 text-success'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                item.priority === 'Alta' ? 'bg-danger' :
                item.priority === 'Média' ? 'bg-warning' :
                'bg-success'
              }`} />
              {item.priority}
            </span>
          </div>
          
          {item.completed && item.completedAt && (
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-success uppercase tracking-widest bg-success-soft px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3" />
                CONCLUÍDO: {formatDateTime(item.completedAt)}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest bg-primary-soft px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3" />
                RESET: {format(getNextReset(item), 'HH:mm')}
              </div>
            </div>
          )}

          {!item.completed && (
            <div className="flex items-center gap-1.5 text-[9px] font-black text-warning uppercase tracking-widest bg-warning-soft px-2 py-0.5 rounded-md mt-1.5 w-fit">
              <Clock className="w-3 h-3" />
              PENDENTE: {format(getNextReset(item), 'HH:mm')}
            </div>
          )}

          <p className={`text-xs mt-2 font-medium leading-relaxed line-clamp-1 ${item.completed && item.type !== 'permanente' ? 'text-text-muted/30' : 'text-text-muted'}`}>
            {item.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-bg text-text-muted border border-border flex items-center gap-2 group-hover:border-primary/20 transition-colors">
              <TypeIcon className="w-3.5 h-3.5 text-primary" />
              {TYPE_LABELS[item.type || 'imediato']}
            </span>
            {item.nextDate && (
              <span className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-primary-soft text-primary border border-primary/10 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                {item.completed && item.type !== 'permanente' ? 'PRÓXIMA: ' : ''}
                {format(parseISO(item.nextDate), 'dd/MM')}
              </span>
            )}
            {item.daysOfWeek && item.daysOfWeek.length > 0 && (
              <span className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-warning-soft text-warning border border-warning/10 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {item.startTime}-{item.endTime} | {item.daysOfWeek.map(d => ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d]).join(',')}
              </span>
            )}
            <span className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-bg text-text-muted border border-border">
              {item.category.toUpperCase()}
            </span>
            {totalSubtasks > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex flex-col gap-1.5 min-w-[140px] group/progress"
              >
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-text-muted/50 group-hover/progress:text-primary transition-colors">
                  <span className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {completedSubtasks}/{totalSubtasks} SUBTAREFAS
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-bg rounded-full overflow-hidden border border-border shadow-inner">
                  <div 
                    className={`h-full transition-all duration-700 ease-out ${progress === 100 ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-primary shadow-[0_0_10px_rgba(47,91,255,0.4)]'}`} 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => openEdit(item)}
            className="w-11 h-11 flex items-center justify-center text-text-muted/30 hover:text-primary hover:bg-primary-soft rounded-xl transition-all active:scale-90 border border-transparent hover:border-primary/10"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => remove(item.id)}
            className="w-11 h-11 flex items-center justify-center text-text-muted/30 hover:text-danger hover:bg-danger-soft rounded-xl transition-all active:scale-90 border border-transparent hover:border-danger/10"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isExpanded && item.subtasks && item.subtasks.length > 0 && (
        <div className="px-10 pb-8 space-y-3 border-t border-border pt-6 bg-bg/20">
          {item.subtasks.map((sub) => (
            <div 
              key={sub.id} 
              className="flex items-center gap-4 group/sub bg-surface/50 p-3 rounded-2xl border border-border/50 hover:border-primary/20 transition-all cursor-pointer"
              onClick={() => toggleSubtask(item.id, sub.id)}
            >
              <button 
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border-2 ${
                  sub.completed 
                    ? 'bg-success border-success text-white shadow-md shadow-success/20' 
                    : 'bg-surface border-border text-text-muted/10 hover:border-primary/30'
                }`}
              >
                {sub.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </button>
              <div className="flex flex-col flex-1">
                <span className={`text-xs font-black uppercase tracking-widest ${sub.completed ? 'text-text-muted/40 line-through' : 'text-text'}`}>
                  {sub.title}
                </span>
                {sub.completed && sub.completedAt && (
                  <span className="text-[8px] font-black text-success uppercase tracking-widest mt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    CONCLUÍDO ÀS {formatTime(sub.completedAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Checklists({ selectedCompanyId }: ChecklistsProps) {
  const { permissions, loading: loadingPerms, isAdmin } = usePermissions(selectedCompanyId);
  const { data: items, add, update, remove, loading: loadingChecklists } = useFirestore<ChecklistItem>('checklists', [
    where('companyId', '==', selectedCompanyId)
  ], !loadingPerms && (isAdmin || permissions?.checklists), [selectedCompanyId]);
  const { data: companies } = useFirestore<Company>('companies');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterPriority, setFilterPriority] = useState('Todas');
  const [filterType, setFilterType] = useState('Todos');

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'imediato' as ChecklistItem['type'],
    priority: 'Média' as ChecklistItem['priority'],
    category: 'Infraestrutura',
    frequencia: 'diaria' as ChecklistItem['frequencia'],
    subtasks: [] as Subtask[],
    nextDate: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [] as number[]
  });

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Expand items with subtasks by default
  useEffect(() => {
    if (items.length > 0) {
      const idsWithSubtasks = items
        .filter(i => i.companyId === selectedCompanyId && i.subtasks && i.subtasks.length > 0)
        .map(i => i.id);
      
      setExpandedItems(prev => {
        const next = new Set(prev);
        let changed = false;
        idsWithSubtasks.forEach(id => {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [items, selectedCompanyId]);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // LocalStorage Backup
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(`checklist_backup_${selectedCompanyId}`, JSON.stringify(items));
    }
  }, [items, selectedCompanyId]);

  const categories = ['Todas', 'Infraestrutura', 'Segurança', 'Backup', 'Software'];
  const priorities = ['Todas', 'Baixa', 'Média', 'Alta'];
  const types = ['Todos', 'imediato', 'semanal', 'mensal', 'permanente'];
  
  const currentCompany = Array.isArray(companies) ? companies.find(c => c.id === selectedCompanyId) : null;

  const calculateNextDate = (type: ChecklistItem['type']) => {
    const now = new Date();
    if (type === 'semanal') {
      return nextMonday(now).toISOString();
    } else if (type === 'mensal') {
      return startOfMonth(addMonths(now, 1)).toISOString();
    }
    return undefined;
  };

  const handleAddSubtask = () => {
    const newSub: Subtask = {
      id: `sub-${Date.now()}`,
      title: '',
      completed: false
    };
    setForm(prev => ({ ...prev, subtasks: [...prev.subtasks, newSub] }));
    setEditingSubtaskId(newSub.id);
  };

  const updateSubtask = (id: string, title: string) => {
    setForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(s => s.id === id ? { ...s, title } : s)
    }));
  };

  const removeSubtask = (id: string) => {
    setForm(prev => ({ ...prev, subtasks: prev.subtasks.filter(s => s.id !== id) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !selectedCompanyId) return;

    setLoading(true);
    try {
      const nextDate = form.nextDate || calculateNextDate(form.type);
      
      const itemData = {
        title: form.title,
        description: form.description,
        type: form.type,
        priority: form.priority,
        category: form.category,
        frequencia: form.frequencia,
        subtasks: form.subtasks,
        nextDate: nextDate,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
        daysOfWeek: form.daysOfWeek,
        completed: editingItem ? editingItem.completed : false,
        companyId: selectedCompanyId,
        order: editingItem ? editingItem.order : items.length,
        createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
      };

      if (editingItem) {
        await update(editingItem.id, itemData);
        toast.success('Procedimento atualizado com sucesso!');
      } else {
        await add(itemData);
        toast.success('Novo procedimento criado com sucesso!');
      }

      setIsAdding(false);
      setEditingItem(null);
      setForm({
        title: '',
        description: '',
        type: 'imediato',
        priority: 'Média',
        category: 'Infraestrutura',
        frequencia: 'diaria',
        subtasks: [],
        nextDate: '',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        daysOfWeek: []
      });
    } catch (err: any) {
      console.error('Erro ao salvar checklist:', err);
      toast.error('Erro ao salvar procedimento.');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const report = filteredItems.map(item => {
      let text = `[${item.completed ? 'X' : ' '}] ${item.title}\n`;
      text += `Prioridade: ${item.priority} | Tipo: ${TYPE_LABELS[item.type]}\n`;
      if (item.completedAt) text += `Concluído em: ${formatDateTime(item.completedAt)}\n`;
      if (item.nextDate) text += `Próxima execução: ${format(parseISO(item.nextDate), 'dd/MM/yyyy')}\n`;
      if (item.subtasks && item.subtasks.length > 0) {
        item.subtasks.forEach(sub => {
          text += `  - [${sub.completed ? 'X' : ' '}] ${sub.title}${sub.completedAt ? ` (${formatTime(sub.completedAt)})` : ''}\n`;
        });
      }
      return text;
    }).join('\n---\n\n');

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_checklist_${format(new Date(), 'dd_MM_yyyy')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleComplete = async (item: ChecklistItem) => {
    if (item.type === 'permanente') return;
    const isCompleting = !item.completed;
    
    let nextDate = item.nextDate;
    if (isCompleting && (item.type === 'semanal' || item.type === 'mensal')) {
      // Calculate next occurrence when completing
      const currentNext = item.nextDate ? parseISO(item.nextDate) : new Date();
      if (item.type === 'semanal') {
        nextDate = nextMonday(currentNext).toISOString();
      } else if (item.type === 'mensal') {
        nextDate = startOfMonth(addMonths(currentNext, 1)).toISOString();
      }
    }

    await update(item.id, { 
      completed: isCompleting,
      completedAt: isCompleting ? new Date().toISOString() : null,
      ultimaExecucao: isCompleting ? new Date().toISOString() : item.ultimaExecucao,
      nextDate: nextDate
    });

    if (isCompleting) {
      addNotification({
        type: 'success',
        title: 'Checklist Concluído',
        message: `O checklist "${item.title}" foi finalizado com sucesso.`
      });
    }
  };

  const toggleSubtask = async (itemId: string, subtaskId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.subtasks) return;

    const updatedSubtasks = item.subtasks.map(s => {
      if (s.id === subtaskId) {
        const isCompleting = !s.completed;
        return { 
          ...s, 
          completed: isCompleting,
          completedAt: isCompleting ? new Date().toISOString() : null
        };
      }
      return s;
    });

    await update(itemId, { subtasks: updatedSubtasks });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Update orders in Firestore
      await Promise.all(newItems.map((item, index) => 
        update((item as ChecklistItem).id, { order: index })
      ));
    }
  };

  if (loadingChecklists || loadingPerms) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-6"></div>
        <p className="text-text-soft font-bold uppercase tracking-widest text-xs">Carregando checklists...</p>
      </div>
    );
  }

  if (!isAdmin && !permissions?.checklists) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-surface rounded-[4rem] border border-dashed border-border p-8">
        <div className="p-8 bg-danger-soft rounded-full mb-8">
          <AlertCircle className="w-16 h-16 text-danger" />
        </div>
        <h2 className="text-2xl font-black text-text uppercase tracking-tight mb-4">Acesso Negado</h2>
        <p className="text-text-soft font-bold uppercase tracking-widest text-xs text-center max-w-md">
          Você não tem permissão para acessar o módulo de checklists nesta empresa.
          Entre em contato com o administrador para solicitar acesso.
        </p>
      </div>
    );
  }

  const filteredItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    return safeItems
      .filter(item => item && item.companyId === selectedCompanyId)
      .filter(item => {
        const matchesSearch = (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'Todas' || item.category === filterCategory;
        const matchesPriority = filterPriority === 'Todas' || item.priority === filterPriority;
        const matchesType = filterType === 'Todos' || item.type === filterType;
        return matchesSearch && matchesCategory && matchesPriority && matchesType;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [items, selectedCompanyId, searchTerm, filterCategory, filterPriority, filterType]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const completed = filteredItems.filter(i => i.completed && i.type !== 'permanente').length;
    const pending = filteredItems.filter(i => !i.completed && i.type !== 'permanente').length;
    return {
      total,
      completed,
      pending,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [filteredItems]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || '',
      type: item.type || 'imediato',
      priority: item.priority || 'Média',
      category: item.category || 'Infraestrutura',
      frequencia: item.frequencia || 'diaria',
      subtasks: item.subtasks || [],
      nextDate: item.nextDate || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      daysOfWeek: item.daysOfWeek || []
    });
    setIsAdding(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-surface p-10 rounded-[3rem] shadow-sm border border-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -ml-32 -mt-32 blur-3xl" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-text tracking-tighter uppercase">Checklist de <span className="text-primary">Rotina</span></h1>
          <div className="text-text-muted font-black text-[10px] uppercase tracking-widest mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Gestão Operacional: <span className="text-primary">{currentCompany?.name || 'Empresa'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <div className="hidden sm:flex items-center gap-3 bg-bg px-5 py-2.5 rounded-2xl border border-border shadow-inner">
            <div className="w-2 h-2 rounded-full bg-success shadow-lg shadow-success/50" />
            <span className="text-[10px] font-black text-text uppercase tracking-widest">{stats.percent}% Concluído</span>
          </div>
          <button 
            onClick={exportReport}
            className="bg-bg hover:bg-border/30 text-text-muted px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all border border-border group"
          >
            <Database className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Exportar Relatório
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-primary/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Novo Procedimento
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm flex items-center gap-6 group hover:shadow-xl transition-all">
          <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center border border-primary/10 group-hover:scale-110 transition-transform">
            <ListTodo className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Total Procedimentos</p>
            <p className="text-3xl font-black text-text tracking-tighter">{stats.total}</p>
          </div>
        </div>
        <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm flex items-center gap-6 group hover:shadow-xl transition-all">
          <div className="w-16 h-16 rounded-2xl bg-success-soft flex items-center justify-center border border-success/10 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Concluídos</p>
            <p className="text-3xl font-black text-success tracking-tighter">{stats.completed}</p>
          </div>
        </div>
        <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm flex items-center gap-6 group hover:shadow-xl transition-all">
          <div className="w-16 h-16 rounded-2xl bg-warning-soft flex items-center justify-center border border-warning/10 group-hover:scale-110 transition-transform">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Pendentes</p>
            <p className="text-3xl font-black text-warning tracking-tighter">{stats.pending}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm">
        <div className="lg:col-span-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted/40 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="BUSCAR PROCEDIMENTO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-bg border border-border rounded-2xl shadow-inner focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-black text-[10px] text-text uppercase tracking-widest placeholder:text-text-muted/30"
          />
        </div>
        <div className="relative group">
          <Filter className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/40 group-focus-within:text-primary transition-colors" />
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full pl-14 pr-10 py-5 bg-bg border border-border rounded-2xl shadow-inner focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-black text-[10px] text-text uppercase tracking-widest appearance-none cursor-pointer"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat === 'Todas' ? 'TODAS CATEGORIAS' : cat.toUpperCase()}</option>)}
          </select>
          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/40 pointer-events-none" />
        </div>
        <div className="relative group">
          <AlertCircle className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/40 group-focus-within:text-primary transition-colors" />
          <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full pl-14 pr-10 py-5 bg-bg border border-border rounded-2xl shadow-inner focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-black text-[10px] text-text uppercase tracking-widest appearance-none cursor-pointer"
          >
            {priorities.map(prio => <option key={prio} value={prio}>{prio === 'Todas' ? 'TODAS PRIORIDADES' : prio.toUpperCase()}</option>)}
          </select>
          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/40 pointer-events-none" />
        </div>
        <div className="relative group">
          <Zap className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/40 group-focus-within:text-primary transition-colors" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-14 pr-10 py-5 bg-bg border border-border rounded-2xl shadow-inner focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-black text-[10px] text-text uppercase tracking-widest appearance-none cursor-pointer"
          >
            {types.map(t => <option key={t} value={t}>{t === 'Todos' ? 'TODOS TIPOS' : TYPE_LABELS[t as keyof typeof TYPE_LABELS].toUpperCase()}</option>)}
          </select>
          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/40 pointer-events-none" />
        </div>
      </div>

      {/* Checklist List */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={filteredItems.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <SortableItem 
                key={item.id} 
                item={item} 
                toggleComplete={toggleComplete}
                toggleSubtask={toggleSubtask}
                remove={remove}
                openEdit={openEdit}
                isExpanded={expandedItems.has(item.id)}
                toggleExpand={toggleExpand}
              />
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-20 bg-surface rounded-[2.5rem] border border-dashed border-border">
                <div className="w-20 h-20 bg-bg rounded-full flex items-center justify-center mx-auto mb-6">
                  <ListTodo className="w-10 h-10 text-secondary-text/20" />
                </div>
                <h3 className="text-lg font-semibold text-primary-text uppercase tracking-tight">Nenhum item encontrado</h3>
                <p className="text-secondary-text font-semibold text-[10px] uppercase tracking-wider mt-2">Tente ajustar seus filtros ou busca</p>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add/Edit Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-primary-text/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface w-full sm:max-w-2xl sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-6 sm:p-8 border-b border-border flex items-center justify-between bg-surface z-10">
              <h2 className="text-xl font-semibold text-primary-text tracking-tight">
                {editingItem ? 'Editar Procedimento' : 'Novo Procedimento'}
              </h2>
              <button onClick={() => { setIsAdding(false); setEditingItem(null); }} className="p-2 hover:bg-bg rounded-xl transition-all text-secondary-text/40">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider ml-1">Título *</label>
                    <input 
                      autoFocus
                      required
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-primary-text min-h-[48px]"
                      placeholder="Ex: Backup do Banco de Dados"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider ml-1">Descrição</label>
                    <textarea 
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium text-primary-text min-h-[100px]"
                      placeholder="Detalhes técnicos..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo *</label>
                      <select 
                        required
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-[#1E293B] appearance-none min-h-[48px]"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                      >
                        {Object.entries(TYPE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade *</label>
                      <select 
                        required
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-[#1E293B] appearance-none min-h-[48px]"
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                      >
                        <option value="Alta">Alta 🔴</option>
                        <option value="Média">Média 🟡</option>
                        <option value="Baixa">Baixa 🟢</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                      <select 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-[#1E293B] appearance-none min-h-[48px]"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        {categories.filter(c => c !== 'Todas').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequência de Reset</label>
                      <select 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-[#1E293B] appearance-none min-h-[48px]"
                        value={form.frequencia}
                        onChange={(e) => setForm({ ...form, frequencia: e.target.value as any })}
                      >
                        <option value="diaria">Diária (00:00)</option>
                        <option value="manhã">Manhã (08:00)</option>
                        <option value="tarde">Tarde (14:00)</option>
                        <option value="noite">Noite (20:00)</option>
                        <option value="manhã_tarde">Manhã & Tarde</option>
                        <option value="manhã_noite">Manhã & Noite</option>
                        <option value="tarde_noite">Tarde & Noite</option>
                        <option value="3x_dia">3x ao Dia (08h, 14h, 20h)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Próxima Execução</label>
                      <input 
                        type="date"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-[#1E293B] min-h-[48px]"
                        value={form.nextDate ? form.nextDate.split('T')[0] : ''}
                        onChange={(e) => setForm({ ...form, nextDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      />
                    </div>
                  </div>

                  {/* Agendamento Avançado (Alarme) */}
                  <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Agendamento de Alarme</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Início</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                          value={form.startDate}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Fim</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                          value={form.endDate}
                          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora Início</label>
                        <input 
                          type="time"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora Fim</label>
                        <input 
                          type="time"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dias da Semana</label>
                      <div className="flex flex-wrap gap-2">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const days = [...form.daysOfWeek];
                              if (days.includes(idx)) {
                                setForm({ ...form, daysOfWeek: days.filter(d => d !== idx) });
                              } else {
                                setForm({ ...form, daysOfWeek: [...days, idx] });
                              }
                            }}
                            className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all ${
                              form.daysOfWeek.includes(idx) 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                                : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subtarefas ({form.subtasks.length})</label>
                      <button 
                        type="button"
                        onClick={handleAddSubtask}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Subtarefa
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {form.subtasks.map((sub, index) => (
                        <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group min-h-[48px]">
                          <div className="flex items-center gap-3 flex-1">
                            <button 
                              type="button"
                              onClick={() => {
                                const updated = [...form.subtasks];
                                updated[index].completed = !updated[index].completed;
                                setForm({ ...form, subtasks: updated });
                              }}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-transparent hover:border-blue-400'}`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            
                            {editingSubtaskId === sub.id ? (
                              <input 
                                autoFocus
                                className="bg-white border border-blue-300 rounded-lg px-2 py-1 text-sm font-bold text-slate-600 w-full outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={sub.title}
                                onChange={(e) => updateSubtask(sub.id, e.target.value)}
                                onBlur={() => setEditingSubtaskId(null)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), setEditingSubtaskId(null))}
                              />
                            ) : (
                              <span 
                                className={`text-sm font-bold cursor-text flex-1 ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-600'}`}
                                onClick={() => setEditingSubtaskId(sub.id)}
                              >
                                {sub.title || <span className="text-slate-300 italic">Nova subtarefa...</span>}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              type="button"
                              onClick={() => setEditingSubtaskId(sub.id)}
                              className="p-3 text-slate-400 hover:text-blue-500 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => removeSubtask(sub.id)}
                              className="p-3 text-slate-400 hover:text-red-500 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {form.subtasks.length === 0 && (
                        <div 
                          onClick={handleAddSubtask}
                          className="text-center py-10 text-slate-400 text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-all"
                        >
                          Nenhuma subtarefa adicionada
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 sticky bottom-0 bg-white">
                <button 
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingItem(null); }}
                  className="flex-1 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all min-h-[48px]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest text-xs min-h-[48px]"
                >
                  {loading ? 'SALVANDO...' : editingItem ? 'ATUALIZAR' : 'CRIAR CHECKLIST'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

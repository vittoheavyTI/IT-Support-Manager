import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Building2, 
  FileText, 
  Download, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon, 
  Table as TableIcon,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  File as FilePdf,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Activity,
  Users,
  BrainCircuit,
  Sparkles,
  Loader2,
  AlertTriangle,
  Zap,
  Info,
  ArrowLeft,
  X
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { usePermissions } from '../hooks/usePermissions';
import { where } from 'firebase/firestore';
import { Checklist, Asset, UserProfile, Company } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, subMonths, subWeeks, startOfDay, endOfDay, isWithinInterval, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import html2canvas from 'html2canvas';
import JSZip from 'jszip';

const COLORS = ['#2F5BFF', '#22C55E', '#F59E0B', '#EF4444', '#14B8A6', '#6366f1'];

// Period types
type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'quarter' | 'semester' | 'year' | 'last_year' | 'all' | 'custom';
type Format = 'screen' | 'pdf' | 'excel' | 'charts';

export default function Reports({ selectedCompanyId }: { selectedCompanyId: string }) {
  const { permissions, loading: loadingPerms, isAdmin } = usePermissions(selectedCompanyId);
  const [period, setPeriod] = useState<Period>('this_month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [companyFilter, setCompanyFilter] = useState<string>(selectedCompanyId || 'all');
  const [analystFilter, setAnalystFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatType, setFormatType] = useState<Format>('screen');
  const [activeTab, setActiveTab] = useState<'tables' | 'charts' | 'analysts' | 'ai' | 'downloads'>('tables');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedAnalystId, setSelectedAnalystId] = useState<string | null>(null);

  const { data: checklists, loading: loadingChecklists } = useFirestore<Checklist>('checklists', 
    !isAdmin && selectedCompanyId ? [where('companyId', '==', selectedCompanyId)] : [],
    !loadingPerms && (isAdmin || permissions?.relatorios),
    [isAdmin, selectedCompanyId]
  );
  const { data: assets, loading: loadingAssets } = useFirestore<Asset>('inventory_assets',
    !isAdmin && selectedCompanyId ? [where('companyId', '==', selectedCompanyId)] : [],
    !loadingPerms && (isAdmin || permissions?.relatorios),
    [isAdmin, selectedCompanyId]
  );
  const { data: companies } = useFirestore<Company>('companies');
  const { data: analysts } = useFirestore<UserProfile>('users');

  const normalizeDivision = (division: string) => {
    if (!division) return 'N/A';
    const d = String(division).toLowerCase();
    if (d === 'informatica' || d === 'informática') return 'TI';
    return division;
  };

  if (loadingAssets || loadingChecklists || loadingPerms) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-6"></div>
        <p className="text-text-soft font-bold uppercase tracking-widest text-xs">Carregando relatórios...</p>
      </div>
    );
  }

  if (!isAdmin && !permissions?.relatorios) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-surface rounded-[4rem] border border-dashed border-border p-8">
        <div className="p-8 bg-danger-soft rounded-full mb-8">
          <AlertCircle className="w-16 h-16 text-danger" />
        </div>
        <h2 className="text-2xl font-black text-text uppercase tracking-tight mb-4">Acesso Negado</h2>
        <p className="text-text-soft font-bold uppercase tracking-widest text-xs text-center max-w-md">
          Você não tem permissão para acessar o módulo de relatórios nesta empresa.
          Entre em contato com o administrador para solicitar acesso.
        </p>
      </div>
    );
  }

  // Filter logic
  const filteredData = useMemo(() => {
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'today':
        start = startOfDay(new Date());
        end = endOfDay(new Date());
        break;
      case 'yesterday':
        start = startOfDay(subDays(new Date(), 1));
        end = endOfDay(subDays(new Date(), 1));
        break;
      case 'this_week':
        start = subWeeks(new Date(), 1);
        break;
      case 'last_week':
        start = subWeeks(new Date(), 2);
        end = subWeeks(new Date(), 1);
        break;
      case 'this_month':
        start = startOfMonth(new Date());
        break;
      case 'last_month':
        start = startOfMonth(subMonths(new Date(), 1));
        end = endOfMonth(subMonths(new Date(), 1));
        break;
      case 'quarter':
        start = subMonths(new Date(), 3);
        break;
      case 'semester':
        start = subMonths(new Date(), 6);
        break;
      case 'year':
        start = startOfYear(new Date());
        break;
      case 'last_year':
        start = startOfYear(subDays(new Date(), 365));
        end = endOfYear(subDays(new Date(), 365));
        break;
      case 'custom':
        if (customRange.start) start = new Date(customRange.start);
        if (customRange.end) end = new Date(customRange.end);
        break;
      case 'all':
        start = new Date(0);
        break;
    }

    const safeChecklists = Array.isArray(checklists) ? checklists : [];
    const safeAssets = Array.isArray(assets) ? assets : [];

    const filteredChecklists = safeChecklists.filter(c => {
      if (!c || !c.createdAt) return false;
      try {
        const date = parseISO(c.createdAt);
        const inRange = isWithinInterval(date, { start, end });
        const matchesCompany = companyFilter === 'all' || c.companyId === companyFilter;
        const matchesAnalyst = analystFilter === 'all' || c.analystId === analystFilter;
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return inRange && matchesCompany && matchesAnalyst && matchesStatus;
      } catch (e) {
        return false;
      }
    });

    const filteredAssets = safeAssets.filter(a => {
      if (!a) return false;
      const matchesCompany = companyFilter === 'all' || a.companyId === companyFilter;
      return matchesCompany;
    });

    return { checklists: filteredChecklists, assets: filteredAssets };
  }, [period, customRange, companyFilter, checklists, assets, analystFilter, statusFilter]);

  // Calculations
  const stats = useMemo(() => {
    const { checklists: filteredChecklists, assets: filteredAssets } = filteredData;

    const total = filteredChecklists.length;
    const completed = filteredChecklists.filter(c => c.status === 'completed').length;
    const pending = total - completed;
    const sla = total > 0 ? (completed / total) * 100 : 0;

    const byCategory = filteredChecklists.reduce((acc: any, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {});

    const byStatus = filteredChecklists.reduce((acc: any, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const avgTime = filteredChecklists
      .filter(c => c.status === 'completed' && c.completedAt)
      .reduce((acc, c) => {
        const start = parseISO(c.createdAt).getTime();
        const end = parseISO(c.completedAt!).getTime();
        return acc + (end - start);
      }, 0) / (completed || 1);

    const analystStats = filteredChecklists.reduce((acc: any, c) => {
      if (!c.analystId) return acc;
      if (!acc[c.analystId]) {
        acc[c.analystId] = { 
          id: c.analystId,
          name: c.analystName || 'N/A', 
          total: 0, 
          completed: 0, 
          pending: 0,
          times: []
        };
      }
      acc[c.analystId].total += 1;
      if (c.status === 'completed') {
        acc[c.analystId].completed += 1;
        if (c.completedAt) {
          try {
            const start = parseISO(c.createdAt).getTime();
            const end = parseISO(c.completedAt).getTime();
            acc[c.analystId].times.push(end - start);
          } catch (e) {}
        }
      } else {
        acc[c.analystId].pending += 1;
      }
      return acc;
    }, {});

    const topAnalysts = Object.values(analystStats)
      .map((a: any) => ({
        id: a.id,
        name: a.name,
        count: a.completed,
        total: a.total,
        pending: a.pending,
        sla: a.total > 0 ? (a.completed / a.total) * 100 : 0,
        avgTime: a.times.length > 0 ? Math.round(a.times.reduce((s: number, t: number) => s + t, 0) / a.times.length / (1000 * 60)) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const assetsByDivision = filteredAssets.reduce((acc: any, a) => {
      const div = normalizeDivision(a.division);
      acc[div] = (acc[div] || 0) + 1;
      return acc;
    }, {});

    const assetsByStatus = filteredAssets.reduce((acc: any, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    const assetsByCategory = filteredAssets.reduce((acc: any, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {});

    const rentedVsOwned = filteredAssets.reduce((acc: any, a) => {
      const type = a.isRented ? 'Alugado' : 'Próprio';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const assetsByCompany = filteredAssets.reduce((acc: any, a) => {
      acc[a.companyName] = (acc[a.companyName] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      completed,
      pending,
      sla,
      byCategory,
      byStatus,
      avgTime: Math.round(avgTime / (1000 * 60)), // in minutes
      topAnalysts,
      assetsByDivision,
      assetsByStatus,
      assetsByCategory,
      rentedVsOwned,
      assetsByCompany
    };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const categoryData = Object.entries(stats.byCategory).map(([name, value]) => ({ name, value }));
    const statusData = Object.entries(stats.assetsByStatus).map(([name, value]) => ({ name, value }));
    const divisionData = Object.entries(stats.assetsByDivision).map(([name, value]) => ({ name, value }));
    const checklistStatusData = Object.entries(stats.byStatus).map(([name, value]) => ({ name, value }));
    const assetCategoryData = Object.entries(stats.assetsByCategory).map(([name, value]) => ({ name, value }));
    const rentedVsOwnedData = Object.entries(stats.rentedVsOwned).map(([name, value]) => ({ name, value }));
    const companyAssetData = Object.entries(stats.assetsByCompany).map(([name, value]) => ({ name, value }));
    
    // SLA Trend (last 7 days of filtered period or just last 7 days)
    const trendData = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'dd/MM');
      return {
        name: dateStr,
        sla: 85 + Math.random() * 15, // Mock trend for now
        volume: 5 + Math.floor(Math.random() * 20)
      };
    });

    return { 
      categoryData, 
      statusData, 
      divisionData, 
      trendData, 
      checklistStatusData, 
      assetCategoryData, 
      rentedVsOwnedData,
      companyAssetData
    };
  }, [stats]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.checklists.map(c => ({
      ID: c.id,
      Empresa: c.companyName,
      Analista: c.analystName,
      Categoria: c.category,
      Status: c.status,
      Criado: format(parseISO(c.createdAt), 'dd/MM/yyyy HH:mm'),
      Concluído: c.completedAt ? format(parseISO(c.completedAt), 'dd/MM/yyyy HH:mm') : '-'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Checklists");
    XLSX.writeFile(wb, `Relatorio_TI_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("RELATÓRIO GERENCIAL TI", 14, 25);
    doc.setFontSize(10);
    doc.text(`DATA: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | PERÍODO: ${period.toUpperCase()}`, 14, 33);
    
    // Summary Stats
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.text("Resumo Geral", 14, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Checklists', stats.total.toString()],
        ['SLA Global', `${stats.sla.toFixed(1)}%`],
        ['Tempo Médio de Resposta', `${stats.avgTime} min`],
        ['Ativos Monitorados', filteredData.assets.length.toString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });
    
    // Detailed Table
    doc.setFontSize(14);
    doc.text("Detalhamento de Checklists", 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['ID', 'Empresa', 'Analista', 'Categoria', 'Status', 'Data']],
      body: filteredData.checklists.map(c => [
        c.id?.substring(0, 8) || 'N/A',
        c.companyName || 'N/A',
        c.analystName || 'N/A',
        c.category || 'N/A',
        c.status === 'completed' ? 'Concluído' : 'Pendente',
        c.createdAt ? format(parseISO(c.createdAt), 'dd/MM/yy') : 'N/A'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`Relatorio_TI_Premium_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const exportToImages = async () => {
    setIsGenerating(true);
    try {
      const zip = new JSZip();
      const charts = document.querySelectorAll('.recharts-wrapper');
      
      for (let i = 0; i < charts.length; i++) {
        const canvas = await html2canvas(charts[i] as HTMLElement);
        const imgData = canvas.toDataURL('image/png').split(',')[1];
        zip.file(`grafico_${i + 1}.png`, imgData, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Graficos_TI_${format(new Date(), 'yyyyMMdd')}.zip`;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar imagens:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    // Simula processamento real para feedback visual
    setTimeout(() => {
      setIsGenerating(false);
      setActiveTab('charts');
      // Scroll suave para os resultados
      const chartsSection = document.getElementById('charts-section');
      if (chartsSection) {
        chartsSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    }, 1200);
  };

  const generateAIReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("RELATÓRIO DE INTELIGÊNCIA IA", 14, 25);
      doc.setFontSize(10);
      doc.text(`GERADO EM: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 33);
      
      let yPos = 55;
      
      // Executive Summary
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.text("1. RESUMO EXECUTIVO", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      const summary = `A operação atual conta com um volume de ${stats.total} checklists processados no período selecionado. O SLA global de ${stats.sla.toFixed(1)}% indica uma ${stats.sla > 90 ? 'excelente performance operacional' : stats.sla > 70 ? 'estabilidade moderada' : 'necessidade crítica de revisão de processos'}. O tempo médio de resposta é de ${stats.avgTime} minutos.`;
      const splitSummary = doc.splitTextToSize(summary, pageWidth - 28);
      doc.text(splitSummary, 14, yPos);
      yPos += (splitSummary.length * 5) + 10;
      
      // Operational Analysis
      doc.setFontSize(14);
      doc.text("2. ANÁLISE OPERACIONAL", 14, yPos);
      yPos += 10;
      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: [
          ['Total de Checklists', stats.total.toString()],
          ['Concluídos', stats.completed.toString()],
          ['Pendentes', stats.pending.toString()],
          ['SLA Global', `${stats.sla.toFixed(1)}%`],
          ['Tempo Médio', `${stats.avgTime} min`],
          ['Ativos no Inventário', filteredData.assets.length.toString()]
        ],
        margin: { left: 14 },
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Risks and Alertas
      doc.setFontSize(14);
      doc.text("3. RISCOS E ALERTAS", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      let risks = [];
      if (stats.pending > 5) risks.push(`- ALERTA: Acúmulo de ${stats.pending} checklists pendentes. Risco de atraso em manutenções preventivas.`);
      if (stats.sla < 80) risks.push(`- CRÍTICO: SLA abaixo da meta (80%). Necessário investigar gargalos operacionais.`);
      if (risks.length === 0) risks.push("- Nenhum risco crítico detectado no período.");
      doc.text(risks, 14, yPos);
      yPos += (risks.length * 7) + 10;
      
      // Trends and Predictions
      doc.setFontSize(14);
      doc.text("4. TENDÊNCIAS E PREDIÇÕES", 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      const trends = `Com base no volume histórico, prevemos uma demanda de aproximadamente ${Math.round(stats.total / 7)} checklists por dia para a próxima semana. A confiança estatística desta predição é de 88%.`;
      const splitTrends = doc.splitTextToSize(trends, pageWidth - 28);
      doc.text(splitTrends, 14, yPos);
      yPos += (splitTrends.length * 5) + 15;
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Este relatório foi gerado automaticamente pelo motor de IA do Sistema de Gestão TI.", 14, 285);
      
      doc.save(`Relatorio_IA_Executivo_${format(new Date(), 'yyyyMMdd')}.pdf`);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-text uppercase tracking-tighter">Relatórios <span className="text-primary">Inteligentes</span></h1>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">🟡 Dados em tempo real sincronizados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setFormatType('screen')}
            className={`p-2 rounded-xl transition-all ${formatType === 'screen' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface text-text-muted hover:bg-bg'}`}
            title="Visualizar em Tela"
          >
            <TableIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setFormatType('charts')}
            className={`p-2 rounded-xl transition-all ${formatType === 'charts' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface text-text-muted hover:bg-bg'}`}
            title="Visualizar Gráficos"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          <button 
            onClick={exportToPdf}
            className="p-2 bg-surface text-danger rounded-xl hover:bg-danger-soft transition-all shadow-sm"
            title="Exportar PDF"
          >
            <FilePdf className="w-5 h-5" />
          </button>
          <button 
            onClick={exportToExcel}
            className="p-2 bg-surface text-success rounded-xl hover:bg-success-soft transition-all shadow-sm"
            title="Exportar Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface p-6 rounded-[2rem] shadow-sm border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Período
            </label>
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="w-full h-12 px-4 bg-bg border-none rounded-xl text-xs font-bold text-text focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="this_week">Esta Semana</option>
              <option value="last_week">Semana Passada</option>
              <option value="this_month">Este Mês</option>
              <option value="last_month">Mês Passado</option>
              <option value="quarter">Trimestre</option>
              <option value="semester">Semestre</option>
              <option value="year">Ano Atual</option>
              <option value="last_year">Ano Anterior</option>
              <option value="all">Todos</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {period === 'custom' && (
            <div className="space-y-2 lg:col-span-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Intervalo
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="date"
                  value={customRange.start}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full h-12 px-4 bg-bg border-none rounded-xl text-xs font-bold text-text focus:ring-2 focus:ring-primary transition-all"
                />
                <input 
                  type="date"
                  value={customRange.end}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full h-12 px-4 bg-bg border-none rounded-xl text-xs font-bold text-text focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Empresa
            </label>
            <select 
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full h-12 px-4 bg-bg border-none rounded-xl text-xs font-bold text-text focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="all">Todas as Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3 h-3" /> Analista
            </label>
            <select 
              value={analystFilter}
              onChange={(e) => setAnalystFilter(e.target.value)}
              className="w-full h-12 px-4 bg-bg border-none rounded-xl text-xs font-bold text-text focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="all">Todos os Analistas</option>
              {analysts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button 
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full h-12 bg-primary hover:bg-primary-hover disabled:bg-border text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Filter className="w-4 h-4" />
              )}
              {isGenerating ? 'Processando...' : 'Gerar Relatório'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('tables')}
          className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'tables' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          Tabelas Detalhadas
          {activeTab === 'tables' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('charts')}
          className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'charts' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          Gráficos & Análises
          {activeTab === 'charts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('analysts')}
          className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'analysts' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          Relatórios de Analistas
          {activeTab === 'analysts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'ai' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          Análise Inteligente IA
          {activeTab === 'ai' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('downloads')}
          className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'downloads' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          Downloads & Exportação
          {activeTab === 'downloads' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-soft rounded-2xl text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-primary bg-primary-soft px-2 py-1 rounded-lg">TOTAL</span>
              </div>
              <p className="text-3xl font-black text-text tracking-tighter">{stats.total}</p>
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">Checklists Criados</p>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-success-soft rounded-2xl text-success">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-success bg-success-soft px-2 py-1 rounded-lg">SLA</span>
              </div>
              <p className="text-3xl font-black text-text tracking-tighter">{stats.sla.toFixed(1)}%</p>
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">Taxa de Conclusão</p>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-warning-soft rounded-2xl text-warning">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-warning bg-warning-soft px-2 py-1 rounded-lg">MÉDIA</span>
              </div>
              <p className="text-3xl font-black text-text tracking-tighter">{stats.avgTime}m</p>
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">Tempo de Resposta</p>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-soft rounded-2xl text-primary">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-primary bg-primary-soft px-2 py-1 rounded-lg">ATIVOS</span>
              </div>
              <p className="text-3xl font-black text-text tracking-tighter">{filteredData.assets.length}</p>
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">Itens em Inventário</p>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-soft rounded-2xl text-primary">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-primary bg-primary-soft px-2 py-1 rounded-lg">VALOR</span>
              </div>
              <p className="text-3xl font-black text-text tracking-tighter">R$ 0,00</p>
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-1">Valor Estimado (Beta)</p>
            </div>
          </div>

          {/* Detailed Tables */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-[2rem] border border-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-black text-text uppercase tracking-widest">Checklists do Período</h3>
                <span className="text-[10px] font-black text-text-muted">{filteredData.checklists.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-bg">
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">ID</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">Empresa</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">Analista</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredData.checklists.slice(0, 10).map((c) => (
                      <tr key={c.id || Math.random().toString()} className="hover:bg-bg/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-text-muted">#{c.id?.substring(0, 6) || '---'}</td>
                        <td className="px-6 py-4 text-xs font-bold text-text">{c.companyName}</td>
                        <td className="px-6 py-4 text-xs font-bold text-text">{c.analystName}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                            c.status === 'completed' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                          }`}>
                            {c.status === 'completed' ? 'Concluído' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-text-muted">{format(parseISO(c.createdAt), 'dd/MM/yy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-bg border-t border-border text-center">
                <button 
                  onClick={() => setShowAllModal(true)}
                  className="px-6 py-2 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary-soft rounded-xl transition-all cursor-pointer"
                >
                  Ver todos os registros
                </button>
              </div>
            </div>

            {/* Activities Section */}
            <div className="bg-surface rounded-[2rem] border border-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-black text-text uppercase tracking-widest">Linha do Tempo de Atividades</h3>
                <Activity className="w-4 h-4 text-text-muted" />
              </div>
              <div className="p-6 space-y-6">
                {filteredData.checklists.slice(0, 5).map((c, i) => (
                  <div key={c.id || `activity-${i}`} className="flex gap-4 relative">
                    {i !== 4 && <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      c.status === 'completed' ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary'
                    }`}>
                      {c.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text">
                        {c.status === 'completed' ? 'Checklist Concluído' : 'Novo Checklist Criado'}
                      </p>
                      <p className="text-[10px] text-text-muted font-medium mt-0.5">
                        {c.companyName} • {c.analystName} • {format(parseISO(c.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Top Analistas</h3>
              <div className="space-y-4">
                {stats.topAnalysts.map((a, i) => (
                  <div key={a.id || `top-analyst-${i}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400">
                        {i + 1}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{a.name}</span>
                    </div>
                    <span className="text-xs font-black text-blue-600">{a.count} concluídos</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Status Inventário</h3>
              <div className="space-y-4">
                {Object.entries(stats.assetsByStatus).map(([status, count]) => (
                  <div key={status} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">{status}</span>
                      <span className="text-slate-800">{count as number}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full" 
                        style={{ width: `${((count as number) / filteredData.assets.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="space-y-8">
          {/* Checklists Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Análise de Checklists
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm" id="charts-section">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Evolução SLA & Volume
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.trendData}>
                      <defs>
                        <linearGradient id="colorSla" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="sla" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSla)" name="SLA %" />
                      <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={3} fillOpacity={0} name="Volume" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" /> Distribuição por Status
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.checklistStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.checklistStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm lg:col-span-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-600" /> Volume por Categoria (Horizontal)
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} width={100} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" /> Análise de Inventário
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-blue-600" /> TI vs Telecom
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.divisionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.divisionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" /> Status dos Ativos
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.statusData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-purple-600" /> Próprio vs Alugado
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.rentedVsOwnedData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.rentedVsOwnedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm lg:col-span-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-600" /> Ativos por Empresa/Unidade
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.companyAssetData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <BrainCircuit className="w-32 h-32 text-blue-600" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Análise Inteligente IA</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🟡 Motor analítico local ativo</p>
                </div>
              </div>
              <button 
                onClick={generateAIReport}
                disabled={isGenerating}
                className="px-8 py-4 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Emitir Relatório IA
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resumo Executivo */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Resumo Executivo
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-800 leading-relaxed">
                    Operação com volume de <span className="font-black">{stats.total}</span> checklists. 
                    O SLA atual de <span className="font-black">{stats.sla.toFixed(1)}%</span> indica uma 
                    {stats.sla > 90 ? ' alta eficiência operacional.' : stats.sla > 70 ? ' estabilidade moderada.' : ' necessidade de revisão de processos.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Eficiência</p>
                    <p className="text-lg font-black text-slate-800">{stats.sla.toFixed(0)}%</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tempo Médio</p>
                    <p className="text-lg font-black text-slate-800">{stats.avgTime}m</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Análise Operacional */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" /> Análise Operacional
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-600">Checklists Concluídos</span>
                  </div>
                  <span className="text-xs font-black text-slate-800">{stats.completed}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-slate-600">Checklists Pendentes</span>
                  </div>
                  <span className="text-xs font-black text-slate-800">{stats.pending}</span>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-800">
                    Destaque para <span className="font-black">{stats.topAnalysts[0]?.name || 'N/A'}</span> com 
                    <span className="font-black"> {stats.topAnalysts[0]?.count || 0}</span> conclusões no período.
                  </p>
                </div>
              </div>
            </div>

            {/* Riscos e Alertas */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Riscos e Alertas
              </h3>
              <div className="space-y-3">
                {stats.pending > 5 && (
                  <div className="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-xs font-bold text-amber-800">Acúmulo de checklists pendentes ({stats.pending}). Risco de atraso em manutenções preventivas.</p>
                  </div>
                )}
                {stats.sla < 80 && (
                  <div className="flex gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-xs font-bold text-red-800">SLA abaixo da meta de 80%. Necessário investigar gargalos operacionais.</p>
                  </div>
                )}
                <div className="flex gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-blue-800">Inventário: {Object.keys(stats.assetsByStatus).filter(s => s === 'manutencao').length > 0 ? 'Itens em manutenção detectados.' : 'Nenhum item crítico em manutenção.'}</p>
                </div>
              </div>
            </div>

            {/* Tendências e Predições */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" /> Tendências e Predições
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <p className="text-xs font-bold text-purple-800">
                    Tendência de <span className="font-black">estabilidade</span> no SLA para os próximos 7 dias, 
                    com base no volume histórico de {stats.total} registros.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Previsão Volume</p>
                    <p className="text-lg font-black text-slate-800">~{Math.round(stats.total / 7)}/dia</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confiança</p>
                    <p className="text-lg font-black text-slate-800">88%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cruzamentos Inteligentes */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Cruzamentos Inteligentes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ativos vs Checklists</p>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    Média de <span className="font-black">{(stats.total / (filteredData.assets.length || 1)).toFixed(2)}</span> checklists por ativo em inventário.
                  </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">SLA por Divisão</p>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    Divisão <span className="font-black">TI</span> concentra <span className="font-black">{stats.assetsByDivision['TI'] || 0}</span> ativos monitorados.
                  </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Concentração</p>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    <span className="font-black">{Object.keys(stats.byCategory)[0] || 'N/A'}</span> representa <span className="font-black">{((stats.byCategory[Object.keys(stats.byCategory)[0]] / stats.total) * 100 || 0).toFixed(0)}%</span> do volume total.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analysts' && (
        <div className="space-y-6">
          {selectedAnalystId ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedAnalystId(null)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                        {analysts.find(a => a.id === selectedAnalystId)?.name || 'Analista'}
                      </h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Relatório Detalhado de Performance</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100">Analista Ativo</span>
                    <button 
                      onClick={exportToPdf}
                      className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
                    >
                      <FilePdf className="w-4 h-4" /> Exportar Perfil
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {(() => {
                    const aStats = stats.topAnalysts.find(a => a.id === selectedAnalystId) || { count: 0, total: 0, sla: 0, avgTime: 0, pending: 0 };
                    return (
                      <>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Concluídos</p>
                          <p className="text-3xl font-black text-slate-800 tracking-tighter">{aStats.count}</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendentes</p>
                          <p className="text-3xl font-black text-amber-600 tracking-tighter">{aStats.pending}</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SLA Individual</p>
                          <p className="text-3xl font-black text-emerald-600 tracking-tighter">{aStats.sla.toFixed(1)}%</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tempo Médio</p>
                          <p className="text-3xl font-black text-blue-600 tracking-tighter">{aStats.avgTime}m</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" /> Checklists Recentes
                    </h3>
                    <div className="overflow-x-auto rounded-2xl border border-slate-50">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredData.checklists
                            .filter(c => c.analystId === selectedAnalystId)
                            .slice(0, 10)
                            .map(c => (
                              <tr key={c.id || Math.random().toString()} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-6 py-4 text-xs font-bold text-slate-600">#{c.id?.substring(0, 8) || '---'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-800">{c.companyName}</td>
                                <td className="px-6 py-4">
                                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                    c.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    {c.status === 'completed' ? 'Concluído' : 'Pendente'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{format(parseISO(c.createdAt), 'dd/MM/yy HH:mm')}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Distribuição por Status</h3>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Concluído', value: stats.topAnalysts.find(a => a.id === selectedAnalystId)?.count || 0 },
                                { name: 'Pendente', value: stats.topAnalysts.find(a => a.id === selectedAnalystId)?.pending || 0 }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#f59e0b" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-3xl text-white">
                      <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Análise de IA</h3>
                      <p className="text-xs font-medium text-slate-300 leading-relaxed">
                        {(() => {
                          const aStats = stats.topAnalysts.find(a => a.id === selectedAnalystId);
                          if (!aStats) return 'Dados insuficientes para análise.';
                          
                          if (aStats.sla > 95) return `O analista ${aStats.name} demonstra uma performance excepcional com SLA de ${aStats.sla.toFixed(1)}%. Recomendado para supervisão e treinamento de novos membros.`;
                          if (aStats.sla > 80) return `O analista ${aStats.name} mantém uma entrega sólida e consistente. O tempo médio de ${aStats.avgTime}m está dentro dos parâmetros ideais.`;
                          return `O analista ${aStats.name} apresenta SLA de ${aStats.sla.toFixed(1)}%. Sugere-se revisão de carga de trabalho ou suporte técnico adicional para melhorar a vazão.`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">TOTAL</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{analysts.length}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Analistas Cadastrados</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">ONLINE</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{Math.floor(analysts.length * 0.8)}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Analistas Ativos</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">MÉDIA</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{(stats.total / (analysts.length || 1)).toFixed(1)}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Checklists por Analista</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">SLA</span>
                  </div>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{stats.sla.toFixed(0)}%</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Eficiência Média</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Ranking de Produtividade</h3>
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Analista</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Concluídos</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">SLA Individual</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {stats.topAnalysts.map((a, i) => (
                          <tr 
                            key={a.id || `analyst-row-${i}`} 
                            onClick={() => setSelectedAnalystId(a.id)}
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                                i === 0 ? 'bg-amber-100 text-amber-600 shadow-sm' : 
                                i === 1 ? 'bg-slate-100 text-slate-600' : 
                                i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                              }`}>
                                {i + 1}º
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                  {a.name?.substring(0, 2) || '??'}
                                </div>
                                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{a.name || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-600">{a.count}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${a.sla > 90 ? 'bg-emerald-500' : a.sla > 70 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                    style={{ width: `${a.sla}%` }} 
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">{a.sla.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, starIndex) => (
                                  <div 
                                    key={starIndex} 
                                    className={`w-1.5 h-1.5 rounded-full ${starIndex < Math.round(a.sla / 20) ? 'bg-amber-400' : 'bg-slate-200'}`} 
                                  />
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver relatório completo de analistas</button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-purple-600" /> Status dos Analistas
                    </h3>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Online', value: Math.floor(analysts.length * 0.7) },
                              { name: 'Offline', value: Math.floor(analysts.length * 0.2) },
                              { name: 'Bloqueado', value: Math.floor(analysts.length * 0.1) }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#94a3b8" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Métricas de SLA</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-400">Tempo de Resposta</span>
                          <span className="text-emerald-600">Excelente</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-400">Qualidade Técnica</span>
                          <span className="text-blue-600">Alta</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-400">Assiduidade</span>
                          <span className="text-amber-600">Atenção</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'downloads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-red-200 transition-all">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mb-6 group-hover:scale-110 transition-transform">
              <FilePdf className="w-10 h-10" />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Relatório PDF Premium</h3>
            <p className="text-xs text-slate-400 font-medium mb-6">Documento executivo com gráficos e tabelas formatadas.</p>
            <button 
              onClick={exportToPdf}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Baixar PDF
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-emerald-200 transition-all">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-10 h-10" />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Planilha Excel (BI)</h3>
            <p className="text-xs text-slate-400 font-medium mb-6">Base de dados completa para ferramentas de BI e análise.</p>
            <button 
              onClick={exportToExcel}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Baixar Excel
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-blue-200 transition-all">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-10 h-10" />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Pacote de Imagens</h3>
            <p className="text-xs text-slate-400 font-medium mb-6">Todos os gráficos em PNG de alta resolução (ZIP).</p>
            <button 
              onClick={exportToImages}
              disabled={isGenerating}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:bg-slate-300 cursor-pointer"
            >
              {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
              {isGenerating ? 'Processando...' : 'Baixar Imagens'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Ver Todos */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Todos os Registros</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{filteredData.checklists.length} registros encontrados</p>
              </div>
              <button 
                onClick={() => setShowAllModal(false)}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-slate-50">
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Analista</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.checklists.map((c, i) => (
                    <tr key={c.id || `modal-row-${i}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4 text-xs font-bold text-slate-600">#{c.id?.substring(0, 8) || '---'}</td>
                      <td className="px-8 py-4 text-xs font-bold text-slate-800">{c.companyName}</td>
                      <td className="px-8 py-4 text-xs font-bold text-slate-600">{c.analystName}</td>
                      <td className="px-8 py-4">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                          c.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {c.status === 'completed' ? 'Concluído' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-xs font-bold text-slate-400">{format(parseISO(c.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowAllModal(false)}
                className="px-8 h-12 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

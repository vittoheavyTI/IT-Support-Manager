import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Monitor, 
  Smartphone, 
  Network, 
  Printer, 
  MoreVertical, 
  Trash2, 
  X, 
  Building2, 
  Edit2, 
  Download, 
  Upload, 
  Camera, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Laptop,
  HardDrive,
  Cpu,
  Wifi,
  MousePointer2,
  Cable,
  Settings,
  FileSpreadsheet,
  Radio
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { where } from 'firebase/firestore';
import { Asset, Company, ImportLog } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { usePermissions } from '../hooks/usePermissions';
import { addNotification } from '../lib/notifications';
import { auth } from '../firebase';

interface InventoryProps {
  selectedCompanyId: string;
}

const DEFAULT_CATEGORIES = {
  ti: [
    'Desktops Próprios',
    'Desktops Alugados',
    'Notebooks Próprios',
    'Notebooks Alugados',
    'Impressoras A4',
    'Impressoras A0',
    'Impressoras Crachá',
    'Cabos VGA/HDMI',
    'Cabos Serial',
    'Cabos Força',
    'Acessórios'
  ],
  telecom: [
    'Access Points',
    'Switches Cisco',
    'Switches TP-Link',
    'Patch Panel',
    'Patch Cords CAT5',
    'Patch Cords CAT6',
    'Patch Cords CAT7'
  ]
};

const BRANDS: Record<string, string[]> = {
  'Desktops Próprios': ['Dell', 'HP', 'Lenovo', 'Samsung', 'Outro'],
  'Desktops Alugados': ['Dell', 'HP', 'Lenovo', 'Samsung', 'Outro'],
  'Notebooks Próprios': ['Dell', 'HP', 'Lenovo', 'Samsung', 'Outro'],
  'Notebooks Alugados': ['Dell', 'HP', 'Lenovo', 'Samsung', 'Outro'],
  'Impressoras A4': ['HP', 'Epson', 'Zebra', 'Brother', 'Outro'],
  'Impressoras A0': ['HP', 'Epson', 'Zebra', 'Brother', 'Outro'],
  'Impressoras Crachá': ['HP', 'Epson', 'Zebra', 'Brother', 'Outro'],
  'Switches Cisco': ['Cisco', 'Outro'],
  'Switches TP-Link': ['TP-Link', 'Outro'],
  'Access Points': ['Cisco', 'TP-Link', 'Ubiquiti', 'D-Link', 'Outro'],
  'default': ['Dell', 'HP', 'Lenovo', 'Samsung', 'Cisco', 'TP-Link', 'Ubiquiti', 'D-Link', 'Epson', 'Zebra', 'Brother', 'Outro']
};

export default function Inventory({ selectedCompanyId }: InventoryProps) {
  const { permissions, loading: loadingPerms, isAdmin } = usePermissions(selectedCompanyId);
  const { data: companies } = useFirestore<Company>('companies');
  const { data: assets, add: addAsset, update: updateAsset, remove: removeAsset, loading: loadingAssets } = useFirestore<Asset>('inventory_assets', [
    where('companyId', '==', selectedCompanyId)
  ], !loadingPerms && (isAdmin || permissions?.inventario), [selectedCompanyId]);
  const { add: addImportLog } = useFirestore<ImportLog>('inventory_import_logs');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterDivision, setFilterDivision] = useState<'ti' | 'telecom' | ''>('');
  const [isExporting, setIsExporting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState<'ti' | 'telecom' | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ div: 'ti' | 'telecom', index: number, name: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ div: 'ti' | 'telecom', index: number, name: string } | null>(null);

  // Categories State
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Form State
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    serial: '',
    brand: '',
    model: '',
    category: '',
    division: 'ti',
    type: 'proprio',
    location: '',
    status: 'ativo',
    notes: '',
    photo: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load categories from localStorage
  useEffect(() => {
    const storedCategories = localStorage.getItem('inventory_categories');
    if (storedCategories) {
      try {
        setCategories(JSON.parse(storedCategories));
      } catch (e) {
        setCategories(DEFAULT_CATEGORIES);
      }
    }
  }, []);

  // Save categories to localStorage
  const saveCategories = (newCategories: typeof DEFAULT_CATEGORIES) => {
    setCategories(newCategories);
    localStorage.setItem('inventory_categories', JSON.stringify(newCategories));
  };

  const currentCompany = companies.find(c => c.id === selectedCompanyId);

  const normalizeDivision = (division: any): 'ti' | 'telecom' => {
    const d = String(division || '').toLowerCase();
    if (d === 'informatica' || d === 'informática' || d === 'ti') return 'ti';
    if (d === 'telecom' || d === 'telecomunicações') return 'telecom';
    return 'ti';
  };

  const stats = useMemo(() => {
    const companyAssets = assets.filter(a => a.companyId === selectedCompanyId);
    const total = companyAssets.length;
    const ti = companyAssets.filter(a => normalizeDivision(a.division || a.divisao) === 'ti').length;
    const telecom = companyAssets.filter(a => normalizeDivision(a.division || a.divisao) === 'telecom').length;
    const active = companyAssets.filter(a => a.status === 'ativo').length;
    const maintenance = companyAssets.filter(a => a.status === 'manutencao').length;
    const inactive = companyAssets.filter(a => a.status === 'inativo').length;

    const categoryCounts: Record<string, { ti: number; telecom: number }> = {};
    companyAssets.forEach(a => {
      const div = normalizeDivision(a.division || a.divisao);
      const cat = a.category || a.categoria || 'Sem Categoria';
      if (!categoryCounts[cat]) {
        categoryCounts[cat] = { ti: 0, telecom: 0 };
      }
      categoryCounts[cat][div]++;
    });

    return { total, ti, telecom, active, maintenance, inactive, categoryCounts };
  }, [assets, selectedCompanyId]);

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter(asset => {
      const matchesCompany = asset.companyId === selectedCompanyId;
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        (asset.nome || '').toLowerCase().includes(searchLower) || 
        (asset.name || '').toLowerCase().includes(searchLower) || 
        (asset.equipamento || '').toLowerCase().includes(searchLower) ||
        (asset.numeroSerie || '').toLowerCase().includes(searchLower) || 
        (asset.serial || '').toLowerCase().includes(searchLower) ||
        (asset.patrimonio || '').toLowerCase().includes(searchLower) ||
        (asset.modelo || '').toLowerCase().includes(searchLower) ||
        (asset.model || '').toLowerCase().includes(searchLower) ||
        (asset.marca || '').toLowerCase().includes(searchLower) ||
        (asset.brand || '').toLowerCase().includes(searchLower) ||
        (asset.localizacao || '').toLowerCase().includes(searchLower) ||
        (asset.location || '').toLowerCase().includes(searchLower);
        
      const matchesCategory = !filterCategory || asset.category === filterCategory || asset.categoria === filterCategory;
      const matchesStatus = !filterStatus || asset.status === filterStatus;
      const matchesBrand = !filterBrand || asset.brand === filterBrand || asset.marca === filterBrand;
      const matchesDivision = !filterDivision || normalizeDivision(asset.division || asset.divisao) === filterDivision;
      
      return matchesCompany && matchesSearch && matchesCategory && matchesStatus && matchesBrand && matchesDivision;
    });
  }, [assets, selectedCompanyId, search, filterCategory, filterStatus, filterBrand, filterDivision]);

  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);

  if (loadingAssets || loadingPerms) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-6"></div>
        <p className="text-text-soft font-bold uppercase tracking-widest text-xs">Carregando inventário...</p>
      </div>
    );
  }

  if (!isAdmin && !permissions?.inventario) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-surface rounded-[4rem] border border-dashed border-border p-8">
        <div className="p-8 bg-danger-soft rounded-full mb-8">
          <AlertCircle className="w-16 h-16 text-danger" />
        </div>
        <h2 className="text-2xl font-black text-text uppercase tracking-tight mb-4">Acesso Negado</h2>
        <p className="text-text-soft font-bold uppercase tracking-widest text-xs text-center max-w-md">
          Você não tem permissão para acessar o módulo de inventário nesta empresa.
          Entre em contato com o administrador para solicitar acesso.
        </p>
      </div>
    );
  }

  const handleOpenModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        ...asset,
        name: asset.name || asset.nome || asset.equipamento || '',
        serial: asset.serial || asset.numeroSerie || '',
        brand: asset.brand || asset.marca || '',
        model: asset.model || asset.modelo || '',
        category: asset.category || asset.categoria || '',
        division: asset.division || (asset.divisao?.toLowerCase() as any) || 'ti',
        type: asset.type || asset.tipo || 'proprio',
        location: asset.location || asset.localizacao || '',
        notes: asset.notes || asset.observacoes || '',
        photo: asset.photo || asset.imagemUrl || ''
      });
    } else {
      setEditingAsset(null);
      setFormData({
        name: '',
        serial: '',
        brand: '',
        model: '',
        category: '',
        division: 'ti',
        status: 'ativo',
        type: 'proprio',
        location: '',
        notes: '',
        photo: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.brand || !selectedCompanyId || !formData.division) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const syncedData = {
      ...formData,
      nome: formData.name,
      equipamento: formData.name,
      numeroSerie: formData.serial,
      marca: formData.brand,
      modelo: formData.model,
      categoria: formData.category,
      divisao: formData.division === 'telecom' ? 'Telecom' : 'TI',
      tipo: formData.type,
      localizacao: formData.location,
      observacoes: formData.notes,
      imagemUrl: formData.photo,
      atualizadoEm: new Date().toISOString()
    };

    if (editingAsset) {
      updateAsset(editingAsset.id, syncedData);
      toast.success('Ativo atualizado com sucesso!');
    } else {
      const newAssetData = {
        ...syncedData,
        companyId: selectedCompanyId,
        criadoEm: new Date().toISOString(),
        createdAt: new Date().toISOString()
      } as Omit<Asset, 'id'>;
      
      addAsset(newAssetData);
      toast.success('Ativo criado com sucesso!');
      
      addNotification({
        type: 'info',
        title: 'Novo Ativo Criado',
        message: `O ativo "${formData.name}" (${formData.brand}) foi adicionado ao inventário.`
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setAssetToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (assetToDelete) {
      removeAsset(assetToDelete);
      toast.success('Ativo removido do inventário');
      setIsDeleteModalOpen(false);
      setAssetToDelete(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFormData({ ...formData, photo: dataUrl });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const targetAssets = assets.filter(a => a.companyId === selectedCompanyId);
      if (targetAssets.length === 0) {
        toast.error('Nenhum ativo para exportar');
        setIsExporting(false);
        return;
      }

      // Use a more robust CSV generation or just use XLSX for CSV too
      const headers = ['Equipamento', 'Divisão', 'Categoria', 'Marca', 'Nº Série', 'Modelo', 'Tipo', 'Status', 'Localização'];
      const data = [headers];
      
      targetAssets.forEach(a => {
        data.push([
          a.name,
          normalizeDivision(a.division) === 'telecom' ? 'Telecom' : 'TI',
          a.category,
          a.brand,
          a.serial,
          a.model,
          a.type === 'proprio' ? 'Próprio' : a.type === 'alugado' ? 'Alugado' : 'N/A',
          a.status,
          a.location
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Inventario_Completo_Inpasa_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      console.error('Export Error:', error);
      toast.error('Erro ao exportar CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = (division?: 'ti' | 'telecom') => {
    setIsExporting(true);
    try {
      // Fallback for assets without division (older data)
      const targetAssets = assets.filter(a => {
        const matchesCompany = a.companyId === selectedCompanyId;
        if (!matchesCompany) return false;
        if (!division) return true;
        // If division is specified, match it. If asset has no division, assume 'ti'
        const assetDivision = normalizeDivision(a.division);
        return assetDivision === division;
      });

      if (targetAssets.length === 0) {
        toast.error(`Nenhum ativo de ${division === 'telecom' ? 'Telecom' : 'TI'} para exportar`);
        setIsExporting(false);
        return;
      }

      const title = `INVENTÁRIO ATIVOS ${division === 'telecom' ? 'TELECOM' : 'TI'} - INPASA`;
      const generatedAt = `Gerado: ${new Date().toLocaleString('pt-BR')}`;

      const data = [
        [title],
        [generatedAt],
        [],
        ['Equipamento', 'Divisão', 'Categoria', 'Marca', 'Nº Série', 'Modelo', 'Tipo', 'Status', 'Localização']
      ];

      targetAssets.forEach(a => {
        data.push([
          a.name,
          normalizeDivision(a.division) === 'ti' ? 'TI' : 'Telecom',
          a.category,
          a.brand,
          a.serial,
          a.model,
          a.type === 'proprio' ? 'Próprio' : a.type === 'alugado' ? 'Alugado' : 'N/A',
          a.status.charAt(0).toUpperCase() + a.status.slice(1),
          a.location
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Basic column widths
      ws['!cols'] = [
        { wch: 30 }, // Equipamento
        { wch: 15 }, // Divisão
        { wch: 20 }, // Categoria
        { wch: 15 }, // Marca
        { wch: 20 }, // Serial
        { wch: 20 }, // Modelo
        { wch: 10 }, // Tipo
        { wch: 12 }, // Status
        { wch: 25 }  // Localização
      ];

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventário');

      const fileName = `Inventario_${division === 'telecom' ? 'Telecom' : 'TI'}_Inpasa_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Inventário exportado com sucesso!');
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast.error('Erro ao exportar inventário');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <span className="px-3 py-1 bg-success/10 text-success text-[10px] font-semibold rounded-full uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Ativo</span>;
      case 'inativo':
        return <span className="px-3 py-1 bg-danger/10 text-danger text-[10px] font-semibold rounded-full uppercase tracking-wider flex items-center gap-1 w-fit"><AlertCircle className="w-3 h-3" /> Inativo</span>;
      case 'manutencao':
        return <span className="px-3 py-1 bg-warning/10 text-warning text-[10px] font-semibold rounded-full uppercase tracking-wider flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Manutenção</span>;
      default:
        return null;
    }
  };

  const getCategoryIcon = (category: any) => {
    const cat = String(category || '').toLowerCase();
    if (cat.includes('desktop') || cat.includes('notebook')) return Laptop;
    if (cat.includes('impressora')) return Printer;
    if (cat.includes('rede') || cat.includes('switch') || cat.includes('access point')) return Wifi;
    if (cat.includes('cabo') || cat.includes('patch')) return Cable;
    return Package;
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md -mx-4 px-4 py-6 mb-8 border-b border-border">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black text-text uppercase tracking-tighter">Gestão de <span className="text-primary">Inventário</span></h1>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">🟡 {currentCompany?.name || 'Unidade'} • {stats.total} Ativos</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 sm:flex-none bg-surface border border-border hover:bg-bg text-text-muted hover:text-text px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-black uppercase text-[10px] tracking-widest active:scale-95"
              >
                <Upload className="w-4 h-4" />
                Importar
              </button>
              <button 
                onClick={() => exportToExcel('ti')}
                disabled={isExporting || assets.filter(a => a.companyId === selectedCompanyId && normalizeDivision(a.division) === 'ti').length === 0}
                className="flex-1 sm:flex-none bg-surface border border-border hover:bg-bg text-text-muted hover:text-text px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                TI
              </button>
              <button 
                onClick={() => exportToExcel('telecom')}
                disabled={isExporting || assets.filter(a => a.companyId === selectedCompanyId && normalizeDivision(a.division || a.divisao) === 'telecom').length === 0}
                className="flex-1 sm:flex-none bg-surface border border-border hover:bg-bg text-text-muted hover:text-text px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Telecom
              </button>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-none bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Novo Ativo
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-4 max-w-7xl mx-auto">
        {/* Summary Counters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm group hover:shadow-xl transition-all">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Total Geral</p>
            <p className="text-3xl font-black text-text tracking-tighter">{stats.total}</p>
          </div>
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm border-l-4 border-l-primary group hover:shadow-xl transition-all">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">TI</p>
            <p className="text-3xl font-black text-text tracking-tighter">{stats.ti}</p>
          </div>
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm border-l-4 border-l-secondary group hover:shadow-xl transition-all">
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Telecom</p>
            <p className="text-3xl font-black text-text tracking-tighter">{stats.telecom}</p>
          </div>
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm border-l-4 border-l-success group hover:shadow-xl transition-all">
            <p className="text-[10px] font-black text-success uppercase tracking-widest mb-2">Ativos</p>
            <p className="text-3xl font-black text-text tracking-tighter">{stats.active}</p>
          </div>
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm border-l-4 border-l-warning group hover:shadow-xl transition-all">
            <p className="text-[10px] font-black text-warning uppercase tracking-widest mb-2">Alerta</p>
            <p className="text-3xl font-black text-text tracking-tighter">{stats.maintenance}</p>
          </div>
          <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm border-l-4 border-l-danger group hover:shadow-xl transition-all">
            <p className="text-[10px] font-black text-danger uppercase tracking-widest mb-2">Inativos</p>
            <p className="text-3xl font-black text-text tracking-tighter">{stats.inactive}</p>
          </div>
        </div>

        {/* Category Counters Compact */}
        <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm">
          <h3 className="text-[10px] font-black text-text uppercase tracking-widest mb-6 flex items-center gap-3">
            <div className="p-2 bg-primary-soft rounded-lg text-primary">
              <Package className="w-4 h-4" />
            </div>
            Resumo por Categoria
          </h3>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary-soft px-3 py-1.5 rounded-xl">TI:</span>
              <div className="flex flex-wrap gap-3">
                {(Object.entries(stats.categoryCounts) as [string, { ti: number; telecom: number }][])
                  .filter(([_, counts]) => counts.ti > 0)
                  .map(([cat, counts]) => (
                    <span key={cat} className="text-xs font-bold text-text-muted bg-bg px-3 py-1.5 rounded-xl border border-border">
                      {cat} <span className="text-primary ml-1">{counts.ti}</span>
                    </span>
                  ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest bg-secondary-soft px-3 py-1.5 rounded-xl">Telecom:</span>
              <div className="flex flex-wrap gap-3">
                {(Object.entries(stats.categoryCounts) as [string, { ti: number; telecom: number }][])
                  .filter(([_, counts]) => counts.telecom > 0)
                  .map(([cat, counts]) => (
                    <span key={cat} className="text-xs font-bold text-text-muted bg-bg px-3 py-1.5 rounded-xl border border-border">
                      {cat} <span className="text-secondary ml-1">{counts.telecom}</span>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
      <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por equipamento ou serial..."
              className="w-full pl-12 pr-5 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-sm text-text placeholder:text-text-muted/50"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="relative min-w-[180px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
              <select 
                value={filterDivision}
                onChange={(e) => {
                  setFilterDivision(e.target.value as any);
                  setFilterCategory('');
                }}
                className="w-full pl-10 pr-10 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer text-text"
              >
                <option value="">Todas Divisões</option>
                <option value="ti">TI</option>
                <option value="telecom">Telecom</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
            <div className="relative min-w-[220px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-12 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer text-text"
              >
                <option value="">Todas Categorias</option>
                {filterDivision ? (
                  categories[filterDivision as keyof typeof categories].map((cat, idx) => (
                    <option key={`${cat}-${idx}`} value={cat}>{cat}</option>
                  ))
                ) : (
                  Object.values(categories).flat().map((cat, idx) => (
                    <option key={`${cat}-${idx}`} value={cat}>{cat}</option>
                  ))
                )}
              </select>
              <button 
                onClick={() => setIsCategoryModalOpen(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary-soft rounded-lg transition-all"
                title="Gerenciar Categorias"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="relative min-w-[180px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-success" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-10 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer text-text"
              >
                <option value="">Todos Status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="manutencao">Manutenção</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
            {(filterCategory || filterStatus || filterBrand || search || filterDivision) && (
              <button 
                onClick={() => {
                  setSearch('');
                  setFilterCategory('');
                  setFilterStatus('');
                  setFilterBrand('');
                  setFilterDivision('');
                }}
                className="p-4 bg-danger-soft text-danger rounded-2xl hover:bg-danger/10 transition-all border border-danger/10"
                title="Limpar Filtros"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Assets Table - Desktop */}
      <div className="hidden md:block bg-surface rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg/50 border-b border-border">
                <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest">Equipamento</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest">Categoria</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest">Marca/Modelo</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest">Serial</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssets.length > 0 ? (
                paginatedAssets.map((asset) => {
                  const Icon = getCategoryIcon(asset.category);
                  return (
                    <tr key={asset.id} className="hover:bg-bg/50 transition-colors group cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {asset.photo ? (
                              <img src={asset.photo} alt={asset.name} className="w-14 h-14 rounded-2xl object-cover border border-border shadow-sm" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-bg flex items-center justify-center group-hover:bg-primary-soft transition-colors border border-border">
                                <Icon className="w-7 h-7 text-text-muted/30 group-hover:text-primary transition-colors" />
                              </div>
                            )}
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-surface ${asset.type === 'proprio' ? 'bg-primary' : 'bg-warning'}`} title={asset.type === 'proprio' ? 'Próprio' : 'Alugado'} />
                          </div>
                          <div>
                            <span className="font-bold text-text tracking-tight block text-lg">{asset.name}</span>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              {asset.location || 'Sem localização'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-text uppercase tracking-widest bg-bg px-3 py-1.5 rounded-xl border border-border w-fit">{asset.category}</span>
                          <span className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">{normalizeDivision(asset.division) === 'ti' ? 'TI' : 'Telecom'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-text">{asset.brand}</span>
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{asset.model}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <code className="text-[10px] font-black text-primary bg-primary-soft px-3 py-1.5 rounded-xl uppercase tracking-widest border border-primary/10">{asset.serial || 'N/A'}</code>
                      </td>
                      <td className="px-8 py-6">
                        {getStatusBadge(asset.status)}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(asset); }}
                            className="p-3 text-text-muted hover:text-primary hover:bg-primary-soft rounded-2xl transition-all border border-transparent hover:border-primary/10"
                            title="Editar Ativo"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }} 
                            className="p-3 text-text-muted hover:text-danger hover:bg-danger-soft rounded-2xl transition-all border border-transparent hover:border-danger/10"
                            title="Remover Ativo"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-24 h-24 bg-bg rounded-[2rem] flex items-center justify-center mb-6 border border-border">
                        <Package className="w-12 h-12 text-text-muted/20" />
                      </div>
                      <h3 className="text-2xl font-black text-text uppercase tracking-tighter mb-2">Nenhum ativo encontrado</h3>
                      <p className="text-text-muted font-medium mb-8">Não encontramos nenhum ativo com os filtros selecionados. Tente ajustar sua busca ou adicione um novo ativo.</p>
                      <button 
                        onClick={() => handleOpenModal()}
                        className="px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Novo Ativo
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assets Card View - Mobile */}
      <div className="md:hidden space-y-6 px-4">
        {filteredAssets.length > 0 ? (
          paginatedAssets.map((asset) => {
            const Icon = getCategoryIcon(asset.category);
            return (
              <div 
                key={asset.id} 
                onClick={() => setSelectedAsset(asset)}
                className="bg-surface p-8 rounded-[2rem] border border-border shadow-sm space-y-6 relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {asset.photo ? (
                        <img src={asset.photo} alt={asset.name} className="w-16 h-16 rounded-2xl object-cover border border-border shadow-sm" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-bg flex items-center justify-center border border-border">
                          <Icon className="w-8 h-8 text-text-muted/30" />
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-surface ${asset.type === 'proprio' ? 'bg-primary' : 'bg-warning'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-text tracking-tight text-lg">{asset.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{asset.category}</p>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{normalizeDivision(asset.division) === 'ti' ? 'TI' : 'Telecom'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(asset); }} className="p-3 text-primary bg-primary-soft rounded-xl border border-primary/10"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }} className="p-3 text-danger bg-danger-soft rounded-xl border border-danger/10"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border">
                  <div>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Marca/Modelo</p>
                    <p className="text-xs font-bold text-text">{asset.brand} <span className="text-text-muted font-medium">{asset.model}</span></p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Serial</p>
                    <p className="text-xs font-bold text-primary">{asset.serial || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-bg rounded-lg border border-border">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{asset.location || 'N/A'}</span>
                  </div>
                  {getStatusBadge(asset.status)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-surface p-12 rounded-3xl border border-border shadow-sm text-center">
            <Package className="w-10 h-10 text-secondary-text/20 mx-auto mb-4" />
            <p className="text-secondary-text font-semibold uppercase text-xs tracking-wider">Nenhum ativo encontrado</p>
          </div>
        )}
      </div>

      {/* Paginação */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface p-6 rounded-[2rem] border border-border mx-4 md:mx-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Exibir:</span>
          <select 
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-bg border border-border text-text text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value={10}>10 itens</option>
            <option value={25}>25 itens</option>
            <option value={50}>50 itens</option>
            <option value={100}>100 itens</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-3 rounded-xl border border-border bg-bg text-text-muted hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:text-text-muted disabled:hover:border-border transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              if (pageNum < 1 || pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                    currentPage === pageNum 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'bg-bg border border-border text-text-muted hover:border-primary hover:text-primary'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-3 rounded-xl border border-border bg-bg text-text-muted hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:text-text-muted disabled:hover:border-border transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">
          Página {currentPage} de {totalPages || 1} • {filteredAssets.length} ativos
        </div>
      </div>

      </div>

      {/* Modal Asset Detail */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-0 md:p-4 overflow-y-auto" onClick={() => setSelectedAsset(null)}>
          <div className="bg-surface w-full max-w-2xl min-h-screen md:min-h-0 md:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-10 duration-300 my-auto overflow-hidden border border-border" onClick={e => e.stopPropagation()}>
            <div className="relative h-48 md:h-64 bg-bg">
              {selectedAsset.photo ? (
                <img src={selectedAsset.photo} alt={selectedAsset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {React.createElement(getCategoryIcon(selectedAsset.category), { className: "w-20 h-20 text-secondary-text/10" })}
                </div>
              )}
              <button 
                onClick={() => setSelectedAsset(null)}
                className="absolute top-6 right-6 p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider mb-1 block">{selectedAsset.category}</span>
                    <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">{selectedAsset.name}</h2>
                  </div>
                  {getStatusBadge(selectedAsset.status)}
                </div>
              </div>
            </div>

            <div className="p-8 md:p-10 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                <div>
                  <p className="text-[10px] font-semibold text-secondary-text/40 uppercase tracking-wider mb-1">Divisão</p>
                  <p className="text-sm font-semibold text-primary-text uppercase">{normalizeDivision(selectedAsset.division) === 'ti' ? 'TI' : 'Telecom'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-secondary-text/40 uppercase tracking-wider mb-1">Marca</p>
                  <p className="text-sm font-semibold text-primary-text">{selectedAsset.brand}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-secondary-text/40 uppercase tracking-wider mb-1">Modelo</p>
                  <p className="text-sm font-semibold text-primary-text">{selectedAsset.model}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-secondary-text/40 uppercase tracking-wider mb-1">Nº Série</p>
                  <code className="text-xs font-semibold text-primary bg-primary-soft px-2 py-1 rounded-md uppercase tracking-wider">{selectedAsset.serial || 'N/A'}</code>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-secondary-text/40 uppercase tracking-wider mb-1">Tipo</p>
                  <p className="text-sm font-semibold text-primary-text uppercase">{selectedAsset.type === 'proprio' ? 'Próprio' : selectedAsset.type === 'alugado' ? 'Alugado' : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-secondary-text/40 uppercase tracking-wider mb-1">Localização</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-secondary-text/20" />
                    <p className="text-sm font-semibold text-primary-text">{selectedAsset.location || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {selectedAsset.notes && (
                <div className="bg-bg p-6 rounded-3xl border border-border">
                  <p className="text-[10px] font-semibold text-secondary-text/40 uppercase tracking-wider mb-2">Observações</p>
                  <p className="text-sm text-secondary-text leading-relaxed font-medium">{selectedAsset.notes}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                <button 
                  onClick={() => {
                    handleOpenModal(selectedAsset);
                    setSelectedAsset(null);
                  }}
                  className="flex-1 px-8 py-4 bg-primary-soft text-primary font-semibold rounded-2xl hover:bg-primary/10 transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar Ativo
                </button>
                <button 
                  onClick={() => {
                    handleDelete(selectedAsset.id);
                    setSelectedAsset(null);
                  }}
                  className="flex-1 px-8 py-4 bg-danger/10 text-danger font-semibold rounded-2xl hover:bg-danger/20 transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Ativo
                </button>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="flex-1 px-8 py-4 bg-primary-text text-surface font-semibold rounded-2xl hover:bg-primary-text/90 transition-all uppercase text-xs tracking-wider"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-surface w-full max-w-2xl min-h-screen md:min-h-0 md:rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 my-auto border border-border">
            <div className="p-6 sm:p-10">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-2xl font-semibold text-primary-text tracking-tight">
                    {editingAsset ? 'Editar Ativo' : 'Novo Ativo TI'}
                  </h2>
                  <p className="text-secondary-text font-semibold text-[10px] uppercase tracking-wider mt-1">Preencha os detalhes técnicos do equipamento</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-bg rounded-2xl transition-all">
                  <X className="w-6 h-6 text-secondary-text/40" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const event = { target: { files: [file] } } as any;
                        handlePhotoUpload(event);
                      }
                    }}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] bg-bg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary-soft transition-all group relative overflow-hidden"
                  >
                    {formData.photo ? (
                      <>
                        <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-secondary-text/20 group-hover:text-primary transition-colors" />
                        <span className="text-[8px] font-semibold text-secondary-text/40 uppercase tracking-wider mt-2">Upload Foto</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <p className="text-[9px] font-semibold text-secondary-text/40 uppercase tracking-wider">Máx 10MB - Auto-resize 1200px</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider mb-2 block">Divisão Principal *</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'ti', label: 'TI' },
                        { id: 'telecom', label: 'Telecom' }
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, division: d.id as any, category: '' })}
                          className={`flex-1 py-4 rounded-2xl text-[10px] font-semibold uppercase tracking-wider transition-all border ${normalizeDivision(formData.division!) === d.id ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-bg text-secondary-text border-border hover:border-secondary-text/20'}`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider mb-2 block">Equipamento *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Notebook Dell Latitude 5420"
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-sm text-primary-text"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider mb-2 block">Serial/IMEI</label>
                    <input
                      type="text"
                      value={formData.serial || ''}
                      onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                      placeholder="Número de série"
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-sm text-primary-text"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider block">Categoria *</label>
                      <button 
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-[8px] font-semibold text-primary uppercase tracking-wider hover:underline"
                      >
                        + Gerenciar
                      </button>
                    </div>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value, brand: '' })}
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-sm text-primary-text appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Selecionar Categoria</option>
                      {formData.division && categories[formData.division as keyof typeof categories].map((cat, idx) => (
                        <option key={`${cat}-${idx}`} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider mb-2 block">Marca *</label>
                    <select
                      value={formData.brand || ''}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-sm text-primary-text appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Selecionar Marca</option>
                      {(BRANDS[formData.category!] || BRANDS['default']).map((brand, idx) => (
                        <option key={`${brand}-${idx}`} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider mb-2 block">Modelo *</label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="Ex: Latitude 5420"
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-sm text-primary-text"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider mb-2 block">Tipo</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'proprio', label: 'Próprio' },
                        { id: 'alugado', label: 'Alugado' },
                        { id: 'na', label: 'N/A' }
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: t.id as any })}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all border ${formData.type === t.id ? 'bg-primary text-white border-primary shadow-md' : 'bg-bg text-secondary-text border-border hover:border-secondary-text/20'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider mb-2 block">Status *</label>
                    <select
                      value={formData.status || 'ativo'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-sm text-primary-text appearance-none cursor-pointer"
                      required
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                      <option value="manutencao">Manutenção</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider mb-2 block">Localização</label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ex: Sala 402 - TI"
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-sm text-primary-text"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider mb-2 block">Observações</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Detalhes adicionais, histórico de manutenção..."
                      rows={3}
                      className="w-full px-6 py-4 bg-bg border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-sm text-primary-text resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 px-8 py-4 text-secondary-text font-semibold uppercase text-xs tracking-wider hover:bg-bg rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-12 py-4 bg-primary text-white font-semibold rounded-2xl hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all uppercase text-xs tracking-wider active:scale-95"
                  >
                    {editingAsset ? 'Salvar Alterações' : 'Criar Ativo TI'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal Manage Categories */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-4 overflow-y-auto" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="bg-surface w-full max-w-xl min-h-screen md:min-h-0 md:rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 my-auto border border-border" onClick={e => e.stopPropagation()}>
            <div className="p-6 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-primary-text tracking-tight">Gerenciar Categorias</h2>
                  <p className="text-secondary-text font-semibold text-[10px] uppercase tracking-wider mt-1">Personalize as categorias de TI e Telecom</p>
                </div>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-3 hover:bg-bg rounded-2xl transition-all">
                  <X className="w-6 h-6 text-secondary-text/40" />
                </button>
              </div>

              <div className="space-y-8">
                {(['ti', 'telecom'] as const).map(div => (
                  <div key={div} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-primary-text uppercase tracking-wider flex items-center gap-2">
                        {div === 'ti' ? <Monitor className="w-4 h-4 text-primary" /> : <Radio className="w-4 h-4 text-success" />}
                        {div === 'ti' ? 'TI' : 'Telecom'}
                      </h3>
                      {!isAddingCategory && (
                        <button 
                          onClick={() => {
                            setIsAddingCategory(div);
                            setNewCategoryName('');
                          }}
                          className="text-[10px] font-semibold text-primary uppercase tracking-wider bg-primary-soft px-3 py-1 rounded-lg hover:bg-primary/10 transition-all"
                        >
                          + Nova
                        </button>
                      )}
                    </div>

                    {isAddingCategory === div && (
                      <div className="flex items-center gap-2 p-4 bg-primary-soft/30 rounded-2xl border border-primary/10 animate-in slide-in-from-top-2 duration-200">
                        <input 
                          autoFocus
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nome da categoria..."
                          className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newCategoryName.trim()) {
                              const newCats = { ...categories, [div]: [...categories[div], newCategoryName.trim()] };
                              saveCategories(newCats);
                              setIsAddingCategory(null);
                              setNewCategoryName('');
                              toast.success('Categoria adicionada!');
                            } else if (e.key === 'Escape') {
                              setIsAddingCategory(null);
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            if (newCategoryName.trim()) {
                              const newCats = { ...categories, [div]: [...categories[div], newCategoryName.trim()] };
                              saveCategories(newCats);
                              setIsAddingCategory(null);
                              setNewCategoryName('');
                              toast.success('Categoria adicionada!');
                            }
                          }}
                          className="p-2 bg-primary text-white rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setIsAddingCategory(null)}
                          className="p-2 bg-surface text-secondary-text border border-border rounded-xl hover:bg-bg transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories[div].map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-bg rounded-2xl group border border-border transition-all hover:border-primary/20">
                          {editingCategory?.div === div && editingCategory?.index === idx ? (
                            <div className="flex items-center gap-2 w-full">
                              <input 
                                autoFocus
                                type="text"
                                value={editingCategory.name}
                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                className="flex-1 bg-surface border border-border rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && editingCategory.name.trim()) {
                                    const newCats = { ...categories };
                                    newCats[div][idx] = editingCategory.name.trim();
                                    saveCategories(newCats);
                                    setEditingCategory(null);
                                    toast.success('Categoria atualizada!');
                                  } else if (e.key === 'Escape') {
                                    setEditingCategory(null);
                                  }
                                }}
                              />
                              <button 
                                onClick={() => {
                                  if (editingCategory.name.trim()) {
                                    const newCats = { ...categories };
                                    newCats[div][idx] = editingCategory.name.trim();
                                    saveCategories(newCats);
                                    setEditingCategory(null);
                                    toast.success('Categoria atualizada!');
                                  }
                                }}
                                className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-all"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-semibold text-primary-text truncate pr-2">{cat}</span>
                              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => setEditingCategory({ div, index: idx, name: cat })}
                                  className="p-2 text-secondary-text/40 hover:text-primary hover:bg-surface rounded-lg transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setCategoryToDelete({ div, index: idx, name: cat })}
                                  className="p-2 text-secondary-text/40 hover:text-danger hover:bg-surface rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-6 border-t border-border">
                <button 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="w-full py-4 bg-primary-text text-surface font-semibold rounded-2xl hover:bg-primary-text/90 transition-all uppercase text-xs tracking-wider"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>

          {/* Delete Category Confirmation */}
          {categoryToDelete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-surface w-full max-w-sm rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-danger-soft rounded-2xl flex items-center justify-center mx-auto mb-6 border border-danger/10">
                    <Trash2 className="w-8 h-8 text-danger" />
                  </div>
                  <h3 className="text-xl font-bold text-primary-text mb-2 tracking-tight">Excluir Categoria?</h3>
                  <p className="text-secondary-text font-medium text-sm leading-relaxed">
                    Tem certeza que deseja excluir a categoria <span className="text-primary-text font-bold">"{categoryToDelete.name}"</span>?
                  </p>
                </div>
                <div className="flex border-t border-border">
                  <button 
                    onClick={() => setCategoryToDelete(null)}
                    className="flex-1 py-5 text-sm font-bold text-secondary-text hover:bg-bg transition-all uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      const newCats = { ...categories };
                      newCats[categoryToDelete.div] = newCats[categoryToDelete.div].filter((_, i) => i !== categoryToDelete.index);
                      saveCategories(newCats);
                      setCategoryToDelete(null);
                      toast.success('Categoria removida!');
                    }}
                    className="flex-1 py-5 text-sm font-bold text-danger hover:bg-danger-soft transition-all border-l border-border uppercase tracking-widest"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-danger-soft rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-danger/10">
                <Trash2 className="w-10 h-10 text-danger" />
              </div>
              <h3 className="text-2xl font-black text-text uppercase tracking-tighter mb-2">Excluir Ativo?</h3>
              <p className="text-text-muted font-medium mb-8">Esta ação não pode ser desfeita. O ativo será removido permanentemente do inventário.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 bg-bg border border-border text-text-muted font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-surface transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-danger text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-danger/20 hover:bg-danger-hover transition-all active:scale-95"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar Arquivo */}
      {isImportModalOpen && (
        <ImportModal 
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={async (newAssets, duplicateMode) => {
            try {
              let added = 0;
              let updated = 0;
              let duplicates = 0;

              let currentAssets = [...assets];

              for (const asset of newAssets) {
                const existing = currentAssets.find(a => a.uniqueKey === asset.uniqueKey);
                if (existing) {
                  if (duplicateMode === 'update') {
                    await updateAsset(existing.id, {
                      ...asset,
                      atualizadoEm: new Date().toISOString()
                    });
                    updated++;
                    currentAssets = currentAssets.map(a => a.id === existing.id ? { ...a, ...asset } : a);
                  } else if (duplicateMode === 'both') {
                    const newAsset = {
                      ...asset,
                      uniqueKey: `${asset.uniqueKey}|${Math.random().toString(36).substr(2, 9)}`
                    };
                    const docRef = await addAsset(newAsset);
                    if (docRef) {
                      added++;
                      currentAssets.push({ id: docRef.id, ...newAsset } as Asset);
                    }
                  } else {
                    duplicates++;
                  }
                } else {
                  const docRef = await addAsset(asset);
                  if (docRef) {
                    added++;
                    currentAssets.push({ id: docRef.id, ...asset } as Asset);
                  }
                }
              }

              // Create Import Log
              await addImportLog({
                nomeArquivo: (newAssets[0] as any)?.origemImportacao || 'Importação',
                tipoArquivo: 'xlsx',
                totalLidos: newAssets.length, // finalAssets.length from handleImport
                totalImportados: added + updated,
                duplicados: duplicates + updated,
                erros: 0,
                estrategiaDuplicidade: duplicateMode as any,
                criadoEm: new Date().toISOString(),
                usuario: auth.currentUser?.email || 'Sistema',
                companyId: selectedCompanyId
              });

              toast.success(`Importação concluída: ${added} novos, ${updated} atualizados.`);
              return Promise.resolve();
            } catch (error) {
              console.error('Import Error:', error);
              toast.error('Erro ao processar importação.');
              return Promise.reject(error);
            }
          }}
          existingAssets={assets}
          categories={categories}
          selectedCompanyId={selectedCompanyId}
        />
      )}
    </div>
  );
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (assets: Omit<Asset, 'id'>[], duplicateMode: 'ignore' | 'update' | 'both') => Promise<void>;
  existingAssets: Asset[];
  categories: typeof DEFAULT_CATEGORIES;
  selectedCompanyId: string;
}

function ImportModal({ isOpen, onClose, onImport, existingAssets, categories, selectedCompanyId }: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'summary'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'ignore' | 'update' | 'both'>('both');
  const [importSummary, setImportSummary] = useState({
    total: 0,
    ti: 0,
    telecom: 0,
    duplicates: 0,
    ignored: 0,
    new: 0,
    updated: 0
  });

  const dropRef = useRef<HTMLDivElement>(null);

  const columnOptions = [
    { value: 'name', label: 'Equipamento / Hostname' },
    { value: 'serial', label: 'Nº Série / Serial' },
    { value: 'brand', label: 'Marca' },
    { value: 'model', label: 'Modelo' },
    { value: 'category', label: 'Categoria' },
    { value: 'location', label: 'Localização' },
    { value: 'status', label: 'Status' },
    { value: 'notes', label: 'Observações' },
    { value: 'ip', label: 'IP' },
    { value: 'patrimonio', label: 'Patrimônio' }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'docx'].includes(ext || '')) {
      toast.error('Formato não suportado. Use Excel ou Word.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      if (ext === 'xlsx' || ext === 'xls') {
        await processExcel(selectedFile);
      } else if (ext === 'docx') {
        await processWord(selectedFile);
      }
      setStep('mapping');
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao ler o arquivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processExcel = (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
          
          if (json.length < 2) {
            reject('Arquivo vazio ou sem dados suficientes.');
            return;
          }

          const headersFound = json[0] as string[];
          const rows = json.slice(1) as any[][];
          
          setHeaders(headersFound);
          setRawData(rows.map(row => {
            const obj: any = {};
            headersFound.forEach((h, i) => obj[h] = row[i]);
            return obj;
          }));

          // Auto-mapping
          const newMapping: Record<string, string> = {};
          headersFound.forEach(h => {
            const lowerH = String(h || '').toLowerCase();
            if (lowerH.includes('host') || lowerH.includes('equip') || lowerH.includes('nome')) newMapping[h] = 'name';
            else if (lowerH.includes('serial') || lowerH.includes('série') || lowerH.includes('sn')) newMapping[h] = 'serial';
            else if (lowerH.includes('marca')) newMapping[h] = 'brand';
            else if (lowerH.includes('model')) newMapping[h] = 'model';
            else if (lowerH.includes('categ')) newMapping[h] = 'category';
            else if (lowerH.includes('local') || lowerH.includes('setor')) newMapping[h] = 'location';
            else if (lowerH.includes('status')) newMapping[h] = 'status';
            else if (lowerH.includes('obs')) newMapping[h] = 'notes';
            else if (lowerH.includes('ip')) newMapping[h] = 'ip';
            else if (lowerH.includes('patrim')) newMapping[h] = 'patrimonio';
          });
          setMapping(newMapping);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const processWord = async (file: File) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          if (typeof window !== 'undefined' && !(window as any).mammoth) {
            reject('Biblioteca Mammoth não carregada. Verifique sua conexão.');
            return;
          }

          // @ts-ignore
          const result = await (window as any).mammoth.convertToHtml({ arrayBuffer });
          const html = result.value;
          
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const table = doc.querySelector('table');
          
          if (!table) {
            reject('Nenhuma tabela encontrada no documento Word.');
            return;
          }

          const rows = Array.from(table.querySelectorAll('tr'));
          if (rows.length === 0) {
            reject('Tabela vazia encontrada no documento Word.');
            return;
          }

          const headersFound = Array.from(rows[0].querySelectorAll('td, th')).map(el => (el as HTMLElement).textContent?.trim() || '');
          const dataRows = rows.slice(1).map(tr => {
            const cells = Array.from((tr as HTMLElement).querySelectorAll('td'));
            const obj: any = {};
            headersFound.forEach((h, i) => obj[h] = (cells[i] as HTMLElement)?.textContent?.trim() || '');
            return obj;
          });

          setHeaders(headersFound);
          setRawData(dataRows);
          
          // Auto-mapping (same logic)
          const newMapping: Record<string, string> = {};
          headersFound.forEach(h => {
            const lowerH = String(h || '').toLowerCase();
            if (lowerH.includes('host') || lowerH.includes('equip') || lowerH.includes('nome')) newMapping[h] = 'name';
            else if (lowerH.includes('serial') || lowerH.includes('série') || lowerH.includes('sn')) newMapping[h] = 'serial';
            else if (lowerH.includes('marca')) newMapping[h] = 'brand';
            else if (lowerH.includes('model')) newMapping[h] = 'model';
            else if (lowerH.includes('categ')) newMapping[h] = 'category';
            else if (lowerH.includes('local') || lowerH.includes('setor')) newMapping[h] = 'location';
            else if (lowerH.includes('status')) newMapping[h] = 'status';
            else if (lowerH.includes('obs')) newMapping[h] = 'notes';
            else if (lowerH.includes('ip')) newMapping[h] = 'ip';
            else if (lowerH.includes('patrim')) newMapping[h] = 'patrimonio';
          });
          setMapping(newMapping);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    setIsProcessing(true);
    const finalAssets: Omit<Asset, 'id'>[] = [];
    let tiCount = 0;
    let telecomCount = 0;
    let duplicateCount = 0;
    let ignoredCount = 0;
    let newCount = 0;
    let updatedCount = 0;

    const generateUniqueKey = (item: any) => {
      const name = (item.equipamento || item.name || item.nome || 'sem-nome').toString().trim();
      const serial = (item.numeroSerie || item.serial || item.serialNumber || 'sem-serie').toString().trim();
      const assetTag = (item.patrimonio || item.assetTag || 'sem-patrimonio').toString().trim();
      const category = (item.categoria || item.category || 'sem-categoria').toString().trim();
      const brand = (item.marca || item.brand || 'sem-marca').toString().trim();
      
      return `${name}|${serial}|${assetTag}|${category}|${brand}`.toLowerCase();
    };

    const existingMap = new Map<string, Asset>();
    existingAssets.forEach(a => {
      const key = a.uniqueKey || generateUniqueKey(a);
      existingMap.set(key, a);
    });

    for (const row of rawData) {
      const asset: any = {
        nome: '',
        equipamento: '',
        divisao: 'TI',
        categoria: 'Acessórios',
        marca: 'Outro',
        modelo: 'N/A',
        numeroSerie: '',
        patrimonio: '',
        status: 'ativo',
        tipo: 'proprio',
        localizacao: '',
        responsavel: '',
        ip: '',
        observacoes: '',
        imagemUrl: null,
        photo: null,
        origemImportacao: file?.name || 'Importação Manual',
        companyId: selectedCompanyId,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        name: '',
        serial: '',
        brand: 'Outro',
        model: 'N/A',
        category: 'Acessórios',
        division: 'ti',
        type: 'proprio',
        location: '',
        notes: ''
      };

      Object.entries(mapping).forEach(([header, field]) => {
        if (field && typeof field === 'string') {
          const value = row[header];
          if (field === 'name') {
            asset.nome = value;
            asset.equipamento = value;
            asset.name = value;
          } else if (field === 'serial') {
            asset.numeroSerie = value;
            asset.serial = value;
          } else if (field === 'brand') {
            asset.marca = value;
            asset.brand = value;
          } else if (field === 'model') {
            asset.modelo = value;
            asset.model = value;
          } else if (field === 'category') {
            asset.categoria = value;
            asset.category = value;
          } else if (field === 'location') {
            asset.localizacao = value;
            asset.location = value;
          } else if (field === 'status') {
            asset.status = String(value || '').toLowerCase();
          } else if (field === 'notes') {
            asset.observacoes = value;
            asset.notes = value;
          } else if (field === 'ip') {
            asset.ip = value;
          } else if (field === 'patrimonio') {
            asset.patrimonio = value;
          }
        }
      });

      if (!asset.nome && !asset.equipamento && !asset.name) {
        ignoredCount++;
        continue;
      }

      // Auto-classify division or use mapped field
      const divisionField = Object.keys(mapping).find(k => mapping[k] === 'division');
      const divisionValue = divisionField ? (row[divisionField] || '').toString().toLowerCase() : '';
      
      const keywords = String((asset.nome || asset.name || '') + ' ' + (asset.categoria || asset.category || '') + ' ' + (asset.modelo || asset.model || '')).toLowerCase();
      
      if (divisionValue.includes('telecom') || divisionValue.includes('radio') || divisionValue.includes('comunicação') || 
          keywords.includes('switch') || keywords.includes('access point') || keywords.includes('patch') || keywords.includes('wifi') || keywords.includes('rede')) {
        asset.divisao = 'Telecom';
        asset.division = 'telecom';
        telecomCount++;
      } else {
        asset.divisao = 'TI';
        asset.division = 'ti';
        tiCount++;
      }

      const key = generateUniqueKey(asset);
      asset.uniqueKey = key;

      const existing = existingMap.get(key);
      if (existing) {
        duplicateCount++;
        if (duplicateMode === 'ignore') {
          ignoredCount++;
          continue;
        } else if (duplicateMode === 'update') {
          updatedCount++;
          // We'll update the existing one later if needed, but for now we just add it as a new one if we want to replace
          // Actually, the instruction says "NÃO substituir registros anteriores ao importar novos arquivos"
          // But "Se chave for exatamente igual, tratar como potencial duplicado... [Atualizar existentes]"
          // I'll implement 'update' by adding it to finalAssets and we'll handle the update in the parent
        } else if (duplicateMode === 'both') {
          asset.uniqueKey = `${key}|${Math.random().toString(36).substr(2, 9)}`;
          newCount++;
        }
      } else {
        newCount++;
      }

      finalAssets.push(asset);
    }

    try {
      await onImport(finalAssets, duplicateMode);
      
      setPreviewData(finalAssets.slice(0, 5));
      setImportSummary({
        total: finalAssets.length + ignoredCount,
        ti: tiCount,
        telecom: telecomCount,
        duplicates: duplicateCount,
        ignored: ignoredCount,
        new: newCount,
        updated: updatedCount
      });
      setStep('summary');
    } catch (error) {
      console.error('Import Error:', error);
      toast.error('Erro ao importar dados.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-4xl min-h-screen md:min-h-0 md:rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 my-auto border border-border" onClick={e => e.stopPropagation()}>
        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-primary-text tracking-tight">Importar Inventário</h2>
              <p className="text-secondary-text font-semibold text-[10px] uppercase tracking-wider mt-1">Excel (.xlsx, .xls) ou Word (.docx)</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-bg rounded-2xl transition-all">
              <X className="w-6 h-6 text-secondary-text/40" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
            {step === 'upload' && (
              <div className="space-y-8">
                <div 
                  ref={dropRef}
                  onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add('border-primary', 'bg-primary-soft'); }}
                  onDragLeave={() => { dropRef.current?.classList.remove('border-primary', 'bg-primary-soft'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropRef.current?.classList.remove('border-primary', 'bg-primary-soft');
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file);
                  }}
                  onClick={() => document.getElementById('file-import')?.click()}
                  className="border-4 border-dashed border-border rounded-[40px] p-20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-bg transition-all group"
                >
                  <div className="w-24 h-24 bg-primary-soft rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-primary-text tracking-tight">Arraste o arquivo aqui</h3>
                  <p className="text-secondary-text font-semibold text-xs uppercase tracking-wider mt-2">Ou clique para buscar no computador</p>
                  <input id="file-import" type="file" className="hidden" accept=".xlsx,.xls,.docx" onChange={handleFileSelect} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-bg rounded-3xl border border-border">
                    <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center mb-4 shadow-sm">
                      <FileSpreadsheet className="w-5 h-5 text-success" />
                    </div>
                    <h4 className="font-semibold text-primary-text uppercase text-[10px] tracking-wider mb-1">Excel</h4>
                    <p className="text-[10px] font-semibold text-secondary-text/40 leading-relaxed">Importação rápida de planilhas com múltiplas colunas.</p>
                  </div>
                  <div className="p-6 bg-bg rounded-3xl border border-border">
                    <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center mb-4 shadow-sm">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-primary-text uppercase text-[10px] tracking-wider mb-1">Word</h4>
                    <p className="text-[10px] font-semibold text-secondary-text/40 leading-relaxed">Extração inteligente de tabelas de documentos Word.</p>
                  </div>
                  <div className="p-6 bg-bg rounded-3xl border border-border">
                    <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center mb-4 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-secondary-text" />
                    </div>
                    <h4 className="font-semibold text-primary-text uppercase text-[10px] tracking-wider mb-1">Auto-Mapeamento</h4>
                    <p className="text-[10px] font-semibold text-secondary-text/40 leading-relaxed">Identificação automática de colunas e divisões.</p>
                  </div>
                </div>
              </div>
            )}

            {step === 'mapping' && (
              <div className="space-y-8">
                <div className="bg-primary-soft p-6 rounded-3xl border border-primary/10 flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center shadow-sm">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-text uppercase text-xs tracking-wider">Arquivo: {file?.name}</h3>
                    <p className="text-[10px] font-semibold text-secondary-text/60 uppercase tracking-wider">{rawData.length} registros encontrados</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary-text uppercase tracking-wider">Mapeamento de Colunas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {headers.map(header => (
                      <div key={header} className="flex items-center gap-4 p-4 bg-bg rounded-2xl border border-border">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-secondary-text/40 uppercase tracking-wider mb-1">Coluna no Arquivo</p>
                          <p className="text-sm font-semibold text-primary-text truncate">{header}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-secondary-text/20" />
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-secondary-text/40 uppercase tracking-wider mb-1">Campo no Sistema</p>
                          <select 
                            value={mapping[header] || ''}
                            onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">Ignorar Coluna</option>
                            {columnOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mapping Preview */}
                {Object.values(mapping).some(v => v) && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary-text uppercase tracking-wider">Pré-visualização (Primeiros 3 itens)</h3>
                    <div className="bg-bg rounded-3xl border border-border overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead className="bg-surface border-b border-border">
                          <tr>
                            {Object.entries(mapping).filter(([_, field]) => field).map(([header, field]) => (
                              <th key={header} className="px-4 py-2 text-left font-black text-secondary-text uppercase tracking-widest min-w-[120px]">
                                {columnOptions.find(o => o.value === field)?.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {rawData.slice(0, 3).map((row, idx) => (
                            <tr key={idx}>
                              {Object.entries(mapping).filter(([_, field]) => field).map(([header, _]) => (
                                <td key={header} className="px-4 py-2 text-primary-text font-medium truncate max-w-[200px]">
                                  {row[header]?.toString() || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary-text uppercase tracking-wider">Configurações de Importação</h3>
                  <div className="p-6 bg-bg rounded-3xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h4 className="font-semibold text-primary-text uppercase text-[10px] tracking-wider mb-1">Tratamento de Duplicados</h4>
                      <p className="text-[10px] font-semibold text-secondary-text/40">Como lidar com ativos que já possuem o mesmo Serial no sistema?</p>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { id: 'ignore', label: 'Ignorar' },
                        { id: 'update', label: 'Substituir' },
                        { id: 'both', label: 'Manter Ambos' }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setDuplicateMode(mode.id as any)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all border ${duplicateMode === mode.id ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface text-secondary-text border-border hover:border-secondary-text/20'}`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'summary' && importSummary && (
              <div className="space-y-8 text-center py-10 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-success" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Importação Concluída!</h3>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Relatório de Processamento Real</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                  <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Novos</p>
                    <p className="text-3xl font-black text-slate-900">{(importSummary as any).new || 0}</p>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Atualizados</p>
                    <p className="text-3xl font-black text-blue-600">{(importSummary as any).updated || 0}</p>
                  </div>
                  <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Duplicados</p>
                    <p className="text-3xl font-black text-amber-600">{importSummary.duplicates}</p>
                  </div>
                  <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Lidos</p>
                    <p className="text-3xl font-black text-white">{importSummary.total}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 max-w-md mx-auto">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">TI vs Telecom</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-slate-200">
                    <div 
                      className="bg-blue-600 transition-all duration-1000" 
                      style={{ width: `${(importSummary.ti / (importSummary.ti + importSummary.telecom || 1)) * 100}%` }}
                    />
                    <div 
                      className="bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${(importSummary.telecom / (importSummary.ti + importSummary.telecom || 1)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-600">TI: {importSummary.ti}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-600">Telecom: {importSummary.telecom}</span>
                    </div>
                  </div>
                </div>

                {previewData.length > 0 && (
                  <div className="space-y-4 max-w-3xl mx-auto text-left">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amostra de Dados Importados</h4>
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-[10px]">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left font-black text-slate-500 uppercase tracking-widest">Nome</th>
                            <th className="px-4 py-2 text-left font-black text-slate-500 uppercase tracking-widest">Série</th>
                            <th className="px-4 py-2 text-left font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                            <th className="px-4 py-2 text-left font-black text-slate-500 uppercase tracking-widest">Divisão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewData.map((asset, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 font-bold text-slate-700">{asset.name}</td>
                              <td className="px-4 py-2 text-slate-500">{asset.serial}</td>
                              <td className="px-4 py-2 text-slate-500">{asset.category}</td>
                              <td className="px-4 py-2 font-bold text-primary">{asset.division.toUpperCase()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row gap-4">
            {step === 'upload' && (
              <button onClick={onClose} className="w-full sm:w-auto px-10 py-4 text-secondary-text font-semibold uppercase text-xs tracking-wider hover:bg-bg rounded-2xl transition-all">
                Cancelar
              </button>
            )}
            {step === 'mapping' && (
              <>
                <button onClick={() => setStep('upload')} className="flex-1 px-10 py-4 text-secondary-text font-semibold uppercase text-xs tracking-wider hover:bg-bg rounded-2xl transition-all">
                  Voltar
                </button>
                <button 
                  onClick={handleImport}
                  disabled={isProcessing || !Object.values(mapping).includes('name')}
                  className="flex-[2] px-10 py-4 bg-primary text-white font-semibold rounded-2xl hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all uppercase text-xs tracking-wider disabled:opacity-50"
                >
                  {isProcessing ? 'Processando...' : !Object.values(mapping).includes('name') ? 'Mapeie o campo Nome' : 'Confirmar Importação'}
                </button>
              </>
            )}
            {step === 'summary' && (
              <button onClick={onClose} className="w-full px-10 py-4 bg-primary-text text-surface font-semibold rounded-2xl hover:bg-primary-text/90 transition-all uppercase text-xs tracking-wider">
                Concluir e Ver Inventário
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

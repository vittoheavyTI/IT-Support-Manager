import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserCompanyPermission } from '../types';

export function usePermissions(companyId: string | null) {
  const [permissions, setPermissions] = useState<UserCompanyPermission['permissoes'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      setPermissions(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Monitorar o perfil do usuário para status de admin global
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
      const userData = userDoc.data();
      const isUserAdmin = userData?.role === 'admin' || userData?.role === 'ADMINISTRADOR';
      setIsAdmin(isUserAdmin);

      if (isUserAdmin) {
        setPermissions({
          inventario: true,
          checklists: true,
          relatorios: true,
          analistas: true,
          notificacoes: true,
          configuracoes: true,
          backups: true,
          auditoria: true,
          
          inventario_visualizar: true,
          inventario_criar: true,
          inventario_editar: true,
          inventario_excluir: true,
          inventario_importar: true,
          inventario_exportar: true,
          inventario_historico: true,
          
          checklists_visualizar: true,
          checklists_criar: true,
          checklists_editar: true,
          checklists_excluir: true,
          checklists_executar: true,
          checklists_concluir: true,
          checklists_resetar: true,
          
          relatorios_visualizar: true,
          relatorios_gerar: true,
          relatorios_exportar: true,
          relatorios_metricas: true,
          
          analistas_visualizar: true,
          analistas_criar: true,
          analistas_editar: true,
          analistas_bloquear: true,
          analistas_excluir: true,
          
          empresas_visualizar: true,
          empresas_criar: true,
          empresas_editar: true,
          empresas_excluir: true,
          empresas_vincular: true,
          
          notificacoes_visualizar: true,
          notificacoes_criar: true,
          notificacoes_enviar: true,
          notificacoes_excluir: true,
          
          admin_visualizar_configs: true,
          admin_editar_configs: true,
          admin_database: true,
          admin_permissoes: true,
          admin_backup: true,
          admin_auditoria: true
        });
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setLoading(false);
    });

    return () => unsubscribeUser();
  }, [auth.currentUser?.uid]);

  useEffect(() => {
    // 2. Monitorar permissões específicas da empresa se NÃO for admin
    if (!auth.currentUser || isAdmin || !companyId) {
      if (!isAdmin && !companyId) {
        setPermissions(null);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const permId = `${auth.currentUser.uid}_${companyId}`;
    const permDocRef = doc(db, 'user_company_permissions', permId);
    
    const unsubscribePerms = onSnapshot(permDocRef, (permDoc) => {
      if (permDoc.exists()) {
        const rawData = permDoc.data().permissoes || {};
        
        // Inflar permissões master baseadas em sub-permissões para retrocompatibilidade
        const inflated = { ...rawData };
        
        const modules = [
          { master: 'inventario', prefix: 'inventario_' },
          { master: 'checklists', prefix: 'checklists_' },
          { master: 'relatorios', prefix: 'relatorios_' },
          { master: 'analistas', prefix: 'analistas_' },
          { master: 'notificacoes', prefix: 'notificacoes_' }
        ];
        
        modules.forEach(mod => {
          if (!inflated[mod.master]) {
            const hasSubPerm = Object.keys(rawData).some(k => k.startsWith(mod.prefix) && rawData[k] === true);
            if (hasSubPerm) inflated[mod.master] = true;
          }
        });

        setPermissions(inflated);
      } else {
        setPermissions(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching permissions:", error);
      setPermissions(null);
      setLoading(false);
    });

    return () => unsubscribePerms();
  }, [auth.currentUser?.uid, companyId, isAdmin]);

  return { permissions, loading, isAdmin };
}

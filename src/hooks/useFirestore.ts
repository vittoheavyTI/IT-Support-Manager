import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  where,
  orderBy,
  QueryConstraint,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Audit logging helper
export async function logAudit(modulo: string, acao: string, entidade: string, entidadeId: string, resumo: string, antes: any = null, depois: any = null) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      modulo,
      acao,
      entidade,
      entidadeId,
      resumo,
      usuario: auth.currentUser?.email || 'sistema',
      antes,
      depois,
      criadoEm: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao registrar log de auditoria:', err);
  }
}

// Integrity logging helper
async function logIntegrityError(modulo: string, tipoProblema: string, descricao: string, severidade: 'baixa' | 'media' | 'alta') {
  try {
    await addDoc(collection(db, 'data_integrity_logs'), {
      modulo,
      tipoProblema,
      descricao,
      severidade,
      resolvido: false,
      criadoEm: new Date().toISOString(),
      resolvidoEm: null
    });
  } catch (err) {
    console.error('Erro ao registrar log de integridade:', err);
  }
}

// Validation helper
function validateIntegrity(collectionName: string, data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (collectionName === 'inventory_assets') {
    if (!['TI', 'Telecom'].includes(data.divisao)) {
      errors.push(`Divisão inválida: ${data.divisao}. Deve ser 'TI' ou 'Telecom'.`);
    }
    if (!['ativo', 'manutencao', 'inativo'].includes(data.status)) {
      errors.push(`Status inválido: ${data.status}`);
    }
    if (!data.uniqueKey) {
      errors.push('uniqueKey é obrigatória para ativos.');
    }
  }

  if (collectionName === 'analysts') {
    if (!['online', 'offline', 'blocked'].includes(data.status)) {
      errors.push(`Status de analista inválido: ${data.status}`);
    }
  }

  // Common validations
  if (data.id === null) errors.push('ID não pode ser nulo.');

  return {
    valid: errors.length === 0,
    errors
  };
}

export function useFirestore<T>(collectionName: string, constraints: QueryConstraint[] = [], enabled: boolean = true, deps: any[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionName || !enabled) {
      if (!enabled) setLoading(false);
      return;
    }

    setLoading(true);
    
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, collectionName), ...constraints);
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Firestore onSnapshot error [${collectionName}]:`, err);
        let errorMessage = err.message;
        if (err.code === 'permission-denied') {
          errorMessage = `Permissão negada para acessar estes dados (${collectionName}). Verifique seu nível de acesso.`;
        } else if (err.message?.includes('network-request-failed')) {
          errorMessage = `Erro de conexão com o banco de dados (${collectionName}). Verifique sua internet.`;
        }
        setError(errorMessage);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [collectionName, auth.currentUser?.uid, enabled, ...deps]);

  const add = async (item: Omit<T, 'id'>) => {
    try {
      const now = new Date().toISOString();
      const enrichedItem = {
        ...item,
        criadoEm: now,
        atualizadoEm: now,
        version: 1
      };

      const validation = validateIntegrity(collectionName, enrichedItem);
      if (!validation.valid) {
        await logIntegrityError(collectionName, 'VALIDATION_FAILED', validation.errors.join(' | '), 'media');
        throw new Error(`Falha na integridade dos dados: ${validation.errors[0]}`);
      }

      const docRef = await addDoc(collection(db, collectionName), enrichedItem);
      
      await logAudit(
        collectionName, 
        'CREATE', 
        collectionName, 
        docRef.id, 
        `Criação de novo registro em ${collectionName}`,
        null,
        enrichedItem
      );

      return docRef;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, collectionName);
    }
  };

  const update = async (id: string, item: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, id);
      const currentDoc = await getDoc(docRef);
      
      if (!currentDoc.exists()) {
        throw new Error('Documento não encontrado para atualização.');
      }

      const currentData = currentDoc.data();
      const now = new Date().toISOString();
      
      const enrichedItem = {
        ...item,
        atualizadoEm: now,
        version: (currentData.version || 0) + 1
      };

      const validation = validateIntegrity(collectionName, { ...currentData, ...enrichedItem });
      if (!validation.valid) {
        await logIntegrityError(collectionName, 'VALIDATION_FAILED', validation.errors.join(' | '), 'media');
        throw new Error(`Falha na integridade dos dados: ${validation.errors[0]}`);
      }

      await updateDoc(docRef, enrichedItem);

      await logAudit(
        collectionName, 
        'UPDATE', 
        collectionName, 
        id, 
        `Atualização de registro em ${collectionName}`,
        currentData,
        { ...currentData, ...enrichedItem }
      );

      return docRef;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  };

  const remove = async (id: string) => {
    try {
      const docRef = doc(db, collectionName, id);
      const currentDoc = await getDoc(docRef);
      const currentData = currentDoc.exists() ? currentDoc.data() : null;

      await deleteDoc(docRef);

      await logAudit(
        collectionName, 
        'DELETE', 
        collectionName, 
        id, 
        `Exclusão de registro em ${collectionName}`,
        currentData,
        null
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  return { data, loading, error, add, update, remove };
}

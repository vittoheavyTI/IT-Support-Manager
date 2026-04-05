import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Checklists from './pages/Checklists';
import Inventory from './pages/Inventory';
import Chat from './pages/Chat';
import AdminCompanies from './pages/AdminCompanies';
import Analysts from './pages/Analysts';
import Reports from './pages/Reports';
import Automation from './pages/Automation';
import Settings from './pages/Settings';
import SelectCompany from './pages/SelectCompany';
import Layout from './components/Layout';

import { Toaster } from 'sonner';
import { ChecklistResetter } from './components/ChecklistResetter';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(localStorage.getItem('selectedCompanyId'));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          // Check if it's a super admin email
          const isAdminEmail = firebaseUser.email === 'vittoheavymetal@gmail.com' || firebaseUser.email === 'admin@ti.com';

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            
            // If it's an admin email but role is not admin, fix it
            if (isAdminEmail && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin' as const };
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }

            // Atualiza status para online (silenciosamente se falhar)
            try {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { status: 'online' });
            } catch (err) {
              console.warn('Não foi possível atualizar o status do usuário:', err);
            }
          } else if (isAdminEmail) {
            // Se o usuário é um dos admins hardcoded, cria o perfil
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'SUPER ADMIN',
              email: firebaseUser.email || '',
              role: 'admin',
              status: 'online',
              createdAt: new Date().toISOString(),
              assignedCompanies: [],
              analystId: `SUPER-${Math.floor(Math.random() * 900000 + 100000)}`,
              position: 'SUPER ADMIN',
              mustResetPassword: false
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          } else {
            // User exists in Auth but not in Firestore and is not a super admin
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
          setSelectedCompanyId(null);
          localStorage.removeItem('selectedCompanyId');
        }
      } catch (err) {
        console.error("Erro na autenticação:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Valida se a empresa selecionada ainda é acessível pelo usuário
  useEffect(() => {
    if (profile && selectedCompanyId && profile.role !== 'admin') {
      const hasAccess = profile.assignedCompanies?.includes(selectedCompanyId) || 
                       profile.empresasComAcesso?.includes(selectedCompanyId);
      if (!hasAccess) {
        setSelectedCompanyId(null);
        localStorage.removeItem('selectedCompanyId');
      }
    }
  }, [profile, selectedCompanyId]);

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    localStorage.setItem('selectedCompanyId', companyId);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-text-muted font-bold animate-pulse tracking-widest text-xs">CARREGANDO SISTEMA...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <ChecklistResetter />
      <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          <Route element={user ? <Layout profile={profile} selectedCompanyId={selectedCompanyId || ''} onClearCompany={() => { setSelectedCompanyId(null); localStorage.removeItem('selectedCompanyId'); }} /> : <Navigate to="/login" />}>
            {/* Se não houver empresa selecionada, redireciona para seleção (exceto admin em páginas de gestão) */}
            <Route path="/" element={selectedCompanyId ? <Dashboard selectedCompanyId={selectedCompanyId} /> : <SelectCompany profile={profile} onSelect={handleSelectCompany} />} />
            <Route path="/reports" element={selectedCompanyId ? <Reports selectedCompanyId={selectedCompanyId} /> : <Navigate to="/" />} />
            <Route path="/checklists" element={selectedCompanyId ? <Checklists selectedCompanyId={selectedCompanyId} /> : <Navigate to="/" />} />
            <Route path="/inventory" element={selectedCompanyId ? <Inventory selectedCompanyId={selectedCompanyId} /> : <Navigate to="/" />} />
            <Route path="/chat" element={selectedCompanyId ? <Chat selectedCompanyId={selectedCompanyId} /> : <Navigate to="/" />} />
            
            {/* Rotas Admin - Acessíveis mesmo sem empresa selecionada */}
            {profile?.role === 'admin' && (
              <>
                <Route path="/admin/companies" element={<AdminCompanies />} />
                <Route path="/analysts" element={<Analysts />} />
                <Route path="/automation" element={<Automation selectedCompanyId={selectedCompanyId || ''} />} />
                <Route path="/config" element={<Settings />} />
              </>
            )}
            
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
    </BrowserRouter>
  );
}

export default App;

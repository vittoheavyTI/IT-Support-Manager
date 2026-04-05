import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, X, CheckCircle2, LogIn, Eye, EyeOff, Mail, Key, Lock } from 'lucide-react';
import { auth, db } from '../firebase';
import { sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Try to sign in with Firebase
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        // If user doesn't exist and it's the default admin, create it
        const isUserNotFound = err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential';
        
        if (isUserNotFound && email === 'admin@ti.com' && password === 'Admin123!@') {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Create the user profile in Firestore
          const superAdminProfile = {
            uid: userCredential.user.uid,
            analystId: 'SUPER-000001',
            displayName: 'SUPER ADMIN',
            email: 'admin@ti.com',
            role: 'admin',
            position: 'SUPER ADMIN',
            photoURL: 'https://ui-avatars.com/api/?name=Super+Admin&background=3B82F6&color=fff',
            status: 'online',
            createdAt: new Date().toISOString(),
            assignedCompanies: [],
            mustResetPassword: false
          };
          await setDoc(doc(db, 'users', userCredential.user.uid), superAdminProfile);
        } else if (err.code === 'auth/wrong-password') {
          throw new Error('Senha incorreta. Verifique suas credenciais.');
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          throw new Error('Usuário não encontrado ou credenciais inválidas. Verifique seu email e senha.');
        } else {
          throw err;
        }
      }

      // Check if user needs to reset password
      const userDoc = await getDoc(doc(db, 'users', userCredential!.user.uid));
      const profile = userDoc.data() as UserProfile;

      if (profile?.mustResetPassword) {
        setTempUser(userCredential!.user);
        setIsChangingPassword(true);
        setLoading(false);
        return;
      }

      setSuccess('Acesso autorizado! Redirecionando...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      let errorMessage = 'Erro ao entrar no sistema. Tente novamente.';
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        errorMessage = 'Erro de conexão com o Firebase. Verifique sua internet ou se o navegador está bloqueando o acesso (tente desativar extensões de bloqueio).';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas sem sucesso. Tente novamente em alguns minutos.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updatePassword(tempUser, newPassword);
      await updateDoc(doc(db, 'users', tempUser.uid), {
        mustResetPassword: false
      });

      setSuccess('Senha alterada com sucesso! Entrando...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      setError('Erro ao alterar senha. Tente fazer login novamente.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setTimeout(() => {
        setIsResetMode(false);
        setLoading(false);
      }, 3000);
    } catch (err: any) {
      setError('Erro ao enviar email. Verifique se o endereço está correto.');
      setLoading(false);
    }
  };

  if (isChangingPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-blue-600 rounded-3xl mb-4 shadow-2xl shadow-blue-500/20">
              <Lock className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-[#1E293B] tracking-tighter mb-2">
              NOVA <span className="text-blue-600">SENHA</span>
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Primeiro Acesso Obrigatório</p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-[#E2E8F0]">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-[#1E293B] mb-2 uppercase tracking-tight">Redefinir Senha</h2>
              <p className="text-slate-500 text-sm font-medium">Por segurança, você deve alterar sua senha inicial.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-[#1E293B]"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-[#1E293B]"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50 min-h-[56px]"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    ALTERAR E ENTRAR
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-6 flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold animate-shake border border-red-100">
                <X className="w-5 h-5" />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="inline-flex p-4 bg-blue-600 rounded-3xl mb-4 shadow-2xl shadow-blue-500/20">
              <ShieldCheck className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-[#1E293B] tracking-tighter mb-2">
              RECUPERAR <span className="text-blue-600">SENHA</span>
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Redefinição de Acesso</p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-[#1E293B] mb-2 uppercase tracking-tight">Esqueceu a senha?</h2>
              <p className="text-slate-500 text-sm font-medium">Informe seu email para receber o link de redefinição.</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-[#1E293B]"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50 min-h-[56px]"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    ENVIAR LINK DE RECUPERAÇÃO
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsResetMode(false)}
                className="w-full text-slate-400 font-black py-2 text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors"
              >
                VOLTAR PARA O LOGIN
              </button>
            </form>

            {error && (
              <div className="mt-6 flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold animate-shake border border-red-100">
                <X className="w-5 h-5" />
                {error}
              </div>
            )}

            {success && (
              <div className="mt-6 flex items-center gap-3 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
                {success}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="max-w-md w-full">
        {/* Logo e Título */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex p-5 bg-primary rounded-[2rem] mb-6 shadow-2xl shadow-primary/20">
            <ShieldCheck className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-text tracking-tighter mb-3">
            SISTEMA <span className="text-primary">TI</span>
          </h1>
          <p className="text-text-muted font-bold text-xs uppercase tracking-[0.4em]">Gestão Profissional de Ativos</p>
        </div>

        <div className="bg-surface p-10 sm:p-12 rounded-[3rem] shadow-xl border border-border animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-text mb-2 uppercase tracking-tight">Login</h2>
            <p className="text-text-muted text-sm font-medium">Entre com suas credenciais de acesso.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-8">
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-text-soft uppercase tracking-widest ml-1">Email Profissional</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-text-soft" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-bg border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-surface outline-none transition-all font-bold text-text"
                  placeholder="admin@ti.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <label className="block text-[11px] font-bold text-text-soft uppercase tracking-widest">Senha de Acesso</label>
                <button 
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="text-[11px] font-bold text-primary uppercase tracking-widest hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-text-soft" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-bg border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-surface outline-none transition-all font-bold text-text"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-text-soft hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-6 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-4 disabled:opacity-50 min-h-[64px]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  ENTRAR NO SISTEMA
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-8 flex items-center gap-4 p-5 bg-danger-soft text-danger rounded-2xl text-xs font-bold animate-shake border border-danger/10">
              <X className="w-6 h-6" />
              {error}
            </div>
          )}

          {success && (
            <div className="mt-8 flex items-center gap-4 p-5 bg-success-soft text-success rounded-2xl text-xs font-bold border border-success/10">
              <CheckCircle2 className="w-6 h-6" />
              {success}
            </div>
          )}
        </div>
        
        <p className="text-center mt-10 text-text-soft text-[11px] font-bold uppercase tracking-widest">
          © 2026 IT MANAGER - SISTEMA DE GESTÃO TI
        </p>
      </div>
    </div>
  );
}

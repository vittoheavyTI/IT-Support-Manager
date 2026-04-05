import React, { useState, useEffect, useRef } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Message, UserProfile, Company } from '../types';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Smile, 
  MoreVertical, 
  Search,
  CheckCheck,
  User,
  AtSign,
  X,
  FileText,
  Download,
  Building2
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, orderBy, addDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';

interface ChatProps {
  selectedCompanyId: string;
}

export default function Chat({ selectedCompanyId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const { data: analysts } = useFirestore<UserProfile>('users');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedCompanyId) return;

    const fetchCompany = async () => {
      const docSnap = await getDoc(doc(db, 'companies', selectedCompanyId));
      if (docSnap.exists()) setCompany({ id: docSnap.id, ...docSnap.data() } as Company);
    };
    fetchCompany();

    const q = query(
      collection(db, 'messages'),
      where('companyId', '==', selectedCompanyId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [selectedCompanyId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const msgData = {
      text: newMessage,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Analista',
      companyId: selectedCompanyId,
      type: 'text',
      createdAt: new Date().toISOString(),
    };

    setNewMessage('');
    setShowMentions(false);
    await addDoc(collection(db, 'messages'), msgData);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      
      await addDoc(collection(db, 'messages'), {
        text: file.name,
        senderId: auth.currentUser!.uid,
        senderName: auth.currentUser!.displayName || 'Analista',
        companyId: selectedCompanyId,
        type,
        fileURL: base64,
        createdAt: new Date().toISOString(),
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const insertMention = (name: string) => {
    const parts = newMessage.split('@');
    parts.pop();
    setNewMessage(parts.join('@') + '@' + name + ' ');
    setShowMentions(false);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Sidebar Analistas */}
      <div className="hidden lg:flex flex-col w-80 border-r border-slate-100 bg-slate-50/50">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-black text-slate-900 mb-4">EQUIPE ONLINE</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar analista..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {analysts.map(analyst => (
            <div key={analyst.uid} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                  {analyst.photoURL ? <img src={analyst.photoURL} className="w-full h-full object-cover" /> : <User className="w-6 h-6 m-3 text-slate-400" />}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${analyst.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{analyst.displayName}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{analyst.position}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col bg-[#F0F2F5] relative">
        {/* Header do Chat */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
              {company?.logoURL ? <img src={company.logoURL} className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-blue-600" />}
            </div>
            <div>
              <h3 className="font-black text-slate-900 leading-tight">{company?.name || 'Carregando...'}</h3>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Grupo de Suporte Ativo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Search className="w-5 h-5" /></button>
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Mensagens */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-auto p-6 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"
        >
          {messages.map((msg) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm relative ${
                  isMe ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'
                }`}>
                  {!isMe && <p className="text-[10px] font-black text-blue-600 mb-1 uppercase tracking-tight">{msg.senderName}</p>}
                  
                  {msg.type === 'text' && (
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {msg.text.split(/(@\w+)/g).map((part, i) => 
                        part.startsWith('@') ? <span key={i} className="text-blue-600 font-bold">{part}</span> : part
                      )}
                    </p>
                  )}

                  {msg.type === 'image' && (
                    <div className="rounded-xl overflow-hidden mb-1 border border-black/5">
                      <img src={msg.fileURL} alt="Mídia" className="max-w-full max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity" />
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <div className="flex items-center gap-3 p-3 bg-black/5 rounded-xl mb-1">
                      <div className="p-2 bg-white rounded-lg shadow-sm"><FileText className="w-6 h-6 text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{msg.text}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Documento</p>
                      </div>
                      <a href={msg.fileURL} download={msg.text} className="p-2 hover:bg-white rounded-lg transition-all text-blue-600">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[9px] text-slate-400 font-bold">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && <CheckCheck className="w-3 h-3 text-blue-500" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input de Mensagem */}
        <div className="p-4 bg-white border-t border-slate-100">
          {showMentions && (
            <div className="absolute bottom-24 left-4 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in slide-in-from-bottom-4">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mencionar Analista</span>
                <button onClick={() => setShowMentions(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <div className="max-h-48 overflow-auto">
                {analysts.map(a => (
                  <button 
                    key={a.uid}
                    onClick={() => insertMention(a.displayName.replace(/\s/g, ''))}
                    className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden">
                      {a.photoURL && <img src={a.photoURL} className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{a.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-5xl mx-auto">
            <div className="flex items-center gap-1">
              <button type="button" className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Smile className="w-6 h-6" /></button>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-blue-600 transition-all"
              >
                <Paperclip className="w-6 h-6" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </div>
            
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  if (e.target.value.endsWith('@')) setShowMentions(true);
                  else if (!e.target.value.includes('@')) setShowMentions(false);
                }}
                placeholder="Digite uma mensagem..."
                className="w-full px-6 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              />
              <button 
                type="button"
                onClick={() => setShowMentions(!showMentions)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
              >
                <AtSign className="w-4 h-4" />
              </button>
            </div>

            <button 
              type="submit"
              disabled={!newMessage.trim() || uploading}
              className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

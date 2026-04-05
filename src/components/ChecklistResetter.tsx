import { useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, updateDoc, doc, where } from 'firebase/firestore';
import { ChecklistItem } from '../types';
import { isBefore, parseISO, startOfDay, setHours, setMinutes, isAfter, format } from 'date-fns';

export function ChecklistResetter() {
  useEffect(() => {
    const checkAndReset = async () => {
      if (!auth.currentUser) return;

      try {
        const q = query(collection(db, 'checklists'));
        const querySnapshot = await getDocs(q);
        const now = new Date();
        const today = startOfDay(now);

        const updates = querySnapshot.docs.map(async (docSnapshot) => {
          const item = { id: docSnapshot.id, ...docSnapshot.data() } as ChecklistItem;
          
          if (item.type === 'permanente') return;

          let shouldReset = false;
          let resetHorarios = item.resetHorarios || ['00:00'];
          
          // Se não tem horários definidos mas tem frequência, define os padrões
          if (!item.resetHorarios) {
            if (item.frequencia === 'manhã') resetHorarios = ['08:00'];
            else if (item.frequencia === 'tarde') resetHorarios = ['14:00'];
            else if (item.frequencia === 'noite') resetHorarios = ['20:00'];
            else if (item.frequencia === 'manhã_tarde') resetHorarios = ['08:00', '14:00'];
            else if (item.frequencia === 'manhã_noite') resetHorarios = ['08:00', '20:00'];
            else if (item.frequencia === 'tarde_noite') resetHorarios = ['14:00', '20:00'];
            else if (item.frequencia === '3x_dia') resetHorarios = ['08:00', '14:00', '20:00'];
            else resetHorarios = ['00:00']; // Diária padrão
          }

          const lastReset = item.ultimaExecucao ? parseISO(item.ultimaExecucao) : new Date(0);

          for (const horario of resetHorarios) {
            const [hours, minutes] = horario.split(':').map(Number);
            const resetTime = setMinutes(setHours(today, hours), minutes);

            // Se o horário de reset já passou hoje E a última execução foi antes desse reset
            if (isBefore(resetTime, now) && isBefore(lastReset, resetTime)) {
              shouldReset = true;
              break;
            }
          }

          if (shouldReset) {
            try {
              console.log(`Resetando checklist: ${item.title}`);
              await updateDoc(doc(db, 'checklists', item.id), {
                completed: false,
                completedAt: null,
                ultimaExecucao: now.toISOString(),
                subtasks: item.subtasks?.map(s => ({ ...s, completed: false, completedAt: null })) || []
              });
              return true;
            } catch (err) {
              console.warn(`Erro ao resetar checklist ${item.title}:`, err);
              return false;
            }
          }
          return false;
        });

        const results = await Promise.all(updates);
        if (results.some(r => r)) {
          // Backup para redundância local
          const allChecklists = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          localStorage.setItem('checklists_backup', JSON.stringify(allChecklists));
          
          window.dispatchEvent(new CustomEvent('checklistsUpdated'));
        }
      } catch (error) {
        console.error('Erro ao processar reset de checklists:', error);
      }
    };

    // Executa imediatamente e depois a cada 5 minutos
    checkAndReset();
    const interval = setInterval(checkAndReset, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}

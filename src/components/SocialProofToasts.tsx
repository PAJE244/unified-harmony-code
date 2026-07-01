import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

const NAMES = [
  'Lucas Almeida', 'Mariana Silva', 'Rafael Oliveira', 'Beatriz Costa',
  'Gabriel Santos', 'Julia Ferreira', 'Pedro Henrique', 'Larissa Souza',
  'Matheus Rocha', 'Ana Clara', 'Felipe Lima', 'Camila Ribeiro',
  'Bruno Carvalho', 'Isabela Martins', 'Thiago Nunes', 'Letícia Araújo',
  'Vinícius Barbosa', 'Sofia Mendes', 'Enzo Cardoso', 'Manuela Dias',
  'Guilherme Pereira', 'Yasmin Correia', 'Arthur Gomes', 'Helena Ramos',
  'Diego Moreira', 'Nicole Freitas', 'André Machado', 'Valentina Pires',
];

const MESSAGES = [
  'acabou de acessar a plataforma.',
  'acabou de adquirir o acesso Premium.',
  'acabou de efetuar o pagamento.',
];

const TIMES = ['agora', 'há poucos segundos', 'há 1 min'];

// pravatar returns natural human portraits (men & women mixed)
const AVATAR_IDS = [1,3,5,7,8,9,11,12,13,14,15,16,20,23,25,26,27,28,29,31,32,33,36,38,40,41,44,45,47,49,51,52,54,56,60,64,65,68];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickDifferent<T>(arr: T[], last: T | null): T {
  if (arr.length <= 1) return arr[0];
  let v = pick(arr);
  let tries = 0;
  while (v === last && tries < 6) { v = pick(arr); tries++; }
  return v;
}
function randRange(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}

type Toast = {
  id: number;
  name: string;
  message: string;
  time: string;
  avatar: string;
};

export default function SocialProofToasts() {
  const [toast, setToast] = useState<Toast | null>(null);
  const lastMessageRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const idRef = useRef(0);
  const visibleRef = useRef(true);

  useEffect(() => {
    const clearTimers = () => {
      if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
      if (hideTimerRef.current) { window.clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    };

    const showOne = () => {
      if (!visibleRef.current) return;
      const message = pickDifferent(MESSAGES, lastMessageRef.current);
      lastMessageRef.current = message;
      const avatarId = pick(AVATAR_IDS);
      idRef.current += 1;
      const next: Toast = {
        id: idRef.current,
        name: pick(NAMES),
        message,
        time: pick(TIMES),
        avatar: `https://i.pravatar.cc/100?img=${avatarId}`,
      };
      setToast(next);
      // Visible ~5s, then fade out, then schedule next
      hideTimerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = window.setTimeout(showOne, randRange(15000, 35000));
      }, 5000);
    };

    // First toast after 6–12s so it doesn't feel spammy
    timerRef.current = window.setTimeout(showOne, randRange(6000, 12000));

    const onVisibility = () => {
      if (document.hidden) {
        visibleRef.current = false;
        clearTimers();
        setToast(null);
      } else if (!visibleRef.current) {
        visibleRef.current = true;
        timerRef.current = window.setTimeout(showOne, randRange(15000, 35000));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimers();
    };
  }, []);

  return (
    <div
      className="fixed z-[60] left-3 sm:left-6 bottom-4 sm:bottom-6 pointer-events-none max-w-[calc(100vw-1.5rem)] sm:max-w-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center gap-3 px-3.5 py-3 pr-4 rounded-2xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.55)]"
            style={{
              background: 'rgba(10, 10, 10, 0.72)',
              backdropFilter: 'blur(22px) saturate(160%)',
              WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            }}
          >
            <div className="relative shrink-0">
              <img
                src={toast.avatar}
                alt=""
                loading="lazy"
                className="w-11 h-11 rounded-full object-cover ring-1 ring-white/15"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-black flex items-center justify-center ring-2 ring-black">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug text-white/95">
                <span className="font-semibold">{toast.name}</span>{' '}
                <span className="text-white/70">{toast.message}</span>
              </p>
              <p className="text-[11px] mt-0.5 text-white/45 tracking-wide">{toast.time}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

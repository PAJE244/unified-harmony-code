import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

type Person = { name: string; avatar: string };

// pravatar image IDs curated by apparent gender (natural portraits)
const FEMALE_AVATAR_IDS = [1, 5, 9, 10, 16, 19, 20, 21, 23, 24, 25, 26, 29, 32, 36, 38, 40, 44, 45, 47, 48, 49];
const MALE_AVATAR_IDS   = [3, 7, 8, 11, 12, 13, 14, 15, 17, 18, 22, 33, 34, 37, 39, 41, 42, 43, 50, 51, 52, 53, 54, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68];

const FEMALE_NAMES = [
  'Mariana Silva', 'Beatriz Costa', 'Julia Ferreira', 'Larissa Souza', 'Ana Clara',
  'Camila Ribeiro', 'Isabela Martins', 'Letícia Araújo', 'Sofia Mendes', 'Manuela Dias',
  'Yasmin Correia', 'Helena Ramos', 'Nicole Freitas', 'Valentina Pires', 'Amanda Rocha',
  'Bruna Cardoso', 'Carolina Nogueira', 'Débora Teixeira', 'Eduarda Moraes', 'Fernanda Lopes',
  'Giovanna Barros', 'Ingrid Cavalcanti', 'Jéssica Andrade', 'Karina Fernandes', 'Luana Vieira',
  'Melissa Pinto', 'Natália Duarte', 'Patrícia Campos', 'Renata Azevedo', 'Sabrina Melo',
  'Tainá Batista', 'Vanessa Freire', 'Priscila Tavares', 'Rafaela Assis', 'Milena Reis',
];

const MALE_NAMES = [
  'Lucas Almeida', 'Rafael Oliveira', 'Gabriel Santos', 'Pedro Henrique', 'Matheus Rocha',
  'Felipe Lima', 'Bruno Carvalho', 'Thiago Nunes', 'Vinícius Barbosa', 'Enzo Cardoso',
  'Guilherme Pereira', 'Arthur Gomes', 'Diego Moreira', 'André Machado', 'Caio Monteiro',
  'Daniel Vasconcelos', 'Eduardo Siqueira', 'Fábio Guimarães', 'Gustavo Pacheco', 'Henrique Aguiar',
  'Igor Fonseca', 'João Vitor', 'Kaique Bezerra', 'Leonardo Prado', 'Murilo Sales',
  'Nicolas Xavier', 'Otávio Brandão', 'Paulo Ricardo', 'Renan Coelho', 'Samuel Antunes',
  'Tiago Bittencourt', 'Vitor Hugo', 'Wesley Marques', 'Yuri Peixoto', 'Alexandre Meireles',
];

const MESSAGES = [
  'acabou de acessar a plataforma.',
  'acabou de adquirir o acesso Premium.',
  'acabou de efetuar o pagamento.',
];

const TIMES = ['agora', 'há poucos segundos', 'há 1 min'];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPeoplePool(): Person[] {
  const females = shuffle(FEMALE_NAMES);
  const males = shuffle(MALE_NAMES);
  const fAvatars = shuffle(FEMALE_AVATAR_IDS);
  const mAvatars = shuffle(MALE_AVATAR_IDS);

  const people: Person[] = [];
  const fCount = Math.min(females.length, fAvatars.length);
  for (let i = 0; i < fCount; i++) {
    people.push({ name: females[i], avatar: `https://i.pravatar.cc/100?img=${fAvatars[i]}` });
  }
  const mCount = Math.min(males.length, mAvatars.length);
  for (let i = 0; i < mCount; i++) {
    people.push({ name: males[i], avatar: `https://i.pravatar.cc/100?img=${mAvatars[i]}` });
  }
  return shuffle(people);
}

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

// 2–4 minutes between notifications
const MIN_GAP_MS = 2 * 60 * 1000;
const MAX_GAP_MS = 4 * 60 * 1000;

export default function SocialProofToasts() {
  const [toast, setToast] = useState<Toast | null>(null);
  const lastMessageRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const idRef = useRef(0);
  const visibleRef = useRef(true);
  const poolRef = useRef<Person[]>(buildPeoplePool());
  const cursorRef = useRef(0);

  useEffect(() => {
    const clearTimers = () => {
      if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
      if (hideTimerRef.current) { window.clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    };

    const nextPerson = (): Person => {
      if (cursorRef.current >= poolRef.current.length) {
        // fully exhausted → rebuild a fresh shuffled pool
        poolRef.current = buildPeoplePool();
        cursorRef.current = 0;
      }
      return poolRef.current[cursorRef.current++];
    };

    const showOne = () => {
      if (!visibleRef.current) return;
      const message = pickDifferent(MESSAGES, lastMessageRef.current);
      lastMessageRef.current = message;
      const person = nextPerson();
      idRef.current += 1;
      const next: Toast = {
        id: idRef.current,
        name: person.name,
        avatar: person.avatar,
        message,
        time: pick(TIMES),
      };
      setToast(next);
      hideTimerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = window.setTimeout(showOne, randRange(MIN_GAP_MS, MAX_GAP_MS));
      }, 5000);
    };

    // First toast after 8–20s so it doesn't feel spammy on load
    timerRef.current = window.setTimeout(showOne, randRange(8000, 20000));

    const onVisibility = () => {
      if (document.hidden) {
        visibleRef.current = false;
        clearTimers();
        setToast(null);
      } else if (!visibleRef.current) {
        visibleRef.current = true;
        timerRef.current = window.setTimeout(showOne, randRange(MIN_GAP_MS, MAX_GAP_MS));
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

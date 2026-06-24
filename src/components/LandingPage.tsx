import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from '@tanstack/react-router';
import { registerPublicUser, getSiteSettings, subscribeRealtime, type SiteSettings } from '@/lib/scriptando-db';
import { 
  Zap, 
  Clock, 
  Award, 
  Cpu, 
  Infinity as InfinityIcon, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Sparkles,
  ChevronRight,
  Terminal,
  Copy,
  Check,
  Send,
  Eye,
  EyeOff,
  Flame,
  ArrowLeft,
  CheckCircle,
  Smartphone,
  Laptop,
  HelpCircle
} from 'lucide-react';

// Helper para gerar o código BR Code oficial (EMVCo PIX Copia e Cola)
function formatPixField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16Pix(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixCopyPaste(key: string, name: string, city: string, amount: string): string {
  const gui = formatPixField('00', 'br.gov.bcb.pix');
  const pixKeyField = formatPixField('01', key);
  const merchantAccount = formatPixField('26', `${gui}${pixKeyField}`);
  const mcc = formatPixField('52', '0000');
  const currency = formatPixField('53', '986');
  const amountField = formatPixField('54', amount);
  const country = formatPixField('58', 'BR');
  const merchantName = formatPixField('59', name.substring(0, 25).toUpperCase());
  const merchantCity = formatPixField('60', city.substring(0, 15).toUpperCase());
  const txid = formatPixField('05', '***');
  const addData = formatPixField('62', txid);

  const payloadWithoutCRC = `000201${merchantAccount}${mcc}${currency}${amountField}${country}${merchantName}${merchantCity}${addData}6304`;
  const checksum = crc16Pix(payloadWithoutCRC);
  return `${payloadWithoutCRC}${checksum}`;
}

// Variantes de animação Apple-style
const fadeInUp: any = {
  hidden: { opacity: 0, y: 36 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } 
  }
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

const stepTransition: any = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: -20, scale: 0.98, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
};

export default function LandingPage() {
  // Controle de etapas do Checkout: 'form' -> 'pix'
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'pix'>('form');
  
  // Feedback de cópia
  const [copiedPixEmail, setCopiedPixEmail] = useState(false);
  const [copiedPixCode, setCopiedPixCode] = useState(false);
  const [pixTab, setPixTab] = useState<'code' | 'email'>('code');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form data state
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [settings, setSettings] = useState<SiteSettings>(() => getSiteSettings());
  useEffect(() => {
    setSettings(getSiteSettings());
    const unsub = subscribeRealtime((msg: any) => {
      if (msg.type === 'settings_updated') setSettings(msg.data);
    });
    return () => unsub();
  }, []);

  const pixKey = settings.pixKey;
  const pixAmount = settings.pixAmount;
  const pixName = settings.pixName;
  const pixCity = settings.pixCity;
  const pixPayload = generatePixCopyPaste(pixKey, pixName, pixCity, pixAmount);

  const handleCopyPixEmail = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPixEmail(true);
    setTimeout(() => setCopiedPixEmail(false), 3000);
  };

  const handleCopyPixCode = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopiedPixCode(true);
    setTimeout(() => setCopiedPixCode(false), 3000);
  };

  const scrollToCheckout = () => {
    const el = document.getElementById('checkout');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    if (!email || !whatsapp || !username || !password) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const result = registerPublicUser(username, password);
      setIsSubmitting(false);
      if (!result.ok) {
        setRegisterError(result.error || "Erro ao cadastrar usuário.");
        return;
      }
      setCheckoutStep('pix');
      const el = document.getElementById('checkout-header');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 900);
  };

  const handleWhatsAppNotify = () => {
    const cleanPhone = whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá Pajé! Acabei de fazer o PIX de ${settings.priceLabel} no SCRIPTANDO. Meu usuário escolhido foi: ${username} (E-mail: ${email}). Vim solicitar meu acesso VIP!`);
    window.open(`https://wa.me/${settings.whatsappNumber}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f7] selection:bg-white selection:text-black relative overflow-hidden font-sans antialiased">
      
      {/* Luzes de Fundo Estilo Apple */}
      <div className="fixed top-[-15%] left-[15%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-white/[0.04] via-neutral-800/[0.03] to-transparent blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-neutral-800/[0.15] to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* BARRA DE URGÊNCIA FLUTUANTE */}
      <motion.div 
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 bg-[#050505]/85 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 text-center text-xs md:text-sm font-medium tracking-wide flex items-center justify-center gap-2 text-neutral-300 shadow-2xl"
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-black text-[10px] font-extrabold tracking-wider animate-pulse">
          <Flame className="w-3 h-3 text-black fill-black" /> LOTE OFICIAL
        </span>
        <span className="truncate">{settings.loteText}</span>
      </motion.div>

      {/* NAVEGAÇÃO PRINCIPAL */}
      <header className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-neutral-200 to-white flex items-center justify-center text-black font-black text-xl tracking-tighter shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-lg text-white leading-none">SCRIPTANDO</span>
            <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase mt-1">PR Public Schools</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="hidden md:flex items-center gap-6 text-xs font-mono tracking-widest uppercase text-neutral-400 bg-white/[0.03] px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-md"
        >
          <span className="flex items-center gap-2 text-white font-sans font-medium">
            <Sparkles className="w-3.5 h-3.5 text-neutral-200" /> Criado com Magia pelo Pajé
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-emerald-400 font-sans font-semibold">Online no PR</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2"
        >
          <Link
            to="/app"
            className="text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            Entrar
          </Link>
          <button
            onClick={scrollToCheckout}
            className="text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer hover:scale-105 active:scale-95"
          >
            Acesso Vitalício
          </button>
        </motion.div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8 pb-32 space-y-32 md:space-y-44">

        {/* 1. SEÇÃO HERÓI */}
        <section className="text-center space-y-8 pt-6 md:pt-16 max-w-4xl mx-auto relative">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-neutral-300 text-xs sm:text-sm font-mono tracking-wider mb-4 shadow-inner"
          >
            <Terminal className="w-4 h-4 text-white" /> Automação Exclusiva para Estudantes do PR
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[2rem] leading-[1.05] sm:text-6xl md:text-7xl font-black tracking-tight text-gradient"
          >
            {settings.heroTitle}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg sm:text-2xl text-neutral-300 font-normal max-w-3xl mx-auto leading-relaxed"
          >
            Eu, o <span className="text-white font-bold underline decoration-white/50 underline-offset-4">Pajé</span>, criei <strong className="text-white font-extrabold">SCRIPTANDO</strong> para você automatizar 
            <span className="text-white font-semibold"> Khan Academy</span>, <span className="text-white font-semibold">Quizizz</span>, <span className="text-white font-semibold">Redação Paraná</span>, <span className="text-white font-semibold">Inglês Paraná</span> e <span className="text-white font-semibold">Leia Paraná</span> em segundos!
          </motion.p>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-sm md:text-base text-neutral-400 max-w-2xl mx-auto font-light leading-normal"
          >
            Enquanto seus colegas perdem noites estudando, você estará à frente, conquistando excelentes notas sem esforço. 
            Isso é privilégio ou inteligência? Com SCRIPTANDO, você decide!
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={scrollToCheckout}
              className="w-full sm:w-auto glass-button px-9 py-5 rounded-full font-extrabold text-base md:text-xl tracking-tight flex items-center justify-center gap-3 cursor-pointer group shadow-[0_0_50px_rgba(255,255,255,0.25)]"
            >
              QUERO AUTOMATIZAR O SISTEMA AGORA
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-4 block"
          >
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 italic">
              "Seus amigos estão se esforçando demais enquanto você lê isso"
            </p>
          </motion.div>

          {/* Plataformas Grid */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="pt-12 grid grid-cols-2 sm:grid-cols-5 gap-3 opacity-70"
          >
            {['Khan Academy', 'Quizizz', 'Redação PR', 'Inglês PR', 'Leia PR'].map((plat, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className="py-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs font-mono tracking-wider text-center text-neutral-300 backdrop-blur-sm hover:border-white/30 transition-colors"
              >
                {plat}
              </motion.div>
            ))}
          </motion.div>
        </section>


        {/* 2. PROBLEMA E SOLUÇÃO */}
        <motion.section 
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="glass-panel rounded-3xl p-8 md:p-16 space-y-10 relative overflow-hidden border-white/15"
        >
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/[0.07] rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-6 relative z-10">
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">O bastidor revelado</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
              A VERDADE QUE NINGUÉM CONTA SOBRE ESTUDAR NO PARANÁ
            </h2>

            <p className="text-neutral-300 text-base md:text-xl leading-relaxed">
              Você sabia que <strong className="text-white font-bold underline decoration-white/40">87% dos alunos da rede pública</strong> gastam mais tempo tentando entender o funcionamento burocrático das plataformas do que estudando de verdade? 
              Enquanto isso, os melhores alunos... bem, você sabe como eles conseguem notas altas, né? 🤫
            </p>

            <div className="p-7 rounded-2xl bg-white/[0.04] border border-white/15 space-y-3 backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-white font-bold text-lg">
                <Cpu className="w-6 h-6 text-neutral-200" />
                <span>A Solução do Pajé:</span>
              </div>
              <p className="text-neutral-300 text-sm md:text-base leading-relaxed font-normal">
                Eu desenvolvi SCRIPTANDO exatamente para otimizar seu tempo. Scripts inteligentes que automatizam tudo, 
                sem precisar se esforçar, sem precisar estudar horas a fio na frente de uma tela cansativa.
              </p>
            </div>

            <div className="pt-4">
              <button 
                onClick={scrollToCheckout}
                className="glass-button-secondary px-8 py-4 rounded-full text-sm font-semibold flex items-center gap-3 cursor-pointer group"
              >
                QUERO SER MAIS EFICIENTE TAMBÉM
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <p className="text-right text-xs font-mono tracking-wider text-neutral-500 pt-4">
            * A verdade é que os melhores alunos não necessariamente estudam mais.
          </p>
        </motion.section>


        {/* 3. BENEFÍCIOS */}
        <motion.section 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-12"
        >
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Vantagem Competitiva</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              O QUE A ESCOLA NÃO QUER QUE VOCÊ SAIBA
            </h2>
            <p className="text-neutral-400 text-sm md:text-base">
              O sistema foi feito para você se esforçar. O SCRIPTANDO foi feito para você vencer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <motion.div variants={fadeInUp} className="glass-panel glass-panel-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between space-y-8 md:col-span-2">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-lg">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Tempo livre para o que realmente importa
                </h3>
                <p className="text-neutral-300 text-base md:text-lg leading-relaxed">
                  (E não, não é estudar mais). Saia com amigos, jogue, pratique esportes ou simplesmente descanse enquanto os robôs do Pajé resolvem as questões pendentes do seu portal escolar.
                </p>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-mono text-neutral-400 pt-4 border-t border-white/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Execução 100% autônoma em segundo plano
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="glass-panel glass-panel-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Award className="w-7 h-7" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Notas altas sem estresse
                </h3>
                <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                  Mantenha seu histórico escolar impecável sem precisar sofrer com prazos apertados ou sistemas lentos.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="glass-panel glass-panel-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Zap className="w-7 h-7" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Status de "Especialista"
                </h3>
                <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                  Ganhe reputação imediata de gênio da tecnologia entre seus amigos quando virem suas metas concluídas em segundos.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="glass-panel glass-panel-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <InfinityIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Acessos Vitalícios
                </h3>
                <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                  Pagamento único. Acesso a TODOS os scripts atuais e todas as futuras atualizações que o Pajé programar.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="glass-panel glass-panel-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Tutorial Simplificado
                </h3>
                <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                  Passo a passo extremamente visual e claro. Feito de uma forma tão simples que até sua avó entenderia como usar.
                </p>
              </div>
            </motion.div>

          </div>

          <div className="text-center pt-8">
            <button 
              onClick={scrollToCheckout}
              className="glass-button px-9 py-5 rounded-full font-bold text-lg cursor-pointer inline-flex items-center gap-3 group"
            >
              QUERO TODOS ESSES BENEFÍCIOS
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.section>


        {/* 4. COMO FUNCIONA */}
        <motion.section 
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-16 max-w-5xl mx-auto"
        >
          <div className="text-center space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Início Rápido</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              AUTOMATIZE O SISTEMA EM 3 PASSOS
            </h2>
            <p className="text-neutral-400 text-sm font-mono tracking-wide">
              (ATÉ SEU PRIMO CONSEGUE)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent -z-10" />

            {[
              {
                step: "01",
                title: "Preencha seus Dados VIP",
                desc: "Crie seu usuário e senha no formulário interativo abaixo para que o Pajé programe seu acesso."
              },
              {
                step: "02",
                title: `Efetue o PIX de ${settings.priceLabel}`,
                desc: "Na próxima tela do checkout, copie o BR Code oficial ou a chave e-mail e faça o PIX de pagamento único."
              },
              {
                step: "03",
                title: "Receba no WhatsApp",
                desc: "Receba seu acesso VIP personalizado programado pelo Pajé diretamente no seu WhatsApp em até 3 dias úteis."
              }
            ].map((item, idx) => (
              <div key={idx} className="glass-panel rounded-3xl p-8 space-y-5 relative bg-[#0a0a0a]/90 hover:border-white/30 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black font-mono text-white/25">
                    {item.step}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold">
                    ✓
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {item.title}
                </h3>
                <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-normal">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button 
              onClick={scrollToCheckout}
              className="glass-button-secondary px-9 py-4 rounded-full font-semibold text-sm sm:text-base cursor-pointer"
            >
              QUERO COMEÇAR AGORA
            </button>
            <p className="text-xs font-mono text-neutral-500 mt-4 italic">
              "Enquanto você hesita, outros alunos já estão otimizando seu tempo"
            </p>
          </div>
        </motion.section>


        {/* 5. TUTORIAL MINIMALISTA */}
        <motion.section 
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="glass-panel rounded-3xl p-8 md:p-16 space-y-12 border-white/15"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">Guia de execução</span>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white mt-1">
                ASSIM ATÉ CRIANÇA USA
              </h2>
            </div>
            <span className="text-xs font-mono tracking-wider px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 uppercase shrink-0">
              MAS NÃO CONTA PARA NINGUÉM 🤫
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
            {[
              { t: "Faça login normal na plataforma escolar desejada", icon: Laptop },
              { t: "Abra o portal do SCRIPTANDO em outra aba no navegador", icon: Smartphone },
              { t: "Selecione a plataforma escolar que quer automatizar", icon: CheckCircle },
              { t: "Clique no botão grande 'INICIAR AUTOMAÇÃO'", icon: Zap },
              { t: "Volte para a aba escolar e veja a mágica acontecendo", icon: Sparkles }
            ].map((step, idx) => {
              const IconComp = step.icon;
              return (
                <div key={idx} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 flex flex-col justify-between hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="w-8 h-8 rounded-xl bg-white/10 font-mono text-sm font-extrabold flex items-center justify-center text-white shadow">
                      {idx + 1}
                    </span>
                    <IconComp className="w-5 h-5 text-neutral-300" />
                  </div>
                  <p className="text-sm md:text-base text-neutral-200 font-normal leading-snug">
                    {step.t}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.section>


        {/* 6. AVISO LEGAL */}
        <motion.section 
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-3xl mx-auto rounded-3xl p-8 md:p-12 border border-neutral-800 bg-gradient-to-b from-neutral-900/60 to-[#050505] text-center space-y-6 shadow-2xl"
        >
          <div className="inline-flex p-3.5 rounded-2xl bg-neutral-800 border border-neutral-700 text-white mb-2 shadow">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">
            VERDADES QUE PRECISAM SER DITAS
          </h2>

          <p className="text-neutral-400 text-sm md:text-base leading-relaxed text-justify sm:text-center font-light">
            Vamos ser claros: <span className="text-white font-medium">isso é ilegal</span>. Você estará burlando o sistema. 
            Eu, o <strong className="text-white font-bold">Pajé</strong>, não me responsabilizo por qualquer dano, suspensão ou problema escolar que você possa ter. 
            Use por sua conta e risco. 
          </p>

          <p className="text-neutral-300 font-medium text-sm md:text-base italic pt-2">
            "Mas vamos combinar... o risco faz parte da emoção, não é mesmo?"
          </p>
        </motion.section>


        {/* ===================================================================== */}
        {/* 7. CHECKOUT MULTI-STEP COM ANIMAÇÃO APPLE (STEP 1: FORM -> STEP 2: PIX) */}
        {/* ===================================================================== */}
        <section id="checkout" className="pt-8 max-w-4xl mx-auto scroll-mt-24">
          <div className="glass-panel rounded-3xl p-6 sm:p-12 md:p-16 relative overflow-hidden border-white/25 shadow-[0_0_80px_rgba(255,255,255,0.08)]">
            
            {/* Efeito luminoso de fundo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-white/[0.08] rounded-full blur-[100px] pointer-events-none" />

            {/* Cabeçalho Fixo do Checkout */}
            <div id="checkout-header" className="text-center space-y-4 mb-10 relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-black font-extrabold text-xs uppercase tracking-wider shadow-lg">
                <Lock className="w-3.5 h-3.5" /> CHECKOUT OFICIAL SCRIPTANDO
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
                DOMINE O JOGO ANTES DOS OUTROS
              </h2>
              <p className="text-lg sm:text-2xl font-medium text-neutral-300">
                Acesso vitalício: <span className="text-white font-bold underline decoration-white underline-offset-4">R$9,90</span> <span className="text-xs sm:text-sm text-neutral-400 font-normal">(único pagamento)</span>
              </p>

              {/* Step Indicator Minimalista */}
              <div className="pt-6 flex items-center justify-center gap-3 text-xs sm:text-sm font-mono max-w-sm mx-auto">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${checkoutStep === 'form' ? 'bg-white text-black font-bold shadow-lg shadow-white/20 scale-105' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'}`}>
                  <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[11px]">1</span>
                  <span>Dados VIP</span>
                </div>
                <div className="w-8 h-[2px] bg-neutral-800 rounded-full" />
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${checkoutStep === 'pix' ? 'bg-white text-black font-bold shadow-lg shadow-white/20 scale-105' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'}`}>
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[11px]">2</span>
                  <span>Pagamento PIX</span>
                </div>
              </div>
            </div>

            {/* ANIMAÇÃO ENTRE TELA DE DADOS E TELA DE PIX */}
            <div className="relative z-10 min-h-[480px]">
              <AnimatePresence mode="wait">
                
                {checkoutStep === 'form' ? (
                  <motion.div
                    key="step-form"
                    variants={stepTransition}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-8"
                  >
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center text-xs sm:text-sm text-neutral-300">
                      📝 Preencha abaixo as credenciais que você deseja usar. Na próxima etapa, você liberará o PIX instantâneo.
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold block">
                            Seu melhor e-mail *
                          </label>
                          <input 
                            type="email" 
                            required
                            placeholder="aluno@escola.pr.gov.br"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-4 rounded-2xl bg-black/80 border border-white/20 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm sm:text-base shadow-inner"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold block">
                            WhatsApp (para receber o script) *
                          </label>
                          <input 
                            type="tel" 
                            required
                            placeholder="(41) 99999-9999"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            className="w-full px-4 py-4 rounded-2xl bg-black/80 border border-white/20 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm sm:text-base shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold block">
                            Crie um Usuário Desejado *
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="paje_aluno01"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-4 rounded-2xl bg-black/80 border border-white/20 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm sm:text-base font-mono shadow-inner"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold block">
                            Crie uma Senha Desejada *
                          </label>
                          <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"} 
                              required
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-4 py-4 rounded-2xl bg-black/80 border border-white/20 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm sm:text-base font-mono shadow-inner pr-12"
                            />
                            <button 
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer p-1"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {registerError && (
                        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-sm font-mono">
                          {registerError}
                        </div>
                      )}
                      <div className="pt-6">
                        <motion.button 
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full glass-button py-5 rounded-2xl font-extrabold text-base sm:text-xl tracking-tight flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                        >
                          {isSubmitting ? (
                            <span className="inline-flex items-center gap-3 font-mono">
                              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              Salvando no servidor do Pajé...
                            </span>
                          ) : (
                            <>
                              <span>PROSSEGUIR PARA PAGAMENTO PIX</span>
                              <ChevronRight className="w-6 h-6" />
                            </>
                          )}
                        </motion.button>
                      </div>
                      
                      <div className="flex items-center justify-center gap-4 text-xs font-mono text-neutral-500 pt-2">
                        <span className="flex items-center gap-1">🔒 SSL 256-bit Encrypted</span>
                        <span>●</span>
                        <span>⚡ Liberação Imediata</span>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-pix"
                    variants={stepTransition}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-8"
                  >
                    {/* Resumo do Pedido / Botão Voltar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.05] border border-white/15">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Dados Vinculados com Sucesso
                        </div>
                        <p className="text-sm text-neutral-200">
                          Usuário: <strong className="text-white font-mono">{username}</strong> (WhatsApp: {whatsapp})
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCheckoutStep('form')}
                        className="text-xs font-semibold px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Alterar Dados</span>
                      </button>
                    </div>

                    {/* ÁREA PIX INTERATIVA */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-black/60 p-6 sm:p-8 rounded-3xl border border-white/15">
                      
                      {/* QR Code Coluna */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-white text-black space-y-3 shadow-[0_0_60px_rgba(255,255,255,0.2)]">
                        <div className="bg-white p-2 rounded-2xl w-full flex items-center justify-center max-w-[220px] mx-auto">
                          <QRCode 
                            value={pixPayload} 
                            size={200}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            viewBox={`0 0 256 256`}
                          />
                        </div>
                        <div className="text-center pt-1">
                          <span className="text-xs font-mono font-black tracking-wider uppercase px-3 py-1.5 bg-black text-white rounded-full block">
                            PIX OFICIAL • R$ 9,90
                          </span>
                        </div>
                      </div>

                      {/* Opções Copia e Cola Coluna */}
                      <div className="lg:col-span-7 space-y-6 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                          <div>
                            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                              Pagamento Instantâneo
                            </span>
                            <h4 className="text-xl sm:text-2xl font-black text-white mt-1">
                              Escolha como pagar:
                            </h4>
                          </div>

                          {/* Seletor de Abas */}
                          <div className="flex bg-neutral-900 p-1.5 rounded-2xl border border-white/15 text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => setPixTab('code')}
                              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${pixTab === 'code' ? 'bg-white text-black font-extrabold shadow' : 'text-neutral-400 hover:text-white'}`}
                            >
                              Copia e Cola
                            </button>
                            <button
                              type="button"
                              onClick={() => setPixTab('email')}
                              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${pixTab === 'email' ? 'bg-white text-black font-extrabold shadow' : 'text-neutral-400 hover:text-white'}`}
                            >
                              Chave E-mail
                            </button>
                          </div>
                        </div>

                        {pixTab === 'code' ? (
                          <div className="space-y-3">
                            <span className="text-xs sm:text-sm font-mono text-neutral-300 block">
                              1. Copie o código abaixo e cole no app do seu banco (Opção: <strong className="text-white">PIX Copia e Cola</strong>):
                            </span>
                            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                              <input 
                                type="text" 
                                readOnly 
                                value={pixPayload}
                                className="w-full bg-black border border-white/25 rounded-2xl px-4 py-3.5 text-xs font-mono text-neutral-300 select-all focus:outline-none focus:border-white font-medium"
                              />
                              <button 
                                type="button"
                                onClick={handleCopyPixCode}
                                className="px-6 py-4 rounded-2xl bg-white text-black font-extrabold text-sm hover:bg-neutral-200 transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-white/10 active:scale-95"
                              >
                                {copiedPixCode ? <Check className="w-4 h-4 text-emerald-600 font-extrabold" /> : <Copy className="w-4 h-4" />}
                                <span>{copiedPixCode ? "Copiado!" : "Copiar BR Code"}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <span className="text-xs sm:text-sm font-mono text-neutral-300 block">
                              1. Copie a chave e-mail abaixo e digite o valor de <strong className="text-white">R$9,90</strong> no seu banco:
                            </span>
                            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                              <input 
                                type="text" 
                                readOnly 
                                value={pixKey}
                                className="w-full bg-black border border-white/25 rounded-2xl px-4 py-3.5 text-sm font-mono text-neutral-200 select-all focus:outline-none focus:border-white font-medium"
                              />
                              <button 
                                type="button"
                                onClick={handleCopyPixEmail}
                                className="px-6 py-4 rounded-2xl bg-white text-black font-extrabold text-sm hover:bg-neutral-200 transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-white/10 active:scale-95"
                              >
                                {copiedPixEmail ? <Check className="w-4 h-4 text-emerald-600 font-extrabold" /> : <Copy className="w-4 h-4" />}
                                <span>{copiedPixEmail ? "Chave Copiada!" : "Copiar E-mail"}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Status animado em tempo real */}
                        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center gap-3">
                          <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                          </div>
                          <p className="text-xs text-neutral-300 font-mono">
                            Aguardando compensação automática bancária...
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Botão de Confirmação no WhatsApp */}
                    <div className="space-y-4 pt-4">
                      <motion.button 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleWhatsAppNotify}
                        className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-base sm:text-xl tracking-tight flex items-center justify-center gap-3 cursor-pointer shadow-[0_0_45px_rgba(16,185,129,0.35)] transition-all"
                      >
                        <Send className="w-6 h-6 fill-black" />
                        <span>JÁ FIZ O PIX • RECEBER ACESSO NO WHATSAPP</span>
                      </motion.button>

                      <p className="text-xs text-center text-neutral-400 leading-relaxed max-w-xl mx-auto">
                        "Após o pagamento, criarei seu acesso personalizado com os dados cadastrados.
                        O sistema enviará tudo diretamente no seu WhatsApp em <strong>1 a 3 dias úteis</strong>. Tenho outras 'magias' para fazer, mas já já te respondo!"
                      </p>

                      <div className="pt-2">
                        <Link
                          to="/app"
                          className="block w-full text-center py-4 rounded-2xl bg-white/5 border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition-all"
                        >
                          Acessar a plataforma agora →
                        </Link>
                        <p className="text-[10px] text-center text-neutral-500 mt-2 font-mono">
                          Use o usuário e senha que você acabou de cadastrar.
                        </p>
                      </div>
                    </div>

                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        </section>


        {/* PSICOLOGIA REVERSA FINAL BANNER */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center py-10 max-w-2xl mx-auto border-t border-white/10"
        >
          <p className="text-sm md:text-base font-mono tracking-widest uppercase text-neutral-400 font-medium">
            "O sistema foi feito para você se esforçar. O SCRIPTANDO foi feito para você vencer."
          </p>
        </motion.section>

      </main>


      {/* RODAPÉ MINIMALISTA */}
      <footer className="border-t border-white/10 bg-black py-16 px-6 text-center space-y-8 text-xs text-neutral-500 font-mono relative z-10">
        <div className="flex items-center justify-center gap-2 text-white font-sans font-extrabold tracking-tight text-lg">
          <ShieldCheck className="w-6 h-6 text-white" />
          <span>SCRIPTANDO PLATFORM</span>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-neutral-300">Criado com magia pelo <strong className="text-white font-black underline decoration-white/40">Pajé</strong></p>
          <p>Todos os direitos reservados ao gênio por trás dos scripts.</p>
          <p className="pt-2 text-neutral-500">Suporte técnico: <span className="text-neutral-300 select-all underline">gabrieldacechen6@gmail.com</span></p>
        </div>

        <div className="pt-8 text-[11px] text-neutral-600 max-w-lg mx-auto leading-relaxed border-t border-neutral-900">
          Plataforma autônoma desenvolvida com o propósito de automação e otimização de tempo estudantil na rede pública do Estado do Paraná.
        </div>
      </footer>

    </div>
  );
}

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, Variants } from 'framer-motion';
import {
  Menu, X, ArrowRight, Sun, Moon, Send, Loader2, AlertCircle,
  Shield, Bug, Crosshair, Users, Eye, Swords, Gem, ChevronLeft, Zap, Flame
} from 'lucide-react';

// Theme Context
interface ThemeContextType { theme: 'dark' | 'light'; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => {} });
const useTheme = () => useContext(ThemeContext);

const SUPABASE_EDGE_URL = 'https://ngfkdzzxjzunovbdcnnx.supabase.co/functions/v1/aionlabs-proxy';
const LOGO_URL = 'https://media.base44.com/images/public/6a7f24f2891dd3b51a30e2ff/50973cd54_generated_image.png';

const fadeInUp: Variants = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } } };
const staggerContainer: Variants = { initial: {}, animate: { transition: { staggerChildren: 0.08 } } };

// AI API call via Supabase proxy
const callAI = async (prompt: string): Promise<string> => {
  const response = await fetch(SUPABASE_EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.content;
};

// Tool definitions
interface Tool { id: string; name: string; icon: React.ElementType; description: string; placeholder: string; promptTemplate: (input: string) => string; }
const tools: Tool[] = [
  { id: 'appeal', name: 'Garena Appeal', icon: Shield, description: 'Write professional appeals to Garena for account bans, suspensions, or issues', placeholder: 'Describe your issue: account banned, lost items, payment problem, etc. Include your player ID if possible.', promptTemplate: (i) => `You are a professional gaming appeal writer for Garena Free Fire. Write a formal, respectful appeal email to Garena support about: ${i}. Make it professional, concise, and persuasive. Include a subject line and proper email format. Keep it under 300 words.` },
  { id: 'bugfix', name: 'Bug Fix Help', icon: Bug, description: 'Get help with Free Fire bugs, crashes, lag, and technical issues', placeholder: 'Describe the bug: black screen, login error, game crash, lag, graphics glitch, etc.', promptTemplate: (i) => `You are a Free Fire technical support expert. The user reports: ${i}. Provide step-by-step troubleshooting solutions for this Free Fire bug. Include device-specific tips if mentioned. Format with clear steps and bullet points. Keep it practical and actionable.` },
  { id: 'loadout', name: 'Loadout Maker', icon: Crosshair, description: 'Get optimal weapon and item loadout recommendations for different modes', placeholder: 'What mode are you playing? (CS ranked, BR, Clash Squad, Lone Wolf) and your playstyle (rusher, sniper, support)?', promptTemplate: (i) => `You are a Free Fire loadout expert. The user wants a loadout for: ${i}. Recommend the best weapons, attachments, characters, pets, and items. Explain why each choice is optimal. Format with clear sections: Primary, Secondary, Characters, Pets, Items. Keep it concise but detailed.` },
  { id: 'combo', name: 'Character Combo', icon: Users, description: 'Find the best character skill combinations for your playstyle', placeholder: 'Your playstyle and mode? (e.g. aggressive BR rusher, defensive CS player, solo vs squad)', promptTemplate: (i) => `You are a Free Fire character combination expert. The user's playstyle: ${i}. Recommend the optimal 4-character skill combo (active + 3 passive). Explain each skill synergy and why this combo works. Include alternative options. Format with character names, skill descriptions, and synergy explanation.` },
  { id: 'hacker', name: 'Hacker Analyzer', icon: Eye, description: 'Analyze suspicious gameplay and identify potential hacking patterns', placeholder: 'Describe what happened: headshot accuracy, wall-bang behavior, movement patterns, or any suspicious activity you witnessed', promptTemplate: (i) => `You are a Free Fire anti-cheat analyst. The user reports suspicious behavior: ${i}. Analyze if this could be hacking, lag, or skill. Provide: 1) Assessment (likely hack/lag/skill), 2) Evidence indicators, 3) What to look for, 4) How to report it properly to Garena. Be objective and fair.` },
  { id: 'strategy', name: 'In-Game Strategy', icon: Swords, description: 'Get tactical strategies for different game modes and situations', placeholder: 'What situation? (e.g. last zone 1v3 in BR, defending bombsite in CS, pushing rank in Clash Squad)', promptTemplate: (i) => `You are a Free Fire strategy coach. The user needs help with: ${i}. Provide detailed tactical strategy including positioning, timing, character skills usage, rotation tips, and key decisions. Format with: Strategy Overview, Step-by-step Execution, Pro Tips. Keep it actionable.` },
  { id: 'diamond', name: 'Diamond Estimate', icon: Gem, description: 'Estimate diamond costs for items, events, and bundles in Free Fire', placeholder: 'What do you want to buy? (e.g. elite pass, character bundle, gun skin, pet, event rewards)', promptTemplate: (i) => `You are a Free Fire diamond cost analyst. The user wants to know the diamond cost for: ${i}. Provide an estimated diamond cost range based on typical Free Fire pricing. Include: 1) Estimated cost in diamonds, 2) Real money equivalent (USD/PKR), 3) Best value tips, 4) Alternative ways to get it. Note: prices may vary by region and events.` },
];

// Logo
const Logo = ({ size = 'normal' }: { size?: 'normal' | 'large' | 'small' }) => {
  const s = size === 'large' ? 'w-14 h-14' : size === 'small' ? 'w-9 h-9' : 'w-11 h-11';
  const ts = size === 'large' ? 'text-3xl' : size === 'small' ? 'text-lg' : 'text-xl';
  return (
    <div className="flex items-center gap-3">
      <img src={LOGO_URL} alt="Gaming Futur" className={`${s} rounded-xl object-cover`} />
      <div>
        <span className={`font-bold tracking-tight ${ts} bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent`}>GAMING FUTUR</span>
        {!size.includes('small') && <span className="block text-[10px] text-orange-500 font-semibold tracking-widest uppercase">Free Fire Assistant</span>}
      </div>
    </div>
  );
};

// Theme Toggle
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className={`relative w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}>
      <motion.div animate={{ x: theme === 'dark' ? 24 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
        {theme === 'dark' ? <Moon className="w-2.5 h-2.5 text-white" /> : <Sun className="w-2.5 h-2.5 text-white" />}
      </motion.div>
    </button>
  );
};

// Navbar
const Navbar = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme } = useTheme();
  useState(() => { const f = () => setScrolled(window.scrollY > 50); window.addEventListener('scroll', f); return () => window.removeEventListener('scroll', f); });
  return (
    <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? (theme === 'dark' ? 'bg-slate-900/95 backdrop-blur-md border-b border-slate-800' : 'bg-white/95 backdrop-blur-md border-b border-slate-200') : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Logo />
          <div className="hidden lg:flex items-center gap-8">
            {['Home', 'Tools', 'About'].map(l => <a key={l} href={`#${l.toLowerCase()}`} className={`text-sm font-semibold transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-orange-400' : 'text-slate-600 hover:text-orange-500'}`}>{l}</a>)}
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <ThemeToggle />
            <button onClick={onGetStarted} className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-full hover:opacity-90 transition-opacity">Get Started</button>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className={`lg:hidden p-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
        </div>
      </div>
      <AnimatePresence>{mobileOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`lg:hidden border-b ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="px-6 py-6 space-y-4">
            {['Home', 'Tools', 'About'].map(l => <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMobileOpen(false)} className={`block text-lg font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{l}</a>)}
            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-3"><span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Theme</span><ThemeToggle /></div>
              <button onClick={() => { onGetStarted(); setMobileOpen(false); }} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-full">Get Started</button>
            </div>
          </div>
        </motion.div>
      )}</AnimatePresence>
    </motion.nav>
  );
};

// Hero
const Hero = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const { theme } = useTheme();
  return (
    <section ref={ref} id="home" className={`relative min-h-screen flex items-center justify-center pt-20 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-gradient-to-b from-slate-900 via-orange-950/20 to-slate-900' : 'bg-gradient-to-b from-slate-50 via-orange-50/50 to-slate-50'}`} />
      <motion.div style={{ y, opacity }} className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="text-center max-w-4xl mx-auto">
          <motion.div variants={fadeInUp} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 ${theme === 'dark' ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-orange-100 border border-orange-300'}`}>
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-500">Powered by AI • Built for Free Fire</span>
          </motion.div>
          <motion.h1 variants={fadeInUp} className={`text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Your Ultimate <span className="block bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Free Fire Assistant</span>
          </motion.h1>
          <motion.p variants={fadeInUp} className={`text-xl max-w-2xl mx-auto mb-10 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            AI-powered tools for Garena appeals, loadouts, character combos, strategy, bug fixes, hacker analysis & diamond estimates.
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onGetStarted} className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-full hover:opacity-90 transition-opacity flex items-center gap-2">Explore Tools <ArrowRight className="w-5 h-5" /></button>
            <a href="#about" className={`px-8 py-4 font-semibold rounded-full flex items-center gap-2 border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}><Zap className="w-5 h-5" /> How It Works</a>
          </motion.div>
          <motion.div variants={fadeInUp} className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[{ v: '7', l: 'AI Tools' }, { v: '100%', l: 'Free to Use' }, { v: 'Real-time', l: 'AI Responses' }, { v: 'FF Meta', l: 'Updated' }].map((s, i) => (
              <div key={i} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className="text-2xl font-bold text-orange-500">{s.v}</p><p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{s.l}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

// Tool Card
const ToolCard = ({ tool, onSelect, index }: { tool: Tool; onSelect: (t: Tool) => void; index: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const { theme } = useTheme();
  return (
    <motion.button ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: index * 0.08 }} onClick={() => onSelect(tool)} className={`p-6 rounded-2xl text-left transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-slate-800 border border-slate-700 hover:border-orange-500/50' : 'bg-white border border-slate-200 hover:border-orange-400'}`}>
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4">
        <tool.icon className="w-7 h-7 text-white" />
      </div>
      <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tool.name}</h3>
      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{tool.description}</p>
      <div className="mt-4 flex items-center gap-1 text-orange-500 text-sm font-semibold">Open <ArrowRight className="w-4 h-4" /></div>
    </motion.button>
  );
};

// Tools Section
const ToolsSection = ({ onSelect }: { onSelect: (t: Tool) => void }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const { theme } = useTheme();
  return (
    <section ref={ref} id="tools" className={`py-24 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-4 py-2 rounded-full bg-orange-500/10 text-orange-500 text-sm font-semibold mb-4">AI Tools</span>
          <h2 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Choose Your Tool</h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Select a tool to get AI-powered assistance for Free Fire</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((t, i) => <ToolCard key={t.id} tool={t} onSelect={onSelect} index={i} />)}
        </div>
      </div>
    </section>
  );
};

// Tool Detail (AI Chat Interface)
const ToolDetail = ({ tool, onBack }: { tool: Tool; onBack: () => void }) => {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setResponse('');
    try {
      const result = await callAI(tool.promptTemplate(input));
      setResponse(result);
    } catch (e) {
      setError('Failed to get response. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className={`min-h-screen pt-24 pb-12 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <button onClick={onBack} className={`flex items-center gap-2 mb-6 transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}><ChevronLeft className="w-5 h-5" /> Back to Tools</button>
        <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} className={`rounded-2xl p-8 ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center"><tool.icon className="w-8 h-8 text-white" /></div>
            <div><h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tool.name}</h1><p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>{tool.description}</p></div>
          </div>
          {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400"><AlertCircle className="w-5 h-5" /> {error}</div>}
          <div className="mb-6">
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Your Input</label>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={tool.placeholder} rows={4} className={`w-full p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 ${theme === 'dark' ? 'bg-slate-900 border border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'}`} />
            <button onClick={handleSubmit} disabled={loading || !input.trim()} className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Send className="w-5 h-5" /> Get AI Response</>}
            </button>
          </div>
          {response && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div><span className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>AI Response</span></div>
              <div className={`whitespace-pre-wrap text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{response}</div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// About Section
const About = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const { theme } = useTheme();
  return (
    <section ref={ref} id="about" className={`py-24 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center">
          <span className="inline-block px-4 py-2 rounded-full bg-orange-500/10 text-orange-500 text-sm font-semibold mb-4">How It Works</span>
          <h2 className={`text-4xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>AI-Powered Free Fire Assistance</h2>
          <p className={`text-lg mb-12 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Gaming Futur uses advanced AI to help you with every aspect of Free Fire — from writing appeals to Garena to optimizing your loadouts and strategies.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{ icon: Crosshair, t: 'Choose a Tool', d: 'Pick from 7 specialized Free Fire tools' }, { icon: Send, t: 'Describe Your Need', d: 'Enter details about your situation or question' }, { icon: Zap, t: 'Get AI Response', d: 'Receive instant, detailed AI-powered guidance' }].map((s, i) => (
              <div key={i} className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4"><s.icon className="w-6 h-6 text-white" /></div>
                <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{s.t}</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{s.d}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Footer

// Adsterra Side Banner Ad
const AdBanner = () => {
  const adRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!adRef.current) return;
    adRef.current.innerHTML = '';
    const atOptions = { key: '9209657e6f2eec939e0b302819ffed9d', format: 'iframe', height: 250, width: 300, params: {} };
    const s1 = document.createElement('script');
    s1.type = 'text/javascript';
    s1.text = `atOptions = ${JSON.stringify(atOptions)};`;
    const s2 = document.createElement('script');
    s2.type = 'text/javascript';
    s2.src = `https://www.highperformanceformat.com/${atOptions.key}/invoke.js`;
    adRef.current.appendChild(s1);
    adRef.current.appendChild(s2);
  }, []);
  const { theme } = useTheme();
  return (
    <div className={`hidden lg:block fixed right-4 top-1/2 -translate-y-1/2 z-40 p-2 rounded-xl ${theme === 'dark' ? 'bg-slate-800/90 border border-slate-700' : 'bg-white/90 border border-slate-200'} backdrop-blur-sm`} style={{ width: '310px' }}>
      <div ref={adRef} className="flex justify-center" style={{ minHeight: '250px', minWidth: '300px' }} />
      <span className={`block text-center text-[10px] mt-1 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>Advertisement</span>
    </div>
  );
};

const Footer = () => {
  const { theme } = useTheme();
  return (
    <footer className={`py-12 border-t ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="small" />
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>AI-powered Free Fire assistant. Not affiliated with Garena.</p>
        </div>
      </div>
    </footer>
  );
};

// Main App
export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => { try { return (localStorage.getItem('gfTheme') as 'dark' | 'light') || 'dark'; } catch { return 'dark'; } });
  const toggleTheme = () => setTheme(p => { const n = p === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('gfTheme', n); } catch {} return n; });
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === 'dark' ? 'dark' : ''}>
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <Navbar onGetStarted={() => scrollTo('tools')} />
          <AdBanner />
          {selectedTool ? <ToolDetail tool={selectedTool} onBack={() => setSelectedTool(null)} /> : (
            <>
              <Hero onGetStarted={() => scrollTo('tools')} />
              <ToolsSection onSelect={setSelectedTool} />
              <About />
            </>
          )}
          <Footer />
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

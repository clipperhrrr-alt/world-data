import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, Variants } from 'framer-motion';
import {
  Globe, Shield, Menu, X, ArrowRight,
  Gamepad2, Newspaper, Brain, Sparkles, Play, Search,
  Server, AlertTriangle, Sun, Moon, Cpu, Rocket,
  RefreshCw, Loader2, Bot, Flame, Bookmark, Zap,
  ChevronLeft, Radio, Satellite, Send, AlertCircle, ExternalLink, TrendingUp
} from 'lucide-react';

// Theme Context
interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => {} });
const useTheme = () => useContext(ThemeContext);

// Types
interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  source: string;
  publishedAt: string;
  tags: string[];
  imageUrl: string;
  sourceUrl: string;
  imageSearchUrl: string;
}

interface SearchResult {
  query: string;
  content: string;
  timestamp: string;
}

// Animation Variants
const fadeInUp: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }
};

const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

// AionLabs API Service
const AIONLABS_API_KEY = import.meta.env.VITE_AIONLABS_API_KEY || '';

const generateWithAion = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch('https://api.aionlabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AIONLABS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'aion-labs/aion-2.0',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from AI';
  } catch (error) {
    console.error('AionLabs API Error:', error);
    throw error;
  }
};

// Build article with web pics + info URLs
const buildArticle = (raw: any, category: string, index: number): Article => {
  const title = raw.title || `Latest ${category} update`;
  const encoded = encodeURIComponent(title);
  const seed = encodeURIComponent(`${category}-${index}-${raw.image_query || category}`);
  return {
    id: `${category}-${index}-${Date.now()}`,
    title,
    content: raw.summary || '',
    summary: raw.summary || '',
    category: category.charAt(0).toUpperCase() + category.slice(1),
    source: 'World Data AI',
    publishedAt: 'Just now',
    tags: raw.tags || [category],
    imageUrl: `https://loremflickr.com/800/400/${seed}`,
    sourceUrl: `https://www.google.com/search?q=${encoded}`,
    imageSearchUrl: `https://www.google.com/search?q=${encoded}&tbm=isch`,
  };
};

// Fetch trending data — includes viral/small trends
const fetchCategoryData = async (category: string): Promise<Article[]> => {
  const prompts: Record<string, string> = {
    gaming: `Provide the latest trending gaming news. Include viral clips, esports tournaments, new game releases, Twitch/YouTube gaming highlights, and even small but trending gaming moments from social media. Format as JSON array with 3 articles. Each: title, summary (2-3 sentences), tags (2-3 keywords), image_query (1-2 words). Return ONLY valid JSON: [{"title":"...","summary":"...","tags":["..."],"image_query":"..."}]`,
    ai: `Provide latest AI and LLM news. Include new model releases, viral AI demos, OpenAI/Google/Anthropic updates, AI research breakthroughs, and trending AI social media content. Format as JSON array with 3 articles. Each: title, summary, tags, image_query. Return ONLY valid JSON.`,
    tech: `Provide latest technology news. Include gadget releases, viral tech moments, Silicon Valley updates, Elon Musk news, startup funding, and trending tech social media content. Format as JSON array with 3 articles. Each: title, summary, tags, image_query. Return ONLY valid JSON.`,
    apis: `Provide latest API and developer tools news. Include new APIs, REST/GraphQL updates, SDK releases, coding best practices, viral dev content, and trending programming topics. Format as JSON array with 3 articles. Each: title, summary, tags, image_query. Return ONLY valid JSON.`,
    conflicts: `Provide latest global conflicts and geopolitical news. Include international relations, security updates, diplomatic news, regional conflicts, peace talks. Keep it factual and neutral. Format as JSON array with 3 articles. Each: title, summary, tags, image_query. Return ONLY valid JSON.`,
    news: `Provide latest breaking news worldwide. Include viral social media trends from TikTok/Instagram/YouTube, trending topics, small but trending stories, major world events, politics, economics, science. Format as JSON array with 3 articles. Each: title, summary, tags, image_query. Return ONLY valid JSON.`,
    trending: `Provide the most trending topics right now across all platforms. Include viral TikTok trends, Instagram reel trends, YouTube trending, Twitter/X hot topics, memes, pop culture, and even small but rapidly trending stories. Format as JSON array with 3 articles. Each: title, summary, tags, image_query. Return ONLY valid JSON.`,
  };

  try {
    const prompt = prompts[category] || prompts.news;
    const response = await generateWithAion(prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const articles = JSON.parse(jsonMatch[0]);
      return articles.map((a: any, i: number) => buildArticle(a, category, i));
    }
    return [buildArticle({ title: `Latest ${category} updates`, summary: response.slice(0, 200) }, category, 0)];
  } catch (error) {
    console.error('Error fetching category data:', error);
    return [];
  }
};

// Search with AionLabs AI
const searchWithAI = async (query: string, category: string): Promise<string> => {
  const prompt = `You are a knowledgeable AI assistant. Provide a comprehensive, well-structured answer about "${query}" in the context of ${category}.\n\nInclude:\n- Key facts and figures\n- Recent developments\n- Important context\n- Future implications\n- Relevant source URLs where users can read more\n\nFormat with clear headings and bullet points where appropriate. Be informative but concise (300-500 words).`;
  return await generateWithAion(prompt);
};

// Bookmark helpers — localStorage
const getSaved = (): Article[] => {
  try { return JSON.parse(localStorage.getItem('worldDataSaved') || '[]'); } catch { return []; }
};
const setSaved = (articles: Article[]) => localStorage.setItem('worldDataSaved', JSON.stringify(articles));

// Logo Component
const Logo = ({ size = 'normal' }: { size?: 'small' | 'normal' | 'large' }) => {
  const isLarge = size === 'large';
  const isSmall = size === 'small';
  return (
    <div className="flex items-center gap-3">
      <div className={`${isLarge ? 'w-14 h-14' : isSmall ? 'w-9 h-9' : 'w-11 h-11'} rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center`}>
        <Globe className={`${isLarge ? 'w-8 h-8' : isSmall ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
      </div>
      <div>
        <span className={`font-bold tracking-tight ${isLarge ? 'text-3xl' : isSmall ? 'text-lg' : 'text-xl'} bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent`}>WORLD DATA</span>
        {!isSmall && <span className="block text-[10px] text-cyan-500 font-semibold tracking-widest uppercase">Global Intelligence</span>}
      </div>
    </div>
  );
};

// Theme Toggle
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className={`relative w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}>
      <motion.div animate={{ x: theme === 'dark' ? 24 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center">
        {theme === 'dark' ? <Moon className="w-2.5 h-2.5 text-white" /> : <Sun className="w-2.5 h-2.5 text-white" />}
      </motion.div>
    </button>
  );
};

// Navbar
const Navbar = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav initial={{ y: -100 }} animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? (theme === 'dark' ? 'bg-slate-900/95 backdrop-blur-md border-b border-slate-800' : 'bg-white/95 backdrop-blur-md border-b border-slate-200') : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Logo />
          <div className="hidden lg:flex items-center gap-8">
            {['Home', 'Categories', 'Dashboard', 'About'].map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} className={`text-sm font-semibold transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-600 hover:text-blue-500'}`}>{link}</a>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <ThemeToggle />
            <button onClick={onGetStarted} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-sm font-semibold rounded-full hover:opacity-90 transition-opacity">Get Started</button>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`lg:hidden p-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`lg:hidden border-b ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="px-6 py-6 space-y-4">
              {['Home', 'Categories', 'Dashboard', 'About'].map((link) => (
                <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setIsMobileMenuOpen(false)} className={`block text-lg font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{link}</a>
              ))}
              <div className="pt-4 space-y-3">
                <div className="flex items-center gap-3"><span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Theme</span><ThemeToggle /></div>
                <button onClick={() => { onGetStarted(); setIsMobileMenuOpen(false); }} className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-full">Get Started</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

// Hero — "Watch Demo" scrolls to dashboard
const Hero = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const { theme } = useTheme();
  const scrollToDashboard = () => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section ref={ref} id="home" className={`relative min-h-screen flex items-center justify-center pt-20 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-gradient-to-b from-slate-900 via-blue-950/20 to-slate-900' : 'bg-gradient-to-b from-slate-50 via-blue-50/50 to-slate-50'}`} />
      <motion.div style={{ y, opacity }} className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="text-center max-w-4xl mx-auto">
          <motion.div variants={fadeInUp} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 ${theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-100 border border-blue-300'}`}>
            <Sparkles className="w-4 h-4 text-blue-500" /><span className="text-sm font-semibold text-blue-500">Powered by AionLabs AI</span>
          </motion.div>
          <motion.h1 variants={fadeInUp} className={`text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Your Gateway to <span className="block bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">Global Intelligence</span>
          </motion.h1>
          <motion.p variants={fadeInUp} className={`text-xl max-w-2xl mx-auto mb-10 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Real-time data on Gaming, AI, APIs, Global Conflicts, Tech News & Viral Trends. Curated by advanced AI for professionals.
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onGetStarted} className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-full hover:opacity-90 transition-opacity flex items-center gap-2">Explore Categories <ArrowRight className="w-5 h-5" /></button>
            <button onClick={scrollToDashboard} className={`px-8 py-4 font-semibold rounded-full flex items-center gap-2 border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}><Play className="w-5 h-5" /> Watch Demo</button>
          </motion.div>
          <motion.div variants={fadeInUp} className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "AI-Powered", label: "Data Analysis", icon: Brain },
              { value: "Real-Time", label: "Updates", icon: Radio },
              { value: "Global", label: "Coverage", icon: Globe },
              { value: "Viral", label: "Trending Now", icon: TrendingUp },
            ].map((stat, i) => (
              <div key={i} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold text-blue-500">{stat.value}</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

// Categories
const Categories = ({ onSelect }: { onSelect: (category: Category) => void }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { theme } = useTheme();

  const categories: Category[] = [
    { id: 'gaming', name: 'Gaming', icon: Gamepad2, description: 'Latest games, esports, viral clips, Twitch highlights' },
    { id: 'ai', name: 'AI & LLMs', icon: Brain, description: 'AI models, research, viral AI demos, breakthroughs' },
    { id: 'tech', name: 'Technology', icon: Cpu, description: 'Gadgets, startups, Elon Musk, viral tech moments' },
    { id: 'apis', name: 'APIs & Dev', icon: Server, description: 'Developer tools, APIs, coding trends, viral dev content' },
    { id: 'conflicts', name: 'Global Affairs', icon: AlertTriangle, description: 'Geopolitics, conflicts, diplomatic news, peace talks' },
    { id: 'news', name: 'Breaking News', icon: Newspaper, description: 'Worldwide news, viral trends, TikTok/IG/YouTube trending' },
  ];

  return (
    <section ref={ref} id="categories" className={`py-24 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 text-sm font-semibold mb-4">Explore Topics</span>
          <h2 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Choose Your Interest</h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Select a category to get AI-powered insights and real-time updates</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, i) => (
            <motion.button key={category.id} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1 }}
              onClick={() => onSelect(category)}
              className={`p-6 rounded-2xl text-left transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-slate-800 border border-slate-700 hover:border-blue-500/50' : 'bg-white border border-slate-200 hover:border-blue-400'}`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-4"><category.icon className="w-6 h-6 text-white" /></div>
              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{category.name}</h3>
              <p className={`mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{category.description}</p>
              <span className="text-blue-500 font-semibold text-sm flex items-center gap-1">Explore <ArrowRight className="w-4 h-4" /></span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

// Article Card — shared component with image, bookmark, web links
const ArticleCard = ({ article, isSaved, onBookmark }: { article: Article; isSaved: boolean; onBookmark: (a: Article) => void }) => {
  const { theme } = useTheme();
  return (
    <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
      <div className="relative h-40 overflow-hidden bg-slate-700">
        <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold ${theme === 'dark' ? 'bg-slate-900/80 text-slate-200' : 'bg-white/80 text-slate-700'}`}>{article.category}</span>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{article.publishedAt}</span>
          <button onClick={() => onBookmark(article)} className={`transition-colors ${isSaved ? 'text-blue-500' : theme === 'dark' ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}>
            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{article.title}</h3>
        <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{article.summary}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {article.tags.map((tag) => (
            <span key={tag} className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>#{tag}</span>
          ))}
        </div>
        <div className="flex items-center gap-4 pt-3 border-t border-slate-700/50">
          <a href={article.imageSearchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400"><ExternalLink className="w-3 h-3" /> Web Pics</a>
          <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400"><ExternalLink className="w-3 h-3" /> Read More</a>
          <span className={`flex items-center gap-1 text-xs ml-auto ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}><Bot className="w-3 h-3" /> AI</span>
        </div>
      </div>
    </motion.article>
  );
};

// Dashboard with Real API Data + Saved tab
const Dashboard = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('trending');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Article[]>([]);
  const [savedVersion, setSavedVersion] = useState(0);

  const tabs = [
    { id: 'trending', name: 'Trending', icon: TrendingUp },
    { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
    { id: 'ai', name: 'AI & Tech', icon: Brain },
    { id: 'tech', name: 'Elon/Tech', icon: Rocket },
    { id: 'saved', name: 'Saved', icon: Bookmark },
  ];

  useEffect(() => { setSaved(getSaved()); }, [savedVersion]);

  useEffect(() => {
    if (activeTab === 'saved') { setSaved(getSaved()); return; }
    loadArticles(activeTab === 'trending' ? 'trending' : activeTab === 'tech' ? 'tech' : activeTab);
  }, [activeTab]);

  const loadArticles = async (category: string) => {
    if (!AIONLABS_API_KEY) { setError('Add VITE_AIONLABS_API_KEY to your .env file'); return; }
    setLoading(true); setError('');
    try { setArticles(await fetchCategoryData(category)); }
    catch { setError('Failed to load data. Check your API key.'); }
    finally { setLoading(false); }
  };

  const handleBookmark = (article: Article) => {
    const current = getSaved();
    const exists = current.find(a => a.id === article.id);
    setSaved(exists ? current.filter(a => a.id !== article.id) : [...current, article]);
    setSavedVersion(v => v + 1);
  };

  const isArticleSaved = (id: string) => saved.some(a => a.id === id);
  const displayArticles = activeTab === 'saved' ? saved : articles;

  return (
    <section ref={ref} id="dashboard" className={`py-24 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-sm font-semibold mb-4"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live Updates</span>
              <h2 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Recommended For You</h2>
            </div>
            {activeTab !== 'saved' && (
              <button onClick={() => loadArticles(activeTab === 'trending' ? 'trending' : activeTab)} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            )}
          </div>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400"><AlertCircle className="w-5 h-5" /> {error}</div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white' : theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              <tab.icon className="w-4 h-4" /> {tab.name}
              {tab.id === 'saved' && saved.length > 0 && <span className="ml-1 text-xs bg-blue-500 text-white px-1.5 rounded-full">{saved.length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /><span className="ml-3 text-slate-400">Loading fresh data...</span></div>
        ) : displayArticles.length === 0 ? (
          <div className="text-center py-20"><p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>{activeTab === 'saved' ? 'No saved articles yet. Bookmark articles to see them here.' : 'No articles found. Try refreshing.'}</p></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayArticles.map((article) => (<ArticleCard key={article.id} article={article} isSaved={isArticleSaved(article.id)} onBookmark={handleBookmark} />))}
          </div>
        )}
      </div>
    </section>
  );
};

// Category Detail with Working Search
const CategoryDetail = ({ category, onBack }: { category: Category; onBack: () => void }) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Article[]>([]);
  const [savedVersion, setSavedVersion] = useState(0);

  useEffect(() => { setSaved(getSaved()); }, [savedVersion]);
  useEffect(() => { loadCategoryArticles(); }, [category]);

  const loadCategoryArticles = async () => {
    if (!AIONLABS_API_KEY) { setError('Add VITE_AIONLABS_API_KEY to your .env file'); return; }
    setLoading(true); setError('');
    try { setArticles(await fetchCategoryData(category.id)); }
    catch { setError('Failed to load articles. Check your API key.'); }
    finally { setLoading(false); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !AIONLABS_API_KEY) return;
    setIsSearching(true); setError('');
    try {
      const result = await searchWithAI(searchQuery, category.name);
      setSearchResult({ query: searchQuery, content: result, timestamp: new Date().toLocaleTimeString() });
    } catch { setError('Search failed. Check your API key.'); }
    finally { setIsSearching(false); }
  };

  const handleBookmark = (article: Article) => {
    const current = getSaved();
    const exists = current.find(a => a.id === article.id);
    setSaved(exists ? current.filter(a => a.id !== article.id) : [...current, article]);
    setSavedVersion(v => v + 1);
  };

  const isArticleSaved = (id: string) => saved.some(a => a.id === id);

  return (
    <div className={`min-h-screen pt-24 pb-12 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <button onClick={onBack} className={`flex items-center gap-2 mb-6 transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}><ChevronLeft className="w-5 h-5" /> Back to Categories</button>
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center"><category.icon className="w-8 h-8 text-white" /></div>
          <div>
            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{category.name}</h1>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>{category.description}</p>
          </div>
        </div>

        {error && (<div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400"><AlertCircle className="w-5 h-5" /> {error}</div>)}

        <div className={`relative max-w-3xl mb-10 p-2 rounded-2xl flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
          <Search className={`w-5 h-5 ml-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={`Ask anything about ${category.name}...`} className={`flex-1 bg-transparent px-3 py-3 outline-none ${theme === 'dark' ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`} />
          <button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{isSearching ? 'Searching...' : 'Ask AI'}
          </button>
        </div>

        {searchResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`mb-10 p-6 rounded-2xl ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-4"><Bot className="w-6 h-6 text-blue-500" /><h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>AI Response</h3><span className="text-xs text-slate-500">{searchResult.timestamp}</span></div>
            <div className={`whitespace-pre-wrap leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{searchResult.content}</div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/50">
              <a href={`https://www.google.com/search?q=${encodeURIComponent(searchResult.query)}&tbm=isch`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400"><ExternalLink className="w-3 h-3" /> Web Pics</a>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(searchResult.query)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400"><ExternalLink className="w-3 h-3" /> Read More</a>
            </div>
          </motion.div>
        )}

        <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Latest Articles</h2>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /><span className="ml-3 text-slate-400">Loading articles...</span></div>
        ) : articles.length === 0 ? (
          <p className={theme === 'dark' ? 'text-slate-400 text-center py-20' : 'text-slate-600 text-center py-20'}>No articles found.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (<ArticleCard key={article.id} article={article} isSaved={isArticleSaved(article.id)} onBookmark={handleBookmark} />))}
          </div>
        )}
      </div>
    </div>
  );
};

// About Us
const AboutUs = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { theme } = useTheme();

  return (
    <section ref={ref} id="about" className={`py-24 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} animate={isInView ? { opacity: 1, x: 0 } : {}}>
            <span className="inline-block px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 text-sm font-semibold mb-4">About Us</span>
            <h2 className={`text-4xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Building the Future of <span className="text-blue-500">Information</span></h2>
            <p className={`mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              World Data leverages AionLabs AI to deliver real-time, intelligent insights across gaming, technology, global affairs, viral trends, and more. Our mission is to democratize access to information through advanced AI curation — from major world events to the smallest trending reel.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}><p className="text-3xl font-bold text-blue-500">AionLabs</p><p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>AI Powered</p></div>
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}><p className="text-3xl font-bold text-blue-500">Real-Time</p><p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Live Data Updates</p></div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 40 }} animate={isInView ? { opacity: 1, x: 0 } : {}} className="grid grid-cols-2 gap-4">
            {[
              { icon: Zap, title: 'Lightning Fast', desc: 'Sub-second response times' },
              { icon: Brain, title: 'AI Powered', desc: 'AionLabs Aion 2.0 integration' },
              { icon: Globe, title: 'Global Reach', desc: 'Worldwide data coverage' },
              { icon: Shield, title: 'Secure', desc: 'Enterprise-grade security' },
            ].map((item, i) => (
              <div key={i} className={`p-5 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                <item.icon className="w-8 h-8 text-blue-500 mb-3" /><h3 className={`font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.title}</h3><p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Terms/Privacy Modal
const TermsModal = ({ isOpen, onClose, title = 'Terms & Conditions' }: { isOpen: boolean; onClose: () => void; title?: string }) => {
  const { theme } = useTheme();
  if (!isOpen) return null;
  const isPrivacy = title.includes('Privacy');

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-8 ${theme === 'dark' ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700/50"><X className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} /></button>
          <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
          <div className={`space-y-4 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            {isPrivacy ? (
              <>
                <section><h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>1. Data Collection</h3><p>We do not store your search queries permanently. All searches are processed through AionLabs API in real-time.</p></section>
                <section><h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>2. Bookmarks</h3><p>Saved articles are stored locally in your browser via localStorage. They never leave your device.</p></section>
                <section><h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>3. Third-Party Services</h3><p>Content is generated by AionLabs AI. Images are served by loremflickr. Please review their respective privacy policies.</p></section>
                <section><h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>4. Cookies</h3><p>We use localStorage for theme preference and saved articles. No tracking cookies are used.</p></section>
              </>
            ) : (
              <>
                <section><h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>1. Acceptance</h3><p>By using World Data, you agree to these terms. We reserve the right to modify them at any time.</p></section>
                <section><h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>2. AI-Generated Content</h3><p>All content is generated using AionLabs AI. While we strive for accuracy, AI-generated content should be verified independently.</p></section>
                <section><h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>3. API Usage</h3><p>Your use of our AionLabs API integration is subject to AionLabs Terms of Service.</p></section>
                <section><h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>4. External Links</h3><p>Article source links redirect to Google Search and Google Images. We are not responsible for third-party content.</p></section>
                <section><h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>5. Limitations</h3><p>World Data is provided "as is" without warranties. We are not liable for any damages arising from use of the service.</p></section>
              </>
            )}
            <p className={`pt-4 border-t ${theme === 'dark' ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>Last updated: August 2026</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Footer — all links functional
const Footer = ({ onShowTerms, onShowPrivacy }: { onShowTerms: () => void; onShowPrivacy: () => void }) => {
  const { theme } = useTheme();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <footer className={`py-12 border-t ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Logo size="small" />
            <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>AI-powered global intelligence platform.</p>
          </div>
          {[
            { title: 'Product', links: [{ label: 'Categories', action: () => scrollTo('categories') }, { label: 'Dashboard', action: () => scrollTo('dashboard') }, { label: 'API', action: () => window.open('https://www.aionlabs.ai/docs/', '_blank') }] },
            { title: 'Company', links: [{ label: 'About', action: () => scrollTo('about') }, { label: 'Careers', action: () => alert('Coming soon! Send your resume to careers@worlddata.ai') }] },
            { title: 'Legal', links: [{ label: 'Terms', action: onShowTerms }, { label: 'Privacy', action: onShowPrivacy }] },
          ].map((col, i) => (
            <div key={i}>
              <h4 className={`font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}><button onClick={link.action} className={`text-sm transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>{link.label}</button></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={`pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>&copy; 2026 World Data. Powered by AionLabs AI.</p>
        </div>
      </div>
    </footer>
  );
};

// Main App
function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return localStorage.getItem('worldDataTheme') as 'dark' | 'light' || 'dark'; } catch { return 'dark'; }
  });
  const [currentView, setCurrentView] = useState<'home' | 'category'>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const toggleTheme = () => setTheme(prev => {
    const next = prev === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('worldDataTheme', next); } catch {}
    return next;
  });

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Navbar onGetStarted={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })} />
        {currentView === 'home' ? (
          <main>
            <Hero onGetStarted={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })} />
            <Categories onSelect={(cat) => { setSelectedCategory(cat); setCurrentView('category'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            <Dashboard />
            <AboutUs />
          </main>
        ) : selectedCategory ? (
          <CategoryDetail category={selectedCategory} onBack={() => { setCurrentView('home'); setSelectedCategory(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        ) : null}
        <Footer onShowTerms={() => setShowTerms(true)} onShowPrivacy={() => setShowPrivacy(true)} />
        <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Terms & Conditions" />
        <TermsModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy" />
      </div>
    </ThemeContext.Provider>
  );
}

export default App;

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Carpet } from '@/types/carpet';
import { api, getErrorMessage, getImageUrl } from '@/services/api';
import { getToken, getUserFromToken } from '@/services/auth.service';
import { toast } from '@/components/ui/Toast';
import Portal from '@/components/Portal';
import { getPricePerM2 } from '@/utils/size';

interface NikeStyleSliderProps {
  carpets: Carpet[];
}

function getCarpetDisplayName(name?: string): string {
  if (!name) return '';
  const clean = name.trim();
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    const firstTwo = `${words[0]} ${words[1]}`.toLowerCase();
    if (
      firstTwo.startsWith('new luna') ||
      firstTwo.startsWith('touch blue') ||
      firstTwo.startsWith('touch gold') ||
      firstTwo.startsWith('touch white') ||
      firstTwo.startsWith('eron soft') ||
      firstTwo.startsWith('iran soft')
    ) {
      return `${words[0]} ${words[1]}`;
    }
  }
  return words[0] || '';
}

interface SlideTextProps {
  carpet: Carpet;
}

function SlideTextComponent({ carpet }: SlideTextProps) {
  const catName = (carpet.category?.name || carpet.name || '').toLowerCase();
  
  const getStyleProps = (name: string) => {
    if (name.includes('iran soft') || name.includes('eron')) {
      return { 
        title: "Eron originalligi va o'ta qulay mayinlik", 
        desc: "Eron texnologiyasi asosida to'qilgan ushbu kolleksiya o'zining noyob naqshlari va o'ta mayinligi bilan ajralib turadi.",
      };
    }
    if (name.includes('steffani') || name.includes('stefani')) {
      return { 
        title: "Zamonaviy interyer uchun mukammal do'st", 
        desc: "Steffani kolleksiyasi zamonaviy dizayn va sifatni o'zida jamlagan. Xonangizni yorug' va keng ko'rsatib, joziba yaratadi.",
      };
    }
    if (name.includes('verona')) {
      return { 
        title: "Klassik nafislik va takrorlanmas ohang", 
        desc: "Verona gilamlari o'zining boy naqshlari va klassik uslubi bilan ajralib turadi. Katta xonalar uchun eng zo'r tanlov.",
      };
    }
    if (name.includes('akril') || name.includes('acrylic')) {
      return { 
        title: "Yorqin tekstura va mustahkam tola", 
        desc: "Akril gilamlar yorqin ranglarini umuman yo'qotmaydi. Uyingizning har bir burchagida xavfsiz va shinam.",
      };
    }
    return { 
      title: "YEC gilamlari sharqona sifat belgisi", 
      desc: "Toshkent bo'ylab sifatli va premium mahsulotlar ulgurji markazi. Eng zamonaviy gilamlarimiz bilan tanishing.",
    };
  };

  const styleProps = getStyleProps(catName);
  const displayName = getCarpetDisplayName(carpet.name);

  return (
    <>
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest text-white uppercase border border-white/20 rounded-full bg-black/10 backdrop-blur-md shadow-sm">
          {carpet.category?.name || "Eksklyuziv Kolleksiya"}
        </span>
      </div>

      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-sans font-bold tracking-tight text-white leading-[1.4] max-w-[90%] drop-shadow-sm">
        {styleProps.title}
      </h2>
      <p className="mt-4 max-w-md text-sm md:text-base leading-relaxed text-white/90 drop-shadow-sm">
        {styleProps.desc}
      </p>

      {/* Aniq Model nomi, material va Kv.M narxi uchun hudud */}
      <div className="mt-4 pt-4 md:mt-6 md:pt-5 border-t border-white/20 flex flex-col gap-1.5">
        <h3 className="text-xl md:text-2xl font-bold text-white tracking-wide drop-shadow-md">
          {displayName}
        </h3>
        {carpet.material && (
          <p className="text-sm md:text-base text-white/70 font-medium tracking-wide drop-shadow-sm">
            <span className="text-white/50 text-xs uppercase tracking-widest">Material: </span>
            {carpet.material}
          </p>
        )}
        {(() => {
          const catName = (carpet.category?.name || '').toLowerCase();
          const nameLower = (carpet.name || '').toLowerCase();
          const pType = String((carpet as any).productType || '').toLowerCase();
          const isRoll = carpet.type === 'ROLL' || pType === 'metraj';
          const isJoynamoz =
            catName.includes('joynamoz') ||
            nameLower.includes('joynamoz') ||
            pType === 'joynamoz' ||
            pType === 'joy_namoz';

          let displayPrice: string | null = null;
          let isPerM2 = false;

          if (isRoll) {
            displayPrice = carpet.price && carpet.price !== '0' ? String(carpet.price) : null;
            isPerM2 = true;
          } else if (!isJoynamoz) {
            const m2Price = carpet.size ? getPricePerM2(carpet.price || 0, carpet.size) : null;
            if (m2Price && m2Price > 0) {
              displayPrice = String(Math.round(m2Price));
              isPerM2 = true;
            } else {
              displayPrice = carpet.price && carpet.price !== '0' ? String(carpet.price) : null;
              isPerM2 = false;
            }
          } else {
            displayPrice = carpet.price && carpet.price !== '0' ? String(carpet.price) : null;
            isPerM2 = false;
          }
          
          if (!displayPrice || displayPrice === "0") return null;
          
          return (
            <p className="text-[#D4AF37] font-bold text-xl md:text-2xl tracking-tight drop-shadow-md">
              {Number(displayPrice).toLocaleString()} so'm{' '}
              {isPerM2 && <span className="text-xs md:text-sm font-medium text-white/80 lowercase">/ 1 m²</span>}
            </p>
          );
        })()}
      </div>
    </>
  );
}

interface SlideImageProps {
  carpet: Carpet;
  activeImageIndex: number;
}

function SlideImageComponent({ carpet, activeImageIndex }: SlideImageProps) {
  const fallbackImg = '/images/hero-carpet-green.png';
  const imgUrl = carpet?.images?.[activeImageIndex]
    ? (getImageUrl(carpet.images[activeImageIndex]) ?? fallbackImg)
    : fallbackImg;

  return (
    <motion.div 
      animate={{ y: [0, -20, 0] }} 
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="w-full relative flex justify-center items-center rounded-[1.5rem]"
      style={{ willChange: "transform" }}
    >
       <img
         src={imgUrl}
         className="w-full h-auto object-contain max-h-[300px] sm:max-h-[350px] md:max-h-[420px] lg:max-h-[480px] drop-shadow-[0_20px_20px_rgba(0,0,0,0.4)]"
         alt="Featured premium carpet"
       />
       {/* Bellow shadow for depth */}
       <div className="absolute -bottom-8 w-[80%] h-6 bg-black/40 blur-xl rounded-[100%] pointer-events-none" />
    </motion.div>
  );
}

export default function NikeStyleSlider({ carpets }: NikeStyleSliderProps) {
  const [localCarpets, setLocalCarpets] = useState<Carpet[]>(carpets || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bgColors, setBgColors] = useState<Record<number, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  // Edit / Delete State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCarpet, setEditingCarpet] = useState<Carpet | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editMaterial, setEditMaterial] = useState('');
  const [editDesignCode, setEditDesignCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteConfirmItem, setDeleteConfirmItem] = useState<Carpet | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLocalCarpets(carpets || []);
  }, [carpets]);

  // Check Admin Role
  useEffect(() => {
    const checkAdmin = () => {
      const token = getToken();
      if (token) {
        const user = getUserFromToken();
        setIsAdmin(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN');
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
    window.addEventListener('yec-auth-changed', checkAdmin);
    return () => window.removeEventListener('yec-auth-changed', checkAdmin);
  }, []);

  // Auto-play
  useEffect(() => {
    if (!localCarpets || localCarpets.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % localCarpets.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [localCarpets]);

  const safeCarpets = localCarpets && localCarpets.length > 0 ? localCarpets : [];
  const currentCarpet = safeCarpets[currentIndex];
  
  // Random image selection within the current carpet's gallery
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  useEffect(() => {
    if (currentCarpet?.images?.length > 1) {
      const newIndex = Math.floor(Math.random() * currentCarpet.images.length);
      setActiveImageIndex(newIndex);
    } else {
      setActiveImageIndex(0);
    }
  }, [currentIndex, currentCarpet]);

  const fallbackImg = '/images/hero-carpet-green.png'; 
  const currentImgUrl = currentCarpet?.images?.[activeImageIndex] 
    ? (getImageUrl(currentCarpet.images[activeImageIndex]) ?? fallbackImg)
    : fallbackImg;

  const catName = (currentCarpet?.category?.name || currentCarpet?.name || '').toLowerCase();

  const getStyleProps = (name: string) => {
    if (name.includes('iran soft') || name.includes('eron')) {
      return { fallbackBg: "rgb(122, 46, 46)" };
    }
    if (name.includes('steffani') || name.includes('stefani')) {
      return { fallbackBg: "rgb(75, 62, 106)" };
    }
    if (name.includes('verona')) {
      return { fallbackBg: "rgb(166, 91, 46)" };
    }
    if (name.includes('akril') || name.includes('acrylic')) {
      return { fallbackBg: "rgb(37, 92, 105)" };
    }
    return { fallbackBg: "rgb(30, 58, 95)" };
  };

  const styleProps = getStyleProps(catName);

  // Background color extraction
  useEffect(() => {
    if (!currentImgUrl) return;
    if (bgColors[currentIndex]) return;

    const img = new window.Image();
    img.crossOrigin = "Anonymous"; 
    img.src = currentImgUrl;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = 64;
        canvas.height = 64;
        context.drawImage(img, 0, 0, 64, 64);
        const data = context.getImageData(0, 0, 64, 64).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 16) { 
          if(data[i+3] > 128) { 
            const avg = (data[i] + data[i+1] + data[i+2]) / 3;
            if(avg > 30 && avg < 240) { 
              r += data[i];
              g += data[i+1];
              b += data[i+2];
              count++;
            }
          }
        }
        
        if (count > 0) {
          const finalR = Math.floor((r / count) * 0.65);
          const finalG = Math.floor((g / count) * 0.65);
          const finalB = Math.floor((b / count) * 0.65);
          setBgColors(prev => ({ ...prev, [currentIndex]: `rgb(${finalR}, ${finalG}, ${finalB})` }));
        }
      } catch (e) {
        // Fallback
      }
    };
  }, [currentImgUrl, currentIndex, bgColors]);

  const activeColor = bgColors[currentIndex] || styleProps.fallbackBg;

  // Open Edit Modal
  const openEditModal = (carpet?: Carpet) => {
    if (!carpet) return;
    setEditingCarpet(carpet);
    setEditName(carpet.name || '');
    setEditPrice(carpet.price ? String(carpet.price) : '');
    setEditMaterial(carpet.material || '');
    setEditDesignCode(carpet.designCode || carpet.patternCode || '');
    setEditDescription(carpet.description || '');
    setEditImageUrl(carpet.images?.[0] || '');
    setIsEditModalOpen(true);
  };

  // Save Edit Form
  const handleSaveHeroItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCarpet) return;
    try {
      setSaving(true);
      const payload = {
        name: editName.trim(),
        price: editPrice ? Number(editPrice) : undefined,
        material: editMaterial.trim() || undefined,
        designCode: editDesignCode.trim() || undefined,
        patternCode: editDesignCode.trim() || undefined,
        description: editDescription.trim() ? editDescription.trim() : '[HERO]',
        images: editImageUrl.trim() ? [editImageUrl.trim()] : editingCarpet.images,
      };

      const { data } = await api.patch(`/carpets/${editingCarpet.id}`, payload, { skipToast: true });
      toast.success("Hero slayder mahsuloti muvaffaqiyatli yangilandi!");

      setLocalCarpets((prev) =>
        prev.map((item) => (item.id === editingCarpet.id ? { ...item, ...data, ...payload } : item))
      );
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Delete Item
  const handleDeleteHeroItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      setDeleting(true);
      await api.delete(`/carpets/${deleteConfirmItem.id}`, { skipToast: true });
      toast.success("Mahsulot slayderdan o'chirildi!");

      setLocalCarpets((prev) => prev.filter((item) => item.id !== deleteConfirmItem.id));
      setCurrentIndex(0);
      setDeleteConfirmItem(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section 
      className="relative w-full overflow-hidden min-h-[380px] md:min-h-[480px] lg:min-h-[520px] transition-colors duration-[1500ms] ease-in-out group"
      style={{ backgroundColor: activeColor }}
    >
      {/* Admin Top-Right Edit Button */}
      {isAdmin && currentCarpet && (
        <button
          type="button"
          onClick={() => openEditModal(currentCarpet)}
          className="absolute top-4 right-4 z-50 inline-flex items-center gap-2 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/30 px-4 py-2.5 text-xs md:text-sm font-bold shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 cursor-pointer"
          title="Hero Slayderini tahrirlash (Faqat Admin)"
        >
          <span className="text-base">✏️</span>
          <span>Hero Tahrirlash</span>
        </button>
      )}

      {/* Light gradient for dynamic background depth */}
      <div 
        className="absolute -top-[50%] -left-[20%] w-[120%] h-[150%] pointer-events-none z-0 opacity-40 mix-blend-soft-light" 
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)' }} 
      />
      <div 
        className="absolute -bottom-[30%] -right-[10%] w-[80%] h-[100%] pointer-events-none z-0 opacity-20" 
        style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 60%)' }} 
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-0" />

      {/* Chap tomondagi yozuvlar orqasiga YEC logotipi */}
      <div className="absolute top-0 bottom-0 left-[-5%] md:left-[0%] w-full md:w-[55%] z-0 flex items-center justify-center pointer-events-none select-none">
        <div className="w-[90%] md:w-[100%] max-w-none opacity-[0.04] rotate-[18deg] transform flex items-center justify-center">
           <h3 className="text-[12vw] font-black text-white whitespace-nowrap">YEC MARKET</h3>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[1280px] mx-auto grid min-h-[300px] md:min-h-[400px] items-center gap-6 md:gap-8 px-6 lg:px-10 pt-4 pb-16 md:py-6 lg:grid-cols-2">
        {/* Text Section */}
        <div className="z-40 row-start-2 lg:row-start-1 relative lg:-mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${currentIndex}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {currentCarpet && <SlideTextComponent carpet={currentCarpet} />}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 md:mt-8 flex flex-wrap items-center gap-3">
            <Link 
              href={`/carpets?search=${encodeURIComponent(getCarpetDisplayName(currentCarpet?.name) || '')}`} 
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105 shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
            >
              Batafsil ko'rish
            </Link>

            {/* Admin Delete Button next to Batafsil ko'rish */}
            {isAdmin && currentCarpet && (
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(currentCarpet)}
                className="inline-flex items-center gap-2 rounded-full bg-red-600/90 text-white px-5 py-3 text-sm font-bold shadow-lg hover:bg-red-700 transition-all hover:scale-105 backdrop-blur-md border border-red-400/30 cursor-pointer"
                title="Slayderdan/Bazadan o'chirish (Faqat Admin)"
              >
                <span>🗑️</span>
                <span>O&apos;chirish</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Carpet Section */}
        <div className="relative z-40 w-full flex justify-center items-center row-start-1 lg:row-start-1 lg:ml-8 perspective-[1000px]">
           <div className="absolute flex justify-center items-center w-[120%] h-[120%] max-w-[600px] pointer-events-none z-0">
             <div className="w-full aspect-[2/1] border-[1.5px] border-white/10 rounded-[100%] transform -rotate-6 absolute" />
             <div className="w-[80%] aspect-[2/1] border-[1px] border-white/5 rounded-[100%] transform rotate-6 absolute" />
           </div>
           
           <AnimatePresence mode="popLayout">
              <motion.div
                key={`img-${currentIndex}`}
                initial={{ opacity: 0, x: 200, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -200, scale: 0.8 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
                className="relative z-10 w-full max-w-[200px] sm:max-w-[280px] md:max-w-[420px] lg:max-w-[500px] mx-auto"
                style={{ willChange: "transform, opacity" }}
              >
                {currentCarpet && (
                  <SlideImageComponent carpet={currentCarpet} activeImageIndex={activeImageIndex} />
                )}
              </motion.div>
           </AnimatePresence>
        </div>
      </div>

      {/* Indicators */}
      {safeCarpets.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex gap-2 items-center p-2 rounded-full bg-black/20 backdrop-blur-md border border-white/10">
          {safeCarpets.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                idx === currentIndex ? 'bg-white w-8 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'w-2.5 bg-white/40 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}

      {/* Admin Hero Edit Modal with Animation */}
      <Portal>
        <AnimatePresence>
          {isEditModalOpen && editingCarpet && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-sand my-8 text-ink"
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-sand">
                  <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                    <span>✏️</span> Hero Slayderini Tahrirlash
                  </h3>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-full p-2 text-ink/40 hover:bg-sand/20 hover:text-ink transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveHeroItem} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1">
                      Gilam nomi
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-sand px-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Masalan: STEFFANO"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1">
                        Narxi (so&apos;m)
                      </label>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full rounded-2xl border border-sand px-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Masalan: 250000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1">
                        Material
                      </label>
                      <input
                        type="text"
                        value={editMaterial}
                        onChange={(e) => setEditMaterial(e.target.value)}
                        className="w-full rounded-2xl border border-sand px-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Masalan: Acrylic + Polypropylene"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1">
                        Dizayn kodi (Gul kodi)
                      </label>
                      <input
                        type="text"
                        value={editDesignCode}
                        onChange={(e) => setEditDesignCode(e.target.value)}
                        className="w-full rounded-2xl border border-sand px-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Masalan: L109A"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1">
                        Rasm havolasi (URL)
                      </label>
                      <input
                        type="text"
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        className="w-full rounded-2xl border border-sand px-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="/uploads/..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1">
                      Tavsif (Description)
                    </label>
                    <textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded-2xl border border-sand px-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Qisqacha ma'lumot..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="rounded-2xl border border-sand px-5 py-2.5 text-sm font-bold text-ink/70 hover:bg-sand/20 transition-colors"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary rounded-2xl px-6 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                    >
                      {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Admin Delete Confirmation Modal */}
      <Portal>
        <AnimatePresence>
          {deleteConfirmItem && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-red-100 text-center text-ink"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
                  ⚠️
                </div>
                <h3 className="font-serif text-xl font-bold text-ink mb-2">
                  Slayder mahsulotini o&apos;chirmoqchimisiz?
                </h3>
                <p className="text-sm text-ink/60 mb-6">
                  <strong className="text-ink">{deleteConfirmItem.name}</strong> mahsuloti slayderdan va bazadan o&apos;chiriladi.
                </p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmItem(null)}
                    className="rounded-2xl border border-sand px-5 py-2.5 text-sm font-bold text-ink/70 hover:bg-sand/20 transition-colors"
                  >
                    Yo&apos;q, bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteHeroItem}
                    disabled={deleting}
                    className="rounded-2xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-red-700 transition-colors"
                  >
                    {deleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </section>
  );
}

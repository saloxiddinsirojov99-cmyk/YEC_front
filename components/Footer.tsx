'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { copyText } from '@/utils/clipboard';

export default function Footer() {
  const [copied, setCopied] = useState<string | null>(null);
  const pathname = usePathname();
  const footerRef = useRef<HTMLElement>(null);
  const isHome = pathname === '/';

  const copyToClipboard = async (text: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  useEffect(() => {
    if (!isHome || !footerRef.current) {
      if (footerRef.current) {
        footerRef.current.style.setProperty('--reveal-progress', '1');
      }
      return;
    }

    const handleScroll = () => {
      if (!footerRef.current) return;
      const footerHeight = footerRef.current.offsetHeight || 400;
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const revealedHeight = scrollBottom - (docHeight - footerHeight);
      
      const p = Math.min(1, Math.max(0, revealedHeight / footerHeight));
      footerRef.current.style.setProperty('--reveal-progress', p.toFixed(4));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    // Initial delay call to let layout stabilize
    const timer = setTimeout(handleScroll, 150);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearTimeout(timer);
    };
  }, [isHome, pathname]);

  return (
    <footer
      ref={footerRef}
      className={`relative overflow-hidden border-t border-white/10 bg-[#050b1a] text-white ${
        isHome ? 'sticky bottom-0 -z-50 w-full' : ''
      }`}
      style={{
        // Set default variable to 1 for non-home pages
        ['--reveal-progress' as any]: '1',
      }}
    >
      {/* Encapsulated GPU-accelerated CSS reveal classes */}
      <style dangerouslySetInnerHTML={{ __html: `
        .reveal-footer-bg {
          opacity: var(--reveal-progress, 1);
        }
        .reveal-logo {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.15) * 1.5), 1);
          transform: translateY(calc(20px * (1 - var(--reveal-progress, 1))));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-desc {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.25) * 1.5), 1);
          transform: translateY(calc(15px * (1 - var(--reveal-progress, 1))));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-heading-1 {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.3) * 1.5), 1);
          transform: translateY(calc(10px * (1 - var(--reveal-progress, 1))));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-heading-2 {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.35) * 1.5), 1);
          transform: translateY(calc(10px * (1 - var(--reveal-progress, 1))));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-item-1 {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.35) * 2), 1);
          transform: translateY(calc(12px * (1 - var(--reveal-progress, 1))));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-item-2 {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.4) * 2), 1);
          transform: translateY(calc(12px * (1 - var(--reveal-progress, 1))));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-item-3 {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.45) * 2), 1);
          transform: translateY(calc(12px * (1 - var(--reveal-progress, 1))));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-item-4 {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.5) * 2), 1);
          transform: translateY(calc(12px * (1 - var(--reveal-progress, 1))));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-item-5 {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.55) * 2), 1);
          transform: translateY(calc(12px * (1 - var(--reveal-progress, 1))));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-social {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.6) * 2), 1);
          transform: scale(calc(0.85 + 0.15 * var(--reveal-progress, 1)));
          transition: opacity 0.05s linear, transform 0.05s linear;
          will-change: opacity, transform;
        }
        .reveal-copyright {
          opacity: clamp(0, calc((var(--reveal-progress, 1) - 0.8) * 5), 1);
          transition: opacity 0.05s linear;
          will-change: opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-logo, .reveal-desc, .reveal-heading-1, .reveal-heading-2, .reveal-item-1, .reveal-item-2, .reveal-item-3, .reveal-item-4, .reveal-item-5, .reveal-social {
            transform: none !important;
            opacity: 1 !important;
            transition: none !important;
          }
        }
      ` }} />

      <div className="absolute -left-24 -top-28 h-64 w-64 rounded-full bg-accent/20 blur-3xl opacity-50 reveal-footer-bg" />
      <div className="absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-primary/25 blur-3xl opacity-50 reveal-footer-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--accent)_/_0.12),_transparent_60%)] reveal-footer-bg" />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3 md:px-6 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3 reveal-logo">
            <div className="h-11 w-11 overflow-hidden rounded-full bg-white p-1 ring-1 ring-white/40 shadow-sm">
              <img src="/logo.png" alt="YEC Logo" className="h-full w-full rounded-full object-contain logo-sticker" />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-white">YEC Market</h3>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent/90">Premium gilamlar</p>
            </div>
          </div>
          <p className="text-sm text-white/70 leading-relaxed reveal-desc">
            YEC Market - YEC zavodining rasmiy do&apos;konlar tarmog&apos;i. Eron texnologiyali premium gilamlar zavod narxida,
            O&apos;zbekistondan AQSHgacha eksport sifatida taqdim etiladi.
          </p>
          <div className="h-1 w-16 rounded-full bg-accent/60 shadow-[0_0_10px_hsla(var(--accent),0.4)] reveal-desc" />
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-accent drop-shadow-[0_0_8px_hsla(var(--accent),0.3)] reveal-heading-1">Yo&apos;nalishlar</h4>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link href="/carpets" className="text-white/90 transition-all hover:translate-x-1 hover:text-accent reveal-item-1">
              Barcha gilamlar
            </Link>
            <Link href="/joynamozlar" className="text-white/90 transition-all hover:translate-x-1 hover:text-accent reveal-item-2">
              Joynamozlar
            </Link>
            <Link href="/ovalni-gilamlar" className="text-white/90 transition-all hover:translate-x-1 hover:text-accent reveal-item-3">
              Ovalni gilamlar
            </Link>
            <Link href="/metraj-gilamlar" className="text-white/90 transition-all hover:translate-x-1 hover:text-accent reveal-item-4">
              📏 Metraj gilamlar
            </Link>
            <Link href="/mashhur-gilamlar" className="text-white/90 transition-all hover:translate-x-1 hover:text-accent reveal-item-4">
              Mashhur gilamlar
            </Link>
            <Link href="/yangi-gilamlar" className="text-white/90 transition-all hover:translate-x-1 hover:text-accent reveal-item-5">
              Yangi gilamlar
            </Link>
            <Link href="/about" className="text-white/90 transition-all hover:translate-x-1 hover:text-accent reveal-item-5">
              Biz haqimizda
            </Link>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-accent drop-shadow-[0_0_8px_hsla(var(--accent),0.3)] reveal-heading-2">Aloqa uchun</h4>
          <div className="mt-4 space-y-4 text-sm text-white/90">
            <div className="space-y-2">
              <div className="group relative reveal-item-1">
                <button 
                  onClick={() => copyToClipboard('+998997999922')}
                  className="flex w-full items-center gap-2 text-left transition-all hover:text-accent"
                >
                  Tel 1: +998 99 799 99 22
                  <span className="text-[10px] opacity-0 transition-opacity group-hover:opacity-60">Nusxa olish</span>
                </button>
                {copied === '+998997999922' && (
                  <span className="absolute left-0 -top-6 rounded bg-accent/20 px-2 py-1 text-[10px] text-accent backdrop-blur-md fade-up">Nusxalandi!</span>
                )}
              </div>

              <div className="group relative reveal-item-2">
                <button 
                  onClick={() => copyToClipboard('+998991079922')}
                  className="flex w-full items-center gap-2 text-left transition-all hover:text-accent"
                >
                  Tel 2: +998 99 107 99 22
                  <span className="text-[10px] opacity-0 transition-opacity group-hover:opacity-60">Nusxa olish</span>
                </button>
                {copied === '+998991079922' && (
                  <span className="absolute left-0 -top-6 rounded bg-accent/20 px-2 py-1 text-[10px] text-accent backdrop-blur-md fade-up">Nusxalandi!</span>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 pt-1 reveal-social">
              <a href="https://t.me/yecgilamuz" className="rounded-full bg-accent/10 px-4 py-1 text-xs font-bold text-accent transition-all hover:bg-accent/20" target="_blank" rel="noreferrer">
                Telegram
              </a>
              <a href="https://www.instagram.com/yec_toshkent?igsh=MTR3ZmRxZjgycHpjZA==" className="rounded-full bg-rose-500/10 px-4 py-1 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/20" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </div>

            <div className="space-y-3 pt-2">
              <p className="font-bold text-accent/90 reveal-heading-2">Manzillar:</p>
              <div className="space-y-2">
                <a href="https://www.google.com/maps/place/YEC,+Tashkent+Ring+Automobile+Road,+%D0%A2%D0%BE%D1%88%D0%BA%D0%B5%D0%BD%D1%82,+Tashkent,+Uzbekistan/@41.2294433,69.1730268,18z/data=!4m6!3m5!1s0x38ae631b59b6c191:0x470d9bab83508b45!8m2!3d41.2294433!4d69.1730268!16s%2Fg%2F11nmt3b09p?g_ep=Eg1tbF8yMDI2MDMwNF8wIOC7DCoASAJQAg%3D%3D" className="group flex items-center gap-2 transition-all hover:text-accent reveal-item-3" target="_blank" rel="noreferrer">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/40 transition-all group-hover:bg-accent group-hover:scale-125" />
                  1. Olim Polvon filiali
                </a>
                <a href="https://maps.app.goo.gl/4KcLqHxEzdk5U5gD8" className="group flex items-center gap-2 transition-all hover:text-accent reveal-item-4" target="_blank" rel="noreferrer">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/40 transition-all group-hover:bg-accent group-hover:scale-125" />
                  2. Algoritim filiali
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-6 text-center text-[10px] uppercase tracking-widest text-white/40 md:px-6 reveal-copyright">
        &copy; {new Date().getFullYear()} YEC Market. Barcha huquqlar himoyalangan.
      </div>
    </footer>
  );
}

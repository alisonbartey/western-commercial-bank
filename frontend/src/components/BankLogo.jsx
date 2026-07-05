import React from 'react';

export default function BankLogo({ size = 'md', showText = true, variant = 'light' }) {
  const sizes = {
    sm: { box: 'w-10 h-10', icon: 22, title: 'text-sm', sub: 'text-[8px]' },
    md: { box: 'w-14 h-14', icon: 30, title: 'text-lg', sub: 'text-[10px]' },
    lg: { box: 'w-20 h-20', icon: 42, title: 'text-2xl', sub: 'text-xs' },
  };
  const s = sizes[size] || sizes.md;
  const textClass = variant === 'light' ? 'text-white' : 'text-navy';
  const subClass = variant === 'light' ? 'text-white/60' : 'text-slate-500';

  return (
    <div className="flex items-center gap-3">
      <div className={`${s.box} rounded-2xl bg-gradient-to-br from-navy to-navy-800 flex items-center justify-center shadow-lg border border-white/10 shrink-0`}>
        <svg width={s.icon} height={s.icon} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <path d="M32 8L8 22v6h48V22L32 8z" fill="#C9A227"/>
          <rect x="14" y="30" width="7" height="20" rx="1.5" fill="#F8FAFC" opacity="0.95"/>
          <rect x="25" y="30" width="7" height="20" rx="1.5" fill="#F8FAFC" opacity="0.95"/>
          <rect x="36" y="30" width="7" height="20" rx="1.5" fill="#F8FAFC" opacity="0.95"/>
          <rect x="47" y="30" width="7" height="20" rx="1.5" fill="#F8FAFC" opacity="0.95"/>
          <rect x="8" y="52" width="48" height="5" rx="1.5" fill="#C9A227"/>
        </svg>
      </div>
      {showText && (
        <div className={textClass}>
          <div className={`font-bold tracking-tight leading-none ${s.title}`}>Western Commercial</div>
          <div className={`font-medium tracking-[0.2em] uppercase ${subClass} ${s.sub}`}>Bank</div>
        </div>
      )}
    </div>
  );
}

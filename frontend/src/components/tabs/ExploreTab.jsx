import React, { useState } from 'react';
import {
  Home, Car, GraduationCap, Shield, Percent, Star, ChevronRight, X,
} from 'lucide-react';

const products = [
  {
    icon: Home,
    title: 'Home Mortgage',
    rate: '6.25% APR',
    description: 'Competitive rates on 15 and 30-year fixed mortgages with flexible terms.',
    badge: 'Popular',
    color: 'from-blue-600 to-blue-800',
  },
  {
    icon: Car,
    title: 'Auto Loan',
    rate: '5.49% APR',
    description: 'Finance your next vehicle with terms up to 72 months and quick approval.',
    badge: null,
    color: 'from-emerald-600 to-emerald-800',
  },
  {
    icon: GraduationCap,
    title: 'Student Account',
    rate: 'No monthly fees',
    description: 'Free student checking with no minimum balance and a virtual debit card.',
    badge: 'New',
    color: 'from-purple-600 to-purple-800',
  },
  {
    icon: Shield,
    title: 'Premium Savings',
    rate: '4.50% APY',
    description: 'High-yield savings with FDIC insurance up to $250,000 per depositor.',
    badge: null,
    color: 'from-amber-600 to-amber-800',
  },
  {
    icon: Percent,
    title: 'Personal Loan',
    rate: '7.99% APR',
    description: 'Borrow up to $50,000 for any purpose with a straightforward application.',
    badge: null,
    color: 'from-rose-600 to-rose-800',
  },
  {
    icon: Star,
    title: 'Rewards Card',
    rate: '2% cashback',
    description: 'Earn cash back on everyday purchases. No annual fee and fraud protection.',
    badge: 'Featured',
    color: 'from-indigo-600 to-indigo-800',
  },
];

export default function ExploreTab() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-4">
      <div className="card p-6 bg-gradient-to-br from-navy to-navy-800 text-white rounded-3xl border-0">
        <h2 className="text-xl font-semibold">Banking Products & Offers</h2>
        <p className="text-sm text-white/70 mt-1">
          Discover financial solutions tailored to your goals.
        </p>
      </div>

      <div className="space-y-3">
        {products.map((product) => {
          const Icon = product.icon;
          return (
            <button
              key={product.title}
              onClick={() => setSelected(product)}
              className="card w-full text-left overflow-hidden hover:shadow-md transition-shadow active:scale-[0.99]"
            >
              <div className={`h-1.5 bg-gradient-to-r ${product.color}`} />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${product.color} text-white shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-navy">{product.title}</h3>
                      {product.badge && (
                        <span className="text-[10px] font-semibold bg-navy/10 text-navy px-2 py-0.5 rounded-full">
                          {product.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-emerald-600 mt-0.5">{product.rate}</p>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-fade-in relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${selected.color} text-white mb-4`}>
              <selected.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-navy">{selected.title}</h3>
            <p className="text-lg font-semibold text-emerald-600 mt-1">{selected.rate}</p>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{selected.description}</p>
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-2xl mt-4">
              To apply, visit your nearest Western Commercial Bank branch or contact your relationship manager.
            </p>
            <button onClick={() => setSelected(null)} className="btn-primary w-full mt-5">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

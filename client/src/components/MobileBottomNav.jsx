import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Flame, Compass } from 'lucide-react';

const navItems = [
  { name: 'Overview', to: '/',         icon: LayoutDashboard },
  { name: 'Sessions', to: '/sessions', icon: Users           },
  { name: 'Heatmap',  to: '/heatmap',  icon: Flame           },
  { name: 'Demo',     to: '/demo',     icon: Compass         },
];

export default function MobileBottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,.06)] flex items-center justify-around px-2 py-1"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[60px] min-h-[52px] px-3 py-1.5 rounded-2xl text-[10px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                isActive
                  ? 'text-teal-700 bg-teal-50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`flex items-center justify-center w-8 h-8 rounded-xl mb-0.5 transition-all ${isActive ? 'bg-teal-100 shadow-sm' : ''}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} aria-hidden="true" />
                </div>
                <span className={isActive ? 'text-teal-700' : ''}>{item.name}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useMember } from '../../contexts/MemberContext';
import { Home, DollarSign, BookOpen, FileText, User } from 'lucide-react';

const navItems = [
  { to: '/portal/dashboard', icon: Home, label: 'Início' },
  { to: '/portal/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/portal/carnets', icon: BookOpen, label: 'Carnês' },
  { to: '/portal/documentos', icon: FileText, label: 'Docs' },
  { to: '/portal/perfil', icon: User, label: 'Perfil' },
];

interface MemberLayoutProps {
  children: React.ReactNode;
}

export const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  const { session } = useMember();

  if (!session) return null;

  const member = session.member;
  const church = session.church;

  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const churchInitials = church.name ? church.name.substring(0, 2).toUpperCase() : 'IA';

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {church.logoUrl ? (
            <img
              src={church.logoUrl}
              alt="Logo"
              className="w-8 h-8 rounded-full object-cover border-2 border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {churchInitials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white text-sm font-bold leading-tight truncate max-w-[180px]">
              {church.name}
            </p>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">
              Portal do Membro
            </p>
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white text-sm font-bold border-2 border-orange-500/40 shrink-0 overflow-hidden shadow-lg shadow-orange-500/20">
          {member.photo ? (
            <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto px-4 py-5">{children}</div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-orange-400'
                    : 'text-slate-500 hover:text-slate-300 active:scale-95'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`transition-all duration-200 ${
                      isActive ? 'scale-110' : 'scale-100'
                    }`}
                  >
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={isActive ? 'drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]' : ''}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-wide transition-colors ${
                      isActive ? 'text-orange-400' : 'text-slate-600'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

import React, { useState } from 'react';
import { useMember } from '../../contexts/MemberContext';
import {
  TrendingUp,
  Copy,
  CheckCheck,
  Calendar,
  Clock,
  ChevronRight,
  Wallet,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const categoryLabel: Record<string, string> = {
  DIZIMO: 'Dízimo',
  OFERTA: 'Oferta',
};

const monthName = () => {
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export const MemberDashboard: React.FC = () => {
  const { session, contributions, currentMonthTithes, upcomingEvents } = useMember();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  if (!session) return null;

  const member = session.member;
  const church = session.church;
  const recentContributions = contributions.slice(0, 5);

  const firstName = member.name.split(' ')[0];
  const firstNameFormatted =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const handleCopyPix = () => {
    if (!church.pixKey) return;
    navigator.clipboard.writeText(church.pixKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Welcome */}
      <div>
        <p className="text-slate-400 text-sm">Olá,</p>
        <h1 className="text-2xl font-extrabold text-white">{firstNameFormatted} 👋</h1>
      </div>

      {/* Tithes Card */}
      <div className="relative bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-5 shadow-xl shadow-orange-900/30 overflow-hidden">
        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -right-2 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-orange-200" />
            <span className="text-orange-200 text-xs font-semibold uppercase tracking-wider">
              Dízimos de {monthName()}
            </span>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">
            {formatCurrency(currentMonthTithes)}
          </p>

          {church.pixKey && (
            <button
              onClick={handleCopyPix}
              className="mt-4 inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-4 py-2 text-white text-xs font-bold transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <CheckCheck size={14} className="text-green-300" />
                  Chave copiada!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copiar Chave PIX
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Member Info Card */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          {member.photo ? (
            <img
              src={member.photo}
              alt={member.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-orange-500/40"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
              <User size={20} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{member.name}</p>
            <p className="text-slate-400 text-xs">{church.name}</p>
            {member.memberNumber && (
              <p className="text-slate-500 text-xs">Nº {member.memberNumber}</p>
            )}
          </div>
          <div className="ml-auto">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                member.status === 'ATIVO'
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : 'bg-slate-600/40 text-slate-400 border border-slate-600/60'
              }`}
            >
              {member.status || 'ATIVO'}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar size={15} className="text-orange-400" />
              Próximos Eventos
            </h2>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="bg-orange-500/15 border border-orange-500/30 rounded-lg p-2 shrink-0">
                  <Calendar size={14} className="text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">{event.name}</p>
                  <p className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    {formatDate(event.date)} às {event.time}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Contributions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet size={15} className="text-orange-400" />
            Últimas Contribuições
          </h2>
          <button
            onClick={() => navigate('/portal/financeiro')}
            className="text-orange-400 text-xs flex items-center gap-0.5 hover:text-orange-300 transition-colors"
          >
            Ver tudo <ChevronRight size={12} />
          </button>
        </div>

        {recentContributions.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-8 text-center">
            <Wallet size={28} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Nenhuma contribuição registrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentContributions.map((txn) => (
              <div
                key={txn.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                    <TrendingUp size={14} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">
                      {categoryLabel[txn.category] || txn.category}
                    </p>
                    <p className="text-slate-500 text-[10px]">{formatDate(txn.date)}</p>
                  </div>
                </div>
                <span className="text-green-400 text-sm font-bold">
                  {formatCurrency(txn.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

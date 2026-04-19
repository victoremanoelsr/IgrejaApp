import React, { useState, useMemo } from 'react';
import { useMember } from '../../contexts/MemberContext';
import {
  TrendingUp,
  Copy,
  CheckCheck,
  Calendar,
  Clock,
  ChevronRight,
  Wallet,
  CreditCard,
  BookOpen,
  HeartHandshake,
  Sparkles,
  ArrowUpRight,
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

const monthName = () =>
  new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const versiculos = [
  { texto: 'Tudo posso naquele que me fortalece.', referencia: 'Filipenses 4:13' },
  { texto: 'O Senhor é o meu pastor e nada me faltará.', referencia: 'Salmos 23:1' },
  { texto: 'Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.', referencia: 'Salmos 37:5' },
  { texto: 'Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor.', referencia: 'Jeremias 29:11' },
  { texto: 'Seja forte e corajoso. Não se apavore nem desanime, pois o Senhor estará com você.', referencia: 'Josué 1:9' },
  { texto: 'Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.', referencia: 'Provérbios 3:5' },
  { texto: 'Mas os que esperam no Senhor renovarão as suas forças.', referencia: 'Isaías 40:31' },
  { texto: 'Porque Deus tanto amou o mundo que deu o seu Filho Unigênito.', referencia: 'João 3:16' },
  { texto: 'Não andem ansiosos por coisa alguma, mas em tudo, pela oração, apresentem seus pedidos a Deus.', referencia: 'Filipenses 4:6' },
];

const getHourGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-800 rounded-lg ${className}`} />
);

export const MemberDashboard: React.FC = () => {
  const { session, contributions, currentMonthTithes, upcomingEvents, isLoading } = useMember();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const versiculoDoDia = useMemo(() => {
    const idx = new Date().getDate() % versiculos.length;
    return versiculos[idx];
  }, []);

  if (!session) return null;

  const member = session.member;
  const church = session.church;
  const recentContributions = contributions.slice(0, 4);
  const firstName =
    member.name.split(' ')[0].charAt(0).toUpperCase() +
    member.name.split(' ')[0].slice(1).toLowerCase();

  const handleCopyPix = () => {
    if (!church.pixKey) return;
    navigator.clipboard.writeText(church.pixKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const quickActions = [
    {
      label: 'Carteirinha',
      icon: CreditCard,
      color: 'from-violet-600 to-indigo-700',
      action: () => navigate('/portal/carteirinha'),
    },
    {
      label: 'Carnês',
      icon: BookOpen,
      color: 'from-emerald-600 to-teal-700',
      action: () => navigate('/portal/carnets'),
    },
    {
      label: 'Financeiro',
      icon: Wallet,
      color: 'from-orange-500 to-red-600',
      action: () => navigate('/portal/financeiro'),
    },
    {
      label: 'Eventos',
      icon: Calendar,
      color: 'from-blue-600 to-cyan-700',
      action: () => {
        document.getElementById('eventos-section')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
  ];

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{getHourGreeting()},</p>
          <h1 className="text-white text-2xl font-bold leading-tight">{firstName} 👋</h1>
          {member.status && (
            <span
              className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                member.status === 'ATIVO'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Membro {member.status}
            </span>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-base overflow-hidden border-2 border-orange-500/30 shadow-lg shadow-orange-500/20 shrink-0">
          {member.photo ? (
            <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            member.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()
          )}
        </div>
      </div>

      {/* Verse of the Day */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={12} className="text-amber-400" />
          <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">
            Versículo do Dia
          </span>
        </div>
        <p className="text-slate-200 text-sm leading-relaxed italic">"{versiculoDoDia.texto}"</p>
        <p className="text-slate-500 text-[11px] mt-2 font-semibold">— {versiculoDoDia.referencia}</p>
      </div>

      {/* Tithe Card */}
      {isLoading ? (
        <Skeleton className="h-36 rounded-2xl" />
      ) : (
        <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-700 rounded-2xl p-5 overflow-hidden shadow-xl shadow-orange-500/20">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-sm" />
          <div className="absolute -bottom-10 -left-4 w-28 h-28 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={13} className="text-orange-200" />
              <span className="text-orange-100 text-[10px] font-bold uppercase tracking-widest">
                Dízimo de {monthName()}
              </span>
            </div>
            <p className="text-white text-3xl font-bold tracking-tight mt-1">
              {formatCurrency(currentMonthTithes)}
            </p>
            <div className="flex items-center justify-between mt-4">
              {church.pixKey ? (
                <button
                  onClick={handleCopyPix}
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 rounded-xl px-3 py-2 text-white text-xs font-semibold transition-all"
                >
                  {copied ? (
                    <>
                      <CheckCheck size={13} className="text-green-300" />
                      Chave copiada!
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      Copiar Chave PIX
                    </>
                  )}
                </button>
              ) : (
                <span className="text-orange-200 text-xs">Sem chave PIX cadastrada</span>
              )}
              <button
                onClick={() => navigate('/portal/financeiro')}
                className="flex items-center gap-1 text-orange-100 hover:text-white text-xs font-semibold transition-colors"
              >
                Ver tudo <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">
          Atalhos Rápidos
        </p>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(({ label, icon: Icon, color, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}
              >
                <Icon size={22} className="text-white" strokeWidth={1.8} />
              </div>
              <span className="text-slate-400 text-[10px] font-semibold text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Contributions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Atividade Recente
          </p>
          <button
            onClick={() => navigate('/portal/financeiro')}
            className="text-orange-400 text-xs flex items-center gap-0.5 hover:text-orange-300 transition-colors"
          >
            Ver tudo <ChevronRight size={12} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : recentContributions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-8 text-center">
            <Wallet size={28} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Nenhuma contribuição registrada.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800/60 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
            {recentContributions.map((txn) => (
              <div key={txn.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <TrendingUp size={15} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-200 text-sm font-semibold">
                      {categoryLabel[txn.category] || txn.category}
                    </p>
                    <p className="text-slate-500 text-[11px]">{formatDate(txn.date)}</p>
                  </div>
                </div>
                <span className="text-emerald-400 text-sm font-bold">
                  {formatCurrency(txn.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div id="eventos-section">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
            Próximos Eventos
          </p>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Calendar size={16} className="text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-200 text-sm font-semibold truncate">{event.name}</p>
                  <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
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

      {/* Prayer Request Button */}
      <button className="w-full flex items-center gap-3 bg-slate-900 border border-slate-800/60 rounded-2xl p-4 active:scale-[0.98] transition-transform">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <HeartHandshake size={16} className="text-violet-400" />
        </div>
        <div className="text-left flex-1">
          <p className="text-slate-200 text-sm font-semibold">Pedido de Oração</p>
          <p className="text-slate-500 text-[11px]">Envie um pedido ao seu pastor</p>
        </div>
        <ChevronRight size={16} className="text-slate-600 shrink-0" />
      </button>

      <div className="h-2" />
    </div>
  );
};

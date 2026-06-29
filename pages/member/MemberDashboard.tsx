import React, { useState, useMemo } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../i18n';
import {
  TrendingUp,
  Copy,
  CheckCheck,
  Calendar,
  Clock,
  ChevronRight,
  Wallet,
  BookOpen,
  HeartHandshake,
  Sparkles,
  ArrowUpRight,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

export const MemberDashboard: React.FC = () => {
  const { session, contributions, currentMonthTithes, upcomingEvents, isLoading } = useMember();
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const lang = i18n.language;

  const getHourGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('memberPortal.dashboard.greetingMorning');
    if (hour < 18) return t('memberPortal.dashboard.greetingAfternoon');
    return t('memberPortal.dashboard.greetingEvening');
  };

  const monthName = () =>
    new Date().toLocaleDateString(lang, { month: 'long', year: 'numeric' });

  const categoryLabel = (cat: string) =>
    t(`memberPortal.categoryLabel.${cat}`, { defaultValue: cat });

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

  const handlePrayerRequest = () => {
    const rawPhone = church.sedePastorPhone?.replace(/\D/g, '') || '';
    if (!rawPhone) {
      alert(t('memberPortal.dashboard.noPastorPhone'));
      return;
    }
    const pastorTitle = church.sedePastorName ? `Pr. ${church.sedePastorName}` : 'Pastor';
    const message =
      `Paz do Senhor, ${pastorTitle}!\n\n` +
      `Sou *${member.name}*, membro da ${church.name}.\n\n` +
      `Gostaria de pedir uma oração:\n\n` +
      `_(escreva aqui o seu pedido)_\n\n` +
      `Que Deus o(a) abençoe! 🙏`;
    const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPix = () => {
    if (!church.pixKey) return;
    navigator.clipboard.writeText(church.pixKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const quickActions = [
    {
      label: t('memberPortal.dashboard.carnets'),
      icon: BookOpen,
      color: 'from-emerald-500 to-teal-600',
      action: () => navigate('/portal/carnets'),
    },
    {
      label: t('memberPortal.nav.financial'),
      icon: DollarSign,
      color: 'from-orange-500 to-red-600',
      action: () => navigate('/portal/financeiro'),
    },
    {
      label: t('memberPortal.dashboard.events'),
      icon: Calendar,
      color: 'from-blue-500 to-cyan-600',
      action: () => navigate('/portal/eventos'),
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{getHourGreeting()},</p>
          <h1 className="text-2xl font-bold text-gray-800">{firstName} 👋</h1>
          {member.status && (
            <span
              className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                member.status === 'ATIVO'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {t('memberPortal.dashboard.memberStatus')} {member.status}
            </span>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-base overflow-hidden border-2 border-orange-200 shadow-sm shrink-0">
          {member.photo ? (
            <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            member.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
          )}
        </div>
      </div>

      {/* Verse of the Day */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={12} className="text-amber-500" />
          <span className="text-amber-600 text-[10px] font-bold uppercase tracking-widest">
            {t('memberPortal.dashboard.verseOfDay')}
          </span>
        </div>
        <p className="text-gray-700 text-sm leading-relaxed italic">"{versiculoDoDia.texto}"</p>
        <p className="text-gray-400 text-[11px] mt-2 font-semibold">— {versiculoDoDia.referencia}</p>
      </div>

      {/* Tithe Card */}
      {isLoading ? (
        <Skeleton className="h-44" />
      ) : currentMonthTithes > 0 ? (
        <div className="relative bg-slate-900 border border-emerald-500/25 rounded-2xl p-5 overflow-hidden shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-500/15 rounded-lg border border-emerald-500/25">
                <CheckCheck size={14} className="text-emerald-400" />
              </div>
              <span className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
                {t('memberPortal.dashboard.contributionRegistered')}
              </span>
            </div>
            <p className="text-slate-300 text-sm">
              {t('memberPortal.dashboard.yourContributionOf')}{' '}
              <span className="text-white font-semibold capitalize">{monthName()}</span>:
            </p>
            <p className="text-white text-4xl font-extrabold tracking-tight mt-1">
              {formatCurrency(currentMonthTithes, lang)}
            </p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
              <p className="text-slate-500 text-xs italic">"O Senhor ama quem dá com alegria." — 2 Co 9:7</p>
              <button
                onClick={() => navigate('/portal/financeiro')}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors shrink-0 ml-2"
              >
                {t('memberPortal.dashboard.history')} <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-5 overflow-hidden shadow-xl">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/25">
                <HeartHandshake size={14} className="text-orange-400" />
              </div>
              <span className="text-orange-300 text-[10px] font-bold uppercase tracking-widest">
                {t('memberPortal.dashboard.titheOf')} <span className="capitalize">{monthName()}</span>
              </span>
            </div>

            <p className="text-white text-lg font-bold leading-snug">
              {t('memberPortal.dashboard.titheLoyalty')}
            </p>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              {t('memberPortal.dashboard.contributeWhenSpirit')}
            </p>

            {church.pixKey ? (
              <button
                onClick={handleCopyPix}
                className={`mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.98] shadow-lg ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/30'
                }`}
              >
                {copied ? (
                  <><CheckCheck size={16} />{t('memberPortal.dashboard.pixKeyCopied')}</>
                ) : (
                  <><Copy size={16} />{t('memberPortal.dashboard.copyPixKey')}</>
                )}
              </button>
            ) : (
              <div className="mt-5 w-full text-center text-xs text-slate-500 bg-slate-800/40 border border-slate-700 rounded-xl py-3">
                {t('memberPortal.dashboard.noPix')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('memberPortal.dashboard.quickShortcuts')}</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(({ label, icon: Icon, color, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
                <Icon size={22} className="text-white" strokeWidth={1.8} />
              </div>
              <span className="text-gray-500 text-[10px] font-semibold text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Contributions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Wallet size={14} className="text-orange-500" />
            {t('memberPortal.dashboard.recentActivity')}
          </h2>
          <button
            onClick={() => navigate('/portal/financeiro')}
            className="text-orange-500 text-xs flex items-center gap-0.5 hover:text-orange-600 transition-colors"
          >
            {t('memberPortal.dashboard.viewAll')} <ChevronRight size={12} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : recentContributions.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-700 p-10 text-center">
            <Wallet size={28} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">{t('memberPortal.dashboard.noContributions')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentContributions.map((txn) => (
              <div
                key={txn.id}
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-sm p-3.5 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {categoryLabel(txn.category)}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{formatDate(txn.date, lang)}</p>
                </div>
                <span className="text-emerald-400 text-sm font-extrabold shrink-0">
                  {formatCurrency(txn.amount, lang)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div id="eventos-section">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-orange-500" />
            {t('memberPortal.dashboard.upcomingEvents')}
          </h2>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-3">
                <div className="bg-orange-100 border border-orange-200 rounded-lg p-2 shrink-0">
                  <Calendar size={14} className="text-orange-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-800 text-xs font-semibold truncate">{event.name}</p>
                  <p className="text-gray-400 text-[10px] flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    {formatDate(event.date, lang)} {t('memberPortal.events.at')} {event.time}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prayer Request */}
      <button
        onClick={handlePrayerRequest}
        className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 text-left shadow-sm hover:border-violet-300 hover:shadow-md transition-all active:scale-[0.99]"
      >
        <div className="w-8 h-8 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
          <HeartHandshake size={14} className="text-violet-500" />
        </div>
        <div className="flex-1">
          <p className="text-gray-800 text-sm font-semibold">{t('memberPortal.dashboard.prayerRequest')}</p>
          <p className="text-gray-400 text-xs">
            {church.sedePastorPhone
              ? `${t('memberPortal.dashboard.sendPrayerRequest')} (Pr. ${(church.sedePastorName || 'Presidente').split(' ')[0]})`
              : t('memberPortal.dashboard.sendPrayerRequest')}
          </p>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0" />
      </button>
    </div>
  );
};

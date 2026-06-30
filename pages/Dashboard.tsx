import React, { useEffect, useState } from 'react';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency, getMonthName } from '../i18n';
import { 
  Users, 
  Coins, 
  Banknote, 
  LayoutDashboard,
  Calendar,
  Wallet,
  Globe,
  TrendingDown,
  MessageCircle,
  Gift,
  AlertTriangle,
  X,
  CreditCard,
} from 'lucide-react';
import { sendWhatsApp, birthdayMessage } from '../utils/whatsapp';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';

const PLAN_MONTHS_MAP: Record<string, number> = {
  mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12,
};

export const Dashboard: React.FC = () => {
  const { members, transactions, currentChurch, churches, user } = useApp();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [expiryDaysLeft, setExpiryDaysLeft] = useState(0);

  useEffect(() => {
    if (user?.role === 'SUPER_ADM' && !currentChurch) {
      navigate('/admin/dashboard');
    }
  }, [user, currentChurch, navigate]);

  // Verifica proximidade de vencimento da assinatura
  useEffect(() => {
    if (!currentChurch || !churches.length) return;

    // Resolve a sede (se for congregação, usa a sede pai)
    const sede = currentChurch.type === 'CONGREGACAO' && currentChurch.parentId
      ? churches.find(c => c.id === currentChurch.parentId)
      : currentChurch;

    if (!sede || !sede.planType || sede.planType === 'isento') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const sessionKey = `expiry_warning_dismissed_${sede.id}_${todayStr}`;

    // Não mostra se já foi dispensado hoje nesta sessão
    if (sessionStorage.getItem(sessionKey)) return;

    const dueDay = sede.dueDay ?? 10;
    const gracePeriod = sede.gracePeriod ?? 5;
    const months = PLAN_MONTHS_MAP[sede.planType ?? 'mensal'] ?? 1;

    let expiryDate: Date | null = null;

    // 1. Promessa de pagamento ativa
    if (sede.paymentPromiseDate) {
      const promise = new Date(sede.paymentPromiseDate + 'T00:00:00');
      if (promise >= today) { expiryDate = promise; }
    }

    // 2. Baseado no último pagamento
    if (!expiryDate && sede.lastPaymentDate) {
      const lastPay = new Date(sede.lastPaymentDate + 'T00:00:00');
      const nextDue = new Date(lastPay.getFullYear(), lastPay.getMonth() + months, dueDay);
      nextDue.setHours(0, 0, 0, 0);
      if (nextDue >= today) { expiryDate = nextDue; }
    }

    // 3. Fallback: dueDay + carência do mês atual
    if (!expiryDate) {
      const graceDate = new Date(today.getFullYear(), today.getMonth(), dueDay + gracePeriod);
      graceDate.setHours(0, 0, 0, 0);
      expiryDate = graceDate;
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / msPerDay);

    if (daysLeft >= 0 && daysLeft <= 5) {
      setExpiryDaysLeft(daysLeft);
      setShowExpiryWarning(true);
    }
  }, [currentChurch, churches]);

  const handleDismissExpiryWarning = () => {
    setShowExpiryWarning(false);
    const today = new Date().toISOString().split('T')[0];
    const sede = currentChurch?.type === 'CONGREGACAO' && currentChurch?.parentId
      ? churches.find(c => c.id === currentChurch.parentId)
      : currentChurch;
    if (sede) sessionStorage.setItem(`expiry_warning_dismissed_${sede.id}_${today}`, '1');
  };

  if (!currentChurch) {
    return (
        <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
                <LayoutDashboard size={48} className="mx-auto mb-2 opacity-20"/>
                <p>{t('dashboard.selectUnit')}</p>
            </div>
        </div>
    );
  }

  const viewId = currentChurch.id;
  const churchMembers = members.filter(m => m.churchId === viewId);
  
  const excludedCategoriesFromGeneral = ['MISSOES', 'JOVENS', 'CRIANCAS', 'SENHORAS', 'SENHORES'];

  const lastDayOfSelectedMonth = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

  const matchesSelectedDate = (dateStr: string) => {
      const [y, m] = dateStr.split('-').map(Number);
      return m === selectedMonth && y === selectedYear;
  };

  // Transações do mês selecionado (para exibir entradas/saídas do mês)
  const generalTransactions = transactions.filter(t => 
      t.churchId === viewId && 
      !t.campaignId &&
      !excludedCategoriesFromGeneral.includes(t.category) &&
      matchesSelectedDate(t.date) &&
      t.status === 'PAGO'
  );

  const totalInGeneral = generalTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const totalOutGeneral = generalTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);

  // Saldo acumulado: todas as transações até o último dia do mês selecionado
  const cumulativeGeneralTransactions = transactions.filter(t =>
      t.churchId === viewId &&
      !t.campaignId &&
      !excludedCategoriesFromGeneral.includes(t.category) &&
      t.date <= lastDayOfSelectedMonth &&
      t.status === 'PAGO'
  );
  const cumulativeTotalIn = cumulativeGeneralTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const cumulativeTotalOut = cumulativeGeneralTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const balanceGeneral = cumulativeTotalIn - cumulativeTotalOut;

  const tithesTransactions = transactions.filter(t => 
      t.churchId === viewId &&
      t.category === 'DIZIMO' &&
      t.type === 'ENTRADA' &&
      matchesSelectedDate(t.date) &&
      t.status === 'PAGO'
  );
  const tithesTotal = tithesTransactions.reduce((acc, t) => acc + t.amount, 0);
  const activeTithersCount = new Set(tithesTransactions.filter(t => t.memberId).map(t => t.memberId)).size;
  const totalRegisteredTithers = churchMembers.filter(m => m.isTither).length;

  // Missões: entradas/saídas do mês para o gráfico de pizza
  const missionsTransactions = transactions.filter(t => 
      t.churchId === viewId &&
      t.category === 'MISSOES' &&
      matchesSelectedDate(t.date) &&
      t.status === 'PAGO'
  );
  const missionsIn = missionsTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const missionsOut = missionsTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);

  // Saldo acumulado de Missões
  const cumulativeMissionsTransactions = transactions.filter(t =>
      t.churchId === viewId &&
      t.category === 'MISSOES' &&
      t.date <= lastDayOfSelectedMonth &&
      t.status === 'PAGO'
  );
  const cumulativeMissionsIn = cumulativeMissionsTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const cumulativeMissionsOut = cumulativeMissionsTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const missionsBalance = cumulativeMissionsIn - cumulativeMissionsOut;

  const missionsChartData = [
      { name: t('common.income'), value: missionsIn > 0 ? missionsIn : 0, color: '#10b981' },
      { name: t('common.expenses'), value: missionsOut, color: '#ef4444' }
  ];
  if (missionsIn === 0 && missionsOut === 0) {
      missionsChartData.push({ name: t('dashboard.empty'), value: 1, color: '#e5e7eb' });
  }

  const offersData = Object.entries(generalTransactions
    .filter(t => t.category === 'OFERTA' && t.type === 'ENTRADA')
    .reduce((acc: any, t) => {
        const day = t.date.split('-')[2];
        acc[day] = (acc[day] || 0) + t.amount; 
        return acc;
    }, {})
  ).sort((a: any, b: any) => parseInt(a[0]) - parseInt(b[0])).slice(-5).map(([day, val]) => ({
      name: `${day}`,
      valor: val
  }));

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dailyFlowData = Array.from({ length: daysInMonth }, (_, i) => ({ day: (i + 1).toString(), entradas: 0, saidas: 0 }));
  
  generalTransactions.forEach(t => {
      const d = parseInt(t.date.split('-')[2]);
      if (d >= 1 && d <= daysInMonth) {
          if(t.type === 'ENTRADA') dailyFlowData[d-1].entradas += t.amount; 
          else dailyFlowData[d-1].saidas += t.amount;
      }
  });

  const lang = i18n.language;

  return (
    <div className="space-y-8 pb-20 font-sans">

      {/* Modal de aviso de vencimento próximo */}
      {showExpiryWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            {/* Botão fechar (X) */}
            <button
              onClick={handleDismissExpiryWarning}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>

            {/* Ícone de alerta */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mx-auto mb-4">
              <AlertTriangle size={28} className="text-amber-500" />
            </div>

            {/* Título */}
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
              Assinatura Próxima do Vencimento
            </h2>

            {/* Mensagem dinâmica */}
            <p className="text-center text-gray-600 mb-6">
              {expiryDaysLeft === 0
                ? <span className="font-bold text-red-600">⚠️ Atenção: Seu sistema será bloqueado hoje!</span>
                : expiryDaysLeft === 1
                ? <span>Atenção: Seu sistema será bloqueado em <span className="font-bold text-red-600">1 dia</span>.</span>
                : <span>Atenção: Seu sistema será bloqueado em <span className="font-bold text-red-600">{expiryDaysLeft} dias</span>.</span>
              }
              <br />
              <span className="text-sm text-gray-500 mt-1 block">Regularize sua assinatura para continuar usando o sistema sem interrupções.</span>
            </p>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { handleDismissExpiryWarning(); navigate('/faturamento'); }}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                <CreditCard size={18} />
                Regularizar Agora
              </button>
              <button
                onClick={handleDismissExpiryWarning}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">{t('dashboard.title')}</h1>
           <div className="flex items-center gap-2 mt-1">
             <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${currentChurch.type === 'SEDE' ? 'bg-brand-red' : 'bg-blue-600'}`}>
                {currentChurch.type}
             </span>
             <span className="text-sm font-medium text-gray-500 uppercase">{currentChurch.name}</span>
           </div>
        </div>

        {/* MONTH/YEAR SELECTOR */}
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <div className="px-2 text-gray-400"><Calendar size={16}/></div>
            <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-gray-700 p-1 outline-none cursor-pointer border-r border-gray-200"
            >
                {Array.from({length: 12}, (_, i) => (
                    <option key={i} value={i+1}>{getMonthName(i, lang)}</option>
                ))}
            </select>
            <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-gray-700 p-1 outline-none cursor-pointer pl-2"
            >
                <option value={2023}>2023</option>
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
            </select>
        </div>
      </div>
      
      {/* ROW 1: MEMBERS AND GENERAL FINANCE */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* MEMBERS CARD */}
        <div onClick={() => navigate('/membros')} className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border-l-4 border-brand-black p-6 flex items-center justify-between cursor-pointer hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dashboard.totalMembers')}</p>
                <p className="text-4xl font-extrabold text-gray-800 mt-2">{churchMembers.length}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-full text-gray-700">
                <Users size={28}/>
            </div>
        </div>

        {/* GENERAL FINANCE CARD */}
        <div onClick={() => navigate('/financeiro')} className="col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border-l-4 border-brand-orange p-5 flex flex-col justify-center cursor-pointer hover:shadow-md transition-all">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="flex flex-col items-start sm:items-center sm:text-center px-3 sm:px-4 py-3 sm:py-0 gap-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('common.income')}</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-black text-green-600 break-words w-full sm:text-center">{formatCurrency(totalInGeneral, lang)}</p>
                </div>
                <div className="flex flex-col items-start sm:items-center sm:text-center px-3 sm:px-4 py-3 sm:py-0 gap-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('common.expenses')}</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-black text-red-600 break-words w-full sm:text-center">{formatCurrency(totalOutGeneral, lang)}</p>
                </div>
                <div className="flex flex-col items-start sm:items-center sm:text-center px-3 sm:px-4 py-3 sm:py-0 gap-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('common.balance')}</p>
                    <p className={`text-lg sm:text-xl md:text-2xl font-black break-words w-full sm:text-center ${balanceGeneral >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{formatCurrency(balanceGeneral, lang)}</p>
                </div>
            </div>
        </div>
      </div>

      {/* ROW 2: TITHES, MISSIONS, OFFERINGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        
        {/* TITHES CARD */}
        <div onClick={() => navigate('/financeiro')} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md h-96">
            <div>
                <div className="flex items-center mb-2">
                    <Coins size={18} className="text-brand-yellow mr-2"/>
                    <h3 className="font-bold text-gray-800 text-lg">{t('dashboard.tithes')}</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">{t('dashboard.totalCollected')}</p>
                <p className="text-right text-3xl font-black text-green-600">{formatCurrency(tithesTotal, lang)}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                    <p className="text-2xl font-black text-green-700">{activeTithersCount}</p>
                    <p className="text-[10px] font-bold text-green-600 uppercase">{t('dashboard.activeTithers')}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-100">
                    <p className="text-2xl font-black text-orange-700">{totalRegisteredTithers}</p>
                    <p className="text-[10px] font-bold text-orange-600 uppercase">{t('dashboard.totalRegistered')}</p>
                </div>
            </div>
        </div>

        {/* MISSIONS CARD */}
        <div onClick={() => navigate('/departamentos')} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col cursor-pointer hover:shadow-md h-96 relative">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                    <Globe size={18} className="text-red-500 mr-2"/>
                    <h3 className="font-bold text-gray-800 text-lg">{t('dashboard.missions')}</h3>
                </div>
                <span className="text-xs md:text-sm font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
                    {t('common.balance')}: {formatCurrency(missionsBalance, lang)}
                </span>
            </div>

            <div className="flex-1 flex items-center justify-center relative my-2">
                <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={missionsChartData}
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {missionsChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(missionsIn, lang)}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{t('dashboard.monthIncome')}</p>
                </div>
                <div className="text-center border-l">
                    <p className="text-lg font-bold text-red-600">{formatCurrency(missionsOut, lang)}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{t('dashboard.monthExpenses')}</p>
                </div>
            </div>
        </div>

        {/* RECENT OFFERINGS CARD */}
        <div onClick={() => navigate('/financeiro')} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col cursor-pointer hover:shadow-md h-96">
            <div className="flex items-center mb-6">
                <Banknote size={18} className="text-brand-orange mr-2"/>
                <h3 className="font-bold text-gray-800 text-lg">{t('dashboard.recentOfferings')}</h3>
            </div>
            
            <div className="flex-1 w-full">
                {offersData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={offersData} margin={{top: 10, right: 0, left: 0, bottom: 0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fill: '#9ca3af'}} 
                                tickFormatter={(v) => formatCurrency(v, lang)} 
                            />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} formatter={(val: number) => [formatCurrency(val, lang), '']}/>
                            <Bar dataKey="valor" fill="#f97316" radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <Banknote size={40} className="mb-3 opacity-30"/>
                        <p className="text-sm">{t('dashboard.noRecentOfferings')}</p>
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* BIRTHDAYS OF THE MONTH */}
      {(() => {
        const birthdayMembers = churchMembers.filter(m => {
          if (!m.birthDate) return false;
          const month = parseInt(m.birthDate.split('-')[1]);
          return month === selectedMonth;
        }).sort((a, b) => {
          const dayA = parseInt(a.birthDate.split('-')[2]);
          const dayB = parseInt(b.birthDate.split('-')[2]);
          return dayA - dayB;
        });
        if (birthdayMembers.length === 0) return null;
        return (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Gift size={18} className="text-pink-500" />
              <h3 className="font-bold text-gray-800 text-lg">{t('dashboard.birthdaysOfMonth')}</h3>
              <span className="ml-auto bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">{birthdayMembers.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {birthdayMembers.map(m => {
                const day = m.birthDate.split('-')[2];
                return (
                  <div key={m.id} className="flex items-center gap-3 bg-pink-50 border border-pink-100 rounded-xl px-3 py-2">
                    <div className="w-9 h-9 rounded-full bg-pink-200 overflow-hidden shrink-0 border-2 border-pink-300">
                      {m.photo ? <img src={m.photo} alt={m.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-pink-600 font-bold text-xs">{m.name.charAt(0)}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{m.name}</p>
                      <p className="text-[10px] text-pink-500 font-medium">{t('dashboard.day')} {day} 🎂</p>
                    </div>
                    {m.phone && (
                      <button
                        onClick={() => sendWhatsApp(m.phone!, birthdayMessage(m.name))}
                        title={t('dashboard.sendCongratulations')}
                        className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shrink-0"
                      >
                        <MessageCircle size={13}/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* MONTHLY CASH FLOW */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
            <Globe className="text-teal-600" size={20}/>
            <h3 className="font-bold text-gray-700">{t('dashboard.monthlyFlow')} ({getMonthName(selectedMonth - 1, lang)} / {selectedYear})</h3>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyFlowData} margin={{top: 20, right: 20, left: 0, bottom: 0}}>
              <XAxis 
                dataKey="day" 
                tick={{fontSize: 12, fill: '#9ca3af'}} 
                axisLine={false} 
                tickLine={false} 
                dy={10}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value, lang)} 
                axisLine={false} 
                tickLine={false}
                tick={{fontSize: 12, fill: '#9ca3af'}}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                formatter={(value: number) => [formatCurrency(value, lang), '']}
              />
              <Legend iconType="circle" iconSize={8} verticalAlign="top" align="left" wrapperStyle={{fontSize: '12px', top: -20, left: 0}}/>
              <Line 
                type="monotone" 
                dataKey="entradas" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={false}
                activeDot={{r: 6, strokeWidth: 0}}
                name={t('common.income')} 
              />
              <Line 
                type="monotone" 
                dataKey="saidas" 
                stroke="#ef4444" 
                strokeWidth={3} 
                dot={false}
                activeDot={{r: 6, strokeWidth: 0}}
                name={t('common.expenses')} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

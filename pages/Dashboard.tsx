
import React, { useEffect } from 'react';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Coins, 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  HeartHandshake,
  LayoutDashboard,
  CalendarClock,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { members, transactions, currentChurch, user, fixedExpenses } = useApp();
  const navigate = useNavigate();

  // UX Check
  useEffect(() => {
    if (user?.role === 'SUPER_ADM' && !currentChurch) {
      navigate('/admin/dashboard');
    }
  }, [user, currentChurch, navigate]);

  if (!currentChurch) {
    return (
        <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
                <LayoutDashboard size={48} className="mx-auto mb-2 opacity-20"/>
                <p>Selecione uma unidade no menu lateral.</p>
            </div>
        </div>
    );
  }

  // 1. DATA FILTERING
  const viewId = currentChurch.id;
  const churchMembers = members.filter(m => m.churchId === viewId);
  const churchTransactions = transactions.filter(t => t.churchId === viewId && !t.campaignId);
  const churchFixedExpenses = fixedExpenses.filter(fe => fe.churchId === viewId && fe.active);

  // --- METRICS CALCULATION ---
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const totalMembers = churchMembers.length;
  // Total de membros marcados como dizimistas no cadastro
  const totalRegisteredTithers = churchMembers.filter(m => m.isTither).length;

  const currentMonthTransactions = churchTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIn = currentMonthTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = currentMonthTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIn - totalOut;

  // --- CÁLCULO DE VENCIMENTOS FIXOS PENDENTES ---
  const pendingFixedExpenses = churchFixedExpenses.filter(fe => {
      const exists = currentMonthTransactions.some(t => t.fixedExpenseId === fe.id);
      return !exists;
  }).sort((a, b) => a.dueDay - b.dueDay);

  const pendingFixedTotal = pendingFixedExpenses.reduce((acc, fe) => acc + fe.amount, 0);

  // --- CHART DATA PREP ---
  const tithesTotal = currentMonthTransactions.filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  
  // Cálculo de Dizimistas Ativos (Membros que deram dízimo este mês)
  const activeTithersCount = new Set(
      currentMonthTransactions
          .filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA' && t.memberId)
          .map(t => t.memberId)
  ).size;

  const missionsIn = currentMonthTransactions.filter(t => t.category === 'MISSOES' && t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const missionsOut = currentMonthTransactions.filter(t => t.category === 'MISSOES' && t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const missionsBalance = missionsIn - missionsOut;
  
  // Ajuste: O gráfico mostra Saldo (Verde) vs Saídas (Vermelho). Se o saldo for negativo, mostramos 0 para não quebrar o gráfico.
  const pieDataMissions = [
      { name: 'Saldo', value: Math.max(0, missionsBalance) }, 
      { name: 'Saídas', value: missionsOut }
  ];
  const COLORS_MISSIONS = ['#16a34a', '#dc2626'];

  const offerData = Object.entries(churchTransactions.filter(t => t.category === 'OFERTA' && t.type === 'ENTRADA').reduce((acc: any, t) => {
      acc[t.date] = (acc[t.date] || 0) + t.amount; return acc;
  }, {})).sort().slice(-5).map(([dateStr, val]) => {
      const [y,m,d] = dateStr.split('-').map(Number);
      return { name: new Date(y, m-1, d).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}), valor: val };
  });
  if (offerData.length === 0) offerData.push({ name: '-', valor: 0 });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyFlowData = Array.from({ length: daysInMonth }, (_, i) => ({ day: (i + 1).toString(), entradas: 0, saidas: 0 }));
  currentMonthTransactions.forEach(t => {
      const d = new Date(t.date).getDate();
      if(t.type === 'ENTRADA') dailyFlowData[d-1].entradas += t.amount; else dailyFlowData[d-1].saidas += t.amount;
  });

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      {/* HEADER COMPACTO */}
      <div className="flex justify-between items-center mb-1">
        <div>
           <h1 className="text-lg md:text-3xl font-bold text-gray-800">Painel Geral</h1>
           <div className="flex items-center space-x-1 md:space-x-2">
             <span className={`px-1.5 py-0.5 rounded text-[9px] md:text-xs font-bold ${currentChurch.type === 'SEDE' ? 'bg-brand-red text-white' : 'bg-gray-200 text-gray-700'}`}>
                {currentChurch.type}
             </span>
             <p className="text-gray-500 font-medium text-xs md:text-lg truncate max-w-[200px] md:max-w-none">{currentChurch.name}</p>
           </div>
        </div>
      </div>
      
      {/* CARD DE AVISO: VENCIMENTOS FIXOS */}
      {pendingFixedExpenses.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm animate-fade-in-down">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-red-700 font-bold flex items-center text-sm md:text-base">
                      <CalendarClock className="mr-2" size={20}/> Contas Fixas Pendentes (Mês Atual)
                  </h3>
                  <span className="text-xs font-bold bg-white text-red-600 px-2 py-1 rounded border border-red-100">
                      Total: R$ {pendingFixedTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-red-200">
                  {pendingFixedExpenses.map(fe => {
                      const isLate = now.getDate() > fe.dueDay;
                      return (
                        <div key={fe.id} className={`flex-shrink-0 min-w-[140px] bg-white p-3 rounded-lg border-l-4 shadow-sm flex flex-col justify-between ${isLate ? 'border-red-500' : 'border-orange-400'}`}>
                            <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">{fe.category}</span>
                            <span className="font-bold text-gray-800 text-xs truncate" title={fe.description}>{fe.description}</span>
                            <div className="flex justify-between items-end mt-2">
                                <span className="text-sm font-black text-gray-700">R$ {fe.amount}</span>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${isLate ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>Dia {fe.dueDay}</span>
                            </div>
                        </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
        
        {/* CARD MEMBROS */}
        <div onClick={() => navigate('/membros')} className="bg-white rounded-xl shadow-sm md:shadow-lg p-3 md:p-6 border-l-4 border-brand-black flex items-center justify-between cursor-pointer transition-all active:scale-95">
          <div><p className="text-gray-500 text-[10px] md:text-sm font-medium uppercase">Total de Membros</p><p className="text-2xl md:text-4xl font-bold text-brand-black mt-0.5 md:mt-2">{totalMembers}</p></div>
          <div className="bg-gray-100 p-2 md:p-3 rounded-full"><Users size={20} className="text-brand-black md:w-8 md:h-8" /></div>
        </div>

        {/* CARD FINANCEIRO GERAL */}
        <div onClick={() => navigate('/financeiro')} className="bg-white rounded-xl shadow-sm md:shadow-lg p-3 md:p-6 border-l-4 border-brand-orange flex items-center col-span-1 md:col-span-2 lg:col-span-2 cursor-pointer transition-all active:scale-95">
          <div className="flex w-full justify-between items-center divide-x divide-gray-100">
            <div className="text-center px-1 md:px-2 flex-1">
               <p className="text-gray-500 text-[9px] md:text-base font-bold uppercase tracking-widest mb-0.5">Entradas</p>
               <p className="text-sm md:text-3xl font-black text-green-600 truncate">R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center px-1 md:px-2 flex-1">
               <p className="text-gray-500 text-[9px] md:text-base font-bold uppercase tracking-widest mb-0.5">Saídas</p>
               <p className="text-sm md:text-3xl font-black text-brand-red truncate">R$ {totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center px-1 md:px-2 flex-1">
               <p className="text-gray-500 text-[9px] md:text-base font-bold uppercase tracking-widest mb-0.5">Saldo</p>
               <p className={`text-base md:text-3xl font-black ${balance >= 0 ? 'text-brand-black' : 'text-brand-red'} truncate`}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
        
        {/* CARD DÍZIMOS REFORMULADO */}
        <div onClick={() => navigate('/financeiro')} className="bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all active:scale-95 col-span-2 md:col-span-1 border border-gray-100 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center mb-4">
               <Coins className="mr-2 text-brand-yellow" size={20}/>
               <h3 className="text-lg font-bold text-gray-800">Dízimos</h3>
            </div>
            
            <div className="flex justify-between items-end mb-6">
               <span className="text-gray-500 font-medium text-sm">Total</span>
               <span className="text-2xl font-black text-green-600">R$ {tithesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-auto">
             <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                <p className="text-xl font-black text-green-700">{activeTithersCount}</p>
                <p className="text-[9px] font-bold text-green-600 uppercase leading-tight mt-1">Dizimistas Ativos</p>
             </div>
             <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-100">
                <p className="text-xl font-black text-brand-orange">{totalRegisteredTithers}</p>
                <p className="text-[9px] font-bold text-orange-600 uppercase leading-tight mt-1">Total Cadastrados</p>
             </div>
          </div>
        </div>

        {/* CARD MISSÕES REFORMULADO */}
        <div onClick={() => navigate('/financeiro')} className="bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all active:scale-95 border border-gray-100 hover:shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                  <HeartHandshake className="mr-2 text-brand-red" size={20}/> 
                  <h3 className="text-lg font-bold text-gray-800">Missões</h3>
              </div>
              <span className={`text-[10px] md:text-xs px-2 py-1 rounded font-bold ${missionsBalance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Saldo: R$ {missionsBalance.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
          </div>

          <div className="h-32 flex items-center justify-center relative mb-2">
            {missionsIn > 0 || missionsOut > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={pieDataMissions} innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">
                    {pieDataMissions.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_MISSIONS[index]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}/>
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-300">
                    <HeartHandshake size={32} className="mb-2 opacity-30"/>
                    <p className="text-xs font-medium">Sem movimento</p>
                </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t pt-3 mt-auto">
              <div className="text-center w-1/2 border-r">
                  <p className="text-green-600 font-bold text-sm">R$ {missionsBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Saldo</p>
              </div>
              <div className="text-center w-1/2">
                  <p className="text-red-600 font-bold text-sm">R$ {missionsOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Saídas</p>
              </div>
          </div>
        </div>

        {/* CARD OFERTAS (MANTIDO) */}
        <div onClick={() => navigate('/financeiro')} className="bg-white rounded-xl shadow-sm p-3 md:p-6 cursor-pointer transition-all active:scale-95">
           <h3 className="text-xs md:text-lg font-bold text-gray-700 mb-2 flex items-center"><Banknote className="mr-1 text-brand-orange" size={16}/> Ofertas Recentes</h3>
           <div className="h-24 md:h-64">
             {offerData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={offerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }} interval={0} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}R$`}/>
                    <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']} labelStyle={{fontSize: '12px', fontWeight: 'bold'}} contentStyle={{fontSize: '12px', borderRadius: '8px'}}/>
                    <Bar dataKey="valor" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
             ) : <div className="h-full flex flex-col items-center justify-center text-gray-400"><Banknote size={24} className="mb-1 opacity-50"/><p className="text-[10px]">Sem dados.</p></div>}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3 md:p-6">
        <h3 className="text-sm md:text-lg font-bold text-gray-700 mb-2 md:mb-6">Fluxo de Caixa Mensal</h3>
        <div className="h-40 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyFlowData} margin={{top: 5, right: 0, left: -20, bottom: 0}}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/><stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{fontSize: 9}} interval={4} />
              <YAxis tickFormatter={(value) => `${value}`} tick={{fontSize: 9}} width={25} />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Legend verticalAlign="top" iconSize={10} wrapperStyle={{fontSize: '10px'}}/>
              <Area type="monotone" dataKey="entradas" stroke="#16a34a" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3}/>
              <Area type="monotone" dataKey="saidas" stroke="#dc2626" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

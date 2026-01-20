
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
  LayoutDashboard
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { members, transactions, currentChurch, user } = useApp();
  const navigate = useNavigate();

  // UX Check: Se for Super Admin e não tiver igreja selecionada, manda pro Painel Master
  useEffect(() => {
    if (user?.role === 'SUPER_ADM' && !currentChurch) {
      navigate('/admin/dashboard');
    }
  }, [user, currentChurch, navigate]);

  // Se estiver carregando ou redirecionando...
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

  // 1. DATA FILTERING: CRITICAL FOR ISOLATION
  const viewId = currentChurch.id;
  const churchMembers = members.filter(m => m.churchId === viewId);
  
  const churchTransactions = transactions.filter(t => t.churchId === viewId && !t.campaignId);

  // --- METRICS CALCULATION ---
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const totalMembers = churchMembers.length;

  const currentMonthTransactions = churchTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const missionsIn = currentMonthTransactions.filter(t => t.category === 'MISSOES' && t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  // CORREÇÃO: Buscar saídas pela categoria exata
  const missionsOut = currentMonthTransactions.filter(t => t.category === 'MISSOES' && t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const missionsBalance = missionsIn - missionsOut;
  const missionsDonors = new Set(currentMonthTransactions.filter(t => t.category === 'MISSOES' && t.type === 'ENTRADA').map(t => t.memberId || 'anon')).size;

  const tithesTotal = currentMonthTransactions.filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  
  const tithersCount = new Set(currentMonthTransactions.filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA').map(t => t.memberId)).size;

  const totalRegisteredTithers = churchMembers.filter(m => m.isTither).length;
  
  const titherPercentage = totalRegisteredTithers > 0 ? Math.round((tithersCount / totalRegisteredTithers) * 100) : 0;

  const totalIn = currentMonthTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = currentMonthTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIn - totalOut;

  const offersRaw = churchTransactions.filter(t => t.category === 'OFERTA' && t.type === 'ENTRADA');
  const offersByDate: Record<string, number> = {};
  offersRaw.forEach(t => {
    if (!offersByDate[t.date]) {
      offersByDate[t.date] = 0;
    }
    offersByDate[t.date] += t.amount;
  });

  const offerData = Object.keys(offersByDate)
    .sort()
    .slice(-5) // Últimas 5 datas
    .map(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      // Formato solicitado: DD/MM
      const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      return { 
        name: dayMonth, 
        valor: offersByDate[dateStr] 
      };
    });

  if (offerData.length === 0) {
    offerData.push({ name: '-', valor: 0 });
  }

  const pieDataMissions = [
    { name: 'Entradas', value: missionsIn },
    { name: 'Saídas', value: missionsOut },
  ];
  const COLORS_MISSIONS = ['#16a34a', '#dc2626'];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyFlowData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: (i + 1).toString(),
    entradas: 0,
    saidas: 0
  }));

  currentMonthTransactions.forEach(t => {
      const [tYear, tMonth, tDay] = t.date.split('-').map(Number);
      if (tYear === currentYear && (tMonth - 1) === currentMonth) {
        const dayIndex = tDay - 1;
        if (dayIndex >= 0 && dayIndex < daysInMonth) {
            if (t.type === 'ENTRADA') dailyFlowData[dayIndex].entradas += t.amount;
            else dailyFlowData[dayIndex].saidas += t.amount;
        }
      }
  });

  return (
    <div className="space-y-2 md:space-y-6">
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
      
      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
        
        {/* CARD MEMBROS */}
        <div 
          onClick={() => navigate('/membros')}
          className="bg-white rounded-xl shadow-sm md:shadow-lg p-3 md:p-6 border-l-4 border-brand-black flex items-center justify-between cursor-pointer transition-all active:scale-95"
        >
          <div>
             <p className="text-gray-500 text-[10px] md:text-sm font-medium uppercase">Total de Membros</p>
             <p className="text-2xl md:text-4xl font-bold text-brand-black mt-0.5 md:mt-2">{totalMembers}</p>
          </div>
          <div className="bg-gray-100 p-2 md:p-3 rounded-full">
            <Users size={20} className="text-brand-black md:w-8 md:h-8" />
          </div>
        </div>

        {/* CARD FINANCEIRO GERAL (Compacto no Mobile) */}
        <div 
          onClick={() => navigate('/financeiro')}
          className="bg-white rounded-xl shadow-sm md:shadow-lg p-3 md:p-6 border-l-4 border-brand-orange flex items-center col-span-1 md:col-span-2 lg:col-span-2 cursor-pointer transition-all active:scale-95"
        >
          <div className="flex w-full justify-between items-center divide-x divide-gray-100">
            <div className="text-center px-1 md:px-2 flex-1">
               <p className="text-gray-500 text-[9px] md:text-base font-bold uppercase tracking-widest mb-0.5">Entradas</p>
               <p className="text-sm md:text-3xl font-black text-green-600 truncate">
                 R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
            </div>
            <div className="text-center px-1 md:px-2 flex-1">
               <p className="text-gray-500 text-[9px] md:text-base font-bold uppercase tracking-widest mb-0.5">Saídas</p>
               <p className="text-sm md:text-3xl font-black text-brand-red truncate">
                 R$ {totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
            </div>
            <div className="text-center px-1 md:px-2 flex-1">
               <p className="text-gray-500 text-[9px] md:text-base font-bold uppercase tracking-widest mb-0.5">Saldo</p>
               <p className={`text-base md:text-3xl font-black ${balance >= 0 ? 'text-brand-black' : 'text-brand-red'} truncate`}>
                 R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
        
        {/* CARD DÍZIMOS */}
        <div 
          onClick={() => navigate('/financeiro')}
          className="bg-white rounded-xl shadow-sm p-3 md:p-6 flex flex-col cursor-pointer transition-all active:scale-95 col-span-2 md:col-span-1"
        >
          <h3 className="text-sm md:text-lg font-bold text-gray-700 mb-2 md:mb-6 flex items-center">
            <Coins className="mr-1 md:mr-2 text-brand-yellow" size={16}/> Dízimos
          </h3>
          <div className="flex-1 flex flex-col justify-center space-y-2 md:space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2 md:pb-3">
              <span className="text-gray-600 font-medium text-xs md:text-lg">Total</span>
              <span className="font-bold text-green-600 text-sm md:text-2xl">R$ {tithesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className="bg-green-50 p-2 md:p-3 rounded-lg text-center border border-green-100">
                    <span className="text-green-600 font-black text-lg md:text-3xl">{tithersCount}</span>
                    <p className="text-green-800 text-[8px] md:text-xs font-bold uppercase mt-0.5 leading-tight">Dizimistas<br/>Ativos</p>
                </div>

                <div className="bg-orange-50 p-2 md:p-3 rounded-lg text-center border border-orange-100">
                    <span className="text-brand-orange font-black text-lg md:text-3xl">{totalRegisteredTithers}</span>
                    <p className="text-brand-orange text-[8px] md:text-xs font-bold uppercase mt-0.5 leading-tight">Total<br/>Cadastrados</p>
                </div>
            </div>
          </div>
        </div>

        {/* CARD MISSÕES */}
        <div 
          onClick={() => navigate('/financeiro')}
          className="bg-white rounded-xl shadow-sm p-3 md:p-6 cursor-pointer transition-all active:scale-95"
        >
          <h3 className="text-xs md:text-lg font-bold text-gray-700 mb-2 flex items-center justify-between">
              <span className="flex items-center"><HeartHandshake className="mr-1 text-brand-red" size={16}/> Missões</span>
              {/* Saldo Líquido Badge */}
              <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded font-bold ${missionsBalance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Saldo: R$ {missionsBalance.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
          </h3>
          <div className="h-24 md:h-40 flex justify-center">
            {missionsIn > 0 || missionsOut > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie 
                    data={pieDataMissions} 
                    innerRadius={25} 
                    outerRadius={45} 
                    paddingAngle={5} 
                    dataKey="value"
                    >
                    {pieDataMissions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_MISSIONS[index]} />
                    ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}/>
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                    <HeartHandshake size={24} className="mb-1 opacity-50"/>
                    <p className="text-[10px]">Sem movimento</p>
                </div>
            )}
          </div>
          
          {/* LEGENDA AUMENTADA NO DESKTOP */}
          <div className="text-center mt-2 grid grid-cols-2 gap-2">
            <div>
                <p className="font-black text-green-600 text-xs md:text-2xl">R$ {missionsIn.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                <p className="text-gray-400 text-[10px] md:text-sm font-bold uppercase">Entradas</p>
            </div>
            <div>
                <p className="font-black text-red-600 text-xs md:text-2xl">R$ {missionsOut.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                <p className="text-gray-400 text-[10px] md:text-sm font-bold uppercase">Saídas</p>
            </div>
          </div>
        </div>

        {/* CARD OFERTAS */}
        <div 
          onClick={() => navigate('/financeiro')}
          className="bg-white rounded-xl shadow-sm p-3 md:p-6 cursor-pointer transition-all active:scale-95"
        >
           <h3 className="text-xs md:text-lg font-bold text-gray-700 mb-2 flex items-center"><Banknote className="mr-1 text-brand-orange" size={16}/> Ofertas</h3>
           <div className="h-24 md:h-64">
             {offersRaw.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={offerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }} 
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f3f4f6' }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                      labelStyle={{fontSize: '12px', fontWeight: 'bold'}}
                      contentStyle={{fontSize: '12px', borderRadius: '8px'}}
                    />
                    <Bar dataKey="valor" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Banknote size={24} className="mb-1 opacity-50"/>
                  <p className="text-[10px]">Sem dados.</p>
                </div>
             )}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3 md:p-6">
        <h3 className="text-sm md:text-lg font-bold text-gray-700 mb-2 md:mb-6">Fluxo de Caixa</h3>
        <div className="h-40 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyFlowData} margin={{top: 5, right: 0, left: -20, bottom: 0}}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="day" 
                tick={{fontSize: 9}}
                interval={4} // Show fewer labels on mobile
              />
              <YAxis tickFormatter={(value) => `${value}`} tick={{fontSize: 9}} width={25} />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Legend verticalAlign="top" iconSize={10} wrapperStyle={{fontSize: '10px'}}/>
              <Area 
                type="monotone" 
                dataKey="entradas" 
                stroke="#16a34a" 
                fillOpacity={1} 
                fill="url(#colorIn)" 
                strokeWidth={3}
              />
              <Area 
                type="monotone" 
                dataKey="saidas" 
                stroke="#dc2626" 
                fillOpacity={1} 
                fill="url(#colorOut)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};


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
  
  // --- ALTERAÇÃO CRÍTICA: FILTRAR APENAS TRANSAÇÕES DO CAIXA PRINCIPAL ---
  // A propriedade 'campaignId' deve ser nula ou undefined para aparecer aqui.
  const churchTransactions = transactions.filter(t => t.churchId === viewId && !t.campaignId);

  // --- METRICS CALCULATION ---
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const totalMembers = churchMembers.length;

  // Filtrar transações APENAS DESTE MÊS para os cards de resumo
  const currentMonthTransactions = churchTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const missionsIn = currentMonthTransactions.filter(t => t.category === 'MISSOES' && t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const missionsOut = currentMonthTransactions.filter(t => t.description.toLowerCase().includes('missões') && t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const missionsDonors = new Set(currentMonthTransactions.filter(t => t.category === 'MISSOES' && t.type === 'ENTRADA').map(t => t.memberId || 'anon')).size;

  const tithesTotal = currentMonthTransactions.filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  
  // Dizimistas que contribuíram ESTE MÊS
  const tithersCount = new Set(currentMonthTransactions.filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA').map(t => t.memberId)).size;

  // Total de Membros marcados como DIZIMISTA no cadastro
  const totalRegisteredTithers = churchMembers.filter(m => m.isTither).length;
  
  // Cálculo da porcentagem
  const titherPercentage = totalRegisteredTithers > 0 ? Math.round((tithersCount / totalRegisteredTithers) * 100) : 0;

  // Monthly Consolidated (Total do Mês - CAIXA PRINCIPAL)
  const totalIn = currentMonthTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = currentMonthTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIn - totalOut;

  // --- DYNAMIC CHART DATA: OFFERINGS (Last 5 records regardless of date for trend, or filter by month? Let's keep recent trend) ---
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
    .slice(-5)
    .map(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');

      return { 
        name: `${weekdayCap} (${dayMonth})`, 
        valor: offersByDate[dateStr] 
      };
    });

  if (offerData.length === 0) {
    offerData.push({ name: 'Sem dados', valor: 0 });
  }

  const pieDataMissions = [
    { name: 'Entradas', value: missionsIn },
    { name: 'Saídas', value: missionsOut },
  ];
  const COLORS_MISSIONS = ['#16a34a', '#dc2626'];

  // --- FLUXO DE CAIXA MENSAL (DIÁRIO) ---
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyFlowData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: (i + 1).toString(),
    entradas: 0,
    saidas: 0
  }));

  // Reuse filtered transactions for chart performance
  currentMonthTransactions.forEach(t => {
      const [tYear, tMonth, tDay] = t.date.split('-').map(Number);
      // Double check date consistency (though already filtered)
      if (tYear === currentYear && (tMonth - 1) === currentMonth) {
        const dayIndex = tDay - 1;
        if (dayIndex >= 0 && dayIndex < daysInMonth) {
            if (t.type === 'ENTRADA') dailyFlowData[dayIndex].entradas += t.amount;
            else dailyFlowData[dayIndex].saidas += t.amount;
        }
      }
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center pl-10 md:pl-0">
        <div>
           <h1 className="text-xl md:text-3xl font-bold text-gray-800">Painel Geral</h1>
           <div className="flex items-center space-x-2">
             <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold ${currentChurch.type === 'SEDE' ? 'bg-brand-red text-white' : 'bg-gray-200 text-gray-700'}`}>
                {currentChurch.type}
             </span>
             <p className="text-gray-500 font-medium text-sm md:text-lg truncate max-w-[200px] md:max-w-none">{currentChurch.name}</p>
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <div 
          onClick={() => navigate('/membros')}
          className="bg-white rounded-xl shadow-md md:shadow-lg p-4 md:p-6 border-l-4 border-brand-black flex items-center justify-between cursor-pointer transition-all duration-300 active:scale-95 md:hover:-translate-y-2 md:hover:shadow-2xl"
        >
          <div>
             <p className="text-gray-500 text-xs md:text-sm font-medium uppercase">Total de Membros</p>
             <p className="text-3xl md:text-4xl font-bold text-brand-black mt-1 md:mt-2">{totalMembers}</p>
          </div>
          <div className="bg-gray-100 p-2 md:p-3 rounded-full">
            <Users size={24} className="text-brand-black md:w-8 md:h-8" />
          </div>
        </div>

        <div 
          onClick={() => navigate('/financeiro')}
          className="bg-white rounded-xl shadow-md md:shadow-lg p-4 md:p-6 border-l-4 border-brand-orange flex items-center col-span-1 md:col-span-2 lg:col-span-2 cursor-pointer transition-all duration-300 active:scale-95 md:hover:-translate-y-2 md:hover:shadow-2xl"
        >
          <div className="flex w-full justify-around items-center divide-x divide-gray-100 md:divide-none">
            <div className="text-center px-2">
               <p className="text-gray-500 text-[10px] md:text-base font-bold uppercase tracking-widest mb-1">Entradas (Principal)</p>
               <p className="text-lg md:text-3xl font-black text-green-600 flex flex-col md:flex-row items-center justify-center">
                 <span className="hidden md:inline"><TrendingUp size={28} className="mr-2"/></span> 
                 R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
            </div>
            <div className="text-center px-2">
               <p className="text-gray-500 text-[10px] md:text-base font-bold uppercase tracking-widest mb-1">Saídas (Principal)</p>
               <p className="text-lg md:text-3xl font-black text-brand-red flex flex-col md:flex-row items-center justify-center">
                 <span className="hidden md:inline"><TrendingDown size={28} className="mr-2"/></span>
                 R$ {totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
            </div>
            <div className="text-center px-2">
               <p className="text-gray-500 text-[10px] md:text-base font-bold uppercase tracking-widest mb-1">Saldo em Caixa</p>
               <p className={`text-lg md:text-3xl font-black ${balance >= 0 ? 'text-brand-black' : 'text-brand-red'}`}>
                 R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        <div 
          onClick={() => navigate('/financeiro')}
          className="bg-white rounded-xl shadow-md p-4 md:p-6 flex flex-col h-full cursor-pointer transition-all duration-300 active:scale-95 md:hover:-translate-y-2 md:hover:shadow-2xl"
        >
          <h3 className="text-base md:text-lg font-bold text-gray-700 mb-4 md:mb-6 flex items-center">
            <Coins className="mr-2 text-brand-yellow" size={20}/> Dízimos
          </h3>
          <div className="flex-1 flex flex-col justify-center space-y-4 md:space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-600 font-medium text-sm md:text-lg">Entradas</span>
              <span className="font-bold text-green-600 text-xl md:text-2xl">R$ {tithesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 p-3 rounded-xl text-center border border-green-100 flex flex-col justify-center items-center">
                    <span className="text-green-600 font-black text-2xl md:text-3xl">{tithersCount}</span>
                    <p className="text-green-800 text-[10px] md:text-xs font-bold uppercase mt-1 leading-tight">Dizimaram<br/>Este Mês</p>
                </div>

                <div className="bg-orange-50 p-3 rounded-xl text-center border border-orange-100 flex flex-col justify-center items-center">
                    <span className="text-brand-orange font-black text-2xl md:text-3xl">{totalRegisteredTithers}</span>
                    <p className="text-brand-orange text-[10px] md:text-xs font-bold uppercase mt-1 leading-tight">Cadastrados<br/>Como Dizimistas</p>
                </div>
            </div>

            <div className="text-center">
                <div className="flex justify-between items-end mb-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fidelidade</p>
                    <p className="text-xs font-bold text-gray-600">{titherPercentage}%</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                        className="bg-brand-orange h-1.5 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${titherPercentage}%` }}
                    ></div>
                </div>
            </div>

          </div>
        </div>

        <div 
          onClick={() => navigate('/financeiro')}
          className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer transition-all duration-300 active:scale-95 md:hover:-translate-y-2 md:hover:shadow-2xl"
        >
          <h3 className="text-base md:text-lg font-bold text-gray-700 mb-4 flex items-center"><HeartHandshake className="mr-2 text-brand-red" size={20}/> Missões</h3>
          <div className="h-40 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieDataMissions} 
                  innerRadius={40} 
                  outerRadius={70} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {pieDataMissions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_MISSIONS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <p className="text-lg md:text-xl font-bold">R$ {missionsIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs md:text-sm text-gray-500">Entradas para Missões</p>
            <div className="mt-3 bg-green-50 p-2 rounded text-green-700 font-medium text-xs md:text-sm">
               {missionsDonors} contribuintes este mês
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/financeiro')}
          className="bg-white rounded-xl shadow-md p-4 md:p-6 cursor-pointer transition-all duration-300 active:scale-95 md:hover:-translate-y-2 md:hover:shadow-2xl"
        >
           <h3 className="text-base md:text-lg font-bold text-gray-700 mb-4 flex items-center"><Banknote className="mr-2 text-brand-orange" size={20}/> Ofertas</h3>
           <div className="h-48 md:h-64">
             {offersRaw.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={offerData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fontWeight: 'bold' }} 
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${value}`} 
                      tick={{ fontSize: 10 }}
                      width={55}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Oferta']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="valor" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Banknote size={48} className="mb-2 opacity-50"/>
                  <p className="text-sm">Nenhuma oferta registrada recentemente.</p>
                </div>
             )}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-gray-700 mb-4 md:mb-6">Fluxo de Caixa - Principal ({new Date().toLocaleString('pt-BR', { month: 'long' })})</h3>
        <div className="h-60 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyFlowData}>
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
                label={{ value: 'Dias', position: 'insideBottomRight', offset: -5 }}
                tick={{fontSize: 10}}
              />
              <YAxis tickFormatter={(value) => `R$ ${value}`} tick={{fontSize: 10}} width={45} />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2)}`} 
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Legend verticalAlign="top" height={36}/>
              <Area 
                type="monotone" 
                dataKey="entradas" 
                name="Entradas"
                stroke="#16a34a" 
                fillOpacity={1} 
                fill="url(#colorIn)" 
              />
              <Area 
                type="monotone" 
                dataKey="saidas" 
                name="Saídas"
                stroke="#dc2626" 
                fillOpacity={1} 
                fill="url(#colorOut)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

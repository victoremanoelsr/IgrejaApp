import React from 'react';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Coins, 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  HeartHandshake
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { members, transactions, currentChurch } = useApp();
  const navigate = useNavigate();

  // 1. DATA FILTERING: CRITICAL FOR ISOLATION
  // We use currentChurch.id instead of user.churchId to support View Switching
  const viewId = currentChurch?.id;

  const churchMembers = members.filter(m => m.churchId === viewId);
  const churchTransactions = transactions.filter(t => t.churchId === viewId);

  // --- METRICS CALCULATION ---
  const totalMembers = churchMembers.length;

  const missionsIn = churchTransactions.filter(t => t.category === 'MISSOES' && t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const missionsOut = churchTransactions.filter(t => t.description.toLowerCase().includes('missões') && t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const missionsDonors = new Set(churchTransactions.filter(t => t.category === 'MISSOES' && t.type === 'ENTRADA').map(t => t.memberId || 'anon')).size;

  const tithesTotal = churchTransactions.filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const tithersCount = new Set(churchTransactions.filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA').map(t => t.memberId)).size;

  // Monthly Consolidated
  const totalIn = churchTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = churchTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIn - totalOut;

  // --- DYNAMIC CHART DATA: OFFERINGS ---
  // 1. Filter Offers
  const offersRaw = churchTransactions.filter(t => t.category === 'OFERTA' && t.type === 'ENTRADA');

  // 2. Group by Date
  const offersByDate: Record<string, number> = {};
  offersRaw.forEach(t => {
    if (!offersByDate[t.date]) {
      offersByDate[t.date] = 0;
    }
    offersByDate[t.date] += t.amount;
  });

  // 3. Format for Chart (Sort by date and take last 5 entries)
  const offerData = Object.keys(offersByDate)
    .sort() // Sorts ISO dates correctly (YYYY-MM-DD)
    .slice(-5) // Take last 5 dates
    .map(dateStr => {
      // Safe local date parsing
      const [year, month, day] = dateStr.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      // Capitalize first letter of weekday
      const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');

      return { 
        name: `${weekdayCap} (${dayMonth})`, 
        valor: offersByDate[dateStr] 
      };
    });

  // Fallback for empty chart to keep layout nice
  if (offerData.length === 0) {
    offerData.push({ name: 'Sem dados', valor: 0 });
  }

  const pieDataMissions = [
    { name: 'Entradas', value: missionsIn },
    { name: 'Saídas', value: missionsOut },
  ];

  const COLORS_MISSIONS = ['#16a34a', '#dc2626'];

  // --- FLUXO DE CAIXA MENSAL (DIÁRIO) ---
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = Jan)
  
  // Quantos dias tem o mês atual?
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Inicializa array com todos os dias do mês com valor 0
  const dailyFlowData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: (i + 1).toString(), // "1", "2", "3"...
    entradas: 0,
    saidas: 0
  }));

  // Popula com dados das transações
  churchTransactions.forEach(t => {
    // Quebra a string "YYYY-MM-DD" para evitar problemas de timezone
    const [tYear, tMonth, tDay] = t.date.split('-').map(Number);

    // Verifica se a transação é deste ano e deste mês
    if (tYear === currentYear && (tMonth - 1) === currentMonth) {
      const dayIndex = tDay - 1; // Array começa em 0, dia começa em 1
      
      if (dayIndex >= 0 && dayIndex < daysInMonth) {
        if (t.type === 'ENTRADA') {
          dailyFlowData[dayIndex].entradas += t.amount;
        } else {
          dailyFlowData[dayIndex].saidas += t.amount;
        }
      }
    }
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center pl-10 md:pl-0">
        <div>
           <h1 className="text-xl md:text-3xl font-bold text-gray-800">Painel Geral</h1>
           <div className="flex items-center space-x-2">
             <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold ${currentChurch?.type === 'SEDE' ? 'bg-brand-red text-white' : 'bg-gray-200 text-gray-700'}`}>
                {currentChurch?.type}
             </span>
             <p className="text-gray-500 font-medium text-sm md:text-lg truncate max-w-[200px] md:max-w-none">{currentChurch?.name}</p>
           </div>
        </div>
      </div>
      
      {/* 1. Membresia Destaque & Resumo Rápido Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Card TOTAL DE MEMBROS -> Vai para Membros */}
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

        {/* Card de Resumo Financeiro -> Vai para Financeiro */}
        <div 
          onClick={() => navigate('/financeiro')}
          className="bg-white rounded-xl shadow-md md:shadow-lg p-4 md:p-6 border-l-4 border-brand-orange flex items-center col-span-1 md:col-span-2 lg:col-span-2 cursor-pointer transition-all duration-300 active:scale-95 md:hover:-translate-y-2 md:hover:shadow-2xl"
        >
          <div className="flex w-full justify-around items-center divide-x divide-gray-100 md:divide-none">
            <div className="text-center px-2">
               <p className="text-gray-500 text-[10px] md:text-base font-bold uppercase tracking-widest mb-1">Entradas</p>
               <p className="text-lg md:text-3xl font-black text-green-600 flex flex-col md:flex-row items-center justify-center">
                 <span className="hidden md:inline"><TrendingUp size={28} className="mr-2"/></span> 
                 R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
            </div>
            <div className="text-center px-2">
               <p className="text-gray-500 text-[10px] md:text-base font-bold uppercase tracking-widest mb-1">Saídas</p>
               <p className="text-lg md:text-3xl font-black text-brand-red flex flex-col md:flex-row items-center justify-center">
                 <span className="hidden md:inline"><TrendingDown size={28} className="mr-2"/></span>
                 R$ {totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
            </div>
            <div className="text-center px-2">
               <p className="text-gray-500 text-[10px] md:text-base font-bold uppercase tracking-widest mb-1">Saldo</p>
               <p className={`text-lg md:text-3xl font-black ${balance >= 0 ? 'text-brand-black' : 'text-brand-red'}`}>
                 R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
        {/* 1. Caixa de Dízimos -> Vai para Financeiro */}
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

            <div className="bg-yellow-50 p-4 md:p-6 rounded-xl text-center border border-yellow-100">
               <span className="text-brand-orange font-black text-2xl md:text-3xl">{tithersCount}</span> 
               <p className="text-brand-orange font-bold mt-1 text-sm md:text-base">dizimistas fiéis este mês</p>
            </div>
          </div>
        </div>

        {/* 2. Caixa de Missões -> Vai para Financeiro */}
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

        {/* 3. Caixa de Ofertas -> Vai para Financeiro */}
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

      {/* Fluxo de Caixa Mensal */}
      <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-gray-700 mb-4 md:mb-6">Fluxo de Caixa ({new Date().toLocaleString('pt-BR', { month: 'long' })})</h3>
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
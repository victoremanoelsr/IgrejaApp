import React, { useEffect, useState } from 'react';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Coins, 
  Banknote, 
  LayoutDashboard,
  Calendar,
  Wallet,
  Globe,
  TrendingDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { members, transactions, currentChurch, user } = useApp();
  const navigate = useNavigate();

  // Estados para filtro de data (Padrão: Mês/Ano atual)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
  
  // Categorias que NÃO entram no financeiro GERAL do topo (Caixas separados)
  const excludedCategoriesFromGeneral = ['MISSOES', 'JOVENS', 'CRIANCAS', 'SENHORAS'];

  // Helper para verificar data selecionada
  const matchesSelectedDate = (dateStr: string) => {
      const [y, m] = dateStr.split('-').map(Number);
      return m === selectedMonth && y === selectedYear;
  };

  // --- CÁLCULOS GERAIS (Topo Direita) ---
  const generalTransactions = transactions.filter(t => 
      t.churchId === viewId && 
      !t.campaignId &&
      !excludedCategoriesFromGeneral.includes(t.category) &&
      matchesSelectedDate(t.date) &&
      t.status === 'PAGO'
  );

  const totalInGeneral = generalTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const totalOutGeneral = generalTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  const balanceGeneral = totalInGeneral - totalOutGeneral;

  // --- CÁLCULOS DÍZIMOS (Meio Esquerda) ---
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

  // --- CÁLCULOS MISSÕES (Meio Centro) ---
  const missionsTransactions = transactions.filter(t => 
      t.churchId === viewId &&
      t.category === 'MISSOES' &&
      matchesSelectedDate(t.date) &&
      t.status === 'PAGO'
  );
  const missionsIn = missionsTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const missionsOut = missionsTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  
  // Saldo de Missões geralmente é cumulativo, mas aqui estamos mostrando o fluxo do mês para coerência com o gráfico de pizza.
  // Se quiser saldo total, precisaria remover o filtro de data para o saldo.
  // O PieChart geralmente mostra Entradas vs Saídas do mês.
  // Vamos manter o cálculo do mês para as barras inferiores e o saldo.
  const missionsBalance = missionsIn - missionsOut;

  const missionsChartData = [
      { name: 'Entradas', value: missionsIn > 0 ? missionsIn : 0, color: '#10b981' }, // green-500
      { name: 'Saídas', value: missionsOut, color: '#ef4444' } // red-500
  ];
  // Se não houver dados, para não quebrar o gráfico
  if (missionsIn === 0 && missionsOut === 0) {
      missionsChartData.push({ name: 'Vazio', value: 1, color: '#e5e7eb' });
  }

  // --- CÁLCULOS OFERTAS (Meio Direita) ---
  // Pegamos as ofertas do mês para o gráfico
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

  // --- CÁLCULOS FLUXO DE CAIXA MENSAL (Fundo) ---
  // Considera TODAS as transações do mês para o fluxo global da igreja (incluindo departamentos se desejar, ou apenas geral. 
  // O print sugere "Fluxo de Caixa Mensal", geralmente é o Geral. Vamos usar o generalTransactions.
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dailyFlowData = Array.from({ length: daysInMonth }, (_, i) => ({ day: (i + 1).toString(), entradas: 0, saidas: 0 }));
  
  generalTransactions.forEach(t => {
      const d = parseInt(t.date.split('-')[2]);
      if (d >= 1 && d <= daysInMonth) {
          if(t.type === 'ENTRADA') dailyFlowData[d-1].entradas += t.amount; 
          else dailyFlowData[d-1].saidas += t.amount;
      }
  });

  return (
    <div className="space-y-8 pb-20 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Painel Geral</h1>
           <div className="flex items-center gap-2 mt-1">
             <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${currentChurch.type === 'SEDE' ? 'bg-brand-red' : 'bg-blue-600'}`}>
                {currentChurch.type}
             </span>
             <span className="text-sm font-medium text-gray-500 uppercase">{currentChurch.name}</span>
           </div>
        </div>

        {/* SELETOR DE MÊS/ANO */}
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <div className="px-2 text-gray-400"><Calendar size={16}/></div>
            <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold text-gray-700 p-1 outline-none cursor-pointer border-r border-gray-200"
            >
                {Array.from({length: 12}, (_, i) => (
                    <option key={i} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'}).toUpperCase()}</option>
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
      
      {/* LINHA 1: MEMBROS E FINANCEIRO GERAL */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* CARD MEMBROS (3 colunas em LG) */}
        <div onClick={() => navigate('/membros')} className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border-l-4 border-brand-black p-6 flex items-center justify-between cursor-pointer hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Membros</p>
                <p className="text-4xl font-extrabold text-gray-800 mt-2">{churchMembers.length}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-full text-gray-700">
                <Users size={28}/>
            </div>
        </div>

        {/* CARD FINANCEIRO GERAL (9 colunas em LG) */}
        <div onClick={() => navigate('/financeiro')} className="col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border-l-4 border-brand-orange p-6 flex flex-col justify-center cursor-pointer hover:shadow-md transition-all">
            <div className="grid grid-cols-3 gap-4 divide-x divide-gray-100">
                <div className="text-center px-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Entradas</p>
                    <p className="text-2xl font-black text-green-600">R$ {totalInGeneral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
                <div className="text-center px-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Saídas</p>
                    <p className="text-2xl font-black text-red-600">R$ {totalOutGeneral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
                <div className="text-center px-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Saldo</p>
                    <p className={`text-2xl font-black ${balanceGeneral >= 0 ? 'text-gray-800' : 'text-red-600'}`}>R$ {balanceGeneral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
            </div>
        </div>
      </div>

      {/* LINHA 2: DÍZIMOS, MISSÕES, OFERTAS */}
      {/* Alterado para 2 colunas em telas médias/laptop para ficarem mais largos, e 3 apenas em XL */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        
        {/* CARD DÍZIMOS */}
        <div onClick={() => navigate('/financeiro')} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md h-96">
            <div>
                <div className="flex items-center mb-2">
                    <Coins size={18} className="text-brand-yellow mr-2"/>
                    <h3 className="font-bold text-gray-800 text-lg">Dízimos</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">Total Arrecadado</p>
                <p className="text-right text-3xl font-black text-green-600">R$ {tithesTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                    <p className="text-2xl font-black text-green-700">{activeTithersCount}</p>
                    <p className="text-[10px] font-bold text-green-600 uppercase">Dizimista Ativos</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-100">
                    <p className="text-2xl font-black text-orange-700">{totalRegisteredTithers}</p>
                    <p className="text-[10px] font-bold text-orange-600 uppercase">Total Cadastrados</p>
                </div>
            </div>
        </div>

        {/* CARD MISSÕES */}
        <div onClick={() => navigate('/missoes')} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col cursor-pointer hover:shadow-md h-96 relative">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                    <Globe size={18} className="text-red-500 mr-2"/>
                    <h3 className="font-bold text-gray-800 text-lg">Missões</h3>
                </div>
                <span className="text-xs md:text-sm font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
                    Saldo: R$ {missionsBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
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
                    <p className="text-lg font-bold text-green-600">R$ {missionsIn.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Entradas do Mês</p>
                </div>
                <div className="text-center border-l">
                    <p className="text-lg font-bold text-red-600">R$ {missionsOut.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Saídas do Mês</p>
                </div>
            </div>
        </div>

        {/* CARD OFERTAS RECENTES */}
        <div onClick={() => navigate('/financeiro')} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col cursor-pointer hover:shadow-md h-96">
            <div className="flex items-center mb-6">
                <Banknote size={18} className="text-brand-orange mr-2"/>
                <h3 className="font-bold text-gray-800 text-lg">Ofertas Recentes</h3>
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
                                tickFormatter={(v) => `R$ ${v}`} 
                            />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} formatter={(val: number) => [`R$ ${val}`, '']}/>
                            <Bar dataKey="valor" fill="#f97316" radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <Banknote size={40} className="mb-3 opacity-30"/>
                        <p className="text-sm">Sem ofertas recentes</p>
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* LINHA 3: FLUXO DE CAIXA MENSAL */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
            <Globe className="text-teal-600" size={20}/>
            <h3 className="font-bold text-gray-700">Fluxo de Caixa Mensal ({new Date(0, selectedMonth - 1).toLocaleString('pt-BR', {month: 'long'}).toUpperCase()} / {selectedYear})</h3>
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
                tickFormatter={(value) => `R$${value}`} 
                axisLine={false} 
                tickLine={false}
                tick={{fontSize: 12, fill: '#9ca3af'}}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '']}
              />
              <Legend iconType="circle" iconSize={8} verticalAlign="top" align="left" wrapperStyle={{fontSize: '12px', top: -20, left: 0}}/>
              <Line 
                type="monotone" 
                dataKey="entradas" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={false}
                activeDot={{r: 6, strokeWidth: 0}}
                name="Entradas" 
              />
              <Line 
                type="monotone" 
                dataKey="saidas" 
                stroke="#ef4444" 
                strokeWidth={3} 
                dot={false}
                activeDot={{r: 6, strokeWidth: 0}}
                name="Saídas" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
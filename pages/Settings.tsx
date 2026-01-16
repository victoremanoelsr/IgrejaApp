import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { Settings as SettingsIcon, Save, Building } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, churches, updateChurch } = useApp();
  const currentChurch = churches.find(c => c.id === user?.churchId);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [pastorName, setPastorName] = useState('');
  const [mission, setMission] = useState('');

  useEffect(() => {
    if (currentChurch) {
      setName(currentChurch.name);
      setAddress(currentChurch.address);
      setPastorName(currentChurch.pastorName);
      setMission(currentChurch.missionStatement || '');
    }
  }, [currentChurch]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentChurch) {
      updateChurch(currentChurch.id, {
        name: name.toUpperCase(),
        address: address.toUpperCase(),
        pastorName: pastorName.toUpperCase(),
        missionStatement: mission.toUpperCase()
      });
      alert('Informações atualizadas com sucesso!');
    }
  };

  if (!currentChurch) return <div>Erro: Igreja não encontrada.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div className="flex items-center mb-6 border-b pb-4">
          <SettingsIcon className="mr-3 text-brand-black" size={32}/>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Configurações da Unidade</h1>
            <p className="text-gray-500">Gerencie os dados públicos desta igreja</p>
          </div>
       </div>

       <div className="bg-white p-8 rounded-xl shadow-lg">
          <form onSubmit={handleSave} className="space-y-6">
             <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow">
                   <Building size={40} className="text-gray-400"/>
                </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700">Nome da Igreja / Congregação</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-3 border rounded-lg focus:ring-brand-orange uppercase"
                 value={name}
                 onChange={e => setName(e.target.value.toUpperCase())}
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700">Endereço Completo</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-3 border rounded-lg focus:ring-brand-orange uppercase"
                 value={address}
                 onChange={e => setAddress(e.target.value.toUpperCase())}
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700">Pastor Responsável</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-3 border rounded-lg focus:ring-brand-orange uppercase"
                 value={pastorName}
                 onChange={e => setPastorName(e.target.value.toUpperCase())}
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700">Declaração de Missão / Lema</label>
               <textarea 
                 rows={3}
                 className="mt-1 block w-full p-3 border rounded-lg focus:ring-brand-orange uppercase"
                 value={mission}
                 onChange={e => setMission(e.target.value.toUpperCase())}
               />
             </div>

             <div className="pt-4 border-t">
               <button type="submit" className="w-full flex justify-center items-center px-6 py-3 bg-brand-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-lg">
                 <Save className="mr-2"/> Salvar Alterações
               </button>
             </div>
          </form>
       </div>
    </div>
  );
};
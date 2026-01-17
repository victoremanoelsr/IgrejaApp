
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import { Settings as SettingsIcon, Save, Building, Camera, Upload } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, churches, updateChurch, uploadChurchLogo } = useApp();
  const currentChurch = churches.find(c => c.id === user?.churchId);
  
  // Encontrar a igreja pai (Sede) se for congregação
  const parentChurch = churches.find(c => c.id === currentChurch?.parentId);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [pastorName, setPastorName] = useState(''); // Se congregação, este é o Dirigente
  const [mission, setMission] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentChurch) {
      setName(currentChurch.name);
      setAddress(currentChurch.address);
      setPastorName(currentChurch.pastorName);
      setMission(currentChurch.missionStatement || '');
      setLogoUrl(currentChurch.logoUrl || '');
    }
  }, [currentChurch]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentChurch) {
        setIsUploading(true);
        const url = await uploadChurchLogo(e.target.files[0]);
        if (url) {
            setLogoUrl(url);
            // Salva imediatamente o logo
            const res = await updateChurch(currentChurch.id, { logoUrl: url });
            if (!res.success) {
                alert(`Erro ao salvar logo no banco de dados: ${res.error}`);
            }
        } else {
            alert("Erro ao enviar a logo.");
        }
        setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentChurch) {
      setIsSaving(true);
      const res = await updateChurch(currentChurch.id, {
        name: name.toUpperCase(),
        address: address.toUpperCase(),
        pastorName: pastorName.toUpperCase(),
        missionStatement: mission.toUpperCase(),
        logoUrl: logoUrl
      });
      setIsSaving(false);

      if (res.success) {
          alert('Informações atualizadas com sucesso!');
      } else {
          alert(`Erro ao atualizar informações: ${res.error}\n\nVerifique se o script de atualização do banco de dados foi executado.`);
      }
    }
  };

  if (!currentChurch) return <div>Erro: Igreja não encontrada.</div>;

  const isCongregation = currentChurch.type === 'CONGREGACAO';
  const presidentName = isCongregation && parentChurch ? parentChurch.pastorName : (isCongregation ? 'Não vinculado' : pastorName);

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
             
             {/* LOGO UPLOAD SECTION */}
             <div className="flex flex-col items-center justify-center mb-6">
                <div 
                    className="h-32 w-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg relative group cursor-pointer overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                >
                   {logoUrl ? (
                       <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                   ) : (
                       <Building size={48} className="text-gray-300"/>
                   )}
                   
                   <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="mb-1"/>
                      <span className="text-[10px] font-bold uppercase">Alterar Logo</span>
                   </div>
                </div>
                
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                />
                
                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 text-brand-orange text-sm font-bold hover:underline flex items-center">
                    {isUploading ? 'Enviando...' : (logoUrl ? 'Trocar Logo' : 'Adicionar Logo')}
                </button>
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

             {/* LÓGICA DE PASTOR / DIRIGENTE */}
             {isCongregation ? (
                 <>
                    {/* Campo READ-ONLY mostrando o Presidente da Sede */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Pastor Responsável (Presidente)</label>
                        <input 
                            type="text" 
                            disabled
                            className="mt-1 block w-full p-3 border rounded-lg bg-gray-100 text-gray-600 font-medium uppercase cursor-not-allowed"
                            value={presidentName}
                        />
                        <p className="text-xs text-gray-500 mt-1">Este dado é gerenciado pela Sede.</p>
                    </div>

                    {/* Campo EDITÁVEL para o Dirigente Local */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Dirigente do Campo / Congregação</label>
                        <input 
                            type="text" 
                            className="mt-1 block w-full p-3 border rounded-lg focus:ring-brand-orange uppercase"
                            value={pastorName}
                            onChange={e => setPastorName(e.target.value.toUpperCase())}
                            placeholder="NOME DO DIRIGENTE LOCAL"
                        />
                    </div>
                 </>
             ) : (
                 /* Se for SEDE, edita o Pastor Responsável diretamente */
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Pastor Responsável (Presidente)</label>
                   <input 
                     type="text" 
                     className="mt-1 block w-full p-3 border rounded-lg focus:ring-brand-orange uppercase"
                     value={pastorName}
                     onChange={e => setPastorName(e.target.value.toUpperCase())}
                   />
                 </div>
             )}

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
               <button 
                type="submit" 
                disabled={isUploading || isSaving} 
                className={`w-full flex justify-center items-center px-6 py-3 bg-brand-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-lg ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
               >
                 <Save className="mr-2"/> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
               </button>
             </div>
          </form>
       </div>
    </div>
  );
};

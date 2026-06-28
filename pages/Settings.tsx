import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import { Settings as SettingsIcon, Save, Building, Camera, AlertTriangle, CheckCircle, Info, Key, BarChart2, Eye, EyeOff, FileDown, Filter } from 'lucide-react';
import { getPrestacaoConfig, PRESTACAO_CONFIG_KEY, PrestacaoConfig } from './member/MemberPrestacaoContas';

const validatePixKey = (key: string): { valid: boolean; type: string } => {
  const cleaned = key.replace(/\D/g, '');
  if (/^\d{11}$/.test(cleaned)) return { valid: true, type: 'CPF' };
  if (/^\d{14}$/.test(cleaned)) return { valid: true, type: 'CNPJ' };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return { valid: true, type: 'E-mail' };
  if (/^\+?55\d{10,11}$/.test(cleaned) || /^\d{10,11}$/.test(cleaned)) return { valid: true, type: 'Telefone' };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return { valid: true, type: 'Chave Aleatória' };
  if (key.length === 0) return { valid: false, type: '' };
  return { valid: false, type: 'Inválida' };
};

export const Settings: React.FC = () => {
  const { user, churches, updateChurch, uploadChurchLogo, systemSettings } = useApp();
  const currentChurch = churches.find(c => c.id === user?.churchId);
  
  // Encontrar a igreja pai (Sede) se for congregação
  const parentChurch = churches.find(c => c.id === currentChurch?.parentId);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [pastorName, setPastorName] = useState(''); // Se congregação, este é o Dirigente
  const [pastorPhone, setPastorPhone] = useState('');
  const [mission, setMission] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Prestação de Contas config
  const [prestConfig, setPrestConfig] = useState<PrestacaoConfig>({
    enabled: true, showDetail: true, allowPDF: false, showMonthFilter: true,
  });
  const [prestSaved, setPrestSaved] = useState(false);

  // --- CUSTOM MODAL STATE ---
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'success' | 'info';
    showCancel: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    showCancel: false,
    onConfirm: undefined
  });

  const showAlert = (title: string, message: string, variant: 'success' | 'info' | 'danger' | 'warning' = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      variant,
      showCancel: false,
      onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentChurch) {
      setName(currentChurch.name);
      setAddress(currentChurch.address);
      setPastorName(currentChurch.pastorName);
      setPastorPhone(currentChurch.pastorPhone || '');
      setMission(currentChurch.missionStatement || '');
      setLogoUrl(currentChurch.logoUrl || '');
      setPixKey(currentChurch.pixKey != null ? currentChurch.pixKey.trim() : (systemSettings.masterPixKey?.trim() || ''));
      setPrestConfig(getPrestacaoConfig(currentChurch.id));
    }
  }, [currentChurch]);

  const handleSavePrestConfig = () => {
    if (!currentChurch) return;
    localStorage.setItem(PRESTACAO_CONFIG_KEY + currentChurch.id, JSON.stringify(prestConfig));
    setPrestSaved(true);
    setTimeout(() => setPrestSaved(false), 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentChurch) {
        setIsUploading(true);
        const url = await uploadChurchLogo(e.target.files[0]);
        if (url) {
            setLogoUrl(url);
            // Salva imediatamente o logo
            const res = await updateChurch(currentChurch.id, { logoUrl: url });
            if (!res.success) {
                showAlert('Erro', `Erro ao salvar logo no banco de dados: ${res.error}`, 'danger');
            } else {
                showAlert('Sucesso', 'Logo atualizada com sucesso! O ícone do App será atualizado na próxima inicialização.', 'success');
            }
        } else {
            showAlert('Erro', "Erro ao enviar a logo.", 'danger');
        }
        setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentChurch) {
      setIsSaving(true);
      const pixValidation = validatePixKey(pixKey);
      if (pixKey && !pixValidation.valid) {
        showAlert('Chave PIX inválida', 'Informe uma chave PIX válida (CPF, CNPJ, e-mail, telefone ou chave aleatória).', 'warning');
        setIsSaving(false);
        return;
      }
      const res = await updateChurch(currentChurch.id, {
        name: name.toUpperCase(),
        address: address.toUpperCase(),
        pastorName: pastorName.toUpperCase(),
        pastorPhone: pastorPhone.replace(/\D/g, ''),
        missionStatement: mission.toUpperCase(),
        logoUrl: logoUrl,
        pixKey: pixKey.trim(),
      });
      setIsSaving(false);

      if (res.success) {
          showAlert('Sucesso', 'Informações atualizadas com sucesso!', 'success');
      } else {
          showAlert('Erro', `Erro ao atualizar informações: ${res.error}\n\nVerifique se o script de atualização do banco de dados foi executado.`, 'danger');
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
                      <span className="text-[10px] font-bold uppercase">Alterar</span>
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
                    {isUploading ? 'Enviando...' : (logoUrl ? 'Alterar Logo' : 'Adicionar Logo / Ícone')}
                </button>
                <p className="text-xs text-gray-400 mt-1"></p>
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
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Pastor Responsável (Presidente)</label>
                     <input 
                       type="text" 
                       className="mt-1 block w-full p-3 border rounded-lg focus:ring-brand-orange uppercase"
                       value={pastorName}
                       onChange={e => setPastorName(e.target.value.toUpperCase())}
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700">WhatsApp do Pastor Presidente</label>
                     <input 
                       type="tel"
                       inputMode="tel"
                       placeholder="55 11 99999-9999"
                       className="mt-1 block w-full p-3 border rounded-lg focus:ring-brand-orange"
                       value={pastorPhone}
                       onChange={e => setPastorPhone(e.target.value)}
                     />
                     <p className="text-xs text-gray-500 mt-1">Receberá os pedidos de oração enviados pelo Portal do Membro. Inclua o DDI 55.</p>
                   </div>
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

             {/* PIX KEY FIELD */}
             <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
               <div className="flex items-center gap-2 mb-1">
                 <Key size={16} className="text-blue-600 shrink-0" />
                 <label className="block text-sm font-semibold text-blue-800">Chave PIX da Igreja</label>
                 {(() => {
                   const v = validatePixKey(pixKey);
                   if (pixKey && v.valid) return <span className="ml-auto text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{v.type}</span>;
                   if (pixKey && !v.valid) return <span className="ml-auto text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inválida</span>;
                   return null;
                 })()}
               </div>
               <input
                 type="text"
                 className={`block w-full p-3 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${
                   pixKey && !validatePixKey(pixKey).valid
                     ? 'border-red-400 focus:ring-red-300 bg-white'
                     : pixKey && validatePixKey(pixKey).valid
                     ? 'border-green-400 focus:ring-green-300 bg-white'
                     : 'border-blue-200 focus:ring-blue-300 bg-white'
                 }`}
                 placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                 value={pixKey}
                 onChange={e => setPixKey(e.target.value)}
               />
               <p className="text-xs text-blue-600 flex items-start gap-1.5">
                 <Info size={13} className="shrink-0 mt-0.5" />
                 Esta chave será exibida no Portal do Membro para recebimento de dízimos e ofertas.
               </p>
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

       {/* PRESTAÇÃO DE CONTAS CONFIG */}
       <div className="bg-white p-8 rounded-xl shadow-lg">
         <div className="flex items-center gap-3 mb-6 pb-4 border-b">
           <div className="p-2 bg-orange-50 rounded-lg">
             <BarChart2 size={22} className="text-brand-orange" />
           </div>
           <div>
             <h2 className="text-lg font-bold text-gray-800">Prestação de Contas — Portal do Membro</h2>
             <p className="text-sm text-gray-500">Configure o que os membros podem ver no relatório financeiro público</p>
           </div>
         </div>

         <div className="space-y-4">
           {/* Toggle: Habilitar */}
           <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
             <div className="flex items-center gap-3">
               {prestConfig.enabled ? <Eye size={18} className="text-green-600" /> : <EyeOff size={18} className="text-gray-400" />}
               <div>
                 <p className="font-semibold text-gray-800 text-sm">Exibir prestação de contas no Portal do Membro</p>
                 <p className="text-xs text-gray-500">Se desativado, os membros verão uma tela de "indisponível"</p>
               </div>
             </div>
             <button
               onClick={() => setPrestConfig(c => ({ ...c, enabled: !c.enabled }))}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prestConfig.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
             >
               <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prestConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
           </div>

           {prestConfig.enabled && (
             <>
               {/* Toggle: Movimentações detalhadas */}
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                 <div className="flex items-center gap-3">
                   <Eye size={18} className="text-blue-500" />
                   <div>
                     <p className="font-semibold text-gray-800 text-sm">Mostrar movimentações detalhadas</p>
                     <p className="text-xs text-gray-500">Membro verá lista com data, categoria, tipo e valor. Se desativado, verá apenas o resumo por categoria.</p>
                   </div>
                 </div>
                 <button
                   onClick={() => setPrestConfig(c => ({ ...c, showDetail: !c.showDetail }))}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prestConfig.showDetail ? 'bg-blue-500' : 'bg-gray-300'}`}
                 >
                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prestConfig.showDetail ? 'translate-x-6' : 'translate-x-1'}`} />
                 </button>
               </div>

               {/* Toggle: Filtro por mês */}
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                 <div className="flex items-center gap-3">
                   <Filter size={18} className="text-purple-500" />
                   <div>
                     <p className="font-semibold text-gray-800 text-sm">Permitir filtro por mês</p>
                     <p className="text-xs text-gray-500">Membro pode selecionar mês e ano para visualizar</p>
                   </div>
                 </div>
                 <button
                   onClick={() => setPrestConfig(c => ({ ...c, showMonthFilter: !c.showMonthFilter }))}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prestConfig.showMonthFilter ? 'bg-purple-500' : 'bg-gray-300'}`}
                 >
                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prestConfig.showMonthFilter ? 'translate-x-6' : 'translate-x-1'}`} />
                 </button>
               </div>

               {/* Toggle: Exportar PDF */}
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                 <div className="flex items-center gap-3">
                   <FileDown size={18} className="text-orange-500" />
                   <div>
                     <p className="font-semibold text-gray-800 text-sm">Permitir exportação em PDF</p>
                     <p className="text-xs text-gray-500">Membro poderá baixar o relatório em PDF</p>
                   </div>
                 </div>
                 <button
                   onClick={() => setPrestConfig(c => ({ ...c, allowPDF: !c.allowPDF }))}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prestConfig.allowPDF ? 'bg-orange-500' : 'bg-gray-300'}`}
                 >
                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prestConfig.allowPDF ? 'translate-x-6' : 'translate-x-1'}`} />
                 </button>
               </div>
             </>
           )}

           {/* Aviso privacidade */}
           <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4">
             <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
             <p className="text-xs text-blue-700 leading-relaxed">
               <strong>Privacidade garantida:</strong> O sistema nunca exibe nome de contribuinte, CPF, telefone ou dados pessoais no Portal do Membro. Apenas data, categoria, tipo e valor são visíveis.
             </p>
           </div>

           <button
             onClick={handleSavePrestConfig}
             className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-brand-orange text-white rounded-lg hover:bg-brand-red transition-colors shadow-lg font-bold active:scale-95"
           >
             {prestSaved ? <><CheckCircle size={18} /> Configurações salvas!</> : <><Save size={18} /> Salvar Configurações de Prestação de Contas</>}
           </button>
         </div>
       </div>

       {/* GLOBAL CONFIRM/ALERT MODAL */}
       {modalState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
             <div className={`h-2 ${
               modalState.variant === 'danger' ? 'bg-red-500' : 
               modalState.variant === 'warning' ? 'bg-yellow-500' : 
               modalState.variant === 'success' ? 'bg-green-500' : 
               'bg-blue-500'
             }`}></div>

             <div className="p-6">
                <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-full mr-4 ${
                         modalState.variant === 'danger' ? 'bg-red-100 text-red-500' : 
                         modalState.variant === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                         modalState.variant === 'success' ? 'bg-green-100 text-green-600' : 
                         'bg-blue-100 text-blue-600'
                    }`}>
                        {modalState.variant === 'danger' && <AlertTriangle size={24}/>}
                        {modalState.variant === 'warning' && <AlertTriangle size={24}/>}
                        {modalState.variant === 'success' && <CheckCircle size={24}/>}
                        {modalState.variant === 'info' && <Info size={24}/>}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{modalState.title}</h3>
                </div>
                
                <p className="text-gray-600 mb-6 text-sm leading-relaxed whitespace-pre-line pl-[3.5rem] -mt-2">
                    {modalState.message}
                </p>

                <div className="flex justify-end space-x-3">
                    {modalState.showCancel && (
                        <button 
                            onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            if (modalState.onConfirm) modalState.onConfirm();
                            else setModalState(prev => ({ ...prev, isOpen: false }));
                        }}
                        className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95 ${
                            modalState.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                            modalState.variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : 
                            modalState.variant === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                            'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {modalState.showCancel ? 'Confirmar' : 'OK'}
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
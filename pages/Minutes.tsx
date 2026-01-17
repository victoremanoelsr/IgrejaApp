
import React, { useState, useRef } from 'react';
import { useApp } from '../context';
import { 
    FileText, Plus, Download, Calendar, ShieldAlert, Upload, Loader, X, 
    Eye, Trash2, Edit2, AlertTriangle, CheckCircle, Info, Save 
} from 'lucide-react';
import { Minute } from '../types';

export const Minutes: React.FC = () => {
  const { minutes, user, addMinute, updateMinute, deleteMinute, uploadMinuteFile, currentChurch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingMinuteId, setEditingMinuteId] = useState<string | null>(null);
  
  // Estado para Visualização
  const [viewingMinute, setViewingMinute] = useState<Minute | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Custom Modal State (Confirmation)
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

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' = 'warning') => {
    setModalState({
      isOpen: true,
      title,
      message,
      variant,
      showCancel: true,
      onConfirm: () => {
        onConfirm();
        setModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Isolate by Current Church (like other pages)
  const viewId = currentChurch?.id;
  const churchMinutes = minutes.filter(m => m.churchId === viewId);

  // Verificação de Permissão: Tesoureiro só pode ver
  const canEdit = user?.role !== 'TESOUREIRO';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedFile(e.target.files[0]);
      }
  };

  const handleEdit = (minute: Minute) => {
      setEditingMinuteId(minute.id);
      setTitle(minute.title);
      setDate(minute.date);
      setSelectedFile(null); // Reset file selection
      setShowForm(true);
  };

  const handleDelete = (minute: Minute) => {
      showConfirm(
          "Excluir Ata",
          `Tem certeza que deseja excluir a ata "${minute.title}"?`,
          () => deleteMinute(minute.id),
          'danger'
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !viewId) return;

    if (!editingMinuteId && !selectedFile) {
        showAlert("Aviso", "Por favor, selecione um arquivo (PDF ou Imagem) para a nova ata.", 'warning');
        return;
    }

    setIsUploading(true);
    let finalFileUrl = editingMinuteId ? churchMinutes.find(m => m.id === editingMinuteId)?.fileUrl : '';

    // 1. Upload do Arquivo (se houver novo)
    if (selectedFile) {
        const uploadedUrl = await uploadMinuteFile(selectedFile);
        if (uploadedUrl) {
            finalFileUrl = uploadedUrl;
        } else {
            showAlert("Erro", "Falha ao fazer upload do arquivo. Tente novamente.", 'danger');
            setIsUploading(false);
            return;
        }
    }

    const payload: Minute = {
      id: editingMinuteId || '',
      churchId: viewId,
      title: title.toUpperCase(),
      date,
      fileUrl: finalFileUrl || ''
    };

    if (editingMinuteId) {
        await updateMinute(editingMinuteId, payload);
        showAlert("Sucesso", "Ata atualizada com sucesso!", 'success');
    } else {
        await addMinute(payload);
        showAlert("Sucesso", "Ata arquivada com sucesso!", 'success');
    }
    
    setIsUploading(false);
    setShowForm(false);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedFile(null);
    setEditingMinuteId(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderViewModal = () => {
      if (!viewingMinute) return null;

      const isImage = viewingMinute.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) != null;
      const isPdf = viewingMinute.fileUrl.match(/\.pdf$/i) != null;

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-down">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col relative overflow-hidden">
                  <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
                      <div>
                          <h3 className="font-bold text-lg text-gray-800">{viewingMinute.title}</h3>
                          <p className="text-sm text-gray-500">{new Date(viewingMinute.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                           <a 
                                href={viewingMinute.fileUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="bg-brand-orange hover:bg-brand-red text-white px-3 py-1.5 rounded-lg flex items-center text-sm font-bold transition-colors"
                            >
                                <Download size={16} className="mr-2"/> Baixar Original
                            </a>
                            <button onClick={() => setViewingMinute(null)} className="text-gray-500 hover:text-gray-800 p-2 hover:bg-gray-200 rounded-full">
                                <X size={24}/>
                            </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-4">
                      {isImage ? (
                          <img src={viewingMinute.fileUrl} alt="Ata" className="max-w-full max-h-full object-contain shadow-lg" />
                      ) : isPdf ? (
                          <iframe src={viewingMinute.fileUrl} className="w-full h-full rounded shadow-lg" title="PDF Viewer">
                              <div className="text-center p-10">
                                  <p>Seu navegador não suporta visualização de PDF.</p>
                                  <a href={viewingMinute.fileUrl} target="_blank" rel="noreferrer" className="text-brand-orange underline">Clique para baixar</a>
                              </div>
                          </iframe>
                      ) : (
                           <div className="text-center text-gray-500">
                               <FileText size={64} className="mx-auto mb-4 opacity-50"/>
                               <p className="text-lg font-medium">Pré-visualização não disponível para este formato.</p>
                               <a href={viewingMinute.fileUrl} target="_blank" rel="noreferrer" className="text-brand-orange hover:underline mt-2 inline-block">Fazer Download do Arquivo</a>
                           </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  if (!viewId) return <div>Carregando unidade...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <FileText className="mr-3 text-brand-orange" /> Livro de Atas
            </h1>
            {!canEdit && (
                <div className="flex items-center text-xs font-bold text-brand-orange uppercase bg-orange-50 px-2 py-1 rounded border border-orange-200 mt-1 w-fit">
                    <ShieldAlert size={14} className="mr-1"/> Apenas Visualização (Tesoureiro)
                </div>
            )}
            <p className="text-gray-500 text-sm mt-1 ml-1">{currentChurch?.name}</p>
        </div>
        
        {canEdit && (
            <button 
            onClick={() => {
                setEditingMinuteId(null);
                setTitle('');
                setDate(new Date().toISOString().split('T')[0]);
                setSelectedFile(null);
                setShowForm(!showForm);
            }}
            className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800"
            >
            <Plus size={20} className="mr-2"/> Nova Ata
            </button>
        )}
      </div>

      {showForm && canEdit && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-fade-in-down">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-700">{editingMinuteId ? 'Editar Ata' : 'Arquivar Nova Ata'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Título da Reunião</label>
              <input 
                type="text" 
                required
                placeholder="EX: ASSEMBLEIA GERAL ORDINÁRIA"
                className="mt-1 block w-full p-2 border rounded-md uppercase focus:ring-brand-orange"
                value={title}
                onChange={e => setTitle(e.target.value.toUpperCase())}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Data</label>
                <input 
                  type="date" 
                  required
                  className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                    Arquivo {editingMinuteId ? '(Deixe vazio para manter o atual)' : '(PDF ou Imagem)'}
                </label>
                <div className="mt-1 relative flex items-center">
                   <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      id="file-upload"
                   />
                   <label 
                      htmlFor="file-upload" 
                      className="cursor-pointer flex items-center justify-center w-full p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-brand-orange hover:bg-orange-50 transition-colors text-sm text-gray-600"
                   >
                      <Upload size={18} className="mr-2"/> 
                      {selectedFile ? selectedFile.name : (editingMinuteId ? 'Clique para substituir o arquivo' : 'Clique para selecionar o arquivo')}
                   </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
               <button 
                type="submit" 
                disabled={isUploading}
                className={`bg-brand-orange text-white px-6 py-2 rounded-lg hover:bg-brand-red flex items-center ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
               >
                 {isUploading ? <Loader className="animate-spin mr-2" size={18}/> : <Save size={18} className="mr-2"/>}
                 {isUploading ? 'Enviando...' : (editingMinuteId ? 'Atualizar' : 'Arquivar')}
               </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assunto</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {churchMinutes.map((minute) => (
              <tr 
                key={minute.id} 
                className="hover:bg-gray-50 cursor-pointer group transition-colors"
                onClick={() => setViewingMinute(minute)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center">
                  <Calendar size={16} className="mr-2 text-gray-400 group-hover:text-brand-orange"/>
                  {new Date(minute.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 group-hover:text-brand-orange">
                  {minute.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                   <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                       {/* BOTÃO VER / LER */}
                       <button 
                            onClick={() => setViewingMinute(minute)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Ler Ata"
                        >
                            <Eye size={18}/>
                       </button>

                       {/* BOTÃO BAIXAR */}
                       <a 
                            href={minute.fileUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Baixar Arquivo"
                        >
                           <Download size={18} />
                        </a>

                       {/* BOTÕES DE EDIÇÃO (RESTRICTED) */}
                       {canEdit && (
                           <>
                                <button 
                                    onClick={() => handleEdit(minute)}
                                    className="p-1.5 text-gray-500 hover:text-brand-orange hover:bg-orange-50 rounded transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={18}/>
                                </button>
                                <button 
                                    onClick={() => handleDelete(minute)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={18}/>
                                </button>
                           </>
                       )}
                   </div>
                </td>
              </tr>
            ))}
            {churchMinutes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">Nenhuma ata registrada nesta unidade.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Renderizar Modal de Visualização */}
      {renderViewModal()}

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


import React, { useState, useRef } from 'react';
import { useApp } from '../context';
import { 
    FileText, Plus, Download, Calendar, ShieldAlert, Upload, Loader, X, 
    Eye, Trash2, Edit2, AlertTriangle, CheckCircle, Info, Save, Paperclip, Files
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
  const churchMinutes = minutes.filter(m => m.churchId === viewId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Verificação de Permissão: Tesoureiro só pode ver
  const canEdit = user?.role !== 'TESOUREIRO';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          // Convert FileList to Array
          const newFiles = Array.from(e.target.files);
          setSelectedFiles(prev => [...prev, ...newFiles]);
      }
  };

  const removeSelectedFile = (index: number) => {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (minute: Minute) => {
      setEditingMinuteId(minute.id);
      setTitle(minute.title);
      setDate(minute.date);
      setSelectedFiles([]); // Reset file selection. User must upload NEW files to replace or add?
                            // Strategy: For editing, if user uploads files, they REPLACE the existing ones 
                            // OR we can make it complex to manage existing vs new.
                            // Simplest & Safe: If files selected, we REPLACE the whole list.
                            // If empty, we keep existing.
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

    // Check validation: Creating requires at least one file. Editing without files keeps existing.
    if (!editingMinuteId && selectedFiles.length === 0) {
        showAlert("Aviso", "Por favor, selecione pelo menos um arquivo (PDF ou Imagem).", 'warning');
        return;
    }

    setIsUploading(true);
    let finalFileUrls: string[] = [];

    // Se estiver editando e não selecionou novos arquivos, mantém os antigos
    if (editingMinuteId && selectedFiles.length === 0) {
        const existing = churchMinutes.find(m => m.id === editingMinuteId);
        if (existing) finalFileUrls = existing.fileUrls;
    } 
    // Se selecionou novos arquivos, faz upload e substitui (ou cria novo)
    else if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
            const url = await uploadMinuteFile(file);
            if (url) {
                finalFileUrls.push(url);
            }
        }
        
        if (finalFileUrls.length === 0) {
             showAlert("Erro", "Falha ao fazer upload dos arquivos.", 'danger');
             setIsUploading(false);
             return;
        }
    }

    const payload: Minute = {
      id: editingMinuteId || '',
      churchId: viewId,
      title: title.toUpperCase(),
      date,
      fileUrls: finalFileUrls
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
    setSelectedFiles([]);
    setEditingMinuteId(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderViewModal = () => {
      if (!viewingMinute) return null;

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in-down">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden">
                  <div className="flex justify-between items-center p-3 bg-gray-100 border-b shrink-0">
                      <div>
                          <h3 className="font-bold text-base md:text-lg text-gray-800 line-clamp-1">{viewingMinute.title}</h3>
                          <p className="text-xs text-gray-500">{new Date(viewingMinute.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <button onClick={() => setViewingMinute(null)} className="text-gray-500 hover:text-gray-800 p-2 hover:bg-gray-200 rounded-full">
                          <X size={24}/>
                      </button>
                  </div>
                  
                  <div className="flex-1 bg-gray-200 overflow-y-auto p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewingMinute.fileUrls.map((url, idx) => {
                              const isImage = url.match(/\.(jpeg|jpg|gif|png)$/i) != null;
                              const isPdf = url.match(/\.pdf$/i) != null;
                              
                              return (
                                <div key={idx} className="bg-white p-2 rounded shadow-sm flex flex-col">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-xs font-bold text-gray-500">Arquivo {idx + 1}</span>
                                        <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-xs flex items-center">
                                            <Download size={12} className="mr-1"/> Baixar
                                        </a>
                                    </div>
                                    
                                    <div className="flex-1 flex items-center justify-center bg-gray-50 border rounded overflow-hidden min-h-[300px]">
                                        {isImage ? (
                                            <img src={url} alt={`Anexo ${idx+1}`} className="max-w-full max-h-[500px] object-contain" />
                                        ) : isPdf ? (
                                            <iframe src={url} className="w-full h-[500px]" title={`PDF Viewer ${idx}`}>
                                                <p className="text-center p-4">Seu navegador não suporta visualização de PDF.</p>
                                            </iframe>
                                        ) : (
                                            <div className="text-center p-10 text-gray-400">
                                                <FileText size={48} className="mx-auto mb-2"/>
                                                <p>Visualização não disponível.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  if (!viewId) return <div>Carregando unidade...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <FileText className="mr-2 text-brand-orange" size={28} /> Livro de Atas
            </h1>
            {!canEdit && (
                <div className="flex items-center text-[10px] font-bold text-brand-orange uppercase bg-orange-50 px-2 py-0.5 rounded border border-orange-200 mt-1 w-fit">
                    <ShieldAlert size={12} className="mr-1"/> Apenas Visualização
                </div>
            )}
            <p className="text-gray-500 text-xs mt-0.5 ml-1">{currentChurch?.name}</p>
        </div>
        
        {canEdit && (
            <button 
            onClick={() => {
                setEditingMinuteId(null);
                setTitle('');
                setDate(new Date().toISOString().split('T')[0]);
                setSelectedFiles([]);
                setShowForm(!showForm);
            }}
            className="bg-brand-black text-white px-3 py-2 rounded-lg flex items-center hover:bg-gray-800 shadow transition-transform active:scale-95"
            >
            <Plus size={18} className="md:mr-1"/> <span className="hidden md:inline">Nova Ata</span><span className="md:hidden">Nova</span>
            </button>
        )}
      </div>

      {showForm && canEdit && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-200 animate-fade-in-down">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg text-gray-700">{editingMinuteId ? 'Editar Ata' : 'Arquivar Nova Ata'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título da Reunião</label>
              <input 
                type="text" 
                required
                placeholder="EX: ASSEMBLEIA GERAL ORDINÁRIA"
                className="w-full p-2 border rounded-md uppercase text-sm focus:ring-brand-orange focus:border-brand-orange"
                value={title}
                onChange={e => setTitle(e.target.value.toUpperCase())}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                <input 
                  type="date" 
                  required
                  className="w-full p-2 border rounded-md text-sm focus:ring-brand-orange focus:border-brand-orange"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Arquivos {editingMinuteId ? '(Selecione para substituir)' : '(Múltipla Seleção)'}
                </label>
                
                <div className="mt-1">
                   <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      id="file-upload"
                      multiple // ENABLE MULTIPLE
                   />
                   <label 
                      htmlFor="file-upload" 
                      className="cursor-pointer flex items-center justify-center w-full p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-brand-orange hover:bg-orange-50 transition-colors text-xs font-bold text-gray-600"
                   >
                      <Upload size={16} className="mr-2"/> 
                      Adicionar Arquivos
                   </label>
                </div>

                {/* FILE LIST PREVIEW */}
                {selectedFiles.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded border">
                        {selectedFiles.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs bg-white p-1 rounded border shadow-sm">
                                <span className="truncate max-w-[80%]">{file.name}</span>
                                <button type="button" onClick={() => removeSelectedFile(idx)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                            </div>
                        ))}
                    </div>
                )}
                {selectedFiles.length === 0 && editingMinuteId && (
                    <p className="text-[10px] text-gray-400 mt-1 italic">Nenhum novo arquivo selecionado. Os atuais serão mantidos.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t mt-2">
               <button 
                type="submit" 
                disabled={isUploading}
                className={`bg-brand-orange text-white px-6 py-2 rounded-lg hover:bg-brand-red flex items-center text-sm font-bold shadow-md ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
               >
                 {isUploading ? <Loader className="animate-spin mr-2" size={16}/> : <Save size={16} className="mr-2"/>}
                 {isUploading ? 'Enviando...' : (editingMinuteId ? 'Salvar' : 'Arquivar')}
               </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTA COMPACTA */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Data</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assunto</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16">Anexos</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {churchMinutes.map((minute) => (
              <tr 
                key={minute.id} 
                className="hover:bg-gray-50 cursor-pointer group transition-colors"
                onClick={() => setViewingMinute(minute)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 font-medium">
                  {new Date(minute.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-3 py-2 text-xs font-bold text-gray-800 uppercase group-hover:text-brand-orange truncate max-w-[150px] md:max-w-none">
                  {minute.title}
                </td>
                <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center justify-center bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full border">
                        <Paperclip size={10} className="mr-1"/> {minute.fileUrls.length}
                    </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                   <div className="flex justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                       {/* BOTÃO VER / LER */}
                       <button 
                            onClick={() => setViewingMinute(minute)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Ler Ata"
                        >
                            <Eye size={16}/>
                       </button>

                       {/* BOTÕES DE EDIÇÃO (RESTRICTED) */}
                       {canEdit && (
                           <>
                                <button 
                                    onClick={() => handleEdit(minute)}
                                    className="p-1.5 text-gray-400 hover:text-brand-orange hover:bg-orange-50 rounded transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={16}/>
                                </button>
                                <button 
                                    onClick={() => handleDelete(minute)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={16}/>
                                </button>
                           </>
                       )}
                   </div>
                </td>
              </tr>
            ))}
            {churchMinutes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-xs text-gray-500">Nenhuma ata registrada nesta unidade.</td>
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

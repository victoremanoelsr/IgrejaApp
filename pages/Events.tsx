
import React, { useState, useRef } from 'react';
import { useApp } from '../context';
import { 
  Calendar as CalendarIcon, Plus, Clock, User, MapPin, Image, Upload, X, Loader, 
  Edit2, Trash2, Save, AlertTriangle, CheckCircle, Info 
} from 'lucide-react';
import { Event } from '../types';

export const Events: React.FC = () => {
  const { events, user, addEvent, updateEvent, deleteEvent, uploadEventImage, currentChurch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [responsibleName, setResponsibleName] = useState('');
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CUSTOM CONFIRM/ALERT MODAL STATE ---
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

  const churchEvents = events.filter(e => e.churchId === currentChurch?.id);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
    }
  };

  const handleEdit = (event: Event) => {
      setEditingEventId(event.id);
      setName(event.name);
      setDate(event.date);
      setTime(event.time);
      setResponsibleName(event.responsibleName);
      setSelectedFile(null); // Reset image unless changed
      setShowForm(true);
  };

  const handleDelete = (event: Event) => {
      showConfirm(
          'Excluir Evento',
          `Deseja realmente excluir o evento "${event.name}"?`,
          async () => {
              await deleteEvent(event.id);
          },
          'danger'
      );
  };

  const handleCancel = () => {
      setShowForm(false);
      setEditingEventId(null);
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('19:00');
      setResponsibleName('');
      setSelectedFile(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentChurch) return;

    setIsUploading(true);
    let finalImageUrl = editingEventId ? churchEvents.find(e => e.id === editingEventId)?.imageUrl : undefined;

    if (selectedFile) {
        const url = await uploadEventImage(selectedFile);
        if (url) {
            finalImageUrl = url;
        } else {
            showAlert("Aviso", "Erro ao enviar a imagem. A imagem anterior (se houver) será mantida.", 'warning');
        }
    }

    const payload: Event = {
      id: editingEventId || '',
      churchId: currentChurch.id,
      name: name.toUpperCase(),
      date,
      time,
      responsibleName: responsibleName.toUpperCase(),
      imageUrl: finalImageUrl
    };

    if (editingEventId) {
        await updateEvent(editingEventId, payload);
    } else {
        await addEvent(payload);
    }

    setIsUploading(false);
    handleCancel();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <CalendarIcon className="mr-3 text-brand-orange" /> Agenda da Igreja
            </h1>
            <p className="text-gray-500 text-sm mt-1">{currentChurch?.name}</p>
        </div>
        
        <button 
          onClick={() => { handleCancel(); setShowForm(!showForm); }}
          className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800"
        >
          <Plus size={20} className="mr-2"/> Novo Evento
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-fade-in-down">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-700">{editingEventId ? 'Editar Evento' : 'Agendar Novo Evento'}</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Evento</label>
                <input 
                  type="text" 
                  required
                  placeholder="EX: CULTO DA FAMÍLIA"
                  className="mt-1 block w-full p-2 border rounded-md uppercase focus:ring-brand-orange"
                  value={name}
                  onChange={e => setName(e.target.value.toUpperCase())}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700">Horário</label>
                  <input 
                    type="time" 
                    required
                    className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Responsável</label>
                  <input 
                    type="text" 
                    required
                    placeholder="EX: DPTO. INFANTIL"
                    className="mt-1 block w-full p-2 border rounded-md uppercase focus:ring-brand-orange"
                    value={responsibleName}
                    onChange={e => setResponsibleName(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              {/* IMAGE UPLOAD SECTION */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Arte / Banner do Evento {editingEventId && '(Opcional)'}</label>
                <div 
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${selectedFile ? 'border-brand-orange bg-orange-50' : 'border-gray-300 hover:bg-gray-50'}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    
                    {selectedFile ? (
                        <div className="relative w-full max-w-xs h-40">
                            <img 
                                src={URL.createObjectURL(selectedFile)} 
                                alt="Preview" 
                                className="w-full h-full object-cover rounded-md shadow-sm"
                            />
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFile(null);
                                    if(fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <Image size={32} className="mx-auto mb-2 opacity-50"/>
                            <p className="text-sm font-medium">{editingEventId ? 'Clique para alterar a imagem atual' : 'Clique para selecionar uma imagem'}</p>
                            <p className="text-xs">JPG, PNG (Max 5MB)</p>
                        </div>
                    )}
                </div>
              </div>

              <div className="flex justify-end pt-2 space-x-3">
                 <button type="button" onClick={handleCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-600">Cancelar</button>
                 <button 
                    type="submit" 
                    disabled={isUploading}
                    className="bg-brand-orange text-white px-6 py-2 rounded-lg hover:bg-brand-red flex items-center shadow-lg"
                 >
                    {isUploading ? <Loader className="animate-spin mr-2" size={18}/> : <Save size={18} className="mr-2"/>}
                    {isUploading ? 'Salvando...' : (editingEventId ? 'Atualizar Evento' : 'Agendar Evento')}
                 </button>
              </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {churchEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden group flex flex-col h-full relative">
            
            {/* ACTION BUTTONS (EDIT/DELETE) */}
            <div className="absolute top-2 right-2 z-20 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(event); }}
                    className="p-2 bg-white/90 text-brand-orange hover:bg-white rounded-full shadow-lg hover:text-brand-red transition-colors"
                    title="Editar Evento"
                >
                    <Edit2 size={16}/>
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(event); }}
                    className="p-2 bg-white/90 text-gray-500 hover:bg-white rounded-full shadow-lg hover:text-red-600 transition-colors"
                    title="Excluir Evento"
                >
                    <Trash2 size={16}/>
                </button>
            </div>

            {/* IMAGE BANNER */}
            <div className="h-40 w-full bg-gray-100 relative overflow-hidden">
                {event.imageUrl ? (
                    <img 
                        src={event.imageUrl} 
                        alt={event.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-orange/10 to-brand-red/10">
                        <CalendarIcon size={48} className="text-brand-orange/20"/>
                    </div>
                )}
                {/* DATE BADGE OVERLAY */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow text-center min-w-[60px] z-10">
                    <span className="block text-xs font-bold text-gray-500 uppercase">{new Date(event.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                    <span className="block text-xl font-black text-brand-black leading-none">{new Date(event.date).getDate()}</span>
                </div>
            </div>

            <div className="p-5 flex flex-col flex-1">
               <h3 className="text-xl font-bold text-gray-900 mb-4 line-clamp-2 uppercase">{event.name}</h3>
               
               <div className="space-y-3 mt-auto">
                   <div className="flex items-center text-sm text-gray-600">
                     <Clock size={16} className="mr-3 text-brand-orange"/>
                     {event.time}
                   </div>
                   <div className="flex items-center text-sm text-gray-600">
                     <User size={16} className="mr-3 text-brand-orange"/>
                     {event.responsibleName}
                   </div>
                   <div className="flex items-center text-sm text-gray-600">
                     <MapPin size={16} className="mr-3 text-brand-orange"/>
                     Na Igreja
                   </div>
               </div>
            </div>
          </div>
        ))}
        {churchEvents.length === 0 && (
           <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-gray-300">
               <CalendarIcon size={48} className="mx-auto text-gray-300 mb-3"/>
               <p className="text-gray-500 font-medium">Nenhum evento agendado.</p>
           </div>
        )}
      </div>

      {/* GLOBAL CONFIRM/ALERT MODAL */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
             {/* Header Colorido baseado no tipo */}
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

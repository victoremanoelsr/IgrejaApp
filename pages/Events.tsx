
import React, { useState, useRef } from 'react';
import { useApp } from '../context';
import { 
  Calendar as CalendarIcon, Plus, Clock, User, MapPin, Image, X, Loader, 
  Edit2, Trash2, Save, AlertTriangle, CheckCircle, Info, History,
  ChevronLeft, ChevronRight, List, LayoutGrid
} from 'lucide-react';
import { Event } from '../types';

export const Events: React.FC = () => {
  const { events, user, addEvent, updateEvent, deleteEvent, uploadEventImage, currentChurch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [location, setLocation] = useState(''); // Novo estado para local
  const [responsibleName, setResponsibleName] = useState('');
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox State
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);

  // Calendar State
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  // --- LOGIC: FILTER AND SORT EVENTS ---
  const today = new Date().toISOString().split('T')[0];
  const churchEventsRaw = events.filter(e => e.churchId === currentChurch?.id);

  // 1. Upcoming Events (Date >= Today) - Ascending Order (Nearest first)
  const upcomingEvents = churchEventsRaw
    .filter(e => e.date >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 2. Past Events (Date < Today) - Descending Order (Most recent past first)
  const pastEvents = churchEventsRaw
    .filter(e => e.date < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
      setLocation(event.location || '');
      setResponsibleName(event.responsibleName);
      setSelectedFile(null); // Reset image unless changed
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setLocation('');
      setResponsibleName('');
      setSelectedFile(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentChurch) return;

    setIsUploading(true);
    // Find image URL from RAW list to ensure we find it regardless of sorting
    let finalImageUrl = editingEventId ? churchEventsRaw.find(e => e.id === editingEventId)?.imageUrl : undefined;

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
      location: location.toUpperCase(),
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

  const renderPhotoLightbox = () => {
      if (!enlargedPhoto) return null;
      return (
          <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4 cursor-pointer" onClick={() => setEnlargedPhoto(null)}>
             <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors z-50">
                 <X size={32}/>
             </button>
             <img src={enlargedPhoto} alt="Zoom" className="max-h-[90vh] max-w-[90vw] rounded object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
      );
  };

  // Helper to Render Cards
  const renderEventCard = (event: Event, isPast: boolean) => (
    <div key={event.id} className={`bg-white rounded-xl shadow-md overflow-hidden group flex flex-col h-full relative transition-all ${isPast ? 'opacity-80 hover:opacity-100 border border-gray-200' : 'hover:shadow-xl'}`}>
      
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
      <div 
          className={`h-40 w-full bg-gray-100 relative overflow-hidden cursor-pointer ${isPast ? 'grayscale-[0.5]' : ''}`}
          onClick={() => event.imageUrl && setEnlargedPhoto(event.imageUrl)}
      >
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
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow text-center min-w-[60px] z-10 pointer-events-none">
              <span className="block text-xs font-bold text-gray-500 uppercase">{new Date(event.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
              <span className="block text-xl font-black text-brand-black leading-none">{new Date(event.date).getDate()}</span>
          </div>
          
          {isPast && (
             <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                 <span className="bg-black/60 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border border-white/20">Finalizado</span>
             </div>
          )}
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
               <span className="truncate" title={event.location || 'Na Igreja'}>
                  {event.location || 'Na Igreja'}
               </span>
             </div>
         </div>
      </div>
    </div>
  );

  // ---- CALENDAR HELPERS ----
  const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const toIso = (d: Date) => d.toISOString().split('T')[0];

  const eventsByDay = churchEventsRaw.reduce<Record<string, Event[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {});

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = toIso(new Date());

    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const dayEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

    return (
      <div className="space-y-4">
        {/* Month navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button
              onClick={() => { setCalendarDate(new Date(year, month - 1, 1)); setSelectedDay(null); }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800">
              {MONTHS_PT[month]} {year}
            </h2>
            <button
              onClick={() => { setCalendarDate(new Date(year, month + 1, 1)); setSelectedDay(null); }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Week header */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEK_DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[72px] border-r border-b border-gray-50 last:border-r-0" />;
              const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvs = eventsByDay[iso] || [];
              const isToday = iso === today;
              const isSelected = iso === selectedDay;

              return (
                <div
                  key={iso}
                  onClick={() => setSelectedDay(isSelected ? null : iso)}
                  className={`min-h-[72px] p-1.5 border-r border-b border-gray-100 last:border-r-0 cursor-pointer transition-colors
                    ${isSelected ? 'bg-orange-50 border-brand-orange' : 'hover:bg-gray-50'}
                    ${idx % 7 === 6 ? 'border-r-0' : ''}
                  `}
                >
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1 mx-auto
                    ${isToday ? 'bg-brand-orange text-white' : isSelected ? 'bg-brand-orange/20 text-brand-orange' : 'text-gray-700'}
                  `}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvs.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        className={`text-[10px] font-medium px-1 py-0.5 rounded truncate leading-tight
                          ${ev.date < today ? 'bg-gray-200 text-gray-500' : 'bg-brand-orange/15 text-brand-orange'}
                        `}
                        title={ev.name}
                      >
                        {ev.name}
                      </div>
                    ))}
                    {dayEvs.length > 2 && (
                      <div className="text-[10px] text-gray-400 font-medium pl-1">+{dayEvs.length - 2} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected day events */}
        {selectedDay && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-brand-orange" />
              <h3 className="font-bold text-gray-700">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </h3>
            </div>
            {dayEvents.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Nenhum evento neste dia.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayEvents.map(ev => renderEventCard(ev, ev.date < today))}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-400 px-1">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-orange/15 inline-block" /> Próximo</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Finalizado</span>
          <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-brand-orange inline-block" /> Hoje</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderPhotoLightbox()}

      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <CalendarIcon className="mr-3 text-brand-orange" /> Agenda da Igreja
            </h1>
            <p className="text-gray-500 text-sm mt-1">{currentChurch?.name}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${viewMode === 'lista' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={15} /> Lista
            </button>
            <button
              onClick={() => setViewMode('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${viewMode === 'calendario' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={15} /> Calendário
            </button>
          </div>

          <button 
            onClick={() => { handleCancel(); setShowForm(!showForm); }}
            className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800"
          >
            <Plus size={20} className="mr-2"/> Novo Evento
          </button>
        </div>
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

              {/* LOCATION INPUT */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Local</label>
                <div className="relative">
                    <MapPin size={16} className="absolute left-2.5 top-3 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="EX: NA IGREJA / PRAÇA CENTRAL"
                        className="mt-1 block w-full pl-8 p-2 border rounded-md uppercase focus:ring-brand-orange"
                        value={location}
                        onChange={e => setLocation(e.target.value.toUpperCase())}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1">Deixe em branco para usar "Na Igreja"</p>
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

      {/* --- CALENDAR or LIST VIEW --- */}
      {viewMode === 'calendario' ? renderCalendar() : (
        <>
          {/* --- UPCOMING EVENTS LIST --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => renderEventCard(event, false))}
          </div>

          {upcomingEvents.length === 0 && pastEvents.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-gray-300">
                  <CalendarIcon size={48} className="mx-auto text-gray-300 mb-3"/>
                  <p className="text-gray-500 font-medium">Nenhum evento agendado.</p>
              </div>
          )}

          {/* --- SEPARATOR & PAST EVENTS --- */}
          {pastEvents.length > 0 && (
            <div className="mt-12">
                <div className="flex items-center mb-6">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <div className="mx-4 flex items-center text-gray-400 font-bold uppercase text-sm tracking-wider">
                        <History size={16} className="mr-2"/> Eventos Finalizados
                    </div>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastEvents.map((event) => renderEventCard(event, true))}
                </div>
            </div>
          )}
        </>
      )}

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

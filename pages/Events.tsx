import React, { useState } from 'react';
import { useApp } from '../context';
import { Calendar as CalendarIcon, Plus, Clock, User, MapPin } from 'lucide-react';
import { Event } from '../types';

export const Events: React.FC = () => {
  const { events, user, addEvent } = useApp();
  const [showForm, setShowForm] = useState(false);
  
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [responsibleName, setResponsibleName] = useState('');

  const churchEvents = events.filter(e => e.churchId === user?.churchId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newEvent: Event = {
      id: '',
      churchId: user.churchId,
      name: name.toUpperCase(),
      date,
      time,
      responsibleName: responsibleName.toUpperCase()
    };

    addEvent(newEvent);
    setShowForm(false);
    setName('');
    setResponsibleName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <CalendarIcon className="mr-3 text-brand-orange" /> Agenda da Igreja
        </h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800"
        >
          <Plus size={20} className="mr-2"/> Novo Evento
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Evento</label>
                <input 
                  type="text" 
                  required
                  placeholder="EX: CULTO DA FAMÍLIA"
                  className="mt-1 block w-full p-2 border rounded-md uppercase"
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
                    className="mt-1 block w-full p-2 border rounded-md"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Horário</label>
                  <input 
                    type="time" 
                    required
                    className="mt-1 block w-full p-2 border rounded-md"
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
                    className="mt-1 block w-full p-2 border rounded-md uppercase"
                    value={responsibleName}
                    onChange={e => setResponsibleName(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                 <button type="submit" className="bg-brand-orange text-white px-6 py-2 rounded-lg hover:bg-brand-red">Agendar</button>
              </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {churchEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-xl shadow hover:shadow-md transition-all border-l-4 border-brand-orange p-4 flex flex-col justify-between">
            <div>
               <div className="flex items-center text-gray-500 text-sm mb-2">
                 <CalendarIcon size={14} className="mr-1"/> 
                 {new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">{event.name}</h3>
            </div>
            
            <div className="space-y-2 mt-4 text-sm text-gray-600">
               <div className="flex items-center">
                 <Clock size={16} className="mr-2 text-brand-yellow"/>
                 {event.time}
               </div>
               <div className="flex items-center">
                 <User size={16} className="mr-2 text-brand-yellow"/>
                 {event.responsibleName}
               </div>
               <div className="flex items-center">
                 <MapPin size={16} className="mr-2 text-brand-yellow"/>
                 Na Igreja
               </div>
            </div>
          </div>
        ))}
        {churchEvents.length === 0 && (
           <div className="col-span-full py-10 text-center text-gray-500">Nenhum evento agendado.</div>
        )}
      </div>
    </div>
  );
};
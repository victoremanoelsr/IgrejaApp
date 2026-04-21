import React from 'react';
import { useMember } from '../../contexts/MemberContext';
import { Calendar, Clock, MapPin, CalendarX } from 'lucide-react';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatDayMonth = (dateStr: string) => {
  if (!dateStr) return { day: '', month: '' };
  const date = new Date(dateStr + 'T00:00:00');
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
  };
};

export const MemberEventos: React.FC = () => {
  const { upcomingEvents, isLoading } = useMember();

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = upcomingEvents.filter((e) => new Date(e.date + 'T00:00:00') >= now);
  const past = upcomingEvents.filter((e) => new Date(e.date + 'T00:00:00') < now);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Eventos</h1>
        <p className="text-gray-500 text-sm mt-0.5">Agenda da sua igreja</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-24" />
          ))}
        </div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
            <CalendarX size={28} className="text-blue-400" />
          </div>
          <p className="text-gray-700 font-semibold">Nenhum evento cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Fique atento às novidades da sua igreja.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                Próximos Eventos
              </h2>
              <div className="space-y-3">
                {upcoming.map((event) => {
                  const { day, month } = formatDayMonth(event.date);
                  return (
                    <div
                      key={event.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex"
                    >
                      {event.imageUrl && (
                        <div className="w-24 shrink-0">
                          <img
                            src={event.imageUrl}
                            alt={event.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-start gap-3 p-4 flex-1">
                        <div className="shrink-0 flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-xl w-12 h-12">
                          <span className="text-blue-700 text-lg font-extrabold leading-none">{day}</span>
                          <span className="text-blue-500 text-[9px] font-bold">{month}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-sm font-semibold leading-snug">{event.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                            <span className="text-gray-400 text-[11px] flex items-center gap-1">
                              <Clock size={10} />
                              {formatDate(event.date)} às {event.time}
                            </span>
                            {event.location && (
                              <span className="text-gray-400 text-[11px] flex items-center gap-1">
                                <MapPin size={10} />
                                {event.location}
                              </span>
                            )}
                          </div>
                          {event.responsibleName && (
                            <p className="text-gray-400 text-[11px] mt-1">
                              Resp.: {event.responsibleName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                Eventos Passados
              </h2>
              <div className="space-y-3">
                {past.map((event) => {
                  const { day, month } = formatDayMonth(event.date);
                  return (
                    <div
                      key={event.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex opacity-60"
                    >
                      {event.imageUrl && (
                        <div className="w-24 shrink-0">
                          <img
                            src={event.imageUrl}
                            alt={event.name}
                            className="w-full h-full object-cover grayscale"
                          />
                        </div>
                      )}
                      <div className="flex items-start gap-3 p-4 flex-1">
                        <div className="shrink-0 flex flex-col items-center justify-center bg-gray-100 border border-gray-200 rounded-xl w-12 h-12">
                          <span className="text-gray-500 text-lg font-extrabold leading-none">{day}</span>
                          <span className="text-gray-400 text-[9px] font-bold">{month}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-600 text-sm font-semibold leading-snug">{event.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                            <span className="text-gray-400 text-[11px] flex items-center gap-1">
                              <Clock size={10} />
                              {formatDate(event.date)} às {event.time}
                            </span>
                            {event.location && (
                              <span className="text-gray-400 text-[11px] flex items-center gap-1">
                                <MapPin size={10} />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

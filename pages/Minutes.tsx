import React, { useState } from 'react';
import { useApp } from '../context';
import { FileText, Plus, Download, Calendar, ShieldAlert, Link as LinkIcon } from 'lucide-react';
import { Minute } from '../types';

export const Minutes: React.FC = () => {
  const { minutes, user, addMinute } = useApp();
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fileUrl, setFileUrl] = useState(''); // Simulated file input

  const churchMinutes = minutes.filter(m => m.churchId === user?.churchId);

  // Verificação de Permissão: Tesoureiro só pode ver
  const canEdit = user?.role !== 'TESOUREIRO';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit) return;

    const newMinute: Minute = {
      id: '',
      churchId: user.churchId,
      title: title.toUpperCase(),
      date,
      fileUrl: fileUrl || '#'
    };

    addMinute(newMinute);
    setShowForm(false);
    setTitle('');
    setFileUrl('');
  };

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
        </div>
        
        {canEdit && (
            <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800"
            >
            <Plus size={20} className="mr-2"/> Nova Ata
            </button>
        )}
      </div>

      {showForm && canEdit && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-fade-in-down">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Título da Reunião</label>
              <input 
                type="text" 
                required
                placeholder="EX: ASSEMBLEIA GERAL ORDINÁRIA"
                className="mt-1 block w-full p-2 border rounded-md uppercase"
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
                  className="mt-1 block w-full p-2 border rounded-md"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Link do Arquivo (PDF)</label>
                <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                    type="text" 
                    placeholder="Cole aqui o link do PDF..."
                    className="block w-full pl-10 p-2 border rounded-md"
                    value={fileUrl}
                    onChange={e => setFileUrl(e.target.value)}
                    />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
               <button type="submit" className="bg-brand-orange text-white px-6 py-2 rounded-lg hover:bg-brand-red">Arquivar</button>
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {churchMinutes.map((minute) => (
              <tr key={minute.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center">
                  <Calendar size={16} className="mr-2 text-gray-400"/>
                  {new Date(minute.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {minute.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href={minute.fileUrl} target="_blank" rel="noreferrer" className="text-brand-orange hover:text-brand-red flex items-center justify-end">
                    <Download size={18} className="mr-1" /> Baixar
                  </a>
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
    </div>
  );
};
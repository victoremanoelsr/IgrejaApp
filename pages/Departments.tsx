
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { useTranslation } from 'react-i18next';
import { 
  Globe, 
  Zap, 
  Baby, 
  Heart, 
  Shield,
  ArrowRight, 
  Layout, 
  ShieldAlert 
} from 'lucide-react';

export const Departments: React.FC = () => {
  const { currentChurch, user } = useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const allowedRoles = ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'];
  const hasAccess = user && allowedRoles.includes(user.role);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <ShieldAlert size={64} className="text-red-400 mb-4"/>
        <h2 className="text-2xl font-bold text-gray-800">{t('departments.access')}</h2>
        <p>{t('departments.accessDesc')}</p>
      </div>
    );
  }

  const departments = [
    {
      id: 'missoes',
      title: t('departments.missions'),
      description: t('departments.missionsDesc'),
      icon: Globe,
      path: '/missoes',
      color: 'bg-teal-600',
      textColor: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200'
    },
    {
      id: 'jovens',
      title: t('departments.youth'),
      description: t('departments.youthDesc'),
      icon: Zap,
      path: '/jovens',
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 'senhoras',
      title: t('departments.ladies'),
      description: t('departments.ladiesDesc'),
      icon: Heart,
      path: '/senhoras',
      color: 'bg-pink-500',
      textColor: 'text-pink-500',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200'
    },
    {
      id: 'criancas',
      title: t('departments.children'),
      description: t('departments.childrenDesc'),
      icon: Baby,
      path: '/criancas',
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'senhores',
      title: t('departments.men'),
      description: t('departments.menDesc'),
      icon: Shield,
      path: '/senhores',
      color: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <Layout className="mr-3 text-brand-black" /> {t('departments.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('departments.subtitle')} <strong>{currentChurch?.name}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <div 
            key={dept.id}
            onClick={() => navigate(dept.path, { state: { activeTab: 'DASHBOARD', entered: true } })}
            className={`group bg-white rounded-xl shadow-md border ${dept.borderColor} p-6 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden`}
          >
            {/* Decorative Background Icon */}
            <dept.icon 
              size={120} 
              className={`absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity ${dept.textColor}`} 
            />

            <div className="flex items-start relative z-10">
              <div className={`p-4 rounded-xl ${dept.color} text-white shadow-lg mr-5 group-hover:scale-110 transition-transform duration-300`}>
                <dept.icon size={32} />
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-brand-orange transition-colors">
                  {dept.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  {dept.description}
                </p>
                
                <div className={`inline-flex items-center text-sm font-bold ${dept.textColor} group-hover:underline`}>
                  {t('departments.enter')} <ArrowRight size={16} className="ml-1" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

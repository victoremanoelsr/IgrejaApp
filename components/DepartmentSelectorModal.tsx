import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Role } from '../types';
import { getRoleInfo } from '../utils/roleUtils';
import { 
  Building, 
  Crown, 
  Globe, 
  Zap, 
  Smile, 
  Sparkles, 
  Heart, 
  Shield, 
  Wallet, 
  FileText, 
  DollarSign, 
  X, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface DepartmentSelectorModalProps {
  isOpen: boolean;
  user: User;
  activeRole?: Role;
  onSelectRole: (role: Role) => void;
  onClose?: () => void;
  canClose?: boolean;
}

const ICON_MAP: Record<string, any> = {
  Crown,
  Building,
  Globe,
  Zap,
  Smile,
  Sparkles,
  Heart,
  Shield,
  Wallet,
  FileText,
  DollarSign,
};

export const DepartmentSelectorModal: React.FC<DepartmentSelectorModalProps> = ({
  isOpen,
  user,
  activeRole,
  onSelectRole,
  onClose,
  canClose = false,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const roles = user.roles && user.roles.length > 0 ? user.roles : [user.role];

  const handleChoose = (role: Role) => {
    onSelectRole(role);
    const info = getRoleInfo(role);
    navigate(info.path, { state: info.state });
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-2xl overflow-hidden transform transition-all animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex justify-between items-center border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>Selecione o Painel de Acesso</span>
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Olá, <span className="font-semibold text-white">{user.name}</span>! Você faz parte de mais de uma equipe. Qual painel deseja acessar agora?
            </p>
          </div>
          {canClose && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Fechar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Roles Grid */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => {
              const info = getRoleInfo(role);
              const IconComponent = ICON_MAP[info.iconName] || Building;
              const isCurrent = activeRole === role;

              return (
                <div
                  key={role}
                  onClick={() => handleChoose(role)}
                  className={`group relative p-5 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between hover:shadow-lg transform hover:-translate-y-0.5 ${
                    isCurrent
                      ? 'border-brand-orange bg-orange-50/40 dark:bg-orange-950/20 shadow-md ring-2 ring-brand-orange/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-orange/50'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute top-3 right-3 flex items-center text-xs font-bold text-brand-orange gap-1 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full shadow-sm border border-orange-200">
                      <CheckCircle2 size={12} /> Ativo
                    </span>
                  )}

                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${info.bgGradient} text-white`}>
                        <IconComponent size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base group-hover:text-brand-orange transition-colors">
                          {info.departmentName}
                        </h3>
                        <span className={`inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-md ${info.badgeColor}`}>
                          {info.roleLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs font-bold text-gray-500 group-hover:text-brand-orange transition-colors">
                    <span>Acessar este departamento</span>
                    <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs text-gray-500">
          <span>Você poderá alternar entre os departamentos a qualquer momento pelo menu.</span>
          {canClose && onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-bold transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

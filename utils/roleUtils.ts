import { Role } from '../types';

export interface DepartmentRoleInfo {
  role: Role;
  roleLabel: string;
  departmentName: string;
  path: string;
  state: { activeTab: string; entered: boolean };
  badgeColor: string;
  bgGradient: string;
  iconName: string;
}

export const ROLE_INFO_MAP: Record<Role, DepartmentRoleInfo> = {
  SUPER_ADM: {
    role: 'SUPER_ADM',
    roleLabel: 'Super Administrador',
    departmentName: 'Painel Master (SaaS)',
    path: '/admin/dashboard',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-red-500 text-white',
    bgGradient: 'from-red-600 to-rose-700',
    iconName: 'Crown'
  },
  PRESIDENTE: {
    role: 'PRESIDENTE',
    roleLabel: 'Pastor Presidente',
    departmentName: 'Administração Geral',
    path: '/dashboard',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-blue-600 text-white',
    bgGradient: 'from-blue-600 to-indigo-700',
    iconName: 'Building'
  },
  VICE_PRESIDENTE: {
    role: 'VICE_PRESIDENTE',
    roleLabel: 'Vice-Presidente',
    departmentName: 'Administração Geral',
    path: '/dashboard',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-blue-500 text-white',
    bgGradient: 'from-blue-500 to-indigo-600',
    iconName: 'Building'
  },
  DIRIGENTE: {
    role: 'DIRIGENTE',
    roleLabel: 'Dirigente',
    departmentName: 'Congregação / Geral',
    path: '/dashboard',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-indigo-600 text-white',
    bgGradient: 'from-indigo-600 to-purple-700',
    iconName: 'Building'
  },
  TESOUREIRO: {
    role: 'TESOUREIRO',
    roleLabel: 'Tesoureiro Geral',
    departmentName: 'Tesouraria da Igreja',
    path: '/dashboard',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-emerald-600 text-white',
    bgGradient: 'from-emerald-600 to-teal-700',
    iconName: 'Wallet'
  },
  SECRETARIO: {
    role: 'SECRETARIO',
    roleLabel: 'Secretário Geral',
    departmentName: 'Secretaria da Igreja',
    path: '/dashboard',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-cyan-600 text-white',
    bgGradient: 'from-cyan-600 to-blue-700',
    iconName: 'FileText'
  },

  // MISSÕES
  PRESIDENTE_MISSOES: {
    role: 'PRESIDENTE_MISSOES',
    roleLabel: 'Presidente de Missões',
    departmentName: 'Departamento de Missões',
    path: '/missoes',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-teal-600 text-white',
    bgGradient: 'from-teal-600 to-emerald-700',
    iconName: 'Globe'
  },
  VICE_MISSOES: {
    role: 'VICE_MISSOES',
    roleLabel: 'Vice-Presidente de Missões',
    departmentName: 'Departamento de Missões',
    path: '/missoes',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-teal-500 text-white',
    bgGradient: 'from-teal-500 to-emerald-600',
    iconName: 'Globe'
  },
  TESOUREIRO_MISSOES: {
    role: 'TESOUREIRO_MISSOES',
    roleLabel: 'Tesoureiro de Missões',
    departmentName: 'Departamento de Missões',
    path: '/missoes',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-teal-600 text-white',
    bgGradient: 'from-teal-600 to-emerald-700',
    iconName: 'DollarSign'
  },
  SECRETARIO_MISSOES: {
    role: 'SECRETARIO_MISSOES',
    roleLabel: 'Secretário de Missões',
    departmentName: 'Departamento de Missões',
    path: '/missoes',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-teal-500 text-white',
    bgGradient: 'from-teal-500 to-emerald-600',
    iconName: 'FileText'
  },

  // JOVENS
  LIDER_JOVENS: {
    role: 'LIDER_JOVENS',
    roleLabel: 'Líder de Jovens',
    departmentName: 'União de Jovens',
    path: '/jovens',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-orange-600 text-white',
    bgGradient: 'from-orange-500 to-amber-600',
    iconName: 'Zap'
  },
  TESOUREIRO_JOVENS: {
    role: 'TESOUREIRO_JOVENS',
    roleLabel: 'Tesoureiro de Jovens',
    departmentName: 'União de Jovens',
    path: '/jovens',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-orange-500 text-white',
    bgGradient: 'from-orange-600 to-amber-700',
    iconName: 'DollarSign'
  },

  // CRIANÇAS
  LIDER_CRIANCAS: {
    role: 'LIDER_CRIANCAS',
    roleLabel: 'Líder de Crianças',
    departmentName: 'Departamento Infantil',
    path: '/criancas',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-blue-600 text-white',
    bgGradient: 'from-blue-500 to-cyan-600',
    iconName: 'Smile'
  },
  TESOUREIRO_CRIANCAS: {
    role: 'TESOUREIRO_CRIANCAS',
    roleLabel: 'Tesoureiro de Crianças',
    departmentName: 'Departamento Infantil',
    path: '/criancas',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-blue-500 text-white',
    bgGradient: 'from-blue-600 to-cyan-700',
    iconName: 'DollarSign'
  },

  // ADOLESCENTES
  LIDER_ADOLESCENTES: {
    role: 'LIDER_ADOLESCENTES',
    roleLabel: 'Líder de Adolescentes',
    departmentName: 'União de Adolescentes',
    path: '/adolescentes',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-purple-600 text-white',
    bgGradient: 'from-purple-600 to-violet-700',
    iconName: 'Sparkles'
  },
  TESOUREIRO_ADOLESCENTES: {
    role: 'TESOUREIRO_ADOLESCENTES',
    roleLabel: 'Tesoureiro de Adolescentes',
    departmentName: 'União de Adolescentes',
    path: '/adolescentes',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-purple-500 text-white',
    bgGradient: 'from-purple-500 to-violet-600',
    iconName: 'DollarSign'
  },

  // SENHORAS
  LIDER_SENHORAS: {
    role: 'LIDER_SENHORAS',
    roleLabel: 'Líder de Senhoras',
    departmentName: 'Círculo de Oração / Senhoras',
    path: '/senhoras',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-pink-600 text-white',
    bgGradient: 'from-pink-600 to-rose-700',
    iconName: 'Heart'
  },
  TESOUREIRO_SENHORAS: {
    role: 'TESOUREIRO_SENHORAS',
    roleLabel: 'Tesoureira de Senhoras',
    departmentName: 'Círculo de Oração / Senhoras',
    path: '/senhoras',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-pink-500 text-white',
    bgGradient: 'from-pink-500 to-rose-600',
    iconName: 'DollarSign'
  },

  // SENHORES
  LIDER_SENHORES: {
    role: 'LIDER_SENHORES',
    roleLabel: 'Líder de Senhores',
    departmentName: 'União de Senhores',
    path: '/senhores',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-indigo-600 text-white',
    bgGradient: 'from-indigo-600 to-slate-800',
    iconName: 'Shield'
  },
  TESOUREIRO_SENHORES: {
    role: 'TESOUREIRO_SENHORES',
    roleLabel: 'Tesoureiro de Senhores',
    departmentName: 'União de Senhores',
    path: '/senhores',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-indigo-500 text-white',
    bgGradient: 'from-indigo-500 to-slate-700',
    iconName: 'DollarSign'
  },
};

/**
 * Converte qualquer string de role (única ou separada por vírgula) em array de roles limpo.
 */
export const getUserRoles = (userOrRole?: { role?: string; roles?: Role[] } | string): Role[] => {
  if (!userOrRole) return [];
  if (typeof userOrRole === 'object' && userOrRole.roles && Array.isArray(userOrRole.roles) && userOrRole.roles.length > 0) {
    return userOrRole.roles;
  }
  const raw = typeof userOrRole === 'string' ? userOrRole : userOrRole.role || '';
  if (!raw) return [];
  const list = raw
    .split(',')
    .map(r => r.trim())
    .filter(r => Boolean(r) && r in ROLE_INFO_MAP) as Role[];
  return list.length > 0 ? list : (raw in ROLE_INFO_MAP ? [raw as Role] : []);
};

/**
 * Retorna as informações do departamento e destino de navegação de um cargo.
 */
export const getRoleInfo = (role: Role): DepartmentRoleInfo => {
  return ROLE_INFO_MAP[role] || {
    role,
    roleLabel: role,
    departmentName: 'Geral',
    path: '/dashboard',
    state: { activeTab: 'DASHBOARD', entered: true },
    badgeColor: 'bg-gray-600 text-white',
    bgGradient: 'from-gray-600 to-gray-800',
    iconName: 'Building'
  };
};

/**
 * Adiciona um cargo à lista existente de cargos sem duplicar.
 */
export const addRoleToUserRoles = (existingRoles: Role[], newRole: Role): Role[] => {
  if (existingRoles.includes(newRole)) return existingRoles;
  return [...existingRoles, newRole];
};

/**
 * Remove um cargo da lista existente de cargos.
 */
export const removeRoleFromUserRoles = (existingRoles: Role[], roleToRemove: Role): Role[] => {
  return existingRoles.filter(r => r !== roleToRemove);
};



export type Role = 'SUPER_ADM' | 'PRESIDENTE' | 'VICE_PRESIDENTE' | 'DIRIGENTE' | 'TESOUREIRO' | 'SECRETARIO';

export type ChurchType = 'SEDE' | 'CONGREGACAO';

export interface Church {
  id: string;
  name: string;
  address: string;
  cnpj?: string;
  pastorName: string;
  logoUrl?: string;
  missionStatement?: string;
  active: boolean;
  type: ChurchType; 
  parentId?: string; 
}

export interface User {
  id: string;
  name: string;
  username: string; 
  cpf: string;
  birthDate?: string; 
  role: Role;
  churchId?: string; // Agora opcional
  password?: string; 
}

export interface Member {
  id: string;
  name: string;
  cpf: string;
  birthDate: string; 
  memberNumber?: string; 
  churchId: string;
  isTither: boolean;
  baptismDate?: string;
  photo?: string; // Nova propriedade para Foto (URL)
  email?: string; // Novo campo
  phone?: string; // Novo campo
  maritalStatus?: string; // Novo campo: Estado Civil
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string; // Novo campo: Estado (UF)
    country?: string; 
    zipCode: string;
  };
}

export type TransactionType = 'ENTRADA' | 'SAIDA';
export type TransactionCategory = 'DIZIMO' | 'OFERTA' | 'MISSOES' | 'CONSTRUCAO' | 'DESPESA_FIXA' | 'DESPESA_VARIAVEL' | 'OUTROS' | 'ALUGUEL' | 'AGUA' | 'LUZ' | 'INTERNET' | 'SALARIO';
export type TransactionStatus = 'PAGO' | 'PENDENTE';

export interface Transaction {
  id: string;
  churchId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  date: string; 
  description: string; 
  memberId?: string; 
  responsibleUserId: string;
  attachmentUrl?: string; 
  campaignId?: string;
  isFixed?: boolean; 
  fixedExpenseId?: string;
  status: TransactionStatus; // Novo campo para controle de pagamento/projeção
  createdAt?: string; // Campo para ordenação por cadastro
}

export interface FixedExpense {
  id: string;
  churchId: string;
  description: string;
  amount: number;
  dueDay: number;
  category: TransactionCategory;
  autoGenerate: boolean;
  active: boolean;
  createdAt?: string; 
}

export interface Campaign {
  id: string;
  churchId: string;
  name: string;
  goal: number;
  startDate: string;
  description?: string;
  status: 'ATIVA' | 'FINALIZADA';
}

export interface Event {
  id: string;
  churchId: string;
  name: string;
  date: string;
  time: string;
  location?: string; 
  responsibleName: string;
  imageUrl?: string;
}

export interface Minute { 
  id: string;
  churchId: string;
  title: string;
  date: string;
  fileUrls: string[]; 
}

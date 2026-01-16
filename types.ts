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
  type: ChurchType; // Novo campo
  parentId?: string; // Novo campo (ID da Sede se for congregação)
}

export interface User {
  id: string;
  name: string;
  username: string; // or email
  cpf: string;
  birthDate?: string; // ISO Date
  role: Role;
  churchId: string; // The specific unit they belong to
  password?: string; // Senha opcional para validação
}

export interface Member {
  id: string;
  name: string;
  cpf: string;
  birthDate: string; // ISO date
  memberNumber?: string; // Novo campo solicitado
  churchId: string;
  isTither: boolean;
  baptismDate?: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    country?: string; // Novo campo solicitado
    zipCode: string;
  };
}

export type TransactionType = 'ENTRADA' | 'SAIDA';
export type TransactionCategory = 'DIZIMO' | 'OFERTA' | 'MISSOES' | 'CONSTRUCAO' | 'DESPESA_FIXA' | 'DESPESA_VARIAVEL' | 'OUTROS';

export interface Transaction {
  id: string;
  churchId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  date: string; // ISO Date
  description: string; // "Culto de Domingo", "Conta de Luz"
  memberId?: string; // For tithes
  responsibleUserId: string;
  attachmentUrl?: string; // Mock URL
  campaignId?: string; // If linked to a campaign
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
  responsibleName: string;
  imageUrl?: string;
}

export interface Minute { // "Ata"
  id: string;
  churchId: string;
  title: string;
  date: string;
  fileUrl: string; // PDF link
}
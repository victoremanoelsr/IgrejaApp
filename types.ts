
export type Role = 'SUPER_ADM' | 'PRESIDENTE' | 'VICE_PRESIDENTE' | 'DIRIGENTE' | 'TESOUREIRO' | 'SECRETARIO' | 'PRESIDENTE_MISSOES' | 'VICE_MISSOES' | 'TESOUREIRO_MISSOES' | 'SECRETARIO_MISSOES' | 'LIDER_JOVENS' | 'TESOUREIRO_JOVENS' | 'LIDER_CRIANCAS' | 'TESOUREIRO_CRIANCAS' | 'LIDER_SENHORAS' | 'TESOUREIRO_SENHORAS';

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
  isYouth?: boolean; // Jovens
  isChild?: boolean; // Crianças (Novo)
  isLady?: boolean;  // Senhoras (Novo)
  baptismDate?: string;
  photo?: string; 
  email?: string; 
  phone?: string; 
  maritalStatus?: string; 
  status?: 'ATIVO' | 'INATIVO' | 'TRANSFERIDO'; 
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string; 
    country?: string; 
    zipCode: string;
  };
}

export type TransactionType = 'ENTRADA' | 'SAIDA';
export type TransactionCategory = 'DIZIMO' | 'OFERTA' | 'MISSOES' | 'JOVENS' | 'CRIANCAS' | 'SENHORAS' | 'CONSTRUCAO' | 'DESPESA_FIXA' | 'DESPESA_VARIAVEL' | 'OUTROS' | 'ALUGUEL' | 'AGUA' | 'LUZ' | 'INTERNET' | 'SALARIO';
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
  status: TransactionStatus; 
  createdAt?: string; 
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

// Visual Editor Types
export type LayoutElementType = 'text' | 'tag' | 'image';

export interface LayoutElement {
  id: string;
  type: LayoutElementType;
  content: string; // Text content, Image URL, or Tag Key (e.g., {{name}})
  x: number;
  y: number;
  width?: number; // For images and text boxes
  height?: number; // For images and text boxes
  style: {
    fontSize: number;
    color: string;
    fontWeight: string; // 'normal' | 'bold'
    textAlign: 'left' | 'center' | 'right';
    fontFamily?: string;
  };
}

export interface BookletSettings {
  churchId: string;
  templateText: string; // Mantido para retrocompatibilidade ou fallback
  logoUrl?: string; // Logo padrão (usado se não houver um elemento de imagem específico)
  color: string;
  referencePhotoUrl?: string;
  backgroundUrl?: string; // Imagem de fundo do canvas
  savedBackgrounds?: string[]; // Histórico de imagens de fundo
  layoutConfig?: LayoutElement[]; // Array JSON do layout visual
}

export interface CarnetBackgroundStyle {
  mode: 'cover' | 'contain' | 'fill'; // 'fill' = esticar, 'cover' = cortar/cobrir, 'contain' = ajustar/inteira
  opacity: number; // 0.1 a 1.0
}

export interface CarnetTemplate {
  id: string;
  churchId: string;
  name: string;
  backgroundUrl?: string;
  backgroundStyle?: CarnetBackgroundStyle;
  layoutJson: LayoutElement[];
  isDefault: boolean;
  category: 'MISSOES' | 'JOVENS'; // Campo adicionado
  createdAt?: string;
}

// NOVO: Template de Carta
export interface LetterTemplate {
  id: string;
  churchId: string;
  name: string;
  type: 'RECOMENDACAO' | 'MUDANCA' | 'GENERICO';
  backgroundUrl?: string;
  recommendationText?: string; // Texto base para recomendação
  changeText?: string;         // Texto base para mudança
  layoutJson: LayoutElement[];
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

export interface LetterHistory {
  id: string;
  churchId: string;
  memberId: string;
  letterType: 'RECOMENDACAO' | 'MUDANCA';
  issuedAt: string; // date string
  issuedByUserId: string;
  // Snapshot of data used to generate the letter, for re-generation
  memberDataSnapshot: {
    name: string;
    baptismDate?: string;
    birthDate: string;
    roleOrFunction: string; // e.g., "MEMBRO", "OBREIRO"
    cpf: string;
  };
}

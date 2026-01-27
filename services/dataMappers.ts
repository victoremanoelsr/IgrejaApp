
import { Church, User, Member, Transaction, Campaign, Event, Minute, FixedExpense } from '../types';

// Helper para tratar valores que podem estar criptografados ou ser números legados
const handleNumericField = (val: any): number => {
  if (typeof val === 'string' && val.startsWith('ENCv1:')) return 0; // Será descriptografado no context
  return typeof val === 'string' ? parseFloat(val) || 0 : (val || 0);
};

export const toAppChurch = (data: any): Church => ({
  id: data.id,
  name: data.name,
  address: data.address,
  active: data.active,
  type: data.type,
  parentId: data.parent_id,
  pastorName: data.pastor_name,
  cnpj: data.cnpj,
  mission_statement: data.mission_statement,
  logo_url: data.logo_url
} as any); // Type cast para simplificar mappers internos

export const toAppUser = (data: any): User => ({
  id: data.id,
  name: data.name,
  username: data.username,
  cpf: data.cpf,
  birthDate: data.birth_date,
  role: data.role,
  churchId: data.church_id || undefined, 
  password: data.password 
});

export const toAppMember = (data: any): Member => ({
  id: data.id,
  churchId: data.church_id,
  name: data.name,
  cpf: data.cpf,
  birthDate: data.birth_date || '', 
  memberNumber: data.member_number,
  isTither: data.is_tither,
  baptismDate: data.baptism_date || '', 
  photo: data.photo_url, 
  email: data.email, 
  phone: data.phone, 
  maritalStatus: data.marital_status, 
  address: {
    street: data.address?.street || '',
    number: data.address?.number || '',
    neighborhood: data.address?.neighborhood || '',
    city: data.address?.city || '',
    state: data.address?.state || '', 
    country: data.address?.country || 'BRASIL',
    zipCode: data.address?.zipCode || ''
  }
});

export const toAppTransaction = (data: any): Transaction => ({
  id: data.id,
  churchId: data.church_id,
  type: data.type,
  category: data.category,
  amount: handleNumericField(data.amount),
  date: data.date,
  description: data.description,
  memberId: data.member_id,
  responsibleUserId: data.responsible_user_id,
  campaignId: data.campaign_id,
  attachmentUrl: data.attachment_url,
  isFixed: data.is_fixed,
  fixedExpenseId: data.fixed_expense_id,
  status: data.status || 'PAGO',
  createdAt: data.created_at
});

export const toAppFixedExpense = (data: any): FixedExpense => ({
  id: data.id,
  church_id: data.church_id,
  description: data.description,
  amount: handleNumericField(data.amount),
  dueDay: data.due_day,
  category: data.category,
  autoGenerate: data.auto_generate,
  active: data.active,
  createdAt: data.created_at
} as any);

export const toAppCampaign = (data: any): Campaign => ({
  id: data.id,
  churchId: data.church_id,
  name: data.name,
  goal: handleNumericField(data.goal),
  startDate: data.start_date,
  description: data.description,
  status: data.status || 'ATIVA'
});

export const toAppEvent = (data: any): Event => ({
  id: data.id,
  churchId: data.church_id,
  name: data.name,
  date: data.date,
  time: data.time,
  location: data.location,
  responsibleName: data.responsible_name,
  imageUrl: data.image_url
});

export const toAppMinute = (data: any): Minute => {
  let urls: string[] = [];
  if (data.file_url) {
    try {
        const parsed = JSON.parse(data.file_url);
        if (Array.isArray(parsed)) urls = parsed;
        else urls = [data.file_url];
    } catch (e) { urls = [data.file_url]; }
  }
  return {
    id: data.id,
    churchId: data.church_id,
    title: data.title,
    date: data.date,
    fileUrls: urls
  };
};

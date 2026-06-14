import { useApp } from '../context';
import { PlanTier, PlanType } from '../types';

export interface TierLimits {
  sedeMembers: number;
  congMembers: number;
  maxCongs: number;
  basePrice: number;
  label: string;
}

export const PLAN_LIMITS: Record<PlanTier | 'isento', TierLimits> = {
  bronze:  { sedeMembers: 100,      congMembers: 50,       maxCongs: 2,        basePrice: 200,  label: 'Bronze'  },
  prata:   { sedeMembers: 300,      congMembers: 100,      maxCongs: 5,        basePrice: 400,  label: 'Prata'   },
  ouro:    { sedeMembers: 700,      congMembers: 200,      maxCongs: 10,       basePrice: 700,  label: 'Ouro'    },
  diamond: { sedeMembers: Infinity, congMembers: Infinity, maxCongs: Infinity, basePrice: 1000, label: 'Diamond' },
  isento:  { sedeMembers: Infinity, congMembers: Infinity, maxCongs: Infinity, basePrice: 0,   label: 'Isento'  },
};

export const CYCLE_DISCOUNTS: Record<PlanType, number> = {
  mensal:     0,
  bimestral:  0.03,
  trimestral: 0.07,
  semestral:  0.10,
  anual:      0.15,
  isento:     0,
};

export const CYCLE_MONTHS: Record<PlanType, number> = {
  mensal:     1,
  bimestral:  2,
  trimestral: 3,
  semestral:  6,
  anual:      12,
  isento:     0,
};

export const CYCLE_LABELS: Record<PlanType, string> = {
  mensal:     'Mensal',
  bimestral:  'Bimestral',
  trimestral: 'Trimestral',
  semestral:  'Semestral',
  anual:      'Anual',
  isento:     'Isento',
};

export function calcPrice(basePrice: number, cycle: PlanType, months: number): number {
  const discount = CYCLE_DISCOUNTS[cycle] ?? 0;
  const mths = CYCLE_MONTHS[cycle] ?? 1;
  return basePrice * mths * (1 - discount);
}

export function calcMonthlyPrice(basePrice: number, cycle: PlanType): number {
  const discount = CYCLE_DISCOUNTS[cycle] ?? 0;
  return basePrice * (1 - discount);
}

export function calcSavings(basePrice: number, cycle: PlanType): number {
  const months = CYCLE_MONTHS[cycle] ?? 1;
  const withDiscount = calcPrice(basePrice, cycle, months);
  const withoutDiscount = basePrice * months;
  return withoutDiscount - withDiscount;
}

export const usePlanLimits = () => {
  const { currentChurch, members, churches } = useApp();

  const tier = (currentChurch?.planType === 'isento' ? 'isento' : currentChurch?.planTier) ?? 'bronze';
  const limits: TierLimits = PLAN_LIMITS[tier as PlanTier | 'isento'] ?? PLAN_LIMITS.diamond;

  const currentMemberCount = members.filter(m => m.churchId === currentChurch?.id).length;

  const memberLimit = currentChurch?.type === 'SEDE'
    ? limits.sedeMembers
    : limits.congMembers;

  const sedeId = currentChurch?.type === 'SEDE'
    ? currentChurch.id
    : currentChurch?.parentId;

  const currentCongCount = churches.filter(c => c.parentId === sedeId && c.type === 'CONGREGACAO').length;
  const congLimit = limits.maxCongs;

  const isAtMemberLimit = memberLimit !== Infinity && currentMemberCount >= memberLimit;
  const isAtCongLimit   = congLimit !== Infinity   && currentCongCount   >= congLimit;

  const memberPercent = memberLimit !== Infinity && memberLimit > 0
    ? Math.min(100, Math.round((currentMemberCount / memberLimit) * 100))
    : 100;

  const congPercent = congLimit !== Infinity && congLimit > 0
    ? Math.min(100, Math.round((currentCongCount / congLimit) * 100))
    : 100;

  return {
    tier: tier as PlanTier | 'isento',
    limits,
    memberLimit,
    currentMemberCount,
    congLimit,
    currentCongCount,
    isAtMemberLimit,
    isAtCongLimit,
    memberPercent,
    congPercent,
  };
};

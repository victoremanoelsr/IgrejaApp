import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context';
import { supabase } from '../services/supabaseClient';
import {
  Users, Plus, Edit2, Trash2, FileText, DollarSign, CheckCircle,
  AlertTriangle, Clock, RotateCcw, Download, ChevronLeft, Eye,
  XCircle, Save, Send, History, UserCheck, Briefcase, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PayrollEmployee {
  id: string;
  churchId: string;
  name: string;
  cpf: string;
  role: string;
  baseSalary: number;
  otherBenefits: number;
  exemptBenefits: number;
  admissionDate: string;
  status: 'ATIVO' | 'AFASTADO' | 'DESLIGADO';
  dismissalDate?: string;
  observations?: string;
  linkedChurchName?: string;
  createdAt: string;
}

export interface PayrollPeriodEntry {
  employeeId: string;
  employeeName: string;
  cpf: string;
  role: string;
  baseSalary: number;
  otherBenefits: number;
  exemptBenefits: number;
  calculationBase: number;
  pisDue: number;
}

export interface PayrollPeriod {
  id: string;
  churchId: string;
  competencia: string;
  entries: PayrollPeriodEntry[];
  totalEmployees: number;
  totalPayroll: number;
  totalBase: number;
  totalPis: number;
  status: 'ABERTA' | 'FECHADA' | 'LANCADA';
  financialTransactionIds?: string[];
  createdAt: string;
  closedAt?: string;
  launchedAt?: string;
  launchDate?: string;
  accountantName?: string;
  accountantCrc?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const fmt = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const fmtCompetencia = (c: string) => {
  if (!c) return '';
  const [y, m] = c.split('-');
  return `${MONTHS[parseInt(m) - 1]}/${y}`;
};

const calcEntry = (e: Pick<PayrollPeriodEntry, 'baseSalary'|'otherBenefits'|'exemptBenefits'>): { calculationBase: number; pisDue: number } => {
  const base = Math.max(0, e.baseSalary + e.otherBenefits - e.exemptBenefits);
  return { calculationBase: base, pisDue: base * 0.01 };
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────

const mapEmpFromDB = (r: any): PayrollEmployee => ({
  id:             r.id,
  churchId:       r.church_id,
  name:           r.name,
  cpf:            r.cpf || '',
  role:           r.role || '',
  baseSalary:     Number(r.base_salary) || 0,
  otherBenefits:  Number(r.other_benefits) || 0,
  exemptBenefits: Number(r.exempt_benefits) || 0,
  admissionDate:  r.admission_date || '',
  status:         r.status || 'ATIVO',
  dismissalDate:  r.dismissal_date || undefined,
  observations:   r.observations || undefined,
  createdAt:      r.created_at || new Date().toISOString(),
});

const mapPeriodFromDB = (r: any): PayrollPeriod => ({
  id:                     r.id,
  churchId:               r.church_id,
  competencia:            r.competencia,
  entries:                r.entries || [],
  totalEmployees:         Number(r.total_employees) || 0,
  totalPayroll:           Number(r.total_payroll) || 0,
  totalBase:              Number(r.total_base) || 0,
  totalPis:               Number(r.total_pis) || 0,
  status:                 r.status || 'ABERTA',
  financialTransactionIds: r.financial_transaction_ids || [],
  accountantName:         r.accountant_name || undefined,
  accountantCrc:          r.accountant_crc || undefined,
  launchDate:             r.launch_date || undefined,
  createdAt:              r.created_at || new Date().toISOString(),
  closedAt:               r.closed_at || undefined,
  launchedAt:             r.launched_at || undefined,
});

const fetchEmployeesFromDB = async (cid: string): Promise<PayrollEmployee[]> => {
  const { data, error } = await supabase
    .from('payroll_employees')
    .select('*')
    .eq('church_id', cid)
    .order('name');
  if (error) { console.error('[fetchEmployees]', error.message); return []; }
  return (data || []).map(mapEmpFromDB);
};

const fetchPeriodsFromDB = async (cid: string): Promise<PayrollPeriod[]> => {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('church_id', cid)
    .order('competencia', { ascending: false });
  if (error) { console.error('[fetchPeriods]', error.message); return []; }
  return (data || []).map(mapPeriodFromDB);
};

const upsertPeriodToDB = async (period: PayrollPeriod): Promise<PayrollPeriod | null> => {
  const row: any = {
    church_id:                period.churchId,
    competencia:              period.competencia,
    entries:                  period.entries,
    total_employees:          period.totalEmployees,
    total_payroll:            period.totalPayroll,
    total_base:               period.totalBase,
    total_pis:                period.totalPis,
    status:                   period.status,
    financial_transaction_ids: period.financialTransactionIds || [],
    accountant_name:          period.accountantName || null,
    accountant_crc:           period.accountantCrc || null,
    launch_date:              period.launchDate || null,
    closed_at:                period.closedAt || null,
    launched_at:              period.launchedAt || null,
  };
  // If we already have a real UUID, include it so we UPDATE instead of INSERT
  if (period.id && period.id.length === 36) row.id = period.id;
  const { data, error } = await supabase
    .from('payroll_periods')
    .upsert(row, { onConflict: 'church_id,competencia' })
    .select()
    .single();
  if (error) { console.error('[upsertPeriod]', error.message); return null; }
  return mapPeriodFromDB(data);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ModalProps { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; }
const Modal: React.FC<ModalProps> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div
      className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto`}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
        <h3 className="font-bold text-gray-800 text-base">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'funcionarios' | 'folha' | 'historico';

export const PisPasep: React.FC = () => {
  const { currentChurch, user, addTransaction } = useApp();
  const cid = currentChurch?.id || '';

  const [tab, setTab] = useState<Tab>('funcionarios');

  // ── Employees ──
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [empForm, setEmpForm] = useState<Partial<PayrollEmployee>>({});
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empFilter, setEmpFilter] = useState<'TODOS'|'ATIVO'|'AFASTADO'|'DESLIGADO'>('ATIVO');

  // ── Payroll Period ──
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedCompetencia, setSelectedCompetencia] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [editingEntries, setEditingEntries] = useState<PayrollPeriodEntry[]>([]);
  const [accountantName, setAccountantName] = useState('');
  const [accountantCrc, setAccountantCrc] = useState('');

  // ── History modal ──
  const [previewPeriod, setPreviewPeriod] = useState<PayrollPeriod | null>(null);

  // ── Launch modal ──
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchDate, setLaunchDate] = useState(new Date().toISOString().split('T')[0]);
  const [launching, setLaunching] = useState(false);

  // ── Confirm modal ──
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // ─── Load ───
  useEffect(() => {
    if (!cid) return;
    fetchEmployeesFromDB(cid).then(setEmployees);
    fetchPeriodsFromDB(cid).then(setPeriods);
  }, [cid]);

  // ─── When competência changes, load or init period ───
  useEffect(() => {
    if (!cid) return;
    fetchPeriodsFromDB(cid).then(fresh => {
      const existing = fresh.find(p => p.competencia === selectedCompetencia);
      if (existing) {
        setCurrentPeriod(existing);
        setEditingEntries(existing.entries.map(e => ({ ...e })));
        setAccountantName(existing.accountantName || '');
        setAccountantCrc(existing.accountantCrc || '');
      } else {
        setCurrentPeriod(null);
        fetchEmployeesFromDB(cid).then(emps => {
          const activeEmps = emps.filter(e => e.status === 'ATIVO');
          const entries: PayrollPeriodEntry[] = activeEmps.map(e => {
            const { calculationBase, pisDue } = calcEntry(e);
            return {
              employeeId: e.id,
              employeeName: e.name,
              cpf: e.cpf,
              role: e.role,
              baseSalary: e.baseSalary,
              otherBenefits: e.otherBenefits,
              exemptBenefits: e.exemptBenefits,
              calculationBase,
              pisDue,
            };
          });
          setEditingEntries(entries);
        });
        setAccountantName('');
        setAccountantCrc('');
      }
    });
  }, [selectedCompetencia, cid]);

  const refreshPeriods = useCallback(async () => {
    const fresh = await fetchPeriodsFromDB(cid);
    setPeriods(fresh);
    const updated = fresh.find(p => p.competencia === selectedCompetencia);
    setCurrentPeriod(updated || null);
    if (updated) setEditingEntries(updated.entries.map(e => ({ ...e })));
  }, [cid, selectedCompetencia]);

  // ─── Totals ───
  const totalEmployees = editingEntries.length;
  const totalPayroll = editingEntries.reduce((s, e) => s + e.baseSalary + e.otherBenefits, 0);
  const totalBase = editingEntries.reduce((s, e) => s + e.calculationBase, 0);
  const totalPis = editingEntries.reduce((s, e) => s + e.pisDue, 0);

  // ─── Employee CRUD ───
  const openNewEmp = () => {
    setEmpForm({ status: 'ATIVO', baseSalary: 0, otherBenefits: 0, exemptBenefits: 0, admissionDate: new Date().toISOString().split('T')[0] });
    setEditingEmpId(null);
    setShowEmpModal(true);
  };

  const openEditEmp = (e: PayrollEmployee) => {
    setEmpForm({ ...e });
    setEditingEmpId(e.id);
    setShowEmpModal(true);
  };

  const saveEmp = async () => {
    if (!empForm.name?.trim()) { alert('Informe o nome do funcionário.'); return; }
    if (!empForm.role?.trim()) { alert('Informe o cargo/função.'); return; }

    const row = {
      church_id:       cid,
      name:            empForm.name!.trim(),
      cpf:             empForm.cpf || '',
      role:            empForm.role!.trim(),
      base_salary:     empForm.baseSalary || 0,
      other_benefits:  empForm.otherBenefits || 0,
      exempt_benefits: empForm.exemptBenefits || 0,
      admission_date:  empForm.admissionDate || null,
      status:          empForm.status || 'ATIVO',
      dismissal_date:  empForm.dismissalDate || null,
      observations:    empForm.observations || null,
    };

    if (editingEmpId) {
      const { error } = await supabase
        .from('payroll_employees')
        .update(row)
        .eq('id', editingEmpId);
      if (error) { alert('Erro ao salvar funcionário: ' + error.message); return; }
    } else {
      const { error } = await supabase
        .from('payroll_employees')
        .insert(row);
      if (error) { alert('Erro ao salvar funcionário: ' + error.message); return; }
    }

    const updated = await fetchEmployeesFromDB(cid);
    setEmployees(updated);
    setShowEmpModal(false);
    setEmpForm({});
    setEditingEmpId(null);
  };

  const deleteEmp = (id: string) => {
    setConfirmMsg('Excluir este funcionário? O histórico dos períodos gerados não será afetado.');
    setConfirmAction(() => async () => {
      const { error } = await supabase
        .from('payroll_employees')
        .delete()
        .eq('id', id);
      if (error) { alert('Erro ao excluir: ' + error.message); return; }
      setEmployees(prev => prev.filter(e => e.id !== id));
      setConfirmAction(null);
    });
  };

  // ─── Editing entries in payroll ───
  const updateEntry = (idx: number, field: keyof PayrollPeriodEntry, value: number) => {
    if (currentPeriod?.status === 'FECHADA' || currentPeriod?.status === 'LANCADA') return;
    setEditingEntries(prev => {
      const copy = prev.map((e, i) => {
        if (i !== idx) return e;
        const updated = { ...e, [field]: value };
        const { calculationBase, pisDue } = calcEntry(updated);
        return { ...updated, calculationBase, pisDue };
      });
      return copy;
    });
  };

  const removeEntry = (idx: number) => {
    if (currentPeriod?.status === 'FECHADA' || currentPeriod?.status === 'LANCADA') return;
    setEditingEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const addManualEntry = () => {
    if (currentPeriod?.status === 'FECHADA' || currentPeriod?.status === 'LANCADA') return;
    setEditingEntries(prev => [...prev, {
      employeeId: uid(),
      employeeName: 'Novo Funcionário',
      cpf: '',
      role: '',
      baseSalary: 0,
      otherBenefits: 0,
      exemptBenefits: 0,
      calculationBase: 0,
      pisDue: 0,
    }]);
  };

  // ─── Save period (open) ───
  const savePeriod = async () => {
    if (editingEntries.length === 0) { alert('Adicione pelo menos um funcionário à folha.'); return; }
    const period: PayrollPeriod = {
      id: currentPeriod?.id || '',
      churchId: cid,
      competencia: selectedCompetencia,
      entries: editingEntries,
      totalEmployees,
      totalPayroll,
      totalBase,
      totalPis,
      status: currentPeriod?.status || 'ABERTA',
      financialTransactionIds: currentPeriod?.financialTransactionIds,
      createdAt: currentPeriod?.createdAt || new Date().toISOString(),
      closedAt: currentPeriod?.closedAt,
      launchedAt: currentPeriod?.launchedAt,
      launchDate: currentPeriod?.launchDate,
      accountantName,
      accountantCrc,
    };
    const saved = await upsertPeriodToDB(period);
    if (!saved) { alert('Erro ao salvar folha. Tente novamente.'); return; }
    await refreshPeriods();
    alert('✅ Folha salva com sucesso!');
  };

  // ─── Close period ───
  const closePeriod = () => {
    if (!currentPeriod) { savePeriod(); return; }
    setConfirmMsg(`Fechar a folha de ${fmtCompetencia(selectedCompetencia)}? Após fechada, os dados ficam protegidos contra alteração.`);
    setConfirmAction(() => async () => {
      const updated: PayrollPeriod = {
        ...currentPeriod,
        status: 'FECHADA',
        closedAt: new Date().toISOString(),
        entries: editingEntries,
        totalEmployees,
        totalPayroll,
        totalBase,
        totalPis,
        accountantName,
        accountantCrc,
      };
      await upsertPeriodToDB(updated);
      await refreshPeriods();
      setConfirmAction(null);
    });
  };

  // ─── Reopen period ───
  const reopenPeriod = () => {
    if (!currentPeriod) return;
    setConfirmMsg(`Reabrir a folha de ${fmtCompetencia(selectedCompetencia)}? Os dados poderão ser editados novamente.`);
    setConfirmAction(() => async () => {
      const updated: PayrollPeriod = {
        ...currentPeriod,
        status: 'ABERTA',
        closedAt: undefined,
        launchedAt: undefined,
        financialTransactionIds: undefined,
        launchDate: undefined,
      };
      await upsertPeriodToDB(updated);
      await refreshPeriods();
      setConfirmAction(null);
    });
  };

  // ─── Launch in financeiro ───
  const handleLaunch = async () => {
    if (!currentPeriod) return;
    setLaunching(true);
    try {
      const ids: string[] = [];
      const competenciaLabel = fmtCompetencia(selectedCompetencia);
      // Salary entries per employee
      for (const entry of currentPeriod.entries) {
        const t: any = {
          id: uid(),
          churchId: cid,
          type: 'SAIDA',
          category: 'SALARIO',
          amount: entry.baseSalary + entry.otherBenefits,
          date: launchDate,
          description: `Salário - ${entry.employeeName} - ${competenciaLabel}`,
          responsibleUserId: user?.id || '',
          status: 'PAGO',
          isFixed: false,
        };
        await addTransaction(t);
        ids.push(t.id);
      }
      // PIS/PASEP tax entry
      const taxT: any = {
        id: uid(),
        churchId: cid,
        type: 'SAIDA',
        category: 'IMPOSTO',
        amount: currentPeriod.totalPis,
        date: launchDate,
        description: `PIS/PASEP sobre Folha - ${competenciaLabel}`,
        responsibleUserId: user?.id || '',
        status: 'PAGO',
        isFixed: false,
      };
      await addTransaction(taxT);
      ids.push(taxT.id);

      // Update period status
      await upsertPeriodToDB({
        ...currentPeriod,
        status: 'LANCADA',
        launchedAt: new Date().toISOString(),
        financialTransactionIds: ids,
        launchDate,
      });
      await refreshPeriods();
      setShowLaunchModal(false);
      alert(`✅ Lançamentos realizados com sucesso!\n${currentPeriod.entries.length} salários + 1 PIS/PASEP lançados no financeiro.`);
    } catch (err) {
      alert('Erro ao lançar no financeiro. Tente novamente.');
    } finally {
      setLaunching(false);
    }
  };

  // ─── Estornar ───
  const estornarPeriod = (p: PayrollPeriod) => {
    setConfirmMsg(`Estornar os lançamentos financeiros de ${fmtCompetencia(p.competencia)}? Os lançamentos serão removidos do financeiro e a folha será reaberta para correção.`);
    setConfirmAction(() => async () => {
      await upsertPeriodToDB({
        ...p,
        status: 'ABERTA',
        launchedAt: undefined,
        financialTransactionIds: undefined,
        launchDate: undefined,
        closedAt: undefined,
      });
      await refreshPeriods();
      setConfirmAction(null);
      alert('Lançamentos estornados. A folha foi reaberta para correção.\nAtenção: remova manualmente os lançamentos no Financeiro se necessário.');
    });
  };

  // ─── PDF ───
  const generatePDF = (p: PayrollPeriod) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(26, 82, 118);
    doc.rect(0, 0, pw, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE APURAÇÃO DO PIS/PASEP SOBRE FOLHA DE SALÁRIOS', pw / 2, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Igrejas e Templos de Qualquer Culto — Alíquota 1%', pw / 2, 21, { align: 'center' });
    doc.text(`${currentChurch?.name || ''} | CNPJ: ${currentChurch?.cnpj || '[não informado]'}`, pw / 2, 27, { align: 'center' });
    doc.text(`Competência: ${fmtCompetencia(p.competencia)} | Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pw / 2, 33, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    let y = 45;

    // Dados da Igreja
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 82, 118);
    doc.text('1. DADOS DA ENTIDADE', 14, y); y += 4;
    doc.setDrawColor(26, 82, 118);
    doc.setLineWidth(0.5);
    doc.line(14, y, pw - 14, y); y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0);
    const churchRows = [
      ['Razão Social:', currentChurch?.name || ''],
      ['CNPJ:', currentChurch?.cnpj || 'Não informado'],
      ['Endereço:', currentChurch?.address || 'Não informado'],
      ['Responsável Legal:', currentChurch?.pastorName || 'Não informado'],
      ['Contador:', p.accountantName || 'Não informado'],
      ['CRC:', p.accountantCrc || 'Não informado'],
    ];
    churchRows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, 55, y);
      y += 5;
    });
    y += 3;

    // Fundamento Legal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 82, 118);
    doc.text('2. FUNDAMENTO LEGAL', 14, y); y += 4;
    doc.line(14, y, pw - 14, y); y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60);
    const legal = 'A entidade está enquadrada como templo de qualquer culto (art. 13, I, MP 2.158-35/2001), sendo contribuinte do PIS/PASEP sobre folha de salários. Base: LC 7/1970; MP 2.158-35/2001; IN RFB 2121/2022, arts. 300-305; Lei 8.212/1991, art. 22. Alíquota: 1%. Código DARF: 8301-02.';
    const lines = doc.splitTextToSize(legal, pw - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 5;

    // Employees Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 82, 118);
    doc.text('3. DETALHAMENTO POR FUNCIONÁRIO', 14, y); y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Nº', 'Nome', 'CPF', 'Cargo', 'Sal. Base', 'Outras Verbas', 'Isento', 'Base Cálc.', 'PIS 1%']],
      body: p.entries.map((e, i) => [
        i + 1,
        e.employeeName,
        e.cpf || '-',
        e.role || '-',
        fmt(e.baseSalary),
        fmt(e.otherBenefits),
        fmt(e.exemptBenefits),
        fmt(e.calculationBase),
        fmt(e.pisDue),
      ]),
      foot: [['', '', '', 'TOTAIS', fmt(p.entries.reduce((s,e)=>s+e.baseSalary,0)), fmt(p.entries.reduce((s,e)=>s+e.otherBenefits,0)), fmt(p.entries.reduce((s,e)=>s+e.exemptBenefits,0)), fmt(p.totalBase), fmt(p.totalPis)]],
      theme: 'grid',
      headStyles: { fillColor: [26, 82, 118], fontSize: 7, halign: 'center' },
      bodyStyles: { fontSize: 7 },
      footStyles: { fillColor: [234, 242, 248], fontStyle: 'bold', fontSize: 7 },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right', textColor: [192, 57, 43] } },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 82, 118);
    doc.text('4. RESUMO DO CÁLCULO', 14, y); y += 4;
    doc.line(14, y, pw - 14, y); y += 5;
    doc.setFontSize(9);
    doc.setTextColor(0);
    const summaryRows = [
      ['Total de Funcionários:', String(p.totalEmployees)],
      ['Total da Folha de Pagamento:', fmt(p.totalPayroll)],
      ['Base de Cálculo PIS/PASEP:', fmt(p.totalBase)],
    ];
    summaryRows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, 90, y);
      y += 5;
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(192, 57, 43);
    doc.text('PIS/PASEP Devido (1%):', 14, y);
    doc.text(fmt(p.totalPis), 90, y);
    y += 8;

    // Payment info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 82, 118);
    doc.text('5. PRAZO E FORMA DE RECOLHIMENTO', 14, y); y += 4;
    doc.line(14, y, pw - 14, y); y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0);
    [
      ['Vencimento:', '25º dia do mês subsequente (ou dia útil anterior)'],
      ['Forma de Pagamento:', 'DARF - Documento de Arrecadação de Receitas Federais'],
      ['Código de Receita:', '8301-02'],
      ['Competência:', fmtCompetencia(p.competencia)],
    ].forEach(([l, v]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(l, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(v, 65, y);
      y += 5;
    });
    y += 5;

    // Signatures
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 82, 118);
    doc.text('6. DECLARAÇÃO E ASSINATURAS', 14, y); y += 4;
    doc.line(14, y, pw - 14, y); y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60);
    const decl = 'Declaro que as informações constantes neste relatório são verdadeiras e refletem fielmente a apuração do PIS/PASEP sobre a folha de salários da entidade acima identificada para o período de competência indicado.';
    const declLines = doc.splitTextToSize(decl, pw - 28);
    doc.text(declLines, 14, y);
    y += declLines.length * 4 + 20;

    const sigY = Math.min(y, 270);
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.line(14, sigY, 90, sigY);
    doc.line(pw / 2 + 10, sigY, pw - 14, sigY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(currentChurch?.pastorName || 'Responsável Legal', 14, sigY + 5);
    doc.text(p.accountantName || 'Contador Responsável', pw / 2 + 10, sigY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text('Responsável Legal', 14, sigY + 9);
    doc.text(`Contador | CRC: ${p.accountantCrc || '_______'}`, pw / 2 + 10, sigY + 9);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('Documento gerado automaticamente pelo IgrejaApp. Fundamento: MP 2.158-35/2001, art. 13, I | IN RFB 2121/2022, arts. 300-305 | Alíquota: 1%', pw / 2, 292, { align: 'center' });

    doc.save(`PIS_PASEP_${p.competencia}.pdf`);
  };

  // ─── Render ───

  const statusBadge = (s: PayrollPeriod['status']) => {
    const map = {
      ABERTA: 'bg-yellow-100 text-yellow-700',
      FECHADA: 'bg-blue-100 text-blue-700',
      LANCADA: 'bg-green-100 text-green-700',
    };
    const labels = { ABERTA: 'Aberta', FECHADA: 'Fechada', LANCADA: 'Lançada' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[s]}`}>{labels[s]}</span>;
  };

  const isClosed = currentPeriod?.status === 'FECHADA' || currentPeriod?.status === 'LANCADA';
  const isLaunched = currentPeriod?.status === 'LANCADA';

  const filteredEmps = employees.filter(e => empFilter === 'TODOS' || e.status === empFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Briefcase className="text-blue-700" size={22}/> PIS/PASEP sobre Folha de Pagamento
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Igrejas e Templos — Alíquota 1% | Código DARF: 8301-02 | Unidade: {currentChurch?.name}
            </p>
          </div>
          <div className="flex gap-2 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <FileText size={14}/> Base Legal: MP 2.158-35/2001, art. 13-I
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 border-b border-gray-200">
          {([
            { id: 'funcionarios', label: 'Funcionários', icon: <Users size={14}/> },
            { id: 'folha', label: 'Folha do Mês', icon: <FileText size={14}/> },
            { id: 'historico', label: 'Histórico', icon: <History size={14}/> },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all ${
                tab === t.id
                  ? 'bg-blue-700 text-white border-b-2 border-blue-700'
                  : 'text-gray-500 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Funcionários ── */}
      {tab === 'funcionarios' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex gap-2">
              {(['ATIVO', 'AFASTADO', 'DESLIGADO', 'TODOS'] as const).map(f => (
                <button key={f} onClick={() => setEmpFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${empFilter === f ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f === 'TODOS' ? 'Todos' : f.charAt(0) + f.slice(1).toLowerCase()}
                  {f !== 'TODOS' && <span className="ml-1 opacity-70">({employees.filter(e => e.status === f).length})</span>}
                </button>
              ))}
            </div>
            <button onClick={openNewEmp} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow">
              <Plus size={14}/> Cadastrar Funcionário
            </button>
          </div>

          {filteredEmps.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30"/>
              <p className="font-bold">Nenhum funcionário encontrado</p>
              <p className="text-xs mt-1">Cadastre funcionários para gerar a folha mensalmente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Nome', 'CPF', 'Cargo', 'Salário Base', 'Admissão', 'Status', 'Ações'].map(h => (
                      <th key={h} className="p-3 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEmps.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-semibold text-gray-800 text-xs">{e.name}</td>
                      <td className="p-3 text-xs text-gray-500">{e.cpf || '-'}</td>
                      <td className="p-3 text-xs text-gray-600">{e.role}</td>
                      <td className="p-3 text-xs font-bold text-gray-800">{fmt(e.baseSalary)}</td>
                      <td className="p-3 text-xs text-gray-500">{e.admissionDate ? new Date(e.admissionDate).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.status === 'ATIVO' ? 'bg-green-100 text-green-700' :
                          e.status === 'AFASTADO' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-600'}`}>
                          {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEditEmp(e)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={13}/></button>
                          <button onClick={() => deleteEmp(e.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4 bg-blue-50 border-t text-xs text-blue-700 flex items-start gap-2 rounded-b-xl">
            <UserCheck size={14} className="shrink-0 mt-0.5"/>
            <span>Funcionários com status <strong>Ativo</strong> são incluídos automaticamente na folha mensal. Funcionários desligados mantêm o histórico.</span>
          </div>
        </div>
      )}

      {/* ── TAB: Folha do Mês ── */}
      {tab === 'folha' && (
        <div className="space-y-4">
          {/* Competência selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Competência</label>
                <input
                  type="month"
                  value={selectedCompetencia}
                  onChange={e => setSelectedCompetencia(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-blue-500"
                />
              </div>
              {currentPeriod && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  {statusBadge(currentPeriod.status)}
                </div>
              )}
              <div className="md:ml-auto flex flex-wrap gap-2">
                {/* Dados do contador */}
                {!isClosed && (
                  <>
                    <input
                      placeholder="Nome do Contador"
                      value={accountantName}
                      onChange={e => setAccountantName(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 outline-none focus:border-blue-400 w-44"
                    />
                    <input
                      placeholder="CRC"
                      value={accountantCrc}
                      onChange={e => setAccountantCrc(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 outline-none focus:border-blue-400 w-28"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-4 border-t pt-4">
              {!isClosed && (
                <>
                  <button onClick={savePeriod} className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 transition-all shadow-sm">
                    <Save size={13}/> Salvar Folha
                  </button>
                  <button onClick={addManualEntry} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all">
                    <Plus size={13}/> Adicionar Linha
                  </button>
                  <button onClick={closePeriod} className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-all shadow-sm">
                    <CheckCircle size={13}/> Fechar Competência
                  </button>
                </>
              )}
              {currentPeriod?.status === 'FECHADA' && (
                <>
                  <button onClick={reopenPeriod} className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition-all">
                    <RotateCcw size={13}/> Reabrir
                  </button>
                  <button
                    onClick={() => { if (currentPeriod) setShowLaunchModal(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all shadow-sm"
                  >
                    <Send size={13}/> Lançar no Financeiro
                  </button>
                </>
              )}
              {isLaunched && (
                <>
                  <button onClick={reopenPeriod} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-all">
                    <RotateCcw size={13}/> Estornar / Reabrir
                  </button>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200">
                    <CheckCircle size={13}/> Lançado em {currentPeriod.launchDate ? new Date(currentPeriod.launchDate).toLocaleDateString('pt-BR') : '-'}
                  </div>
                </>
              )}
              {currentPeriod && (
                <button onClick={() => generatePDF(currentPeriod)} className="flex items-center gap-1.5 px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-800 transition-all">
                  <Download size={13}/> Exportar PDF
                </button>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Funcionários', value: String(totalEmployees), color: 'blue' },
              { label: 'Total da Folha', value: fmt(totalPayroll), color: 'gray' },
              { label: 'Base de Cálculo', value: fmt(totalBase), color: 'orange' },
              { label: 'PIS/PASEP (1%)', value: fmt(totalPis), color: 'red' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-white rounded-xl p-4 border shadow-sm border-${color}-100`}>
                <p className={`text-[10px] font-bold text-${color}-500 uppercase mb-1`}>{label}</p>
                <p className={`text-xl font-black text-${color}-700`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {isClosed && (
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center gap-2 text-xs text-blue-700 font-semibold">
                <CheckCircle size={13}/> Competência {isClosed ? 'fechada' : 'aberta'} — {isLaunched ? 'já lançada no financeiro' : 'pronta para lançamento'}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    {['Nº', 'Funcionário', 'CPF', 'Cargo', 'Salário Base (R$)', 'Outras Verbas (R$)', 'Isentas (R$)', 'Base Cálc.', 'PIS 1%', ''].map((h, i) => (
                      <th key={i} className="p-3 text-left font-bold text-[10px] uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {editingEntries.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-400">
                        <Users size={32} className="mx-auto mb-2 opacity-30"/>
                        Nenhum funcionário ativo. Cadastre funcionários na aba "Funcionários".
                      </td>
                    </tr>
                  ) : editingEntries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-400 font-bold">{idx + 1}</td>
                      <td className="p-3">
                        {isClosed ? (
                          <span className="font-semibold text-gray-800">{entry.employeeName}</span>
                        ) : (
                          <input
                            value={entry.employeeName}
                            onChange={e => {
                              setEditingEntries(prev => prev.map((en, i) => i === idx ? { ...en, employeeName: e.target.value } : en));
                            }}
                            className="border border-gray-200 rounded px-2 py-1 w-36 text-xs outline-none focus:border-blue-400"
                          />
                        )}
                      </td>
                      <td className="p-3 text-gray-500">{entry.cpf || '-'}</td>
                      <td className="p-3 text-gray-500">{entry.role || '-'}</td>
                      {(['baseSalary', 'otherBenefits', 'exemptBenefits'] as const).map(field => (
                        <td key={field} className="p-3">
                          {isClosed ? (
                            <span className="font-bold text-gray-700">{fmt(entry[field])}</span>
                          ) : (
                            <input
                              type="number"
                              value={entry[field]}
                              onChange={e => updateEntry(idx, field, parseFloat(e.target.value) || 0)}
                              className="border border-gray-200 rounded px-2 py-1 w-28 text-xs outline-none focus:border-blue-400"
                              min={0}
                              step={0.01}
                            />
                          )}
                        </td>
                      ))}
                      <td className="p-3 font-bold text-gray-700">{fmt(entry.calculationBase)}</td>
                      <td className="p-3 font-black text-red-600">{fmt(entry.pisDue)}</td>
                      <td className="p-3">
                        {!isClosed && (
                          <button onClick={() => removeEntry(idx)} className="text-red-400 hover:text-red-600 p-1">
                            <X size={13}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {editingEntries.length > 0 && (
                  <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                    <tr>
                      <td colSpan={4} className="p-3 font-black text-blue-900 text-[10px] uppercase text-right">TOTAIS:</td>
                      <td className="p-3 font-black text-blue-900">{fmt(editingEntries.reduce((s,e)=>s+e.baseSalary,0))}</td>
                      <td className="p-3 font-black text-blue-900">{fmt(editingEntries.reduce((s,e)=>s+e.otherBenefits,0))}</td>
                      <td className="p-3 font-black text-blue-900">{fmt(editingEntries.reduce((s,e)=>s+e.exemptBenefits,0))}</td>
                      <td className="p-3 font-black text-blue-900">{fmt(totalBase)}</td>
                      <td className="p-3 font-black text-red-700 text-sm">{fmt(totalPis)}</td>
                      <td/>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
            <span><strong>Fórmula:</strong> Base de Cálculo = Salário Base + Outras Verbas − Verbas Isentas | PIS/PASEP = Base × 1% | Vencimento: 25º dia do mês subsequente</span>
          </div>
        </div>
      )}

      {/* ── TAB: Histórico ── */}
      {tab === 'historico' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><History size={16} className="text-blue-700"/> Histórico de Relatórios Gerados</h3>
          </div>
          {periods.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30"/>
              <p className="font-bold">Nenhum relatório gerado ainda</p>
              <p className="text-xs mt-1">Vá para "Folha do Mês" e salve a primeira competência</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Competência', 'Funcionários', 'Total Folha', 'Base PIS', 'PIS/PASEP', 'Status', 'Gerado em', 'Ações'].map(h => (
                      <th key={h} className="p-3 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...periods].sort((a, b) => b.competencia.localeCompare(a.competencia)).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-800">{fmtCompetencia(p.competencia)}</td>
                      <td className="p-3 text-gray-600">{p.totalEmployees}</td>
                      <td className="p-3 font-semibold">{fmt(p.totalPayroll)}</td>
                      <td className="p-3 text-gray-600">{fmt(p.totalBase)}</td>
                      <td className="p-3 font-black text-red-600">{fmt(p.totalPis)}</td>
                      <td className="p-3">{statusBadge(p.status)}</td>
                      <td className="p-3 text-gray-400">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => { setPreviewPeriod(p); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Visualizar">
                            <Eye size={13}/>
                          </button>
                          <button onClick={() => generatePDF(p)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Baixar PDF">
                            <Download size={13}/>
                          </button>
                          {p.status === 'FECHADA' && (
                            <button
                              onClick={() => {
                                setSelectedCompetencia(p.competencia);
                                setTab('folha');
                                setShowLaunchModal(true);
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Lançar no Financeiro"
                            >
                              <Send size={13}/>
                            </button>
                          )}
                          {p.status === 'LANCADA' && (
                            <button onClick={() => estornarPeriod(p)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded" title="Estornar">
                              <RotateCcw size={13}/>
                            </button>
                          )}
                          {(p.status === 'ABERTA' || p.status === 'FECHADA') && (
                            <button
                              onClick={() => { setSelectedCompetencia(p.competencia); setTab('folha'); }}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Editar"
                            >
                              <Edit2 size={13}/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal: Employee Form ─── */}
      {showEmpModal && (
        <Modal title={editingEmpId ? 'Editar Funcionário' : 'Cadastrar Funcionário'} onClose={() => setShowEmpModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Nome completo *', key: 'name', type: 'text', placeholder: 'Nome do funcionário' },
                { label: 'CPF', key: 'cpf', type: 'text', placeholder: '000.000.000-00' },
                { label: 'Cargo / Função *', key: 'role', type: 'text', placeholder: 'Ex: Secretário, Zelador' },
                { label: 'Data de Admissão', key: 'admissionDate', type: 'date', placeholder: '' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(empForm as any)[key] || ''}
                    onChange={e => setEmpForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Salário Base (R$)', key: 'baseSalary' },
                { label: 'Outras Verbas (R$)', key: 'otherBenefits' },
                { label: 'Verbas Isentas (R$)', key: 'exemptBenefits' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={(empForm as any)[key] ?? 0}
                    onChange={e => setEmpForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
                <select
                  value={empForm.status || 'ATIVO'}
                  onChange={e => setEmpForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="AFASTADO">Afastado</option>
                  <option value="DESLIGADO">Desligado</option>
                </select>
              </div>
              {(empForm.status === 'DESLIGADO') && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data de Desligamento</label>
                  <input
                    type="date"
                    value={empForm.dismissalDate || ''}
                    onChange={e => setEmpForm(f => ({ ...f, dismissalDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Igreja/Congregação vinculada</label>
              <input
                placeholder="Nome da congregação (opcional)"
                value={empForm.linkedChurchName || ''}
                onChange={e => setEmpForm(f => ({ ...f, linkedChurchName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Observações</label>
              <textarea
                placeholder="Observações adicionais..."
                value={empForm.observations || ''}
                onChange={e => setEmpForm(f => ({ ...f, observations: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Preview cálculo */}
            {((empForm.baseSalary || 0) + (empForm.otherBenefits || 0)) > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                <strong>Prévia PIS/PASEP:</strong> Base = {fmt((empForm.baseSalary||0) + (empForm.otherBenefits||0) - (empForm.exemptBenefits||0))} → PIS = {fmt(Math.max(0,(empForm.baseSalary||0)+(empForm.otherBenefits||0)-(empForm.exemptBenefits||0))*0.01)}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowEmpModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all">Cancelar</button>
              <button onClick={saveEmp} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-all shadow-sm">
                {editingEmpId ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Modal: Launch ─── */}
      {showLaunchModal && currentPeriod && (
        <Modal title="Lançar no Financeiro" onClose={() => setShowLaunchModal(false)}>
          <div className="space-y-5">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                <Send size={14}/> Serão criados os seguintes lançamentos no financeiro:
              </p>
              <ul className="space-y-2 text-xs text-green-700">
                {currentPeriod.entries.map((e, i) => (
                  <li key={i} className="flex justify-between">
                    <span>↪ Salário — {e.employeeName} ({fmtCompetencia(selectedCompetencia)})</span>
                    <span className="font-bold">{fmt(e.baseSalary + e.otherBenefits)}</span>
                  </li>
                ))}
                <li className="flex justify-between pt-2 border-t border-green-200">
                  <span>↪ PIS/PASEP sobre Folha — {fmtCompetencia(selectedCompetencia)}</span>
                  <span className="font-bold text-red-600">{fmt(currentPeriod.totalPis)}</span>
                </li>
              </ul>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data do Lançamento</label>
              <input
                type="date"
                value={launchDate}
                onChange={e => setLaunchDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
              Após o lançamento, as despesas aparecerão automaticamente no Relatório Financeiro. Para desfazer, use "Estornar".
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLaunchModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={handleLaunch} disabled={launching} className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm disabled:opacity-60 flex items-center gap-2">
                {launching ? <><Clock size={13}/> Lançando...</> : <><Send size={13}/> Confirmar Lançamento</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Modal: Preview ─── */}
      {previewPeriod && (
        <Modal title={`Folha ${fmtCompetencia(previewPeriod.competencia)}`} onClose={() => setPreviewPeriod(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: 'Funcionários', v: String(previewPeriod.totalEmployees) },
                { l: 'Total Folha', v: fmt(previewPeriod.totalPayroll) },
                { l: 'Base Cálculo', v: fmt(previewPeriod.totalBase) },
                { l: 'PIS/PASEP (1%)', v: fmt(previewPeriod.totalPis) },
              ].map(({ l, v }) => (
                <div key={l} className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{l}</p>
                  <p className="font-black text-gray-800">{v}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-blue-800 text-white">
                  <tr>
                    {['Nº','Nome','CPF','Cargo','Sal. Base','Outras','Isentas','Base','PIS'].map(h=>(
                      <th key={h} className="p-2.5 text-left text-[10px] font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewPeriod.entries.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2.5 text-gray-400">{i+1}</td>
                      <td className="p-2.5 font-semibold">{e.employeeName}</td>
                      <td className="p-2.5 text-gray-500">{e.cpf||'-'}</td>
                      <td className="p-2.5 text-gray-500">{e.role||'-'}</td>
                      <td className="p-2.5">{fmt(e.baseSalary)}</td>
                      <td className="p-2.5">{fmt(e.otherBenefits)}</td>
                      <td className="p-2.5">{fmt(e.exemptBenefits)}</td>
                      <td className="p-2.5 font-bold">{fmt(e.calculationBase)}</td>
                      <td className="p-2.5 font-black text-red-600">{fmt(e.pisDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => generatePDF(previewPeriod)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-700 rounded-lg hover:bg-red-800">
                <Download size={14}/> Baixar PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Modal: Confirm ─── */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-amber-500 shrink-0" size={22}/>
              <h3 className="font-bold text-gray-800">Confirmação</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">{confirmMsg}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={confirmAction} className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

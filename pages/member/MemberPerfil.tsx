import React, { useState, useEffect } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { updateMemberPassword } from '../../services/memberService';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  LogOut,
  Phone,
  Mail,
  MapPin,
  Loader,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

interface ChangePasswordModalProps {
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  memberId,
  onClose,
  onSuccess,
}) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    const result = await updateMemberPassword(memberId, newPass);
    setLoading(false);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Erro ao atualizar a senha.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-4">
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">Criar Nova Senha</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-3 pr-10 py-3 bg-slate-700/60 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
              Confirmar Senha
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-3 pr-10 py-3 bg-slate-700/60 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white font-bold rounded-xl transition-all text-sm"
          >
            {loading ? <Loader size={15} className="animate-spin" /> : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const MemberPerfil: React.FC = () => {
  const { session, logout, isLoading } = useMember();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showFirstAccessAlert, setShowFirstAccessAlert] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    if (session?.isFirstAccess && !passwordChanged) {
      setShowFirstAccessAlert(true);
    }
  }, [session]);

  if (!session) return null;
  const member = session.member;

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const handlePasswordSuccess = () => {
    setShowChangePassword(false);
    setShowFirstAccessAlert(false);
    setPasswordChanged(true);
  };

  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="px-4 py-5 space-y-5">
      {/* First access alert */}
      {showFirstAccessAlert && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-300 text-sm font-bold">Primeiro Acesso</p>
              <p className="text-amber-400/80 text-xs mt-1 leading-relaxed">
                Você está usando sua data de nascimento como senha. Recomendamos criar
                uma senha personalizada para maior segurança.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-xl transition-all"
                >
                  Criar minha senha
                </button>
                <button
                  onClick={() => setShowFirstAccessAlert(false)}
                  className="px-3 py-2 border border-amber-500/40 text-amber-400 text-xs font-semibold rounded-xl hover:bg-amber-500/10 transition-all"
                >
                  Depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {passwordChanged && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
          <CheckCircle size={14} className="text-green-400 shrink-0" />
          <p className="text-green-400 text-xs font-semibold">Senha atualizada com sucesso!</p>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 text-center">
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            className="w-20 h-20 rounded-full object-cover border-4 border-orange-500/40 mx-auto mb-3"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-extrabold">{initials}</span>
          </div>
        )}
        <h2 className="text-white font-extrabold text-lg">{member.name}</h2>
        <p className="text-slate-400 text-xs">{session.church.name}</p>
        {member.memberNumber && (
          <p className="text-slate-500 text-xs mt-0.5">Nº {member.memberNumber}</p>
        )}
        <div className="flex justify-center mt-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              member.status === 'ATIVO'
                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : 'bg-slate-600/40 text-slate-400 border border-slate-600/60'
            }`}
          >
            {member.status || 'ATIVO'}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
        <h3 className="text-white text-sm font-bold">Dados Cadastrais</h3>

        <div className="space-y-2.5">
          {[
            {
              icon: User,
              label: 'CPF',
              value: member.cpf
                ? member.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                : '—',
            },
            {
              icon: User,
              label: 'Data de Nascimento',
              value: formatDate(member.birthDate),
            },
            {
              icon: User,
              label: 'Data de Batismo',
              value: member.baptismDate ? formatDate(member.baptismDate) : '—',
            },
            {
              icon: Mail,
              label: 'E-mail',
              value: member.email || '—',
            },
            {
              icon: Phone,
              label: 'Telefone',
              value: member.phone || '—',
            },
            {
              icon: MapPin,
              label: 'Cidade',
              value: member.address?.city
                ? `${member.address.city} / ${member.address.state}`
                : '—',
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0">
                <Icon size={12} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                  {label}
                </p>
                <p className="text-white text-xs font-medium truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => setShowChangePassword(true)}
          className="w-full flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 text-left hover:border-orange-500/40 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Lock size={14} className="text-orange-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Alterar Senha</p>
            <p className="text-slate-500 text-xs">Crie uma senha personalizada</p>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 bg-slate-800/60 border border-red-500/20 rounded-xl p-4 text-left hover:border-red-500/40 hover:bg-red-500/5 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <LogOut size={14} className="text-red-400" />
          </div>
          <div>
            <p className="text-red-400 text-sm font-semibold">Sair do Portal</p>
            <p className="text-slate-500 text-xs">Encerrar sessão</p>
          </div>
        </button>
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          memberId={member.id}
          onClose={() => setShowChangePassword(false)}
          onSuccess={handlePasswordSuccess}
        />
      )}
    </div>
  );
};

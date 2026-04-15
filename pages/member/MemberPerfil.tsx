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
    if (newPass.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPass !== confirmPass) { setError('As senhas não conferem.'); return; }
    setLoading(true);
    const result = await updateMemberPassword(memberId, newPass);
    setLoading(false);
    if (result.success) onSuccess();
    else setError(result.error || 'Erro ao atualizar a senha.');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-800 font-semibold">Criar Nova Senha</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 text-sm"
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">
              Confirmar Senha
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 text-sm"
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={13} className="text-red-500 shrink-0" />
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-lg transition-all text-sm">
            {loading ? <Loader size={15} className="animate-spin" /> : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const MemberPerfil: React.FC = () => {
  const { session, logout } = useMember();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showFirstAccessAlert, setShowFirstAccessAlert] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    if (session?.isFirstAccess && !passwordChanged) setShowFirstAccessAlert(true);
  }, [session]);

  if (!session) return null;
  const member = session.member;

  const handleLogout = () => { logout(); navigate('/portal/login'); };

  const handlePasswordSuccess = () => {
    setShowChangePassword(false);
    setShowFirstAccessAlert(false);
    setPasswordChanged(true);
  };

  const initials = member.name.split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');

  return (
    <div className="space-y-6">
      {/* First access alert */}
      {showFirstAccessAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-700 text-sm font-semibold">Primeiro Acesso</p>
              <p className="text-amber-600 text-xs mt-1 leading-relaxed">
                Você está usando sua data de nascimento como senha. Recomendamos criar
                uma senha personalizada para maior segurança.
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowChangePassword(true)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 rounded-lg transition-all">
                  Criar minha senha
                </button>
                <button onClick={() => setShowFirstAccessAlert(false)}
                  className="px-3 py-2 border border-amber-300 text-amber-600 text-xs font-medium rounded-lg hover:bg-amber-100 transition-all">
                  Depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {passwordChanged && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle size={14} className="text-green-500 shrink-0" />
          <p className="text-green-700 text-xs font-semibold">Senha atualizada com sucesso!</p>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
        {member.photo ? (
          <img src={member.photo} alt={member.name}
            className="w-20 h-20 rounded-full object-cover border-4 border-orange-200 mx-auto mb-3" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">{initials}</span>
          </div>
        )}
        <h2 className="text-gray-800 font-bold text-lg">{member.name}</h2>
        <p className="text-gray-500 text-xs">{session.church.name}</p>
        {member.memberNumber && <p className="text-gray-400 text-xs mt-0.5">Nº {member.memberNumber}</p>}
        <div className="flex justify-center mt-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            member.status === 'ATIVO'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}>
            {member.status || 'ATIVO'}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <h3 className="text-gray-700 text-sm font-semibold">Dados Cadastrais</h3>
        <div className="space-y-3">
          {[
            { icon: User, label: 'CPF', value: member.cpf ? member.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—' },
            { icon: User, label: 'Data de Nascimento', value: formatDate(member.birthDate) },
            { icon: User, label: 'Data de Batismo', value: member.baptismDate ? formatDate(member.baptismDate) : '—' },
            { icon: Mail, label: 'E-mail', value: member.email || '—' },
            { icon: Phone, label: 'Telefone', value: member.phone || '—' },
            { icon: MapPin, label: 'Cidade', value: member.address?.city ? `${member.address.city} / ${member.address.state}` : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <Icon size={12} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">{label}</p>
                <p className="text-gray-800 text-xs font-medium truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button onClick={() => setShowChangePassword(true)}
          className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 text-left shadow-sm hover:border-orange-300 hover:shadow-md transition-all">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
            <Lock size={14} className="text-orange-500" />
          </div>
          <div>
            <p className="text-gray-800 text-sm font-semibold">Alterar Senha</p>
            <p className="text-gray-400 text-xs">Crie uma senha personalizada</p>
          </div>
        </button>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 bg-white border border-red-200 rounded-xl p-4 text-left shadow-sm hover:border-red-300 hover:bg-red-50 transition-all">
          <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
            <LogOut size={14} className="text-red-500" />
          </div>
          <div>
            <p className="text-red-500 text-sm font-semibold">Sair do Portal</p>
            <p className="text-gray-400 text-xs">Encerrar sessão</p>
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

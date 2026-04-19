import React, { useState, useEffect } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { updateMemberPassword, updateMemberUsername } from '../../services/memberService';
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
  AtSign,
  Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

/* ─── Change Password Modal ─── */
interface ChangePasswordModalProps {
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ memberId, onClose, onSuccess }) => {
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-base">Criar Nova Senha</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Nova Senha', value: newPass, setter: setNewPass, show: showNew, toggle: () => setShowNew(!showNew) },
            { label: 'Confirmar Senha', value: confirmPass, setter: setConfirmPass, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
          ].map(({ label, value, setter, show, toggle }) => (
            <div key={label}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-4 pr-10 py-3 bg-slate-800 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 text-sm"
                  required
                />
                <button type="button" onClick={toggle}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-orange-500/20">
            {loading ? <Loader size={15} className="animate-spin" /> : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Change Username Modal ─── */
interface ChangeUsernameModalProps {
  memberId: string;
  currentUsername?: string;
  onClose: () => void;
  onSuccess: (newUsername: string) => void;
}

const ChangeUsernameModal: React.FC<ChangeUsernameModalProps> = ({ memberId, currentUsername, onClose, onSuccess }) => {
  const [newUser, setNewUser] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newUser.trim().length < 3) { setError('O usuário deve ter pelo menos 3 caracteres.'); return; }
    setLoading(true);
    const result = await updateMemberUsername(memberId, newUser.trim());
    setLoading(false);
    if (result.success) onSuccess(newUser.trim());
    else setError(result.error || 'Erro ao atualizar o usuário.');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-base">Alterar Usuário de Acesso</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {currentUsername && (
          <p className="text-xs text-slate-500 mb-4">
            Atual: <span className="font-bold text-slate-300">{currentUsername}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Novo Usuário</label>
            <div className="relative">
              <AtSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                placeholder="Mínimo 3 caracteres"
                className="w-full pl-9 pr-4 py-3 bg-slate-800 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 text-sm"
                required
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5">Após salvar, use este usuário para entrar no portal.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-orange-500/20">
            {loading ? <Loader size={15} className="animate-spin" /> : 'Salvar Usuário'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
export const MemberPerfil: React.FC = () => {
  const { session, logout } = useMember();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [showFirstAccessAlert, setShowFirstAccessAlert] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [usernameChanged, setUsernameChanged] = useState<string | null>(null);

  useEffect(() => {
    if (session?.isFirstAccess && !passwordChanged) setShowFirstAccessAlert(true);
  }, [session]);

  if (!session) return null;
  const member = session.member;

  const handleLogout = () => { logout(); navigate('/'); };

  const handlePasswordSuccess = () => {
    setShowChangePassword(false);
    setShowFirstAccessAlert(false);
    setPasswordChanged(true);
  };

  const handleUsernameSuccess = (newUsername: string) => {
    setShowChangeUsername(false);
    setUsernameChanged(newUsername);
  };

  const initials = member.name.split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');

  return (
    <div className="space-y-5">

      {/* First access alert */}
      {showFirstAccessAlert && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-300 text-sm font-bold">Primeiro Acesso</p>
              <p className="text-amber-400/80 text-xs mt-1 leading-relaxed">
                Você está usando sua data de nascimento como senha. Recomendamos criar uma senha personalizada.
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowChangePassword(true)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-xl transition-all">
                  Criar minha senha
                </button>
                <button onClick={() => setShowFirstAccessAlert(false)}
                  className="px-3 py-2 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-xl hover:bg-amber-500/10 transition-all">
                  Depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success alerts */}
      {passwordChanged && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <CheckCircle size={14} className="text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-xs font-semibold">Senha atualizada com sucesso!</p>
        </div>
      )}
      {usernameChanged && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <CheckCircle size={14} className="text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-xs font-semibold">
            Usuário alterado para <span className="font-bold">{usernameChanged}</span>
          </p>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-3xl p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-violet-500/5" />
        <div className="relative">
          {member.photo ? (
            <img src={member.photo} alt={member.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-500/40 mx-auto mb-3 shadow-xl" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-orange-500/20">
              <span className="text-white text-2xl font-bold">{initials}</span>
            </div>
          )}
          <h2 className="text-white font-bold text-lg leading-tight">{member.name}</h2>
          <p className="text-slate-400 text-xs mt-0.5">{session.church.name}</p>
          {member.memberNumber && (
            <p className="text-slate-500 text-xs mt-0.5">Nº {member.memberNumber}</p>
          )}
          <div className="flex justify-center mt-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              member.status === 'ATIVO'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {member.status || 'ATIVO'}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4 space-y-3">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">
          Dados Cadastrais
        </p>
        {[
          { icon: User, label: 'CPF', value: member.cpf ? member.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—' },
          { icon: User, label: 'Data de Nascimento', value: formatDate(member.birthDate) },
          { icon: Shield, label: 'Data de Batismo', value: member.baptismDate ? formatDate(member.baptismDate) : '—' },
          { icon: Mail, label: 'E-mail', value: member.email || '—' },
          { icon: Phone, label: 'Telefone', value: member.phone || '—' },
          { icon: MapPin, label: 'Cidade', value: member.address?.city ? `${member.address.city} / ${member.address.state}` : '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center shrink-0">
              <Icon size={13} className="text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-600 text-[10px] uppercase tracking-wider font-bold">{label}</p>
              <p className="text-slate-200 text-xs font-semibold truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button onClick={() => setShowChangeUsername(true)}
          className="w-full flex items-center gap-3 bg-slate-900 border border-slate-800/60 rounded-2xl p-4 text-left hover:border-orange-500/30 active:scale-[0.98] transition-all">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <AtSign size={16} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-slate-200 text-sm font-semibold">Alterar Usuário</p>
            <p className="text-slate-500 text-xs">
              {usernameChanged || member.memberUsername
                ? `Atual: ${usernameChanged || member.memberUsername}`
                : 'Defina um usuário personalizado para o login'}
            </p>
          </div>
        </button>

        <button onClick={() => setShowChangePassword(true)}
          className="w-full flex items-center gap-3 bg-slate-900 border border-slate-800/60 rounded-2xl p-4 text-left hover:border-orange-500/30 active:scale-[0.98] transition-all">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Lock size={16} className="text-orange-400" />
          </div>
          <div>
            <p className="text-slate-200 text-sm font-semibold">Alterar Senha</p>
            <p className="text-slate-500 text-xs">Crie uma senha personalizada</p>
          </div>
        </button>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 bg-slate-900 border border-red-500/20 rounded-2xl p-4 text-left hover:border-red-500/40 hover:bg-red-500/5 active:scale-[0.98] transition-all">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <LogOut size={16} className="text-red-400" />
          </div>
          <div>
            <p className="text-red-400 text-sm font-semibold">Sair do Portal</p>
            <p className="text-slate-500 text-xs">Encerrar sessão</p>
          </div>
        </button>
      </div>

      <div className="h-2" />

      {showChangePassword && (
        <ChangePasswordModal memberId={member.id} onClose={() => setShowChangePassword(false)} onSuccess={handlePasswordSuccess} />
      )}
      {showChangeUsername && (
        <ChangeUsernameModal
          memberId={member.id}
          currentUsername={usernameChanged || member.memberUsername}
          onClose={() => setShowChangeUsername(false)}
          onSuccess={handleUsernameSuccess}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../i18n';
import { updateMemberPassword, updateMemberUsername } from '../../services/memberService';
import {
  User, Lock, Eye, EyeOff, CheckCircle, AlertCircle,
  LogOut, Phone, Mail, MapPin, Loader, X, AtSign, Shield, Camera,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ─── Change Password Modal ─── */
const ChangePasswordModal: React.FC<{ memberId: string; onClose: () => void; onSuccess: () => void }> = ({ memberId, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 6) { setError(t('memberPortal.profile.passwordTooShort')); return; }
    if (newPass !== confirmPass) { setError(t('memberPortal.profile.passwordsDontMatch')); return; }
    setLoading(true);
    const result = await updateMemberPassword(memberId, newPass);
    setLoading(false);
    if (result.success) onSuccess();
    else setError(result.error || t('memberPortal.profile.errorUpdatePassword'));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-800 font-semibold">{t('memberPortal.profile.newPasswordModal')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: t('memberPortal.profile.newPassword'), value: newPass, setter: setNewPass, show: showNew, toggle: () => setShowNew(!showNew) },
            { label: t('memberPortal.profile.confirmPassword'), value: confirmPass, setter: setConfirmPass, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
          ].map(({ label, value, setter, show, toggle }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">{label}</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={value} onChange={(e) => setter(e.target.value)} placeholder={t('memberPortal.profile.minChars')}
                  className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 text-sm" required />
                <button type="button" onClick={toggle} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={13} className="text-red-500 shrink-0" />
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-lg transition-all text-sm">
            {loading ? <Loader size={15} className="animate-spin" /> : t('memberPortal.profile.savePassword')}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Change Username Modal ─── */
const ChangeUsernameModal: React.FC<{ memberId: string; currentUsername?: string; onClose: () => void; onSuccess: (u: string) => void }> = ({ memberId, currentUsername, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [newUser, setNewUser] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newUser.trim().length < 3) { setError(t('memberPortal.profile.usernameTooShort')); return; }
    setLoading(true);
    const result = await updateMemberUsername(memberId, newUser.trim());
    setLoading(false);
    if (result.success) onSuccess(newUser.trim());
    else setError(result.error || t('memberPortal.profile.errorUpdateUsername'));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-800 font-semibold">{t('memberPortal.profile.changeUsernameModal')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        {currentUsername && (
          <p className="text-xs text-gray-500 mb-4">{t('memberPortal.profile.currentLabel')} <span className="font-semibold text-gray-700">{currentUsername}</span></p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">{t('memberPortal.profile.newUsername')}</label>
            <div className="relative">
              <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder={t('memberPortal.profile.minUserChars')}
                className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 text-sm" required />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{t('memberPortal.profile.afterSaveUsername')}</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={13} className="text-red-500 shrink-0" />
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-lg transition-all text-sm">
            {loading ? <Loader size={15} className="animate-spin" /> : t('memberPortal.profile.saveUsername')}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Main ─── */
export const MemberPerfil: React.FC = () => {
  const { session, logout, updateMemberPhoto } = useMember();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [showFirstAccessAlert, setShowFirstAccessAlert] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [usernameChanged, setUsernameChanged] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.isFirstAccess && !passwordChanged) setShowFirstAccessAlert(true);
  }, [session]);

  if (!session) return null;
  const member = session.member;

  const handleLogout = () => { logout(); navigate('/'); };
  const handlePasswordSuccess = () => { setShowChangePassword(false); setShowFirstAccessAlert(false); setPasswordChanged(true); };
  const handleUsernameSuccess = (u: string) => { setShowChangeUsername(false); setUsernameChanged(u); };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset input so the same file can be re-selected
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (!file) return;

    setPhotoError(null);
    setPhotoSuccess(false);

    // Validate: image only, max 5MB
    if (!file.type.startsWith('image/')) {
      setPhotoError('Selecione um arquivo de imagem válido (JPG, PNG, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setPhotoUploading(true);
    try {
      const result = await updateMemberPhoto(file);
      if (result.success) {
        setPhotoSuccess(true);
        setTimeout(() => setPhotoSuccess(false), 3000);
      } else {
        setPhotoError(result.error || 'Erro ao atualizar foto.');
      }
    } finally {
      setPhotoUploading(false);
    }
  };

  const initials = member.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  const profileFields = [
    { icon: User, label: t('memberPortal.profile.cpf'), value: member.cpf ? member.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—' },
    { icon: User, label: t('memberPortal.profile.birthDate'), value: formatDate(member.birthDate, lang) },
    { icon: Shield, label: t('memberPortal.profile.baptismDate'), value: member.baptismDate ? formatDate(member.baptismDate, lang) : '—' },
    { icon: Mail, label: t('memberPortal.profile.email'), value: member.email || '—' },
    { icon: Phone, label: t('memberPortal.profile.phone'), value: member.phone || '—' },
    { icon: MapPin, label: t('memberPortal.profile.city'), value: member.address?.city ? `${member.address.city} / ${member.address.state}` : '—' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {showFirstAccessAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-700 text-sm font-semibold">{t('memberPortal.profile.firstAccess')}</p>
              <p className="text-amber-600 text-xs mt-1 leading-relaxed">
                {t('memberPortal.profile.firstAccessDesc')}
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowChangePassword(true)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 rounded-lg transition-all">
                  {t('memberPortal.profile.createPassword')}
                </button>
                <button onClick={() => setShowFirstAccessAlert(false)}
                  className="px-3 py-2 border border-amber-300 text-amber-600 text-xs font-medium rounded-lg hover:bg-amber-100 transition-all">
                  {t('memberPortal.profile.later')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {passwordChanged && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle size={14} className="text-green-500 shrink-0" />
          <p className="text-green-700 text-xs font-semibold">{t('memberPortal.profile.passwordUpdated')}</p>
        </div>
      )}
      {usernameChanged && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle size={14} className="text-green-500 shrink-0" />
          <p className="text-green-700 text-xs font-semibold">
            {t('memberPortal.profile.usernameChangedMsg')} <span className="font-bold">{usernameChanged}</span>. {t('memberPortal.profile.useOnNextAccess')}
          </p>
        </div>
      )}

      {/* Photo feedback */}
      {photoSuccess && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle size={14} className="text-green-500 shrink-0" />
          <p className="text-green-700 text-xs font-semibold">Foto atualizada com sucesso!</p>
        </div>
      )}
      {photoError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={13} className="text-red-500 shrink-0" />
          <p className="text-red-600 text-xs">{photoError}</p>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
        {/* Hidden file input */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />

        {/* Avatar with camera overlay */}
        <div className="relative w-20 h-20 mx-auto mb-3">
          {member.photo ? (
            <img src={member.photo} alt={member.name} className="w-20 h-20 rounded-full object-cover border-4 border-orange-200" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{initials}</span>
            </div>
          )}
          {/* Camera button overlay */}
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading}
            title="Alterar foto"
            className="absolute bottom-0 right-0 w-7 h-7 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-colors"
          >
            {photoUploading
              ? <Loader size={13} className="text-white animate-spin" />
              : <Camera size={13} className="text-white" />
            }
          </button>
        </div>

        <h2 className="text-gray-800 font-bold text-lg">{member.name}</h2>
        <p className="text-gray-500 text-xs">{session.church.name}</p>
        {member.memberNumber && (
          <p className="text-gray-400 text-xs mt-0.5">{t('memberPortal.profile.memberNumber')} {member.memberNumber}</p>
        )}
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
        <h3 className="text-gray-700 text-sm font-semibold">{t('memberPortal.profile.personalData')}</h3>
        {profileFields.map(({ icon: Icon, label, value }) => (
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

      {/* Actions */}
      <div className="space-y-2">
        <button onClick={() => setShowChangeUsername(true)}
          className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 text-left shadow-sm hover:border-orange-300 hover:shadow-md transition-all">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
            <AtSign size={14} className="text-orange-500" />
          </div>
          <div>
            <p className="text-gray-800 text-sm font-semibold">{t('memberPortal.profile.changeUsername')}</p>
            <p className="text-gray-400 text-xs">
              {usernameChanged || member.memberUsername
                ? `${t('memberPortal.profile.currentLabel')} ${usernameChanged || member.memberUsername}`
                : t('memberPortal.profile.customizeUsername')}
            </p>
          </div>
        </button>

        <button onClick={() => setShowChangePassword(true)}
          className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 text-left shadow-sm hover:border-orange-300 hover:shadow-md transition-all">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
            <Lock size={14} className="text-orange-500" />
          </div>
          <div>
            <p className="text-gray-800 text-sm font-semibold">{t('memberPortal.profile.changePassword')}</p>
            <p className="text-gray-400 text-xs">{t('memberPortal.profile.customizePassword')}</p>
          </div>
        </button>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 bg-white border border-red-200 rounded-xl p-4 text-left shadow-sm hover:border-red-300 hover:bg-red-50 transition-all">
          <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
            <LogOut size={14} className="text-red-500" />
          </div>
          <div>
            <p className="text-red-500 text-sm font-semibold">{t('memberPortal.profile.logout')}</p>
            <p className="text-gray-400 text-xs">{t('memberPortal.profile.endSession')}</p>
          </div>
        </button>
      </div>

      {showChangePassword && (
        <ChangePasswordModal memberId={member.id} onClose={() => setShowChangePassword(false)} onSuccess={handlePasswordSuccess} />
      )}
      {showChangeUsername && (
        <ChangeUsernameModal memberId={member.id} currentUsername={usernameChanged || member.memberUsername} onClose={() => setShowChangeUsername(false)} onSuccess={handleUsernameSuccess} />
      )}
    </div>
  );
};

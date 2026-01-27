
import React, { useState } from 'react';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, AlertCircle, CheckCircle, Building, Eye, EyeOff, Loader, ShieldCheck } from 'lucide-react';

type LoginStep = 'LOGIN' | 'RECOVERY_IDENTIFY' | 'RECOVERY_SELECT' | 'RECOVERY_RESET_USER' | 'RECOVERY_RESET_PASS';

export const Login: React.FC = () => {
  const { login, recoverAccount, updateUserCredentials } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>('LOGIN');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [recoveryName, setRecoveryName] = useState('');
  const [recoveryCpf, setRecoveryCpf] = useState('');
  const [identifiedUserId, setIdentifiedUserId] = useState<string | null>(null);
  
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCPF = (value: string) => value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => setRecoveryCpf(formatCPF(e.target.value));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); 
    setIsProcessing(true);
    const result = await login(username.trim(), password.trim());
    setIsProcessing(false);
    
    if (result.user) {
      if (result.user.role === 'SUPER_ADM') navigate('/admin/dashboard');
      else navigate('/dashboard');
    } else {
      setError(result.error || 'Erro desconhecido ao tentar logar.');
    }
  };

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUserId = recoverAccount(recoveryName, recoveryCpf);
    if (foundUserId) {
      setIdentifiedUserId(foundUserId);
      setStep('RECOVERY_SELECT');
      setError('');
    } else {
      setError('Dados não encontrados. Verifique nome e CPF.');
    }
  };

  const handleUpdateUser = async () => {
    if (!identifiedUserId) return;
    setIsProcessing(true);
    const res = await updateUserCredentials(identifiedUserId, newUsername.trim(), undefined);
    setIsProcessing(false);
    if (res.success) {
      setSuccessMsg('Sucesso! Agora você já pode logar com seu novo usuário.');
      setTimeout(() => { setStep('LOGIN'); setSuccessMsg(''); setIdentifiedUserId(null); setNewUsername(''); }, 3000);
    } else setError('Erro ao atualizar usuário: ' + res.error);
  };

  const handleUpdatePass = async () => {
    if (!identifiedUserId) return;
    if (newPassword !== confirmPassword) { setError('Senhas não conferem'); return; }
    setIsProcessing(true);
    const res = await updateUserCredentials(identifiedUserId, undefined, newPassword.trim());
    setIsProcessing(false);
    if (res.success) {
      setSuccessMsg('Sucesso! Senha alterada. Use-a para entrar.');
      setTimeout(() => { setStep('LOGIN'); setSuccessMsg(''); setIdentifiedUserId(null); setNewPassword(''); setConfirmPassword(''); }, 3000);
    } else setError('Erro ao atualizar senha: ' + res.error);
  };

  const renderLogin = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-extrabold text-brand-black">Bem-vindo</h2>
        <p className="text-gray-500 text-sm mt-1">Acesse o portal da sua igreja</p>
      </div>
      
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Usuário</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-gray-400" />
          </div>
          <input type="text" required className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-brand-orange text-sm" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Digite seu usuário" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Senha</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-gray-400" />
          </div>
          <input type={showPassword ? 'text' : 'password'} required className="block w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-brand-orange text-sm" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && <div className="text-brand-red text-xs font-bold bg-red-50 p-2 rounded flex items-center"><AlertCircle size={14} className="mr-1"/> {error}</div>}
      {successMsg && <div className="text-green-600 text-xs font-bold bg-green-50 p-2 rounded flex items-center"><CheckCircle size={14} className="mr-1"/> {successMsg}</div>}

      <button type="submit" disabled={isProcessing} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-brand-orange hover:bg-brand-red transition-all transform active:scale-95 mt-2">
        {isProcessing ? <Loader className="animate-spin" size={18}/> : 'Acessar Sistema'}
      </button>

      <div className="flex flex-col items-center gap-2 mt-4">
        <button type="button" onClick={() => { setStep('RECOVERY_IDENTIFY'); setError(''); }} className="text-xs text-gray-500 hover:text-brand-orange">
          Esqueci minha senha
        </button>
        <div className="flex items-center text-[10px] text-green-600 font-bold uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <ShieldCheck size={12} className="mr-1"/> Acesso Criptografado (AES-256)
        </div>
      </div>
    </form>
  );

  const renderIdentify = () => (
    <form onSubmit={handleIdentify} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-brand-black">Recuperação</h2>
        <p className="text-gray-500 text-sm">Confirme sua identidade</p>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo</label>
        <input type="text" required className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm uppercase" value={recoveryName} onChange={(e) => setRecoveryName(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CPF</label>
        <input type="text" required placeholder="000.000.000-00" maxLength={14} className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm" value={recoveryCpf} onChange={handleCpfChange} />
      </div>
      {error && <div className="text-brand-red text-xs font-bold bg-red-50 p-2 rounded"><AlertCircle size={14} className="mr-1"/>{error}</div>}
      <div className="flex gap-2 pt-2">
         <button type="button" onClick={() => setStep('LOGIN')} className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium">Voltar</button>
         <button type="submit" className="flex-1 py-2.5 px-4 bg-brand-black text-white rounded-lg text-sm font-bold shadow-md">Validar</button>
      </div>
    </form>
  );

  const renderSelect = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-brand-black mb-6">Escolha o que alterar</h2>
      <button onClick={() => setStep('RECOVERY_RESET_USER')} className="w-full p-3 border border-gray-300 rounded-lg hover:border-brand-orange flex justify-between items-center group bg-white">
        <div className="text-left"><span className="block font-bold text-sm">Mudar Usuário</span><span className="text-xs text-gray-500">Alterar seu login</span></div>
        <ArrowRight className="text-gray-400 group-hover:text-brand-orange w-4 h-4" />
      </button>
      <button onClick={() => setStep('RECOVERY_RESET_PASS')} className="w-full p-3 border border-gray-300 rounded-lg hover:border-brand-orange flex justify-between items-center group bg-white">
        <div className="text-left"><span className="block font-bold text-sm">Mudar Senha</span><span className="text-xs text-gray-500">Criar nova senha segura</span></div>
        <ArrowRight className="text-gray-400 group-hover:text-brand-orange w-4 h-4" />
      </button>
      <div className="text-center mt-4"><button onClick={() => setStep('LOGIN')} className="text-xs text-gray-500">Cancelar</button></div>
    </div>
  );

  const renderResetUser = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-gray-800">Novo Usuário</h2>
      <input type="text" placeholder="Novo Nome de Usuário" className="w-full p-2.5 border rounded-lg text-sm" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
      <button onClick={handleUpdateUser} disabled={isProcessing} className="w-full py-2.5 bg-brand-orange text-white rounded-lg font-bold shadow-md flex justify-center">{isProcessing ? <Loader className="animate-spin" size={18}/> : 'Atualizar Usuário'}</button>
    </div>
  );

  const renderResetPass = () => (
     <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-gray-800">Nova Senha</h2>
      <div className="relative">
        <input type={showNewPass ? 'text' : 'password'} placeholder="Nova Senha" className="w-full p-2.5 pr-10 border rounded-lg text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">{showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
      <div className="relative">
        <input type={showConfirmPass ? 'text' : 'password'} placeholder="Confirmar Nova Senha" className="w-full p-2.5 pr-10 border rounded-lg text-sm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">{showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
      {error && <div className="text-brand-red text-xs font-bold bg-red-50 p-2 rounded">{error}</div>}
      <button onClick={handleUpdatePass} disabled={isProcessing} className="w-full py-2.5 bg-brand-orange text-white rounded-lg font-bold shadow-md flex justify-center">{isProcessing ? <Loader className="animate-spin" size={18}/> : 'Atualizar Senha'}</button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-orange to-brand-red p-4">
      <div className="max-w-sm w-full bg-white p-6 rounded-2xl shadow-2xl space-y-4">
        <div className="flex justify-center mb-2">
           <div className="bg-brand-black text-white p-3 rounded-full shadow-lg"><Building size={24} /></div>
        </div>
        {step === 'LOGIN' && renderLogin()}
        {step === 'RECOVERY_IDENTIFY' && renderIdentify()}
        {step === 'RECOVERY_SELECT' && renderSelect()}
        {step === 'RECOVERY_RESET_USER' && renderResetUser()}
        {step === 'RECOVERY_RESET_PASS' && renderResetPass()}
      </div>
    </div>
  );
};

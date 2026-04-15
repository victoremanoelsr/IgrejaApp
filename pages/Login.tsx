
import React, { useState, useMemo } from 'react';
import { useApp } from '../context';
import { useMember } from '../contexts/MemberContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, AlertCircle, CheckCircle, Building, Eye, EyeOff, Loader } from 'lucide-react';

type LoginStep = 'LOGIN' | 'RECOVERY_IDENTIFY' | 'RECOVERY_SELECT' | 'RECOVERY_RESET_USER' | 'RECOVERY_RESET_PASS';

export const Login: React.FC = () => {
  const { login, recoverAccount, updateUserCredentials } = useApp();
  const { login: memberLogin } = useMember();
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>('LOGIN');
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Visibilidade Login
  
  // Recovery States
  const [recoveryName, setRecoveryName] = useState('');
  const [recoveryCpf, setRecoveryCpf] = useState('');
  const [identifiedUserId, setIdentifiedUserId] = useState<string | null>(null);
  
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Novos estados para visibilidade na recuperação
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const versiculos = [
    { texto: 'Tudo posso naquele que me fortalece.', referencia: 'Filipenses 4:13' },
    { texto: 'O Senhor é o meu pastor e nada me faltará.', referencia: 'Salmos 23:1' },
    { texto: 'Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.', referencia: 'Salmos 37:5' },
    { texto: 'Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor.', referencia: 'Jeremias 29:11' },
    { texto: 'Seja forte e corajoso. Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você.', referencia: 'Josué 1:9' },
    { texto: 'Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.', referencia: 'Provérbios 3:5' },
    { texto: 'O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha.', referencia: '1 Coríntios 13:4' },
    { texto: 'Mas os que esperam no Senhor renovarão as suas forças.', referencia: 'Isaías 40:31' },
    { texto: 'Porque Deus tanto amou o mundo que deu o seu Filho Unigênito.', referencia: 'João 3:16' },
    { texto: 'Dêem graças ao Senhor, porque ele é bom; o seu amor dura para sempre.', referencia: 'Salmos 107:1' },
    { texto: 'Não andem ansiosos por coisa alguma, mas em tudo, pela oração, apresentem seus pedidos a Deus.', referencia: 'Filipenses 4:6' },
    { texto: 'Onde dois ou três se reúnem em meu nome, ali estou no meio deles.', referencia: 'Mateus 18:20' },
  ];

  const versiculoDoDia = useMemo(() => {
    return versiculos[Math.floor(Math.random() * versiculos.length)];
  }, []);

  // Helpers
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecoveryCpf(formatCPF(e.target.value));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    // Step 1: try admin login
    const adminResult = await login(trimmedUser, trimmedPass);

    if (adminResult.blocked) {
      setIsProcessing(false);
      navigate('/bloqueado');
      return;
    }

    if (adminResult.user) {
      setIsProcessing(false);
      if (adminResult.user.role === 'SUPER_ADM') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
      return;
    }

    // Step 2: admin not found — try member login (CPF or custom username)
    const memberResult = await memberLogin(trimmedUser, trimmedPass);
    setIsProcessing(false);

    if (memberResult.blocked) {
      navigate('/bloqueado');
      return;
    }

    if (!memberResult.error) {
      navigate('/portal/dashboard');
      return;
    }

    setError('Usuário ou senha incorretos.');
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
    // Trim no novo usuário
    const res = await updateUserCredentials(identifiedUserId, newUsername.trim(), undefined);
    setIsProcessing(false);

    if (res.success) {
      setSuccessMsg('Sucesso! Agora você já pode logar com seu novo usuário.');
      setTimeout(() => {
        setStep('LOGIN');
        setSuccessMsg('');
        setIdentifiedUserId(null);
        setNewUsername('');
      }, 3000);
    } else {
      setError('Erro ao atualizar usuário: ' + res.error);
    }
  };

  const handleUpdatePass = async () => {
    if (!identifiedUserId) return;
    if (newPassword !== confirmPassword) {
      setError('Senhas não conferem');
      return;
    }
    setIsProcessing(true);
    // Trim na nova senha para evitar espaços fantasmas
    const res = await updateUserCredentials(identifiedUserId, undefined, newPassword.trim());
    setIsProcessing(false);

    if (res.success) {
      setSuccessMsg('Sucesso! Senha alterada. Use-a para entrar.');
      setTimeout(() => {
        setStep('LOGIN');
        setSuccessMsg('');
        setIdentifiedUserId(null);
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPass(false);
        setShowConfirmPass(false);
      }, 3000);
    } else {
      setError('Erro ao atualizar senha: ' + res.error);
    }
  };

  // --- RENDER HELPERS ---

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
          <input
            type="text"
            required
            className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-brand-orange focus:border-brand-orange text-sm transition-all"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Digite seu usuário"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Senha</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            className="block w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-brand-orange focus:border-brand-orange text-sm transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-brand-red text-xs font-bold flex flex-col bg-red-50 p-2 rounded">
            <div className="flex items-center"><AlertCircle size={14} className="mr-1 shrink-0"/> {error}</div>
        </div>
      )}
      {successMsg && <div className="text-green-600 text-xs font-bold flex items-center bg-green-50 p-2 rounded"><CheckCircle size={14} className="mr-1"/>{successMsg}</div>}

      <button type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-brand-orange hover:bg-brand-red focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange transition-all transform active:scale-95 mt-2">
        Acessar Sistema
      </button>

      <div className="text-center my-4 px-2">
        <p className="text-xs italic text-gray-400 leading-relaxed">"{versiculoDoDia.texto}"</p>
        <p className="text-[10px] font-semibold text-gray-400 mt-1">— {versiculoDoDia.referencia}</p>
      </div>

      <div className="text-center pt-2">
        <button type="button" onClick={() => { setStep('RECOVERY_IDENTIFY'); setError(''); }} className="text-xs text-gray-500 hover:text-brand-orange transition-colors">
          Esqueci minha senha
        </button>
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
        <input
          type="text"
          required
          className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-brand-orange focus:border-brand-orange text-sm uppercase"
          value={recoveryName}
          onChange={(e) => setRecoveryName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CPF</label>
        <input
          type="text"
          required
          placeholder="000.000.000-00"
          maxLength={14}
          className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-brand-orange focus:border-brand-orange text-sm"
          value={recoveryCpf}
          onChange={handleCpfChange}
        />
      </div>

      {error && <div className="text-brand-red text-xs font-bold flex items-center bg-red-50 p-2 rounded"><AlertCircle size={14} className="mr-1"/>{error}</div>}

      <div className="flex gap-2 pt-2">
         <button type="button" onClick={() => setStep('LOGIN')} className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">Voltar</button>
         <button type="submit" className="flex-1 py-2.5 px-4 bg-brand-black text-white rounded-lg hover:bg-gray-800 text-sm font-bold shadow-md">Validar</button>
      </div>
    </form>
  );

  const renderSelect = () => (
    <div className="space-y-4">
       <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-brand-black">O que deseja alterar?</h2>
      </div>

      <button onClick={() => setStep('RECOVERY_RESET_USER')} className="w-full p-3 border border-gray-300 rounded-lg hover:border-brand-orange hover:shadow-md transition-all flex justify-between items-center group bg-white">
        <div className="text-left">
          <span className="block font-bold text-gray-800 text-sm">Mudar Nome de Usuário</span>
          <span className="text-xs text-gray-500">Atualizar seu login de acesso</span>
        </div>
        <ArrowRight className="text-gray-400 group-hover:text-brand-orange w-4 h-4" />
      </button>

      <button onClick={() => setStep('RECOVERY_RESET_PASS')} className="w-full p-3 border border-gray-300 rounded-lg hover:border-brand-orange hover:shadow-md transition-all flex justify-between items-center group bg-white">
        <div className="text-left">
          <span className="block font-bold text-gray-800 text-sm">Mudar Senha</span>
          <span className="text-xs text-gray-500">Criar uma nova senha segura</span>
        </div>
        <ArrowRight className="text-gray-400 group-hover:text-brand-orange w-4 h-4" />
      </button>
       <div className="text-center mt-4">
        <button onClick={() => { setStep('LOGIN'); setIdentifiedUserId(null); }} className="text-xs text-gray-500 hover:text-gray-800">Cancelar</button>
      </div>
    </div>
  );

  const renderResetUser = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-gray-800">Novo Usuário</h2>
      <input 
        type="text" 
        placeholder="Novo Nome de Usuário" 
        className="w-full p-2.5 border rounded-lg focus:ring-brand-orange text-sm"
        value={newUsername}
        onChange={e => setNewUsername(e.target.value)}
      />
      {error && <div className="text-brand-red text-xs font-bold bg-red-50 p-2 rounded">{error}</div>}
      <button 
        onClick={handleUpdateUser} 
        disabled={isProcessing}
        className="w-full py-2.5 bg-brand-orange text-white rounded-lg hover:bg-brand-red text-sm font-bold shadow-md flex items-center justify-center"
      >
        {isProcessing ? <Loader className="animate-spin" size={18}/> : 'Atualizar Usuário'}
      </button>
       {successMsg && <div className="text-green-600 text-xs text-center font-bold bg-green-50 p-2 rounded">{successMsg}</div>}
    </div>
  );

  const renderResetPass = () => (
     <div className="space-y-4">
      <h2 className="text-xl font-bold text-center text-gray-800">Nova Senha</h2>
      
      {/* Campo Nova Senha com Toggle */}
      <div className="relative">
        <input 
          type={showNewPass ? 'text' : 'password'}
          placeholder="Nova Senha" 
          className="w-full p-2.5 pr-10 border rounded-lg focus:ring-brand-orange text-sm"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowNewPass(!showNewPass)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Campo Confirmar Senha com Toggle */}
      <div className="relative">
        <input 
          type={showConfirmPass ? 'text' : 'password'} 
          placeholder="Confirmar Nova Senha" 
          className="w-full p-2.5 pr-10 border rounded-lg focus:ring-brand-orange text-sm"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowConfirmPass(!showConfirmPass)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error && <div className="text-brand-red text-xs font-bold bg-red-50 p-2 rounded">{error}</div>}
      
      <button 
        onClick={handleUpdatePass} 
        disabled={isProcessing}
        className="w-full py-2.5 bg-brand-orange text-white rounded-lg hover:bg-brand-red text-sm font-bold shadow-md flex items-center justify-center"
      >
        {isProcessing ? <Loader className="animate-spin" size={18}/> : 'Atualizar Senha'}
      </button>
      {successMsg && <div className="text-green-600 text-xs text-center font-bold bg-green-50 p-2 rounded">{successMsg}</div>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-6 px-4 bg-gradient-to-br from-brand-orange to-brand-red">
      <div className="max-w-sm w-full bg-white p-6 rounded-2xl shadow-2xl space-y-4 transform transition-all">
        <div className="flex justify-center mb-2">
           <div className="bg-brand-black text-white p-3 rounded-full shadow-lg">
             <Building size={24} />
           </div>
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


import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context';
import { useMember } from '../contexts/MemberContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, AlertCircle, CheckCircle, Building, Eye, EyeOff, Loader, Clock } from 'lucide-react';
import { DepartmentSelectorModal } from '../components/DepartmentSelectorModal';
import { getUserRoles, getRoleInfo, getAccessiblePanels } from '../utils/roleUtils';
import { User as UserType } from '../types';
import { checkRateLimit, recordFailedLogin, resetLoginAttempts, formatLockoutTime, MAX_LOGIN_ATTEMPTS } from '../utils/rateLimiter';

type LoginStep = 'LOGIN' | 'RECOVERY_IDENTIFY' | 'RECOVERY_SELECT' | 'RECOVERY_RESET_USER' | 'RECOVERY_RESET_PASS';

export const Login: React.FC = () => {
  const { login, switchActiveRole, recoverAccount, updateUserCredentials } = useApp();
  const { login: memberLogin } = useMember();
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>('LOGIN');
  const [multiRoleUser, setMultiRoleUser] = useState<UserType | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Visibilidade Login
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  
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

  // Suporte a lembrar senha e credenciais no aparelho
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('igrejaapp_remember') === 'true';
    } catch {
      return false;
    }
  });
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  // Carrega credenciais salvas no dispositivo ao abrir APENAS se lembrar senha estiver ativo
  useEffect(() => {
    try {
      const isRemember = localStorage.getItem('igrejaapp_remember') === 'true';
      if (!isRemember) {
        setUsername('');
        setPassword('');
        setHasSavedCredentials(false);
        return;
      }
      const savedUser = localStorage.getItem('igrejaapp_saved_user');
      const savedPass = localStorage.getItem('igrejaapp_saved_pass');
      if (savedUser) {
        setUsername(savedUser);
        if (savedPass) {
          setPassword(savedPass);
        }
        setHasSavedCredentials(true);
      }
    } catch (_) {}
  }, []);

  const handleRememberToggle = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      try {
        localStorage.removeItem('igrejaapp_saved_user');
        localStorage.removeItem('igrejaapp_saved_pass');
        localStorage.setItem('igrejaapp_remember', 'false');
      } catch (_) {}
      setUsername('');
      setPassword('');
      setHasSavedCredentials(false);
    } else {
      try {
        localStorage.setItem('igrejaapp_remember', 'true');
      } catch (_) {}
    }
  };

  const handleForgetCredentials = () => {
    try {
      localStorage.removeItem('igrejaapp_saved_user');
      localStorage.removeItem('igrejaapp_saved_pass');
      localStorage.setItem('igrejaapp_remember', 'false');
    } catch (_) {}
    setRememberMe(false);
    setUsername('');
    setPassword('');
    setHasSavedCredentials(false);
  };

  const saveCredentialsIfRequested = (u: string, p: string) => {
    if (rememberMe) {
      try {
        localStorage.setItem('igrejaapp_saved_user', u);
        localStorage.setItem('igrejaapp_saved_pass', p);
        localStorage.setItem('igrejaapp_remember', 'true');
        setHasSavedCredentials(true);
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem('igrejaapp_saved_user');
        localStorage.removeItem('igrejaapp_saved_pass');
        localStorage.removeItem('igrejaapp_remember');
        setHasSavedCredentials(false);
      } catch (_) {}
    }

    // Suporte nativo à Web Credential Management API (W3C standard - iOS Keychain e Google Password Manager)
    if (typeof window !== 'undefined' && 'credentials' in navigator && (window as any).PasswordCredential) {
      try {
        const cred = new (window as any).PasswordCredential({
          id: u,
          password: p,
          name: u,
        });
        navigator.credentials.store(cred).catch(() => {});
      } catch (_) {}
    }
  };

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

  // Timer regressivo para desbloqueio
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Checa se o usuário digitado está em período de bloqueio temporário
  useEffect(() => {
    let isCurrent = true;
    if (username.trim()) {
      checkRateLimit(username.trim()).then(status => {
        if (!isCurrent) return;
        if (status.isLocked) {
          setLockoutSeconds(status.remainingSeconds);
          setError(`Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${formatLockoutTime(status.remainingSeconds)}.`);
        } else if (lockoutSeconds > 0) {
          setLockoutSeconds(0);
          setError('');
        }
      });
    }
    return () => { isCurrent = false; };
  }, [username]);

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

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    // 0. Verifica se já está temporariamente bloqueado por excesso de tentativas (no banco e no cache)
    const rateStatus = await checkRateLimit(trimmedUser);
    if (rateStatus.isLocked) {
      setLockoutSeconds(rateStatus.remainingSeconds);
      setError(`Muitas tentativas incorretas. Por segurança, tente novamente em ${formatLockoutTime(rateStatus.remainingSeconds)}.`);
      return;
    }

    setIsProcessing(true);

    // Step 1: try admin login
    const adminResult = await login(trimmedUser, trimmedPass);

    if (adminResult.blocked) {
      setIsProcessing(false);
      navigate('/bloqueado');
      return;
    }

    if (adminResult.user) {
      await resetLoginAttempts(trimmedUser);
      saveCredentialsIfRequested(trimmedUser, trimmedPass);
      setIsProcessing(false);
      // Super Administrador vai direto para o Painel Master
      if (adminResult.user.role === 'SUPER_ADM' || adminResult.user.roles?.includes('SUPER_ADM')) {
        navigate('/admin/dashboard');
        return;
      }

      // Painéis acessíveis pelo usuário (Administração Geral e/ou Departamentos)
      const accessiblePanels = getAccessiblePanels(adminResult.user);

      // O modal só é exibido se tiver acesso a mais de 1 painel/departamento
      // (ex: mais de 1 departamento, ou administração da igreja + departamento)
      if (accessiblePanels.length > 1) {
        setMultiRoleUser(adminResult.user);
        setShowRoleModal(true);
        return;
      }

      // Se só tem 1 painel acessível (ex: apenas Pastor Presidente, apenas Dirigente, ou apenas Líder de 1 departamento)
      if (accessiblePanels.length === 1) {
        const targetPanel = accessiblePanels[0];
        if (targetPanel.role !== adminResult.user.role) {
          switchActiveRole(targetPanel.role);
        }
        navigate(targetPanel.path, { state: targetPanel.state });
        return;
      }

      const dest = getRoleInfo(adminResult.user.role);
      navigate(dest.path, { state: dest.state });
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
      await resetLoginAttempts(trimmedUser);
      saveCredentialsIfRequested(trimmedUser, trimmedPass);
      navigate('/portal/dashboard');
      return;
    }

    // Registra tentativa falha no banco de dados e checa limite
    const failStatus = await recordFailedLogin(trimmedUser);
    if (failStatus.isLocked) {
      setLockoutSeconds(failStatus.remainingSeconds);
      setError(`Você errou a senha 5 vezes consecutivas. Por segurança, aguarde ${formatLockoutTime(failStatus.remainingSeconds)} antes de tentar novamente.`);
    } else {
      setError(`Usuário ou senha incorretos. Tentativas restantes: ${failStatus.attemptsLeft} de ${MAX_LOGIN_ATTEMPTS}.`);
    }
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    const foundUserId = await recoverAccount(recoveryName, recoveryCpf);
    setIsProcessing(false);
    if (foundUserId) {
      setIdentifiedUserId(foundUserId);
      setStep('RECOVERY_SELECT');
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
      setError(res.error || 'Erro ao atualizar usuário.');
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
      setError(res.error || 'Erro ao atualizar senha.');
    }
  };

  // --- RENDER HELPERS ---

  const renderLogin = () => (
    <form method="post" action="#" autoComplete="on" onSubmit={handleLogin} className="space-y-4">
      <div className="text-center mb-2">
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="Logo" className="h-20 w-20 object-contain" />
        </div>
        <h2 className="text-2xl font-extrabold text-brand-black">Bem-vindo</h2>
        <p className="text-gray-500 text-sm mt-1">Acesse o portal da sua igreja</p>
      </div>
      
      <div>
        <label htmlFor="username" className="block text-xs font-bold text-gray-700 uppercase mb-1">Usuário</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-brand-orange focus:border-brand-orange text-sm transition-all"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Digite seu usuário"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase mb-1">Senha</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
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
            tabIndex={-1}
            title={showPassword ? 'Ocultar senha' : 'Ver senha'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Opção de Salvar/Lembrar Senha no dispositivo */}
      <div className="flex items-center justify-between text-xs pt-0.5 pb-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 hover:text-gray-800">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => handleRememberToggle(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange cursor-pointer accent-orange-500"
          />
          <span className="font-semibold text-gray-600">Lembrar senha</span>
        </label>

        {hasSavedCredentials && (
          <button
            type="button"
            onClick={handleForgetCredentials}
            className="text-[11px] text-gray-400 hover:text-red-500 transition-colors underline font-medium"
            title="Limpar credenciais salvas deste aparelho"
          >
            Esquecer dados
          </button>
        )}
      </div>

      {error && (
        <div className={`text-xs font-bold flex flex-col p-3 rounded-lg border ${
          lockoutSeconds > 0 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
            : 'bg-red-50 border-red-200 text-brand-red'
        }`}>
            <div className="flex items-center">
              {lockoutSeconds > 0 ? (
                <Clock size={16} className="mr-1.5 shrink-0 text-amber-500 animate-pulse"/>
              ) : (
                <AlertCircle size={14} className="mr-1 shrink-0"/>
              )}
              <span>{error}</span>
            </div>
            {lockoutSeconds === 0 && (
              <div className="text-gray-500 font-normal mt-1 text-xs">Membro? Use seu CPF como usuário e senha no primeiro acesso.</div>
            )}
        </div>
      )}
      {successMsg && <div className="text-green-600 text-xs font-bold flex items-center bg-green-50 p-2 rounded"><CheckCircle size={14} className="mr-1"/>{successMsg}</div>}

      <button 
        type="submit" 
        disabled={isProcessing || lockoutSeconds > 0}
        className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white transition-all transform mt-2 ${
          lockoutSeconds > 0
            ? 'bg-gray-400 cursor-not-allowed opacity-75'
            : 'bg-brand-orange hover:bg-brand-red focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange active:scale-95'
        }`}
      >
        {lockoutSeconds > 0 
          ? `Bloqueado temporariamente (${formatLockoutTime(lockoutSeconds)})` 
          : isProcessing 
            ? 'Acessando...' 
            : 'Acessar Sistema'
        }
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
         <button type="submit" disabled={isProcessing} className="flex-1 py-2.5 px-4 bg-brand-black text-white rounded-lg hover:bg-gray-800 text-sm font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
           {isProcessing ? <><Loader size={16} className="animate-spin"/> Verificando...</> : 'Validar'}
         </button>
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
        {step === 'LOGIN' && renderLogin()}
        {step === 'RECOVERY_IDENTIFY' && renderIdentify()}
        {step === 'RECOVERY_SELECT' && renderSelect()}
        {step === 'RECOVERY_RESET_USER' && renderResetUser()}
        {step === 'RECOVERY_RESET_PASS' && renderResetPass()}
      </div>

      {multiRoleUser && (
        <DepartmentSelectorModal
          isOpen={showRoleModal}
          user={multiRoleUser}
          onSelectRole={(role) => switchActiveRole(role)}
          onClose={() => setShowRoleModal(false)}
          canClose={false}
        />
      )}
    </div>
  );
};

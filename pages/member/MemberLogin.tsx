import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMember } from '../../contexts/MemberContext';
import { Lock, Hash, Eye, EyeOff, AlertCircle, Building, ArrowLeft, Loader, Clock } from 'lucide-react';
import { checkRateLimit, recordFailedLogin, resetLoginAttempts, formatLockoutTime, MAX_LOGIN_ATTEMPTS } from '../../utils/rateLimiter';

export const MemberLogin: React.FC = () => {
  const { login, isLoading } = useMember();
  const navigate = useNavigate();

  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [error, setError] = useState('');

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

  // Checa se o CPF digitado já está em período de bloqueio
  useEffect(() => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      const status = checkRateLimit(cleanCpf);
      if (status.isLocked) {
        setLockoutSeconds(status.remainingSeconds);
        setError(`Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente em ${formatLockoutTime(status.remainingSeconds)}.`);
      } else if (lockoutSeconds > 0) {
        setLockoutSeconds(0);
        setError('');
      }
    }
  }, [cpf]);

  const versiculos = useMemo(() => {
    const list = [
      { texto: 'Tudo posso naquele que me fortalece.', ref: 'Filipenses 4:13' },
      { texto: 'O Senhor é o meu pastor e nada me faltará.', ref: 'Salmos 23:1' },
      { texto: 'Porque sou eu que conheço os planos que tenho para vocês.', ref: 'Jeremias 29:11' },
      { texto: 'Confie no Senhor de todo o seu coração.', ref: 'Provérbios 3:5' },
      { texto: 'Mas os que esperam no Senhor renovarão as suas forças.', ref: 'Isaías 40:31' },
    ];
    return list[Math.floor(Math.random() * list.length)];
  }, []);

  const formatCpfDisplay = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value.replace(/\D/g, '').slice(0, 8));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCpf = cpf.replace(/\D/g, '');
    const rateStatus = checkRateLimit(cleanCpf);
    if (rateStatus.isLocked) {
      setLockoutSeconds(rateStatus.remainingSeconds);
      setError(`Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente em ${formatLockoutTime(rateStatus.remainingSeconds)}.`);
      return;
    }

    const result = await login(cleanCpf, password);
    if (result.blocked) {
      navigate('/bloqueado');
      return;
    }
    if (result.error) {
      const failStatus = recordFailedLogin(cleanCpf);
      if (failStatus.isLocked) {
        setLockoutSeconds(failStatus.remainingSeconds);
        setError(`Você errou a senha 5 vezes consecutivas. Por segurança, tente novamente em ${formatLockoutTime(failStatus.remainingSeconds)}.`);
      } else {
        setError(`${result.error} Tentativas restantes: ${failStatus.attemptsLeft} de ${MAX_LOGIN_ATTEMPTS}.`);
      }
    } else {
      resetLoginAttempts(cleanCpf);
      navigate('/portal/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 py-6 px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 border border-orange-500/40 rounded-2xl mb-4">
            <Building size={30} className="text-orange-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Portal do Membro</h1>
          <p className="text-slate-400 text-sm mt-1">IgrejaApp</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-6 shadow-2xl">
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-white">Acesse sua conta</h2>
            <p className="text-slate-400 text-xs mt-1">Use seu CPF e data de nascimento</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                CPF (somente números)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  value={formatCpfDisplay(cpf)}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  className="block w-full pl-9 pr-3 py-3 bg-slate-700/60 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                Senha (data de nascimento DDMMAAAA)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Ex: 15031990"
                  className="block w-full pl-9 pr-10 py-3 bg-slate-700/60 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`flex items-start gap-2 border rounded-xl p-3 ${
                lockoutSeconds > 0 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                {lockoutSeconds > 0 ? (
                  <Clock size={16} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                )}
                <p className={`text-xs leading-relaxed ${lockoutSeconds > 0 ? 'text-amber-400 font-medium' : 'text-red-400'}`}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || lockoutSeconds > 0 || cpf.length < 11 || password.length < 8}
              className={`w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl shadow-lg transition-all text-sm ${
                lockoutSeconds > 0
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 disabled:cursor-not-allowed shadow-orange-500/20 active:scale-95'
              }`}
            >
              {lockoutSeconds > 0 ? (
                `Acesso bloqueado (${formatLockoutTime(lockoutSeconds)})`
              ) : isLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Entrando no Portal...
                </>
              ) : (
                'Entrar no Portal'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-700/60 text-center">
            <p className="text-xs italic text-slate-500 leading-relaxed">"{versiculos.texto}"</p>
            <p className="text-[10px] font-semibold text-slate-600 mt-1">— {versiculos.ref}</p>
          </div>
        </div>

        <div className="text-center mt-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={12} />
            Acesso administrativo
          </Link>
        </div>
      </div>
    </div>
  );
};

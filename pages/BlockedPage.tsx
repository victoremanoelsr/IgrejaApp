import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldOff, MessageCircle, ArrowLeft, Mail, LogOut,
  Zap, QrCode, Copy, CheckCircle, CheckCircle2, Loader2, Sparkles, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { PLAN_LIMITS } from '../hooks/usePlanLimits';
import { generatePixBrCode, getPixQrCodeImageUrl } from '../utils/pixPayload';
import { PlanTier } from '../types';

export const BlockedPage: React.FC = () => {
  const navigate = useNavigate();
  const { systemSettings, logout, user, churches, currentChurch, confirmChurchPayment } = useApp();

  const salesPhone = (systemSettings.salesPhone || '').replace(/\D+/g, '');
  const supportEmail = systemSettings.supportEmail?.trim();
  const masterPix = systemSettings.masterPixKey?.trim() || '';

  // Identifica a igreja sede
  const myChurch = currentChurch || churches.find(c => c.id === user?.churchId);
  let sede = myChurch;
  if (sede && sede.type === 'CONGREGACAO' && sede.parentId) {
    const parent = churches.find(c => c.id === sede!.parentId);
    if (parent) sede = parent;
  }

  const tierKey = (sede?.planTier as PlanTier) || 'bronze';
  const planInfo = PLAN_LIMITS[tierKey] || PLAN_LIMITS.bronze;
  const planAmount = planInfo.basePrice > 0 ? planInfo.basePrice : 1.00;

  // Estados do Modal de Pagamento PIX Mercado Pago
  const [showPixModal, setShowPixModal] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [mpPixData, setMpPixData] = useState<{
    paymentId: number;
    qrCode: string;
    qrCodeBase64?: string;
    status: string;
  } | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const [isPaymentApproved, setIsPaymentApproved] = useState(false);
  const [copiedMpBrCode, setCopiedMpBrCode] = useState(false);
  const [copiedMasterPix, setCopiedMasterPix] = useState(false);
  const [copiedFallbackBrCode, setCopiedFallbackBrCode] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const pollingTimerRef = useRef<any>(null);

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Se o pagamento for confirmado e a igreja for desbloqueada, redireciona automaticamente
  useEffect(() => {
    if (!user) return;
    if (user.role === 'SUPER_ADM') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    if (sede && sede.active !== false) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, currentChurch, churches, sede, navigate]);

  const handleOpenPixModal = async () => {
    setShowPixModal(true);
    setIsPaymentApproved(false);
    setMpError(null);
    setShowManualFallback(false);

    if (!sede) return;

    setIsGeneratingPix(true);
    const mpToken = systemSettings.mercadoPagoAccessToken || 'APP_USR-5117403087631490-101920-b790f8f321ecb5fffbfdfba5e35b25ae-263829210';
    let generatedData: any = null;

    try {
      const res = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchId: sede.id,
          churchName: sede.name || 'Igreja',
          amount: planAmount,
          description: `Desbloqueio ${sede.name || 'Igreja'} - Plano ${planInfo.label}`,
          payerEmail: sede.email || user?.username || 'financeiro@igrejaapp.com.br',
          payerName: sede.name || user?.name || 'Responsável Financeiro',
          accessToken: mpToken
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.qrCode) {
          generatedData = data;
        }
      }
    } catch (err) {
      console.warn('[BlockedPage] /api/create-pix indisponivel, tentando fallback Mercado Pago direto:', err);
    }

    // Fallback: se a API serverless falhou ou nao respondeu qrCode, chama diretamente o Mercado Pago
    if (!generatedData && mpToken) {
      try {
        const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mpToken}`,
            'X-Idempotency-Key': `pix_${sede.id}_${Date.now()}`
          },
          body: JSON.stringify({
            transaction_amount: Number(planAmount.toFixed(2)),
            description: `Desbloqueio IgrejaApp - ${(sede.name || 'Igreja').slice(0, 30)}`,
            payment_method_id: 'pix',
            payer: {
              email: (sede.email && sede.email.includes('@')) ? sede.email : 'financeiro@igrejaapp.com.br',
              first_name: (sede.name || 'Igreja').slice(0, 30)
            },
            external_reference: sede.id
          })
        });

        if (mpRes.ok) {
          const mpJson = await mpRes.json();
          const txData = mpJson.point_of_interaction?.transaction_data;
          if (txData?.qr_code) {
            generatedData = {
              success: true,
              paymentId: mpJson.id,
              qrCode: txData.qr_code,
              qrCodeBase64: txData.qr_code_base64,
              amount: planAmount,
              churchId: sede.id,
              status: mpJson.status
            };
          }
        }
      } catch (directErr) {
        console.warn('[BlockedPage] Falha na chamada direta Mercado Pago:', directErr);
      }
    }

    if (generatedData?.qrCode) {
      setMpPixData(generatedData);
      startPolling(generatedData.paymentId, mpToken);
    } else {
      setMpError('PIX instantâneo pronto. Copie o código abaixo no seu banco para liberação.');
    }
    setIsGeneratingPix(false);
  };

  const startPolling = (paymentId: number, token?: string) => {
    stopPolling();
    const mpToken = token || systemSettings.mercadoPagoAccessToken || 'APP_USR-5117403087631490-101920-b790f8f321ecb5fffbfdfba5e35b25ae-263829210';
    pollingTimerRef.current = setInterval(async () => {
      try {
        let isApproved = false;
        // 1. Tenta API do backend
        try {
          const res = await fetch(`/api/check-pix-status?paymentId=${paymentId}&churchId=${sede?.id || ''}&accessToken=${encodeURIComponent(mpToken)}`);
          if (res.ok) {
            const result = await res.json();
            if (result.status === 'approved') isApproved = true;
          }
        } catch (_) {}

        // 2. Se backend falhou, consulta direto Mercado Pago
        if (!isApproved && mpToken) {
          try {
            const direct = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { Authorization: `Bearer ${mpToken}` }
            });
            if (direct.ok) {
              const payment = await direct.json();
              if (payment.status === 'approved') isApproved = true;
            }
          } catch (_) {}
        }

        if (isApproved) {
          stopPolling();
          setIsPaymentApproved(true);
          if (sede?.id) {
            await confirmChurchPayment(sede.id);
          }
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        }
      } catch (e) {
        console.warn('[BlockedPage] Erro no polling:', e);
      }
    }, 3500);
  };

  const handleCopyMpBrCode = () => {
    if (!mpPixData?.qrCode) return;
    navigator.clipboard.writeText(mpPixData.qrCode).then(() => {
      setCopiedMpBrCode(true);
      setTimeout(() => setCopiedMpBrCode(false), 2500);
    });
  };

  const handleCopyFallbackBrCode = () => {
    const codeToCopy = fallbackBrCode || masterPix;
    if (!codeToCopy) return;
    navigator.clipboard.writeText(codeToCopy).then(() => {
      setCopiedFallbackBrCode(true);
      setTimeout(() => setCopiedFallbackBrCode(false), 2500);
    });
  };

  const handleCopyMasterPix = () => {
    if (!masterPix) return;
    navigator.clipboard.writeText(masterPix).then(() => {
      setCopiedMasterPix(true);
      setTimeout(() => setCopiedMasterPix(false), 2500);
    });
  };

  const handleCloseModal = () => {
    stopPolling();
    setShowPixModal(false);
    setMpPixData(null);
    setIsPaymentApproved(false);
    setMpError(null);
  };

  const handleWhatsApp = () => {
    const churchInfo = sede?.name ? ` da igreja *${sede.name}*` : '';
    const userGreeting = user?.name ? `Sou ${user.name}${churchInfo}.` : (churchInfo ? `Falo${churchInfo}.` : '');

    const textParts = [
      'Olá!',
      userGreeting,
      'Nosso acesso ao sistema IgrejaApp está bloqueado por pagamento pendente.',
      'Gostaria de ajuda para regularizar a assinatura, por favor.'
    ].filter(Boolean);

    const msg = encodeURIComponent(textParts.join('\n\n'));
    const url = salesPhone
      ? `https://wa.me/${salesPhone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    if (!supportEmail) return;
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent('Regularização de Pagamento — IgrejaApp')}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // QR Code Estático de Fallback
  const fallbackBrCode = React.useMemo(() => {
    if (!masterPix) return '';
    return generatePixBrCode({
      pixKey: masterPix,
      keyType: systemSettings.masterPixKeyType,
      merchantName: systemSettings.masterPixHolderName || 'IGREJAAPP SAAS',
      merchantCity: 'BRASIL',
      amount: planAmount,
      txId: `DESB${sede?.id?.slice(0, 6).toUpperCase() || 'SAAS'}`,
      info: `Desbloqueio ${sede?.name?.slice(0, 20) || 'IgrejaApp'}`,
    });
  }, [masterPix, systemSettings, planAmount, sede]);

  const fallbackQrUrl = React.useMemo(() => {
    if (!fallbackBrCode) return '';
    return getPixQrCodeImageUrl(fallbackBrCode, 260);
  }, [fallbackBrCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="bg-red-500/20 border border-red-500/40 rounded-full p-5"
          >
            <ShieldOff size={44} className="text-red-400" />
          </motion.div>
        </div>

        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Acesso Bloqueado
        </h1>

        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          O acesso da sua igreja está suspenso por pendência de pagamento da mensalidade.
          Pague via PIX abaixo para <b className="text-emerald-400">desbloquear na mesma hora</b>, sem precisar esperar!
        </p>

        {/* Card de Desbloqueio Imediato */}
        <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 mb-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 text-left">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                Liberação Automática
              </span>
              <h3 className="text-base font-bold text-white">
                Plano {planInfo.label}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Mensalidade</span>
              <span className="text-lg font-black text-emerald-400">
                R$ {planAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-left text-xs text-emerald-300">
            <Sparkles size={16} className="text-emerald-400 shrink-0" />
            <span>
              Pagamento via Mercado Pago reconhecido em segundos. Acesso liberado sem envio de comprovante!
            </span>
          </div>

          {/* BOTÃO PRINCIPAL: PAGAR E DESBLOQUEAR AGORA */}
          <button
            type="button"
            onClick={handleOpenPixModal}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Zap size={18} className="text-yellow-300 animate-pulse" />
            <span>Pagar com PIX e Desbloquear Agora</span>
          </button>
        </div>

        {/* Opções Secundárias: Suporte */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
          >
            <MessageCircle size={15} className="text-green-400" />
            Falar com Suporte no WhatsApp
          </button>

          {supportEmail && (
            <button
              type="button"
              onClick={handleEmail}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-xl font-medium text-xs transition"
            >
              <Mail size={14} />
              Enviar e-mail ao suporte
            </button>
          )}
        </div>

        {user ? (
          <button
            onClick={handleLogout}
            className="mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors mx-auto"
          >
            <LogOut size={14} />
            Sair da Conta
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors mx-auto"
          >
            <ArrowLeft size={14} />
            Voltar para o Login
          </button>
        )}

        <p className="text-slate-600 text-xs mt-6">
          IgrejaApp &copy; {new Date().getFullYear()} &mdash; Gestão Eclesiástica
        </p>
      </motion.div>

      {/* MODAL DE PAGAMENTO PIX DIRETO NA TELA DE BLOQUEIO */}
      {showPixModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-gray-200 dark:border-gray-700 space-y-3">
            {isPaymentApproved ? (
              <div className="py-6 px-2 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={38} className="text-emerald-600 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-gray-900 dark:text-white">
                    Pagamento Aprovado!
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                    O Mercado Pago confirmou seu PIX. Seu sistema está <b>100% liberado</b> e você será redirecionado para o painel em instantes!
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                  Redirecionando para o sistema...
                </div>
              </div>
            ) : isGeneratingPix ? (
              <div className="py-12 px-4 space-y-4">
                <Loader2 size={36} className="text-emerald-600 animate-spin mx-auto" />
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                    Gerando PIX com Baixa Automática...
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Conectando com segurança ao Mercado Pago
                  </p>
                </div>
              </div>
            ) : mpPixData && !showManualFallback ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="text-left">
                    <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Zap size={18} className="text-emerald-600" />
                      PIX para Desbloqueio
                    </h3>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Baixa automática instantânea</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* QR Code Dinâmico */}
                <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500/40 inline-block mx-auto shadow-inner">
                  {mpPixData.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${mpPixData.qrCodeBase64}`}
                      alt="QR Code PIX Mercado Pago"
                      className="w-52 h-52 mx-auto rounded-lg"
                    />
                  ) : (
                    <img
                      src={getPixQrCodeImageUrl(mpPixData.qrCode, 280)}
                      alt="QR Code PIX Mercado Pago"
                      className="w-52 h-52 mx-auto rounded-lg"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span>Valor:</span>
                    <span className="font-black">R$ {planAmount.toFixed(2).replace('.', ',')}</span>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl text-[11px] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span>Aguardando pagamento... Desbloqueio na hora!</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyMpBrCode}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                      copiedMpBrCode
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                    }`}
                  >
                    {copiedMpBrCode ? <CheckCircle size={15} /> : <Copy size={15} />}
                    {copiedMpBrCode ? 'Código PIX Copiado!' : 'Copiar Código "PIX Copia e Cola"'}
                  </button>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualFallback(true)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                    >
                      Prefere Chave PIX Manual?
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Fallback Manual */
              <>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="text-left">
                    <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                      <QrCode size={18} className="text-emerald-600" />
                      PIX Manual (Chave Oficial)
                    </h3>
                    <p className="text-[11px] text-gray-400">Padrão Banco Central</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {mpError && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                    {mpError}
                  </p>
                )}

                <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500/30 inline-block mx-auto shadow-inner">
                  {fallbackQrUrl ? (
                    <img src={fallbackQrUrl} alt="QR Code PIX" className="w-52 h-52 mx-auto rounded-lg" />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center text-xs text-gray-400">
                      Chave não configurada
                    </div>
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <span>Valor:</span>
                  <span className="font-black">R$ {planAmount.toFixed(2).replace('.', ',')}</span>
                </div>

                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-left text-[11px] text-gray-600 dark:text-gray-300 space-y-1 border">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Chave:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{masterPix}</span>
                  </div>
                  {systemSettings.masterPixHolderName && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Favorecido:</span>
                      <span className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{systemSettings.masterPixHolderName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {/* Botão Principal: Copia o código Copia e Cola completo para baixa e reconhecimento */}
                  <button
                    type="button"
                    onClick={handleCopyFallbackBrCode}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-900/30"
                  >
                    {copiedFallbackBrCode ? <CheckCircle size={15} /> : <Copy size={15} />}
                    {copiedFallbackBrCode ? 'Código PIX Copiado!' : 'Copiar Código "PIX Copia e Cola"'}
                  </button>

                  {/* Botão Secundário: Copia apenas a chave bruta caso o usuário queira */}
                  {masterPix && (
                    <button
                      type="button"
                      onClick={handleCopyMasterPix}
                      className="w-full py-1.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedMasterPix ? <CheckCircle size={13} /> : <Copy size={13} />}
                      {copiedMasterPix ? 'Chave Bruta Copiada!' : `Copiar apenas Chave (${masterPix})`}
                    </button>
                  )}

                  <div className="flex gap-2">
                    {mpPixData && (
                      <button
                        type="button"
                        onClick={() => setShowManualFallback(false)}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl font-bold text-xs transition"
                      >
                        Voltar ao Automático
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockedPage;

import React, { useRef } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { Download, Shield, Building } from 'lucide-react';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const CarteirinhaDigital: React.FC = () => {
  const { session } = useMember();
  const cardRef = useRef<HTMLDivElement>(null);

  if (!session) return null;

  const member = session.member;
  const church = session.church;

  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const qrData = encodeURIComponent(
    `IgrejaApp|${member.id}|${member.cpf}|${church.name}`
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}&bgcolor=0f172a&color=f97316&qzone=1`;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Carteirinha Digital',
        text: `${member.name} — ${church.name}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Carteirinha Digital</h1>
        <p className="text-slate-400 text-sm mt-1">Seu documento de membro</p>
      </div>

      {/* Card */}
      <div ref={cardRef} className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/20 via-transparent to-violet-600/10" />

        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-16 -left-8 w-48 h-48 bg-violet-500/10 rounded-full blur-2xl" />

        {/* Card content */}
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              {church.logoUrl ? (
                <img
                  src={church.logoUrl}
                  alt="Logo"
                  className="w-9 h-9 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-xs border-2 border-white/10">
                  {church.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white text-sm font-bold leading-tight">{church.name}</p>
                <p className="text-orange-400 text-[10px] font-bold uppercase tracking-widest">
                  Membro Oficial
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-1">
              <Shield size={11} className="text-emerald-400" />
              <span className="text-emerald-400 text-[10px] font-bold">
                {member.status || 'ATIVO'}
              </span>
            </div>
          </div>

          {/* Member info + QR code */}
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-4">
              {/* Photo */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/10 overflow-hidden shadow-xl flex-shrink-0">
                {member.photo ? (
                  <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Info */}
              <div>
                <p className="text-white font-bold text-lg leading-tight">
                  {member.name.split(' ').slice(0, 2).join(' ')}
                </p>
                {member.name.split(' ').length > 2 && (
                  <p className="text-white/70 font-semibold text-sm leading-tight">
                    {member.name.split(' ').slice(2).join(' ')}
                  </p>
                )}
                {member.memberNumber && (
                  <p className="text-orange-400 text-xs font-bold mt-1">
                    Nº {member.memberNumber}
                  </p>
                )}
                {member.baptismDate && (
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Batismo: {formatDate(member.baptismDate)}
                  </p>
                )}
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 shrink-0">
              <img
                src={qrUrl}
                alt="QR Code"
                width={80}
                height={80}
                className="rounded-lg"
                loading="lazy"
              />
            </div>
          </div>

          {/* Bottom strip */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">CPF</p>
              <p className="text-slate-300 text-xs font-semibold tracking-wider">
                {member.cpf
                  ? member.cpf
                      .replace(/\D/g, '')
                      .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                  : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">
                Emitido por
              </p>
              <p className="text-slate-300 text-xs font-semibold">IgrejaApp</p>
            </div>
          </div>
        </div>

        {/* Bottom color bar */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-red-500" />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Data de Nascimento', value: formatDate(member.birthDate) },
          { label: 'Data de Batismo', value: member.baptismDate ? formatDate(member.baptismDate) : '—' },
          { label: 'Status', value: member.status || 'ATIVO' },
          { label: 'Nº de Membro', value: member.memberNumber || '—' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4"
          >
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-slate-200 text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Church Info */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
          <Building size={16} className="text-orange-400" />
        </div>
        <div className="min-w-0">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Igreja</p>
          <p className="text-slate-200 text-sm font-semibold truncate">{church.name}</p>
          {church.pastorName && (
            <p className="text-slate-500 text-xs truncate">Pastor: {church.pastorName}</p>
          )}
        </div>
      </div>

      {/* Share button */}
      {typeof navigator.share !== 'undefined' && (
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold py-3.5 rounded-2xl transition-all shadow-lg shadow-orange-500/20"
        >
          <Download size={16} />
          Compartilhar Carteirinha
        </button>
      )}

      <p className="text-slate-600 text-[11px] text-center pb-2">
        Documento gerado automaticamente pelo IgrejaApp
      </p>
    </div>
  );
};

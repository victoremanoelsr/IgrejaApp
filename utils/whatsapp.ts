export const sendWhatsApp = (phone: string, message: string): void => {
  const clean = phone.replace(/\D/g, '');
  const number = clean.startsWith('55') ? clean : `55${clean}`;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const welcomeMessage = (memberName: string, churchName: string): string =>
  `Olá ${memberName}, seja muito bem-vindo(a) à ${churchName}! É uma alegria enorme ter você conosco. Que Deus abençoe a sua vida! 🙏`;

export const birthdayMessage = (memberName: string): string =>
  `🎂 Parabéns, ${memberName}! "Que o Senhor te abençoe e te guarde; que o Senhor faça resplandecer o seu rosto sobre ti." (Números 6:24-25) Muitas felicidades neste dia especial! 🙏`;

export const treasuryMessage = (description: string, amount: number, type: 'ENTRADA' | 'SAIDA', date: string): string => {
  const formattedAmount = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
  const typeLabel = type === 'ENTRADA' ? '✅ Entrada' : '🔴 Saída';
  return `💰 *Aviso Financeiro*\n${typeLabel}: ${formattedAmount}\n📋 Descrição: ${description}\n📅 Data: ${formattedDate}\n\n_Enviado pelo IgrejaApp_`;
};

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';

async function updatePdf() {
  const sourcePath = 'C:/Users/VICTOR.ESR/.gemini/antigravity-ide/brain/7e5a8b8f-a860-48fb-a986-cd667c2473e5/.user_uploaded/media_1792442777571.pdf';
  const outPathRoot = 'c:/PROJETOS ANTIGRAVITY/igrejaapp/IGREJA_APP_Apresentacao_Comercial_2026.pdf';
  const outPathPublic = 'c:/PROJETOS ANTIGRAVITY/igrejaapp/public/IGREJA_APP_Apresentacao_Comercial_2026.pdf';

  console.log('Carregando PDF original com layout 100% autêntico...');
  const existingPdfBytes = fs.readFileSync(sourcePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // =========================================================================
  // 1. ATUALIZAÇÃO DA PÁGINA 15 (PLANOS E PREÇOS ATUALIZADOS)
  // =========================================================================
  console.log('1/3 - Atualizando Página 15 (Planos e Preços)...');
  const p15 = pdfDoc.getPage(14); // 0-indexed

  // Card 1: Bronze -> R$ 79,90 /mês
  p15.drawRectangle({
    x: 52,
    y: 546,
    width: 104,
    height: 38,
    color: rgb(34 / 255, 27 / 255, 22 / 255),
  });
  p15.drawText('R$ 79,90', {
    x: 57,
    y: 563,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  p15.drawText('/mês', {
    x: 57,
    y: 552,
    size: 9,
    font: fontRegular,
    color: rgb(156 / 255, 163 / 255, 175 / 255),
  });

  // Card 2: Prata -> R$ 149,90 /mês
  p15.drawRectangle({
    x: 181,
    y: 546,
    width: 104,
    height: 38,
    color: rgb(22 / 255, 27 / 255, 34 / 255),
  });
  p15.drawText('R$ 149,90', {
    x: 187,
    y: 563,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  p15.drawText('/mês', {
    x: 187,
    y: 552,
    size: 9,
    font: fontRegular,
    color: rgb(156 / 255, 163 / 255, 175 / 255),
  });

  // Card 3: Ouro -> R$ 249,90 /mês
  p15.drawRectangle({
    x: 311,
    y: 546,
    width: 104,
    height: 38,
    color: rgb(30 / 255, 25 / 255, 18 / 255),
  });
  p15.drawText('R$ 249,90', {
    x: 317,
    y: 563,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  p15.drawText('/mês', {
    x: 317,
    y: 552,
    size: 9,
    font: fontRegular,
    color: rgb(156 / 255, 163 / 255, 175 / 255),
  });

  // Card 4: Diamond -> R$ 399,90 /mês
  p15.drawRectangle({
    x: 441,
    y: 546,
    width: 104,
    height: 38,
    color: rgb(24 / 255, 20 / 255, 42 / 255),
  });
  p15.drawText('R$ 399,90', {
    x: 446,
    y: 563,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  p15.drawText('/mês', {
    x: 446,
    y: 552,
    size: 9,
    font: fontRegular,
    color: rgb(156 / 255, 163 / 255, 175 / 255),
  });

  // =========================================================================
  // 2. ATUALIZAÇÃO DA PÁGINA 12 (PORTAL DO MEMBRO - NOVOS RECURSOS EXCLUSIVOS)
  // =========================================================================
  console.log('2/3 - Atualizando Página 12 (Portal do Membro)...');
  const p12 = pdfDoc.getPage(11); // 0-indexed

  // Card no espaço aberto abaixo de "Como a igreja divulga"
  p12.drawRectangle({
    x: 308,
    y: 355,
    width: 244,
    height: 154,
    color: rgb(1, 1, 1),
    borderColor: rgb(226 / 255, 232 / 255, 240 / 255),
    borderWidth: 0.8,
  });

  // Badge no topo do card
  p12.drawRectangle({
    x: 314,
    y: 488,
    width: 232,
    height: 14,
    color: rgb(255 / 255, 247 / 255, 237 / 255),
  });
  p12.drawText('Recursos Exclusivos do Portal', {
    x: 320,
    y: 492,
    size: 8,
    font: fontBold,
    color: rgb(234 / 255, 88 / 255, 12 / 255),
  });

  // Item 1: Carteirinha Digital de Membro com QR Code
  p12.drawCircle({
    x: 319,
    y: 474,
    size: 2.2,
    color: rgb(249 / 255, 115 / 255, 22 / 255),
  });
  p12.drawText('Carteirinha Digital com QR Code', {
    x: 326,
    y: 471.5,
    size: 7.5,
    font: fontBold,
    color: rgb(15 / 255, 23 / 255, 42 / 255),
  });
  p12.drawText('Identificação oficial com foto, congregação e QR', {
    x: 326,
    y: 462,
    size: 6.8,
    font: fontRegular,
    color: rgb(100 / 255, 116 / 255, 139 / 255),
  });
  p12.drawText('Code para validação imediata em eventos e cultos.', {
    x: 326,
    y: 454,
    size: 6.8,
    font: fontRegular,
    color: rgb(100 / 255, 116 / 255, 139 / 255),
  });

  // Item 2: Carnê Anual Digital de Contribuição
  p12.drawCircle({
    x: 319,
    y: 441,
    size: 2.2,
    color: rgb(249 / 255, 115 / 255, 22 / 255),
  });
  p12.drawText('Carnê Anual Digital de Contribuição', {
    x: 326,
    y: 438.5,
    size: 7.5,
    font: fontBold,
    color: rgb(15 / 255, 23 / 255, 42 / 255),
  });
  p12.drawText('Visualização das 12 parcelas do ano com status', {
    x: 326,
    y: 429,
    size: 6.8,
    font: fontRegular,
    color: rgb(100 / 255, 116 / 255, 139 / 255),
  });
  p12.drawText('de pagamento e opção de impressão em PDF.', {
    x: 326,
    y: 421,
    size: 6.8,
    font: fontRegular,
    color: rgb(100 / 255, 116 / 255, 139 / 255),
  });

  // Item 3: Prestação de Contas Aberta aos Membros
  p12.drawCircle({
    x: 319,
    y: 408,
    size: 2.2,
    color: rgb(249 / 255, 115 / 255, 22 / 255),
  });
  p12.drawText('Prestação de Contas Aberta', {
    x: 326,
    y: 405.5,
    size: 7.5,
    font: fontBold,
    color: rgb(15 / 255, 23 / 255, 42 / 255),
  });
  p12.drawText('Transparência total com gráficos e relatórios', {
    x: 326,
    y: 396,
    size: 6.8,
    font: fontRegular,
    color: rgb(100 / 255, 116 / 255, 139 / 255),
  });
  p12.drawText('resumidos de entradas e saídas aprovadas da igreja.', {
    x: 326,
    y: 388,
    size: 6.8,
    font: fontRegular,
    color: rgb(100 / 255, 116 / 255, 139 / 255),
  });

  // Item 4: Notificações Push Flutuantes no Smartphone
  p12.drawCircle({
    x: 319,
    y: 375,
    size: 2.2,
    color: rgb(249 / 255, 115 / 255, 22 / 255),
  });
  p12.drawText('Notificações Push no Celular', {
    x: 326,
    y: 372.5,
    size: 7.5,
    font: fontBold,
    color: rgb(15 / 255, 23 / 255, 42 / 255),
  });
  p12.drawText('Alertas nativos na tela do smartphone (Web Push)', {
    x: 326,
    y: 363,
    size: 6.8,
    font: fontRegular,
    color: rgb(100 / 255, 116 / 255, 139 / 255),
  });
  p12.drawText('para avisos e eventos, mesmo com app fechado.', {
    x: 326,
    y: 355,
    size: 6.8,
    font: fontRegular,
    color: rgb(100 / 255, 116 / 255, 139 / 255),
  });

  // =========================================================================
  // 3. ATUALIZAÇÃO DA PÁGINA 13 (MOEDA FIXA EM REAL BRASILEIRO R$)
  // =========================================================================
  console.log('3/3 - Atualizando Página 13 (Moeda em Real R$)...');
  const p13 = pdfDoc.getPage(12); // 0-indexed

  // Cobrir "Moeda e datas ajustadas por idioma" mantendo o checkmark verde original
  p13.drawRectangle({
    x: 236,
    y: 361,
    width: 122,
    height: 10,
    color: rgb(10 / 255, 10 / 255, 10 / 255),
  });
  p13.drawText('Moeda padrão em Real Brasileiro (R$)', {
    x: 238,
    y: 364.5,
    size: 6.5,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });

  // =========================================================================
  // SALVAR ARQUIVO FINAL
  // =========================================================================
  console.log('Gravando arquivos PDF finais...');
  const pdfBytes = await pdfDoc.save();

  fs.writeFileSync(outPathRoot, pdfBytes);
  fs.writeFileSync(outPathPublic, pdfBytes);

  console.log('✅ Arquivos PDF concluídos com perfeição!');
  console.log(`- ${outPathRoot} (${pdfBytes.length} bytes)`);
  console.log(`- ${outPathPublic} (${pdfBytes.length} bytes)`);
}

updatePdf().catch(err => {
  console.error('Erro:', err);
});

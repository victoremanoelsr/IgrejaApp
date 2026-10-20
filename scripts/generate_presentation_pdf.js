import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

// ====================================================================
// GERADOR DO PDF OFICIAL DE APRESENTAÇÃO COMERCIAL - IGREJA APP 2026
// ====================================================================

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
  compress: true,
});

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 178mm

// PALETA DE CORES OFICIAIS
const COLOR_PRIMARY = [249, 115, 22];    // #f97316 (Laranja Brand)
const COLOR_PRIMARY_DARK = [234, 88, 12]; // #ea580c (Laranja Escuro)
const COLOR_DARK = [15, 23, 42];          // #0f172a (Slate 900)
const COLOR_BLACK = [10, 14, 23];         // #0a0e17 (Preto Profundo)
const COLOR_GRAY_DARK = [51, 65, 85];     // #334155 (Slate 700)
const COLOR_GRAY_LIGHT = [241, 245, 249]; // #f1f5f9 (Slate 100)
const COLOR_GRAY_BORDER = [226, 232, 240];// #e2e8f0 (Slate 200)
const COLOR_WHITE = [255, 255, 255];
const COLOR_GREEN = [16, 185, 129];       // #10b981 (Emerald)
const COLOR_GREEN_BG = [236, 253, 245];   // #ecfdf5
const COLOR_RED = [239, 68, 68];          // #ef4444 (Rose)
const COLOR_RED_BG = [254, 242, 242];     // #fef2f2
const COLOR_BLUE = [59, 130, 246];        // #3b82f6 (Blue)
const COLOR_PURPLE = [147, 51, 234];      // #9333ea (Purple)

// HELPER: Desenhar Cabeçalho Padrão das Páginas Internas
function drawHeader(pageNum, sectionName = 'Apresentação Comercial') {
  // Mini Logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('IGREJA', MARGIN, 18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('APP', MARGIN + 21, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('SISTEMA DE GERENCIAMENTO DE IGREJAS', MARGIN, 21.5);

  // Seção e Página no topo direito
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 150, 165);
  doc.text(`${sectionName} · Pág. ${pageNum}`, PAGE_WIDTH - MARGIN, 19, { align: 'right' });

  // Linha divisória sutil
  doc.setDrawColor(...COLOR_GRAY_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 24, PAGE_WIDTH - MARGIN, 24);
}

// HELPER: Desenhar Rodapé Padrão
function drawFooter(footerText = 'IGREJA APP — A plataforma completa para a gestão da sua igreja.') {
  doc.setDrawColor(...COLOR_GRAY_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 283, PAGE_WIDTH - MARGIN, 283);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 150, 165);
  doc.text(footerText, MARGIN, 288);
  doc.text('www.igrejaapp.com.br', PAGE_WIDTH - MARGIN, 288, { align: 'right' });
}

// HELPER: Desenhar Card com Borda e Fundo
function drawCard(x, y, w, h, bgColor = COLOR_WHITE, borderColor = COLOR_GRAY_BORDER, radius = 2.5) {
  doc.setFillColor(...bgColor);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, radius, radius, 'FD');
}

// HELPER: Desenhar Faixa / Banner
function drawBanner(x, y, w, h, text, bgColor = COLOR_DARK, textColor = COLOR_WHITE, fontSize = 9) {
  doc.setFillColor(...bgColor);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(...textColor);
  doc.text(text, x + w / 2, y + h / 2 + 1.2, { align: 'center', maxWidth: w - 4 });
}

// HELPER: Tag com fundo colorido (ex: "+ SOBRE O SISTEMA")
function drawBadgeTag(text, x, y, bg = [255, 237, 213], textCol = COLOR_PRIMARY_DARK) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const width = doc.getTextWidth(text) + 6;
  doc.setFillColor(...bg);
  doc.roundedRect(x, y, width, 5.5, 1.2, 1.2, 'F');
  doc.setTextColor(...textCol);
  doc.text(text, x + 3, y + 4);
  return width;
}

// ====================================================================
// PÁGINA 1: CAPA OFICIAL
// ====================================================================
function buildPage1() {
  // Fundo gradiente estilizado (Dark Theme)
  doc.setFillColor(...COLOR_BLACK);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  // Círculo decorativo / brilho laranja superior
  doc.setFillColor(35, 20, 15);
  doc.circle(PAGE_WIDTH / 2, 90, 85, 'F');
  doc.setFillColor(45, 25, 15);
  doc.circle(PAGE_WIDTH / 2, 90, 55, 'F');

  // Cruz e Templo Estilizado (Logo Vetorial Premium)
  const cx = PAGE_WIDTH / 2;
  const cy = 68;

  // Cruz no topo
  doc.setFillColor(...COLOR_WHITE);
  doc.rect(cx - 1.2, cy - 26, 2.4, 18, 'F'); // Vertical
  doc.rect(cx - 6, cy - 21, 12, 2.4, 'F');   // Horizontal

  // Telhado do templo
  doc.setFillColor(...COLOR_PRIMARY);
  doc.triangle(cx, cy - 6, cx - 24, cy + 12, cx + 24, cy + 12, 'F');
  doc.setFillColor(...COLOR_PRIMARY_DARK);
  doc.triangle(cx, cy - 6, cx, cy + 12, cx + 24, cy + 12, 'F');

  // Corpo do templo
  doc.setFillColor(25, 30, 45);
  doc.rect(cx - 20, cy + 12, 40, 18, 'F');
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(cx - 4, cy + 17, 8, 13, 'F'); // Porta da igreja
  doc.setFillColor(...COLOR_WHITE);
  doc.circle(cx - 11, cy + 18, 2.5, 'F'); // Janela esquerda
  doc.circle(cx + 11, cy + 18, 2.5, 'F'); // Janela direita

  // Título Principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...COLOR_WHITE);
  doc.text('IGREJA ', cx - 20, 122, { align: 'right' });
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('APP', cx - 18, 122, { align: 'left' });

  // Linhas e Subtítulo
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(cx - 65, 128, cx - 45, 128);
  doc.line(cx + 45, 128, cx + 65, 128);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 225, 235);
  doc.text('SISTEMA DE GERENCIAMENTO DE IGREJAS', cx, 129, { align: 'center' });

  // Tag Apresentação
  drawBadgeTag('+ APRESENTAÇÃO COMERCIAL OFICIAL 2026', cx - 35, 140, [40, 25, 20], COLOR_PRIMARY);

  // Frase de impacto
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(200, 210, 225);
  const desc = 'Uma plataforma moderna, segura e completa para organizar membros, dízimos e ofertas, congregações, ministérios, carnês, eventos com notificações push e relatórios em um só lugar.';
  doc.text(desc, cx, 156, { align: 'center', maxWidth: 140 });

  // 4 Cards de Métricas na Capa
  const cardW = 39;
  const cardH = 26;
  const startX = MARGIN + 4;
  const cardY = 195;
  const metrics = [
    { num: '18+', label: 'Módulos\nCompletos' },
    { num: '12x', label: 'Carnês &\nParcelas' },
    { num: 'PUSH', label: 'Notificações\nno Celular' },
    { num: 'R$ 79', label: 'Planos a partir\nde R$ 79,90/mês' },
  ];

  metrics.forEach((m, idx) => {
    const x = startX + idx * (cardW + 4);
    doc.setFillColor(20, 26, 40);
    doc.setDrawColor(40, 50, 70);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, cardY, cardW, cardH, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(m.num, x + cardW / 2, cardY + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 190, 205);
    doc.text(m.label, x + cardW / 2, cardY + 16, { align: 'center' });
  });

  // Tecnologias no rodapé
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 150);
  doc.text('SAAS · PWA INSTALÁVEL · REACT 19 · TYPESCRIPT · SUPABASE REALTIME · WEB PUSH', cx, 260, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 100, 120);
  doc.text('Desenvolvido para Pastores, Líderes e Tesoureiros do Ministério Evangélico', cx, 268, { align: 'center' });
}

// ====================================================================
// PÁGINA 2: O QUE É O IGREJA APP?
// ====================================================================
function buildPage2() {
  drawHeader(2);
  drawBadgeTag('✦ SOBRE O SISTEMA', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('O que é o ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('IGREJA APP?', MARGIN + 29, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'O IGREJA APP é uma plataforma web e móvel de alta performance desenvolvida especificamente para igrejas, ministérios e congregações. Ele une tecnologia de ponta, praticidade e espiritualidade para organizar a obra de Deus com total clareza, segurança e transparência financeira.',
    MARGIN, 47, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.4 }
  );

  // 2 Destaques em Cartões
  const colW = (CONTENT_WIDTH - 6) / 2;
  drawCard(MARGIN, 62, colW, 40, [255, 250, 245], [254, 215, 170]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_PRIMARY_DARK);
  doc.text('⛪ Para Igrejas de Todos os Tamanhos', MARGIN + 5, 71);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'Desde pequenas congregações locais até grandes campos e ministérios com sede e dezenas de filiais. O sistema cresce junto com a sua igreja de forma flexível e acessível.',
    MARGIN + 5, 78, { maxWidth: colW - 10, lineHeightFactor: 1.3 }
  );

  drawCard(MARGIN + colW + 6, 62, colW, 40, [240, 249, 255], [186, 230, 253]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(3, 105, 161);
  doc.text('🌐 100% Online, em Nuvem e PWA', MARGIN + colW + 11, 71);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'Acesse de qualquer smartphone, tablet ou computador. Instale direto na tela inicial sem precisar baixar de lojas. Com sincronização em tempo real e backup contínuo.',
    MARGIN + colW + 11, 78, { maxWidth: colW - 10, lineHeightFactor: 1.3 }
  );

  // Bloco Central: O sistema centraliza em um só lugar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_DARK);
  doc.text('O que o sistema centraliza para a sua igreja:', MARGIN, 112);

  const featuresList = [
    { left: '✓ Gestão Completa de Membros e Obreiros', right: '✓ Tesouraria: Dízimos, Ofertas e Despesas' },
    { left: '✓ Sede e Congregações Filhas Integradas', right: '✓ Departamentos com Caixas Próprios' },
    { left: '✓ Campanhas de Arrecadação com Metas', right: '✓ Carnês Digitais Anuais em 12 Parcelas' },
    { left: '✓ Cartas de Recomendação e Mudança em PDF', right: '✓ Certificados de Batismo e Apresentação' },
    { left: '✓ Agenda com Notificações Push no Celular', right: '✓ Atas, Reuniões e Decisões Históricas' },
    { left: '✓ Patrimônio e Espaços Físicos', right: '✓ Relatórios Contábeis e Prestação de Contas' },
    { left: '✓ Portal do Membro com Carteirinha Digital', right: '✓ Chave PIX e QR Code Dinâmico Oficial' },
    { left: '✓ Modo Offline: Funciona mesmo sem Internet', right: '✓ Controle Rigoroso de Acesso por Cargo' },
  ];

  let featY = 119;
  featuresList.forEach((item) => {
    drawCard(MARGIN, featY, colW, 8.5, COLOR_GRAY_LIGHT, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_DARK);
    doc.text(item.left, MARGIN + 4, featY + 5.5);

    drawCard(MARGIN + colW + 6, featY, colW, 8.5, COLOR_GRAY_LIGHT, COLOR_GRAY_BORDER);
    doc.text(item.right, MARGIN + colW + 10, featY + 5.5);
    featY += 10.5;
  });

  // Banner destaque
  drawBanner(MARGIN, 210, CONTENT_WIDTH, 18, 'Uma única plataforma para toda a administração da igreja — do financeiro ao membro, da sede à congregação.', COLOR_DARK, COLOR_WHITE, 9.5);

  // 4 Caixas de Indicadores no pé da página
  const w4 = (CONTENT_WIDTH - 9) / 4;
  const bottomY = 236;
  const badges = [
    { top: '∞', sub: 'Membros\nCadastrados' },
    { top: '24h', sub: 'Acesso Remoto\nem Tempo Real' },
    { top: '3', sub: 'Idiomas\nPT · EN · ES' },
    { top: '100%', sub: 'Modo Offline\nAnti-Queda' },
  ];

  badges.forEach((b, idx) => {
    const x = MARGIN + idx * (w4 + 3);
    drawCard(x, bottomY, w4, 28, [255, 255, 255], [254, 215, 170]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(b.top, x + w4 / 2, bottomY + 11, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(b.sub, x + w4 / 2, bottomY + 18, { align: 'center' });
  });

  drawFooter();
}

// ====================================================================
// PÁGINA 3: O PROBLEMA QUE RESOLVEMOS
// ====================================================================
function buildPage3() {
  drawHeader(3);
  drawBadgeTag('✦ O PROBLEMA QUE RESOLVEMOS', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Por que o ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('IGREJA APP', MARGIN + 28, 40);
  doc.setTextColor(...COLOR_DARK);
  doc.text(' foi criado?', MARGIN + 64, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'O sistema nasceu para substituir cadernos manuais, planilhas soltas no computador, papéis que se perdem e processos demorados que geram desgaste e desorganização na liderança pastoral.',
    MARGIN, 47, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.4 }
  );

  // Tabela Comparativa (Antes vs Com Igreja App)
  const colCompW = (CONTENT_WIDTH - 6) / 2;
  const startY = 62;

  // Cabeçalho da coluna "Antes"
  drawCard(MARGIN, startY, colCompW, 11, COLOR_RED_BG, [254, 202, 202]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_RED);
  doc.text('❌ Antes do IGREJA APP', MARGIN + 6, startY + 7);

  // Cabeçalho da coluna "Depois"
  drawCard(MARGIN + colCompW + 6, startY, colCompW, 11, COLOR_GREEN_BG, [167, 243, 208]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text('✅ Com o IGREJA APP', MARGIN + colCompW + 12, startY + 7);

  const comparisons = [
    { antes: 'Cadastros de membros feitos em fichas de papel', depois: 'Cadastro digital completo com foto e histórico' },
    { antes: 'Dificuldade para saber quem é dizimista fiel', depois: 'Controle de dízimos e ofertas em tempo real' },
    { antes: 'Planilhas de Excel que corrompem ou somem', depois: 'Dashboard inteligente em nuvem sem risco de perda' },
    { antes: 'Falta de controle de contas e despesas fixas', depois: 'Despesas recorrentes automáticas com saldo na hora' },
    { antes: 'Internet cai no culto e trava os lançamentos', depois: 'Modo Offline: lança tudo e sincroniza ao voltar' },
    { antes: 'Cartas e certificados feitos no Word demoram', depois: 'Documentos oficiais gerados em segundos em PDF' },
    { antes: 'Congregações sem prestação de contas à Sede', depois: 'Sede e congregações integradas com isolamento seguro' },
    { antes: 'Avisos e eventos esquecidos no WhatsApp', depois: 'Notificação Push nativa direto na tela do celular' },
    { antes: 'Falta de transparência com as doações dos fiéis', depois: 'Portal do Membro transparente com carnê digital' },
    { antes: 'Pastores sobrecarregados com administração', depois: 'Gestão rápida e organizada: mais tempo para o Reino' },
  ];

  let compY = startY + 14;
  comparisons.forEach((item) => {
    drawCard(MARGIN, compY, colCompW, 13, [255, 255, 255], [254, 226, 226]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_RED);
    doc.text('✗', MARGIN + 3.5, compY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(item.antes, MARGIN + 8, compY + 5.5, { maxWidth: colCompW - 11, lineHeightFactor: 1.2 });

    drawCard(MARGIN + colCompW + 6, compY, colCompW, 13, [255, 255, 255], [209, 250, 229]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text('✓', MARGIN + colCompW + 9.5, compY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_DARK);
    doc.text(item.depois, MARGIN + colCompW + 14, compY + 5.5, { maxWidth: colCompW - 17, lineHeightFactor: 1.2 });

    compY += 15.5;
  });

  // Banner inferior
  drawBanner(MARGIN, 248, CONTENT_WIDTH, 18, 'Com o IGREJA APP, pastores, dirigentes, secretários e tesoureiros acessam tudo em segundos — com máxima ordem e santidade.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 4: TODOS OS MÓDULOS DO SISTEMA (MAPA COMPLETO)
// ====================================================================
function buildPage4() {
  drawHeader(4, 'Módulos do Sistema');
  drawBadgeTag('✦ VISÃO GERAL COMPLETA', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Todos os ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Módulos Integrados', MARGIN + 26, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('O IGREJA APP conta com uma suíte de módulos que atende de ponta a ponta a vida eclesiástica:', MARGIN, 47);

  const modules = [
    { num: '01', title: 'Dashboard Geral', desc: 'Visão financeira e de membros em tempo real' },
    { num: '02', title: 'Painel de Congregações', desc: 'Gestão multi-unidade com isolamento seguro' },
    { num: '03', title: 'Gestão de Membros', desc: 'Cadastro de fiéis, batismo e obreiros' },
    { num: '04', title: 'Tesouraria & Finanças', desc: 'Dízimos, ofertas, despesas e modo offline' },
    { num: '05', title: 'Departamentos', desc: '6 ministérios com caixas próprios independentes' },
    { num: '06', title: 'Campanhas com Metas', desc: 'Arrecadação específica com barra de progresso' },
    { num: '07', title: 'Documentos Oficiais', desc: 'Cartas de recomendação e mudança em PDF' },
    { num: '08', title: 'Certificados Oficiais', desc: 'Batismo nas águas e apresentação de bebês' },
    { num: '09', title: 'Atas e Reuniões', desc: 'Histórico de assembleias e decisões pastorais' },
    { num: '10', title: 'Eventos & Notificações', desc: 'Push flutuante no celular com app fechado' },
    { num: '11', title: 'Infraestrutura', desc: 'Patrimônio, som, imóveis e conservação' },
    { num: '12', title: 'Relatórios Contábeis', desc: 'Exportação em PDF profissional para conselho' },
    { num: '13', title: 'Portal do Membro', desc: 'Espaço digital com histórico e dízimo via PIX' },
    { num: '14', title: 'Carteirinha Digital', desc: 'Documento do membro no celular com QR Code' },
    { num: '15', title: 'Carnês em 12 Parcelas', desc: 'Talões de contribuição para download e impressão' },
    { num: '16', title: 'Transparência de Contas', desc: 'Demonstrativo liberado para os membros' },
    { num: '17', title: 'Controle de Acesso RBAC', desc: 'Permissões por cargo (Presidente, Dirigente, etc.)' },
    { num: '18', title: 'Multi-idioma & PIX', desc: 'PT, EN, ES com moeda BRL (R$) e QR Code oficial' },
  ];

  const gridCols = 3;
  const gW = (CONTENT_WIDTH - 6) / gridCols;
  const gH = 26;
  const gStartY = 54;

  modules.forEach((mod, idx) => {
    const col = idx % gridCols;
    const row = Math.floor(idx / gridCols);
    const x = MARGIN + col * (gW + 3);
    const y = gStartY + row * (gH + 4);

    drawCard(x, y, gW, gH, COLOR_WHITE, COLOR_GRAY_BORDER, 2);

    // Número em badge
    doc.setFillColor(...COLOR_PRIMARY);
    doc.roundedRect(x + 3, y + 3.5, 6.5, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_WHITE);
    doc.text(mod.num, x + 6.25, y + 7, { align: 'center' });

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(mod.title, x + 11.5, y + 7.5, { maxWidth: gW - 14 });

    // Descrição
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(mod.desc, x + 3.5, y + 15, { maxWidth: gW - 7, lineHeightFactor: 1.25 });
  });

  drawBanner(MARGIN, 252, CONTENT_WIDTH, 14, 'Todos os módulos funcionam integrados em tempo real na nuvem — sem necessidade de plugins ou contratações extras.', COLOR_PRIMARY_DARK, COLOR_WHITE, 8.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 5: MÓDULO 01 - DASHBOARD PRINCIPAL
// ====================================================================
function buildPage5() {
  drawHeader(5, 'Módulo 01');
  drawBadgeTag('📊 MÓDULO 01', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Dashboard — ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Painel de Controle', MARGIN + 40, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'A primeira tela ao entrar no sistema. Em 30 segundos a liderança pastoral já sabe a situação financeira, o total de membros e os compromissos do mês — sem precisar puxar relatórios demorados.',
    MARGIN, 47, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.4 }
  );

  // 4 Cards de Métricas do Topo
  const w4 = (CONTENT_WIDTH - 9) / 4;
  const topY = 64;
  const dashCards = [
    { title: 'Total de Membros', val: '248', desc: 'Membros Ativos', color: COLOR_DARK },
    { title: 'Dizimistas do Mês', val: '86', desc: 'Contribuições Ativas', color: COLOR_GREEN },
    { title: 'Entradas no Mês', val: 'R$ 18.450', desc: 'Dízimos + Ofertas', color: COLOR_PRIMARY },
    { title: 'Saldo Disponível', val: 'R$ 7.920', desc: 'Entradas - Saídas', color: COLOR_BLUE },
  ];

  dashCards.forEach((c, idx) => {
    const x = MARGIN + idx * (w4 + 3);
    drawCard(x, topY, w4, 28, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(c.title, x + w4 / 2, topY + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...c.color);
    doc.text(c.val, x + w4 / 2, topY + 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 150, 165);
    doc.text(c.desc, x + w4 / 2, topY + 23, { align: 'center' });
  });

  // 4 Funcionalidades do Dashboard em Cards Maiores
  const colW = (CONTENT_WIDTH - 6) / 2;
  const dCards = [
    {
      icon: '📊',
      title: 'Gráfico Interativo de Fluxo de Caixa',
      desc: 'Visualização mês a mês das receitas e despesas. Barras verdes indicam entradas e vermelhas indicam despesas, mostrando a saúde financeira imediata.',
    },
    {
      icon: '🎂',
      title: 'Aniversariantes com Disparo WhatsApp',
      desc: 'Lista automática de todos os irmãos que aniversariam no mês. Um botão de 1 clique abre o WhatsApp do pastor diretamente com mensagem de felicitações!',
    },
    {
      icon: '⚡',
      title: 'Últimas Transações em Tempo Real',
      desc: 'Todos os últimos dízimos, ofertas e despesas lançados aparecem na tela inicial com data, valor e comprovante para acompanhamento rápido.',
    },
    {
      icon: '🔍',
      title: 'Filtro Histórico por Mês e Ano',
      desc: 'Alterne entre os meses de Janeiro a Dezembro de qualquer ano em 1 segundo para auditar períodos passados ou comparar o crescimento ministerial.',
    },
  ];

  let dcY = 104;
  dCards.forEach((dc, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = MARGIN + col * (colW + 6);
    const y = dcY + row * 48;

    drawCard(x, y, colW, 42, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(`${dc.icon} ${dc.title}`, x + 5, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(dc.desc, x + 5, y + 18, { maxWidth: colW - 10, lineHeightFactor: 1.35 });
  });

  // Banner
  drawBanner(MARGIN, 215, CONTENT_WIDTH, 18, 'Em poucos segundos, o pastor entende a situação real da igreja — sem planilhas, sem cálculos manuais e sem estresse.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 6: MÓDULO 02 - CONGREGAÇÕES E FILIAIS
// ====================================================================
function buildPage6() {
  drawHeader(6, 'Módulo 02');
  drawBadgeTag('🏠 MÓDULO 02', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Painel de Congregação — ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Gestão Multi-Igreja', MARGIN + 74, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'Projetado para ministérios que possuem igreja Sede e congregações filiais. Cada unidade tem seu ambiente seguro e exclusivo, enquanto o Pastor Presidente mantém o controle consolidado.',
    MARGIN, 47, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.4 }
  );

  const colW = (CONTENT_WIDTH - 6) / 2;

  // Card Sede vs Congregação
  drawCard(MARGIN, 64, colW, 64, [255, 255, 255], COLOR_GRAY_BORDER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY_DARK);
  doc.text('🏛️ Visão da Igreja SEDE', MARGIN + 6, 73);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  const sedeTexts = [
    '• Visão unificada de todas as congregações',
    '• Acesso a relatórios financeiros consolidados',
    '• Alternância rápida entre filiais no menu em 1 clique',
    '• Cadastro e criação de novas filiais com limites',
    '• Gestão de permissões de dirigentes e obreiros',
  ];
  let sY = 82;
  sedeTexts.forEach(t => { doc.text(t, MARGIN + 6, sY); sY += 8; });

  drawCard(MARGIN + colW + 6, 64, colW, 64, [255, 255, 255], COLOR_GRAY_BORDER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(3, 105, 161);
  doc.text('📍 Visão da CONGREGAÇÃO', MARGIN + colW + 12, 73);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  const congTexts = [
    '• Ambiente 100% blindado e exclusivo da unidade',
    '• Membresia própria da congregação',
    '• Livro caixa e tesouraria local isolados',
    '• Eventos e avisos push específicos da filial',
    '• Dirigente não vê nem altera dados de outras filiais',
  ];
  let cY = 82;
  congTexts.forEach(t => { doc.text(t, MARGIN + colW + 12, cY); cY += 8; });

  // Como funciona na prática
  drawCard(MARGIN, 138, CONTENT_WIDTH, 26, [255, 251, 235], [253, 230, 138]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9);
  doc.text('⚡ Como funciona na prática ministerial:', MARGIN + 6, 146);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'O Pastor Presidente pode navegar entre qualquer congregação a qualquer momento para auditar entradas, membros e atas. Já os pastores e dirigentes locais têm acesso restrito e seguro apenas à sua respectiva congregação.',
    MARGIN + 6, 153, { maxWidth: CONTENT_WIDTH - 12, lineHeightFactor: 1.3 }
  );

  // Capacidade por Plano
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Capacidade de Congregações por Plano:', MARGIN, 178);

  const planBoxes = [
    { name: '🥉 Bronze', val: '2 Filiais', desc: 'Para campos locais' },
    { name: '🥈 Prata', val: '5 Filiais', desc: 'Em expansão' },
    { name: '🥇 Ouro', val: '10 Filiais', desc: 'Campos médios' },
    { name: '💎 Diamond', val: 'Ilimitadas', desc: 'Grandes ministérios' },
  ];

  const w4 = (CONTENT_WIDTH - 9) / 4;
  planBoxes.forEach((pb, idx) => {
    const x = MARGIN + idx * (w4 + 3);
    drawCard(x, 185, w4, 30, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(pb.name, x + w4 / 2, 194, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_DARK);
    doc.text(pb.val, x + w4 / 2, 203, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 150, 165);
    doc.text(pb.desc, x + w4 / 2, 209, { align: 'center' });
  });

  drawBanner(MARGIN, 230, CONTENT_WIDTH, 18, 'Cada congregação tem sua própria gestão organizada, e a Sede mantém a visão completa de todo o rebanho.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 7: MÓDULO 03 - GESTÃO DE MEMBROS
// ====================================================================
function buildPage7() {
  drawHeader(7, 'Módulo 03');
  drawBadgeTag('👤 MÓDULO 03', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Gestão de Membros — ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Cadastro Completo', MARGIN + 65, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'Ficha cadastral digital completa de cada irmão e irmã da congregação. Chega de fichas de papel amareladas ou gavetas cheias de formulários perdidos.',
    MARGIN, 47, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.4 }
  );

  const colW = (CONTENT_WIDTH - 6) / 2;
  const memberFeatures = [
    {
      icon: '📋',
      title: 'Ficha Cadastral Completa',
      desc: 'Nome, CPF, RG, data de nascimento, estado civil, data de batismo nas águas, função/cargo ministerial, telefone, e-mail e endereço.',
    },
    {
      icon: '📸',
      title: 'Upload e Foto de Perfil',
      desc: 'Foto oficial do membro armazenada com segurança em nuvem. A imagem sai na Carteirinha Digital e nos certificados emitidos.',
    },
    {
      icon: '📍',
      title: 'Busca Automática de CEP (ViaCEP)',
      desc: 'Basta digitar o CEP e o sistema preenche sozinho rua, bairro, cidade e estado em menos de 1 segundo, sem erros de digitação.',
    },
    {
      icon: '👔',
      title: 'Cargos e Obreiros Vinculados',
      desc: 'Identificação exata: Membro, Auxiliar, Diácono, Presbítero, Evangelista, Pastor ou Missionário com filtros para reuniões ministeriais.',
    },
    {
      icon: '💰',
      title: 'Histórico Individual de Dízimos',
      desc: 'O pastor e a tesouraria conseguem ver mês a mês todos os dízimos e ofertas entregues pelo irmão ao longo dos anos.',
    },
    {
      icon: '👥',
      title: 'Vínculo com Departamentos',
      desc: 'Indique se o membro faz parte de Jovens, Crianças, Senhoras, Senhores, Adolescentes ou Missões com relatórios setoriais.',
    },
  ];

  let mY = 64;
  memberFeatures.forEach((mf, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = MARGIN + col * (colW + 6);
    const y = mY + row * 44;

    drawCard(x, y, colW, 38, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_DARK);
    doc.text(`${mf.icon} ${mf.title}`, x + 5, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(mf.desc, x + 5, y + 17, { maxWidth: colW - 10, lineHeightFactor: 1.35 });
  });

  // Caixa de agilidade
  drawCard(MARGIN, 206, CONTENT_WIDTH, 26, [240, 253, 244], [187, 247, 208]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  doc.text('⚡ Cadastro Concluído em Menos de 2 Minutos:', MARGIN + 6, 215);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'A secretaria abre o sistema, digita os dados do novo membro, anexa a foto e clica em Salvar. O membro passa a constar instantaneamente na lista, nos aniversariantes e ganha acesso imediato ao Portal do Membro.',
    MARGIN + 6, 222, { maxWidth: CONTENT_WIDTH - 12, lineHeightFactor: 1.3 }
  );

  drawBanner(MARGIN, 244, CONTENT_WIDTH, 18, 'Todas as informações dos membros organizadas, acessíveis em segundos e protegidas por níveis de permissão.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 8: MÓDULO 04 - FINANCEIRO, TESOURARIA E MODO OFFLINE
// ====================================================================
function buildPage8() {
  drawHeader(8, 'Módulo 04');
  drawBadgeTag('💰 MÓDULO 04', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Financeiro & Tesouraria — ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Com Modo Offline', MARGIN + 77, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'O coração financeiro da igreja com total transparência e rigor. Controle absoluto de dízimos, ofertas, despesas fixas recorrentes e relatórios contábeis com moeda oficial brasileira (R$).',
    MARGIN, 47, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.4 }
  );

  const colW = (CONTENT_WIDTH - 6) / 2;

  const finBlocks = [
    {
      title: '💚 Registro de Dízimos',
      desc: 'Vincule ao membro com 1 clique ou lance avulso. O sistema totaliza dizimistas do mês e soma no fluxo de caixa na hora.',
    },
    {
      title: '🧡 Registro de Ofertas',
      desc: 'Ofertas de culto, ofertas missionárias, votos e campanhas com discriminação de categoria e histórico.',
    },
    {
      title: '❤️ Controle de Despesas',
      desc: 'Água, luz, aluguel, manutenção e ajudas de custo com anexo de comprovantes e notas fiscais em foto ou PDF.',
    },
    {
      title: '🔄 Despesas Fixas Automáticas',
      desc: 'Cadastre contas mensais recorrentes uma única vez; o sistema lança sozinho a cada virada de mês.',
    },
    {
      title: '⚖️ Saldo Automático em Tempo Real',
      desc: 'Entradas menos Saídas calculadas automaticamente. Sem erros humanos, sem planilhas com fórmulas quebradas.',
    },
    {
      title: '🔍 Filtro Contábil Completo',
      desc: 'Filtre por mês, ano, categoria ou membro para prestação de contas exata na assembleia ou conselho fiscal.',
    },
  ];

  let fY = 64;
  finBlocks.forEach((fb, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = MARGIN + col * (colW + 6);
    const y = fY + row * 38;

    drawCard(x, y, colW, 32, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(fb.title, x + 5, y + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(fb.desc, x + 5, y + 16, { maxWidth: colW - 10, lineHeightFactor: 1.35 });
  });

  // DESTAQUE EXCLUSIVO: MODO OFFLINE (PWA RESILIENCE)
  const offY = 186;
  drawCard(MARGIN, offY, CONTENT_WIDTH, 48, [15, 23, 42], COLOR_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('🛡️ FUNCIONALIDADE EXCLUSIVA: MODO OFFLINE ANTI-QUEDA', MARGIN + 8, offY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 230, 245);
  const offlineDesc =
    'Se a internet cair durante o culto ou contagem de ofertas na sala da tesouraria, o tesoureiro NÃO precisa parar: ele continua registrando dízimos e ofertas normalmente no celular ou computador! O sistema salva tudo em banco local criptografado (IndexedDB).\n\nAssim que o aparelho reconectar à internet ou Wi-Fi, o sistema sincroniza todos os lançamentos automaticamente com a nuvem sem perder nenhum dado e sem duplicar valores!';
  doc.text(offlineDesc, MARGIN + 8, offY + 20, { maxWidth: CONTENT_WIDTH - 16, lineHeightFactor: 1.35 });

  drawBanner(MARGIN, 246, CONTENT_WIDTH, 18, 'Mais segurança, ordem e tranquilidade para o pastor e o tesoureiro — nenhum dízimo ou oferta é perdido.', COLOR_PRIMARY_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 9: MÓDULOS 05 E 06 - DEPARTAMENTOS E CAMPANHAS
// ====================================================================
function buildPage9() {
  drawHeader(9, 'Módulos 05 e 06');

  // LADO ESQUERDO: DEPARTAMENTOS
  const colW = (CONTENT_WIDTH - 6) / 2;
  drawBadgeTag('👥 MÓDULO 05', MARGIN, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Departamentos', MARGIN, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('6 ministérios com caixa próprio e painel independente:', MARGIN, 46);

  const depts = [
    { name: '⚡ Jovens', color: COLOR_PRIMARY },
    { name: '🌺 Senhoras', color: COLOR_PURPLE },
    { name: '👔 Senhores', color: COLOR_DARK },
    { name: '👶 Crianças', color: COLOR_GREEN },
    { name: '🌱 Adolescentes', color: COLOR_BLUE },
    { name: '🌍 Missões', color: COLOR_RED },
  ];

  let dY = 53;
  depts.forEach((dp, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * (colW / 2 + 1);
    const y = dY + row * 11;
    drawCard(x, y, colW / 2 - 2, 9, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...dp.color);
    doc.text(dp.name, x + (colW / 2 - 2) / 2, y + 6, { align: 'center' });
  });

  const deptBenefits = [
    '• Painel financeiro próprio por ministério',
    '• Caixa de entradas e saídas exclusivo',
    '• Líder não vê o saldo dos outros departamentos',
    '• O Presidente tem visão consolidada de todos',
    '• Relatórios e carnês próprios por departamento',
  ];
  let dbY = 92;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  deptBenefits.forEach(b => { doc.text(b, MARGIN + 2, dbY); dbY += 7.5; });

  drawCard(MARGIN, 134, colW, 28, [254, 242, 242], [254, 202, 202]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_RED);
  doc.text('"O líder de Missões ou Jovens não precisa pedir ao tesoureiro geral para saber quanto tem em caixa. Ele mesmo acessa e gerencia com autonomia."', MARGIN + 5, 142, { maxWidth: colW - 10, lineHeightFactor: 1.3 });

  // LADO DIREITO: CAMPANHAS DE ARRECADAÇÃO
  const rightX = MARGIN + colW + 6;
  drawBadgeTag('🎯 MÓDULO 06', rightX, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Campanhas', rightX, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('Metas financeiras com acompanhamento visual em tempo real:', rightX, 46);

  const campPoints = [
    { title: '🎯 Criação com Meta Financeira', desc: 'Defina a meta (ex: Reforma do Teto R$ 20.000) e prazo. Barra de progresso automática mostra a porcentagem alcançada.' },
    { title: '👤 Doações Livres e Vinculadas', desc: 'Cada irmão contribui com o valor que o coração desejar, via dinheiro ou PIX, e o total é somado instantaneamente.' },
    { title: '📊 Transparência com a Igreja', desc: 'A liderança e os membros acompanham exatamente quanto já foi arrecadado e quanto falta para a vitória.' },
  ];

  let cY = 53;
  campPoints.forEach(cp => {
    drawCard(rightX, cY, colW, 24, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(cp.title, rightX + 4, cY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(cp.desc, rightX + 4, cY + 13, { maxWidth: colW - 8, lineHeightFactor: 1.3 });
    cY += 27;
  });

  // Exemplo Prático de Campanha
  drawCard(rightX, 134, colW, 28, [240, 249, 255], [186, 230, 253]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(3, 105, 161);
  doc.text('EXEMPLO PRÁTICO:', rightX + 5, 141);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('Campanha "Compra do Som Novo" (Meta R$ 10.000). O irmão João oferta R$ 100 no PIX, a família Santos R$ 300 e a congregação filha R$ 500. A barra avança na hora!', rightX + 5, 147, { maxWidth: colW - 10, lineHeightFactor: 1.3 });

  // Banner inferior
  drawBanner(MARGIN, 244, CONTENT_WIDTH, 18, 'Cada departamento trabalha com organização e zelo ministerial, e a liderança acompanha tudo com total transparência.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 10: MÓDULOS 07 E 08 - DOCUMENTOS E ATAS
// ====================================================================
function buildPage10() {
  drawHeader(10, 'Módulos 07 e 08');

  // LADO ESQUERDO: DOCUMENTOS OFICIAIS
  const colW = (CONTENT_WIDTH - 6) / 2;
  drawBadgeTag('📄 MÓDULO 07', MARGIN, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Emissão de Documentos', MARGIN, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('Documentos e certificados em PDF prontos para assinatura:', MARGIN, 46);

  const docsList = [
    { title: '📨 Carta de Recomendação', desc: 'Para membros em viagem ou período temporário em outra congregação mantendo o vínculo.' },
    { title: '📤 Carta de Mudança / Transferência', desc: 'Despedida e transferência eclesiástica oficial para outra igreja irmã com histórico do membro.' },
    { title: '🎓 Certificado de Batismo nas Águas', desc: 'Com data, pastor celebrante, versículo bíblico e assinatura em formato oficial de alta resolução.' },
    { title: '👶 Certificado de Apresentação de Bebês', desc: 'Registro solene da apresentação do recém-nascido ao Senhor na congregação com nome dos pais.' },
  ];

  let docY = 53;
  docsList.forEach(d => {
    drawCard(MARGIN, docY, colW, 25, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_PRIMARY_DARK);
    doc.text(d.title, MARGIN + 4, docY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(d.desc, MARGIN + 4, docY + 13, { maxWidth: colW - 8, lineHeightFactor: 1.3 });
    docY += 28;
  });

  drawCard(MARGIN, 168, colW, 24, [255, 251, 235], [253, 230, 138]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('⚡ Como funciona:', MARGIN + 5, 175);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('Acesse Documentos → escolha o tipo → selecione o membro → clique em Gerar PDF. Pronto em 30 segundos — antes levava 20 minutos no Word.', MARGIN + 5, 181, { maxWidth: colW - 10, lineHeightFactor: 1.3 });

  // LADO DIREITO: ATAS E REGISTROS
  const rightX = MARGIN + colW + 6;
  drawBadgeTag('📋 MÓDULO 08', rightX, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Atas e Reuniões', rightX, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('Histórico oficial e legal de reuniões e assembleias da igreja:', rightX, 46);

  const atasList = [
    { title: '📝 Cadastro de Atas Administrativas', desc: 'Registre assembleias gerais, reuniões de obreiros, posse de diretoria e decisões financeiras.' },
    { title: '📅 Histórico e Livro Digital', desc: 'Todas as atas ficam arquivadas com data, participantes presentes, pauta debatida e resolução.' },
    { title: '🔍 Busca Imediata por Assunto', desc: 'Encontre o que foi decidido em qualquer ano ou reunião em poucos segundos, sem folhear livros velhos.' },
    { title: '🖨️ Exportação Oficial para Cartório', desc: 'Gere o documento oficial pronto para impressão, registro em cartório ou arquivo institucional.' },
  ];

  let ataY = 53;
  atasList.forEach(a => {
    drawCard(rightX, ataY, colW, 25, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(a.title, rightX + 4, ataY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(a.desc, rightX + 4, ataY + 13, { maxWidth: colW - 8, lineHeightFactor: 1.3 });
    ataY += 28;
  });

  drawCard(rightX, 168, colW, 24, [240, 249, 255], [186, 230, 253]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(3, 105, 161);
  doc.text('🔒 Proteção Institucional:', rightX + 5, 175);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('Evita extravio de registros históricos, garante respaldo jurídico para o ministério e preserva a memória documental da igreja.', rightX + 5, 181, { maxWidth: colW - 10, lineHeightFactor: 1.3 });

  // Banner inferior
  drawBanner(MARGIN, 244, CONTENT_WIDTH, 18, 'Documentos eclesiásticos gerados em segundos e decisões da igreja registradas com máxima ordem e segurança.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 11: MÓDULOS 09, 10 E 11 - EVENTOS COM PUSH E PATRIMÔNIO
// ====================================================================
function buildPage11() {
  drawHeader(11, 'Módulos 09, 10 e 11');

  // EVENTOS & NOTIFICAÇÕES PUSH FLUTUANTES (NOVIDADE DESTAQUE)
  drawBadgeTag('📅 MÓDULO 09 · DESTAQUE', MARGIN, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Eventos, Agenda & ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Notificações Push no Celular', MARGIN + 53, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'A agenda da igreja viva na palma da mão de cada membro e obreiro, com tecnologia de push nativa estilo WhatsApp:',
    MARGIN, 47
  );

  const colW = (CONTENT_WIDTH - 6) / 2;

  drawCard(MARGIN, 54, colW, 46, [255, 250, 245], [254, 215, 170]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_PRIMARY_DARK);
  doc.text('🔔 Notificações Push Flutuantes Nativas', MARGIN + 5, 63);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  const pushText =
    'Ao salvar um culto, congresso ou reunião, o sistema dispara um aviso nativo no celular dos irmãos com toque cristalino e vibração. Funciona mesmo com o aplicativo fechado ou tela bloqueada (Android e iPhone)!';
  doc.text(pushText, MARGIN + 5, 70, { maxWidth: colW - 10, lineHeightFactor: 1.3 });

  drawCard(MARGIN + colW + 6, 54, colW, 46, [240, 249, 255], [186, 230, 253]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(3, 105, 161);
  doc.text('🎯 Filtros Rigorosos de Público-Alvo', MARGIN + colW + 11, 63);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  const filterText =
    'Escolha quem deve receber o alerta no celular:\n• Toda a Igreja (Sede + Todas as Congregações)\n• Somente membros da Sede ou de congregação específica\n• Exclusivo para o Corpo de Obreiros (Pastores, Presbíteros, etc.)';
  doc.text(filterText, MARGIN + colW + 11, 70, { maxWidth: colW - 10, lineHeightFactor: 1.3 });

  // MÓDULO 10: INFRAESTRUTURA E PATRIMÔNIO
  drawBadgeTag('🏛️ MÓDULO 10', MARGIN, 108);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Infraestrutura & Patrimônio', MARGIN, 120);

  const infraCards = [
    { title: '🏢 Imóveis e Espaços', desc: 'Templo sede, congregações, residência pastoral, salão social e salas infantis.' },
    { title: '🎸 Bens e Equipamentos', desc: 'Mesa de som, microfones, instrumentos, projetores, ar-condicionado e veículos.' },
    { title: '🔧 Estado de Conservação', desc: 'Status: Em Bom Estado, Em Manutenção ou Inativo para controle de reparos.' },
  ];

  const w3 = (CONTENT_WIDTH - 6) / 3;
  infraCards.forEach((ic, i) => {
    const x = MARGIN + i * (w3 + 3);
    drawCard(x, 126, w3, 26, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(ic.title, x + 4, 134);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(ic.desc, x + 4, 140, { maxWidth: w3 - 8, lineHeightFactor: 1.25 });
  });

  // MÓDULO 11: RELATÓRIOS E EXPORTAÇÃO
  drawBadgeTag('📈 MÓDULO 11', MARGIN, 160);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Relatórios e Prestação de Contas', MARGIN, 172);

  const repCards = [
    { title: '📊 Balancete Financeiro Mensal', desc: 'Todas as entradas e saídas detalhadas em PDF pronto para conselho fiscal.' },
    { title: '💚 Relatório de Dizimistas', desc: 'Lista completa de contribuintes com total acumulado por período.' },
    { title: '📍 Relatório por Congregação', desc: 'Demonstrativo independente de receitas e despesas por filial.' },
  ];

  repCards.forEach((rc, i) => {
    const x = MARGIN + i * (w3 + 3);
    drawCard(x, 178, w3, 26, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_PRIMARY_DARK);
    doc.text(rc.title, x + 4, 186);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(rc.desc, x + 4, 192, { maxWidth: w3 - 8, lineHeightFactor: 1.25 });
  });

  drawBanner(MARGIN, 244, CONTENT_WIDTH, 18, 'Agenda sincronizada no celular dos irmãos, patrimônio protegido e prestação de contas impecável.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 12: MÓDULO 12 - PORTAL DO MEMBRO & CARTEIRINHA DIGITAL
// ====================================================================
function buildPage12() {
  drawHeader(12, 'Módulo 12');
  drawBadgeTag('📱 MÓDULO 12 · PORTAL DO MEMBRO', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Portal do Membro & ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Carteirinha Digital', MARGIN + 57, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'Cada fiel da igreja possui seu próprio espaço digital exclusivo, acessível pelo navegador do smartphone sem precisar baixar nada de lojas pesadas.',
    MARGIN, 47, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.4 }
  );

  const colW = (CONTENT_WIDTH - 6) / 2;

  // LADO ESQUERDO: O QUE O MEMBRO ACESSA
  drawCard(MARGIN, 62, colW, 118, COLOR_WHITE, COLOR_GRAY_BORDER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY_DARK);
  doc.text('📱 O que o membro tem no celular:', MARGIN + 6, 72);

  const memberPortalItems = [
    { t: '🔐 Login Simples por CPF', d: 'Senha inicial automática é a data de nascimento.' },
    { t: '🪪 Carteirinha de Membro Oficial', d: 'Cartão digital com QR Code, foto e cargo eclesiástico.' },
    { t: '💚 Histórico de Dízimos e Ofertas', d: 'Total transparência para conferir suas contribuições.' },
    { t: '📋 Chave PIX Oficial com 1 Toque', d: 'Botão "Copiar Chave PIX" para doar no app do banco.' },
    { t: '🎯 Campanhas da Igreja', d: 'Acompanha metas da igreja e contribui diretamente.' },
    { t: '📅 Agenda de Cultos e Notificações', d: 'Recebe alertas no celular de todos os eventos.' },
    { t: '🌙 Tema Claro e Escuro Mobile', d: 'Interface moderna e adaptada para uso noturno.' },
  ];

  let mpY = 80;
  memberPortalItems.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_DARK);
    doc.text(item.t, MARGIN + 6, mpY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(item.d, MARGIN + 6, mpY + 4);
    mpY += 10.5;
  });

  // LADO DIREITO: CARTEIRINHA DIGITAL E DIVULGAÇÃO
  const rightX = MARGIN + colW + 6;

  // Mockup da Carteirinha
  drawCard(rightX, 62, colW, 60, [15, 23, 42], COLOR_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('🪪 CARTEIRINHA DIGITAL DO MEMBRO', rightX + 6, 72);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 230, 245);
  doc.text('• Documento oficial de identificação ministerial\n• Válido em viagens, congressos e visitas a igrejas irmãs\n• Exibe foto, data de batismo, congregação e ministério\n• Validação anti-fraude via QR Code dinâmico', rightX + 6, 80, { lineHeightFactor: 1.4 });

  // Como a igreja divulga
  drawCard(rightX, 130, colW, 50, [255, 251, 235], [253, 230, 138]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9);
  doc.text('💡 Como o Pastor Divulga no Culto:', rightX + 6, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'O pastor só precisa anunciar: "Irmãos, entrem no link da nossa igreja pelo celular, coloquem o CPF e o seu portal já estará liberado!"\n\nEm menos de 2 minutos, toda a igreja já tem acesso à carteirinha, agenda e histórico de dízimos.',
    rightX + 6, 147, { maxWidth: colW - 12, lineHeightFactor: 1.35 }
  );

  drawBanner(MARGIN, 244, CONTENT_WIDTH, 18, 'O membro se sente valorizado, conectado com o ministério e acompanha a igreja em qualquer lugar.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 13: MÓDULO 13 - CARNÊS DIGITAIS EM 12 PARCELAS (NOVIDADE)
// ====================================================================
function buildPage13() {
  drawHeader(13, 'Módulo 13');
  drawBadgeTag('🎫 MÓDULO 13 · NOVIDADE 2026', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Carnês de Contribuição — ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('12 Parcelas Individuais', MARGIN + 77, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'O tradicional carnê anual da igreja agora 100% modernizado e digital! Ideal para votos, carnês de missões, reforma do templo ou mantenedores da obra de Deus.',
    MARGIN, 47, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.4 }
  );

  const colW = (CONTENT_WIDTH - 6) / 2;

  // LADO ESQUERDO: RECURSOS DO CARNÊ
  const carnetFeatures = [
    { title: '📅 Grade com as 12 Parcelas do Ano', desc: 'De Janeiro a Dezembro, cada parcela tem seu valor, data de vencimento e status (Pendente ou Paga).' },
    { title: '📱 Visualização no Celular do Membro', desc: 'No Portal do Membro, o irmão clica na parcela do mês para ver os dados e copiar a chave PIX de pagamento.' },
    { title: '🖨️ Impressão Completa ou Parcela Avulsa', desc: 'Gere o talão completo anual em PDF profissional para entregar impresso ou baixe cada parcela avulsa.' },
    { title: '💰 Integração com Departamentos', desc: 'Carnê de Missões, Carnê dos Jovens, Carnê de Senhoras ou Geral da Igreja com caixa separado.' },
  ];

  let cY = 62;
  carnetFeatures.forEach(cf => {
    drawCard(MARGIN, cY, colW, 28, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_PRIMARY_DARK);
    doc.text(cf.title, MARGIN + 5, cY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    doc.text(cf.desc, MARGIN + 5, cY + 15, { maxWidth: colW - 10, lineHeightFactor: 1.3 });
    cY += 32;
  });

  // LADO DIREITO: DEMONSTRAÇÃO VISUAL DO CARNÊ
  const rightX = MARGIN + colW + 6;
  drawCard(rightX, 62, colW, 124, [250, 250, 252], [226, 232, 240]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('🧾 ESTRUTURA DO CARNÊ DIGITAL:', rightX + 6, 72);

  // Simulação de 3 parcelas visuais
  const mockParcelas = [
    { mes: 'Janeiro 2026', valor: 'R$ 50,00', status: 'PAGO', color: COLOR_GREEN },
    { mes: 'Fevereiro 2026', valor: 'R$ 50,00', status: 'PAGO', color: COLOR_GREEN },
    { mes: 'Março 2026', valor: 'R$ 50,00', status: 'PENDENTE', color: COLOR_PRIMARY },
  ];

  let pY = 80;
  mockParcelas.forEach((p, idx) => {
    drawCard(rightX + 5, pY, colW - 10, 24, COLOR_WHITE, COLOR_GRAY_BORDER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(`Parcela ${idx + 1}/12 · ${p.mes}`, rightX + 9, pY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...p.color);
    doc.text(p.valor, rightX + 9, pY + 18);

    doc.setFillColor(p.status === 'PAGO' ? 236 : 255, p.status === 'PAGO' ? 253 : 237, p.status === 'PAGO' ? 245 : 213);
    doc.roundedRect(rightX + colW - 32, pY + 6, 17, 6, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...p.color);
    doc.text(p.status, rightX + colW - 23.5, pY + 10.2, { align: 'center' });

    pY += 28;
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text('✓ O membro pode pagar no PIX e o tesoureiro dá baixa em 1 clique.', rightX + 6, 172);

  drawBanner(MARGIN, 244, CONTENT_WIDTH, 18, 'Arrecadação mais previsível, organizada e prática para as grandes obras e reformas da igreja.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 14: MÓDULOS 14 A 17 - USUÁRIOS, RBAC, PWA E MULTI-IDIOMA
// ====================================================================
function buildPage14() {
  drawHeader(14, 'Módulos 14 a 17');
  drawBadgeTag('⚙️ MAIS MÓDULOS', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Segurança, Controle de Acesso e PWA', MARGIN, 40);

  const colW = (CONTENT_WIDTH - 6) / 2;

  // BLOCO 1: USUÁRIOS E PERMISSÕES (RBAC)
  drawCard(MARGIN, 48, colW, 46, COLOR_WHITE, COLOR_GRAY_BORDER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_PRIMARY_DARK);
  doc.text('👤 Controle de Acesso por Cargo (RBAC)', MARGIN + 5, 57);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  const rbacList = [
    '• Pastor Presidente: Acesso total a todas as filiais e finanças',
    '• Dirigente: Acesso restrito apenas à sua congregação',
    '• Tesoureiro: Controle de entradas e despesas sem alterar cadastros',
    '• Secretário: Membros, eventos e documentos sem ver financeiro',
    '• Líderes de Departamento: Acesso somente ao seu ministério',
  ];
  let rY = 64;
  rbacList.forEach(r => { doc.text(r, MARGIN + 5, rY); rY += 6; });

  // BLOCO 2: MODO PWA INSTALÁVEL
  drawCard(MARGIN + colW + 6, 48, colW, 46, COLOR_WHITE, COLOR_GRAY_BORDER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(3, 105, 161);
  doc.text('📲 Aplicativo PWA Instalável', MARGIN + colW + 11, 57);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  const pwaList = [
    '• Instala direto na tela inicial sem precisar de Play Store/App Store',
    '• Ícone oficial do IgrejaApp na gaveta de aplicativos',
    '• Super leve: não consome memória do celular do irmão',
    '• Compatível com Android, iPhone, Windows e Mac',
    '• Atualizações automáticas em segundo plano',
  ];
  let pY = 64;
  pwaList.forEach(p => { doc.text(p, MARGIN + colW + 11, pY); pY += 6; });

  // BLOCO 3: MULTI-IDIOMA COM REAL BRASILEIRO (R$)
  drawCard(MARGIN, 100, colW, 46, COLOR_WHITE, COLOR_GRAY_BORDER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  doc.text('🌍 Multi-idioma (3 Idiomas)', MARGIN + 5, 109);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  const langList = [
    '• 🇧🇷 Português Brasileiro (Padrão)',
    '• 🇺🇸 Inglês Americano (English)',
    '• 🇪🇸 Espanhol Europeu/Latino (Español)',
    '• Moeda fixada estritamente no Real Brasileiro (R$ - BRL)',
    '• Ideal para igrejas com congregações no exterior ou missionários',
  ];
  let lY = 116;
  langList.forEach(l => { doc.text(l, MARGIN + 5, lY); lY += 6; });

  // BLOCO 4: CONFIGURAÇÕES E PIX MASTER
  drawCard(MARGIN + colW + 6, 100, colW, 46, COLOR_WHITE, COLOR_GRAY_BORDER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9);
  doc.text('⚙️ Configurações & PIX Oficial', MARGIN + colW + 11, 109);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  const cfgList = [
    '• Logo e dados institucionais da igreja/sede',
    '• Cadastro de chave PIX (CPF, CNPJ, Celular, E-mail)',
    '• Gerador de QR Code oficial Banco Central (EMV-Co)',
    '• Personalização de cabeçalho para documentos e atas',
    '• Backup contínuo em nuvem com alta disponibilidade',
  ];
  let cY = 116;
  cfgList.forEach(c => { doc.text(c, MARGIN + colW + 11, cY); cY += 6; });

  // TABELA DE MATRIZ DE PERMISSÕES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Matriz de Permissões Resumida:', MARGIN, 156);

  const tableHeaders = ['Módulo / Recurso', 'Presidente', 'Dirigente', 'Tesoureiro', 'Secretário', 'Membro'];
  const colTableW = [53, 25, 25, 25, 25, 25];

  let tX = MARGIN;
  drawCard(MARGIN, 160, CONTENT_WIDTH, 7, COLOR_DARK, COLOR_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_WHITE);
  tableHeaders.forEach((th, i) => {
    doc.text(th, tX + (i === 0 ? 3 : colTableW[i] / 2), 164.5, { align: i === 0 ? 'left' : 'center' });
    tX += colTableW[i];
  });

  const matrixRows = [
    { name: 'Dashboard Geral da Igreja', p: '✓ Total', d: '◑ Parcial', t: '◑ Caixa', s: '◑ Avisos', m: '✗' },
    { name: 'Gestão de Membros e Fichas', p: '✓ Total', d: '✓ Local', t: '✗', s: '✓ Total', m: '✗' },
    { name: 'Tesouraria (Dízimos e Despesas)', p: '✓ Total', d: '✓ Local', t: '✓ Total', s: '✗', m: '✗' },
    { name: 'Emissão de Cartas e Certificados', p: '✓ Total', d: '✓ Local', t: '✗', s: '✓ Total', m: '✗' },
    { name: 'Notificações Push no Celular', p: '✓ Dispara', d: '✓ Local', t: '✗', s: '✓ Dispara', m: '✓ Recebe' },
    { name: 'Configurações e Chaves PIX', p: '✓ Total', d: '✗', t: '✗', s: '✗', m: '✗' },
  ];

  let trY = 167;
  matrixRows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? COLOR_WHITE : COLOR_GRAY_LIGHT;
    drawCard(MARGIN, trY, CONTENT_WIDTH, 7, bg, COLOR_GRAY_BORDER, 0);

    tX = MARGIN;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_DARK);
    doc.text(row.name, tX + 3, trY + 4.8);
    tX += colTableW[0];

    [row.p, row.d, row.t, row.s, row.m].forEach((val, i) => {
      doc.setFont('helvetica', val.startsWith('✓') ? 'bold' : 'normal');
      doc.setTextColor(val.startsWith('✓') ? COLOR_GREEN[0] : (val === '✗' ? COLOR_RED[0] : COLOR_PRIMARY[0]), val.startsWith('✓') ? COLOR_GREEN[1] : (val === '✗' ? COLOR_RED[1] : COLOR_PRIMARY[1]), val.startsWith('✓') ? COLOR_GREEN[2] : (val === '✗' ? COLOR_RED[2] : COLOR_PRIMARY[2]));
      doc.text(val, tX + colTableW[i + 1] / 2, trY + 4.8, { align: 'center' });
      tX += colTableW[i + 1];
    });

    trY += 7;
  });

  drawBanner(MARGIN, 244, CONTENT_WIDTH, 18, 'Segurança eclesiástica e sigilo total — cada obreiro acessa exatamente o que sua função demanda.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 15: PLANOS E PREÇOS ATUALIZADOS (2026)
// ====================================================================
function buildPage15() {
  drawHeader(15, 'Planos & Valores');
  drawBadgeTag('💳 ASSINATURAS · PREÇOS 2026', MARGIN, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Planos e Preços — ', MARGIN, 40);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Acessíveis ao Ministério', MARGIN + 57, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'Valores justos e acessíveis pensados para a realidade de cada igreja — todos os planos incluem acesso completo a todos os módulos do sistema.',
    MARGIN, 47, { maxWidth: CONTENT_WIDTH, lineHeightFactor: 1.4 }
  );

  // 4 CARDS DE PLANOS OFICIAIS COM PREÇOS ATUAIS
  const planW = (CONTENT_WIDTH - 9) / 4;
  const planCards = [
    {
      name: 'Bronze',
      icon: '🥉',
      price: 'R$ 79,90',
      period: '/mês',
      badge: 'Início',
      badgeBg: [254, 243, 199],
      badgeText: [180, 83, 9],
      features: [
        'Até 100 membros na sede',
        '50 membros/filial',
        '2 congregações filiais',
        'Todos os 18+ módulos',
        'Portal do Membro',
        'Notificações Push',
        'Suporte por e-mail',
      ],
    },
    {
      name: 'Prata',
      icon: '🥈',
      price: 'R$ 149,90',
      period: '/mês',
      badge: 'Crescimento',
      badgeBg: [241, 245, 249],
      badgeText: [51, 65, 85],
      features: [
        'Até 300 membros na sede',
        '100 membros/filial',
        '5 congregações filiais',
        'Todos os 18+ módulos',
        'Portal do Membro',
        'Notificações Push',
        'Suporte prioritário',
      ],
    },
    {
      name: 'Ouro',
      icon: '🥇',
      price: 'R$ 249,90',
      period: '/mês',
      badge: 'MAIS POPULAR',
      badgeBg: [255, 237, 213],
      badgeText: [194, 65, 12],
      highlight: true,
      features: [
        'Até 700 membros na sede',
        '200 membros/filial',
        '10 congregações filiais',
        'Todos os 18+ módulos',
        'Portal do Membro',
        'Notificações Push',
        'Suporte VIP WhatsApp',
      ],
    },
    {
      name: 'Diamond',
      icon: '💎',
      price: 'R$ 399,90',
      period: '/mês',
      badge: 'Ministérios',
      badgeBg: [224, 242, 254],
      badgeText: [3, 105, 161],
      features: [
        'Membros ILIMITADOS',
        'Congregações ILIMITADAS',
        'Sem restrição de espaço',
        'Todos os 18+ módulos',
        'Portal ilimitado',
        'Notificações Push',
        'Suporte Dedicado 24h',
      ],
    },
  ];

  const planY = 54;
  planCards.forEach((pc, idx) => {
    const x = MARGIN + idx * (planW + 3);
    const isHigh = !!pc.highlight;

    // Card
    drawCard(x, planY, planW, 94, isHigh ? [255, 253, 250] : COLOR_WHITE, isHigh ? COLOR_PRIMARY : COLOR_GRAY_BORDER, isHigh ? 3 : 2);

    // Badge
    doc.setFillColor(...pc.badgeBg);
    doc.roundedRect(x + (planW - 24) / 2, planY + 3.5, 24, 4.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...pc.badgeText);
    doc.text(pc.badge, x + planW / 2, planY + 6.7, { align: 'center' });

    // Nome
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_DARK);
    doc.text(`${pc.icon} ${pc.name}`, x + planW / 2, planY + 14, { align: 'center' });

    // Preço
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...(isHigh ? COLOR_PRIMARY : COLOR_DARK));
    doc.text(pc.price, x + planW / 2, planY + 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 150, 165);
    doc.text(pc.period, x + planW / 2, planY + 26, { align: 'center' });

    // Linha
    doc.setDrawColor(...COLOR_GRAY_BORDER);
    doc.setLineWidth(0.2);
    doc.line(x + 3, planY + 29, x + planW - 3, planY + 29);

    // Lista de Recursos
    let rY = planY + 34;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_GRAY_DARK);
    pc.features.forEach(f => {
      doc.text(`✓ ${f}`, x + 3.5, rY, { maxWidth: planW - 6 });
      rY += 8.2;
    });
  });

  // BOX INFORMATIVO - COBRANÇA 100% MENSAL
  const discY = 156;
  drawCard(MARGIN, discY, CONTENT_WIDTH, 42, [15, 23, 42], COLOR_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('⚡ PAGAMENTO SIMPLES & LIBERAÇÃO IMEDIATA:', MARGIN + 8, discY + 9);

  const monthlyBenefits = [
    { titulo: 'Preço Fixo Mensal', desc: 'Preço transparente mês a mês sem surpresas no orçamento da sua igreja.' },
    { titulo: 'Zero Fidelidade', desc: 'Sua igreja tem total liberdade e autonomia para manter o plano ativo.' },
    { titulo: 'Liberação Imediata', desc: 'Acesso imediato no mesmo instante via PIX oficial com baixa instantânea.' },
  ];

  const mColW = (CONTENT_WIDTH - 16) / 3;
  let mX = MARGIN + 8;
  monthlyBenefits.forEach(mb => {
    doc.setFillColor(25, 33, 55);
    doc.roundedRect(mX, discY + 14, mColW - 2, 22, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_WHITE);
    doc.text(mb.titulo, mX + (mColW - 2) / 2, discY + 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(200, 210, 225);
    doc.text(mb.desc, mX + (mColW - 2) / 2, discY + 26, { align: 'center', maxWidth: mColW - 6 });

    mX += mColW;
  });

  // QR Code e PIX
  drawCard(MARGIN, 204, CONTENT_WIDTH, 24, [240, 253, 244], [187, 247, 208]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 101, 52);
  doc.text('⚡ Pagamento Instantâneo via PIX com Baixa Automática:', MARGIN + 6, 212);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY_DARK);
  doc.text(
    'A liberação do sistema é imediata via PIX Oficial do Banco Central. O pastor escaneia o QR Code ou usa o "Copia e Cola" no app do banco e seu sistema fica ativo na mesma hora sem burocracia.',
    MARGIN + 6, 218, { maxWidth: CONTENT_WIDTH - 12, lineHeightFactor: 1.3 }
  );

  drawBanner(MARGIN, 244, CONTENT_WIDTH, 18, 'Planos justos para o ministério crescer sem pesar no orçamento da igreja.', COLOR_DARK, COLOR_WHITE, 9.5);

  drawFooter();
}

// ====================================================================
// PÁGINA 16: CONTRACAPA / CHAMADA MINISTERIAL E CONTATO
// ====================================================================
function buildPage16() {
  // Fundo gradiente estilizado (Dark Theme)
  doc.setFillColor(...COLOR_BLACK);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  // Círculo decorativo
  doc.setFillColor(35, 20, 15);
  doc.circle(PAGE_WIDTH / 2, 110, 85, 'F');
  doc.setFillColor(45, 25, 15);
  doc.circle(PAGE_WIDTH / 2, 110, 55, 'F');

  const cx = PAGE_WIDTH / 2;

  // Cruz no topo
  doc.setFillColor(...COLOR_WHITE);
  doc.rect(cx - 1.2, 50, 2.4, 18, 'F');
  doc.rect(cx - 6, 55, 12, 2.4, 'F');

  // Logo IgrejaApp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...COLOR_WHITE);
  doc.text('IGREJA ', cx - 18, 86, { align: 'right' });
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('APP', cx - 16, 86, { align: 'left' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 225);
  doc.text('SISTEMA DE GERENCIAMENTO DE IGREJAS', cx, 93, { align: 'center' });

  // Mensagem Principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('A tecnologia a serviço da', cx, 122, { align: 'center' });
  doc.text('organização da sua igreja', cx, 131, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 225);
  const finalDesc =
    'Com o IGREJA APP, sua igreja ganha mais controle, transparência, praticidade e zelo pastoral no dia a dia ministerial — de membros a finanças, de congregações a relatórios.';
  doc.text(finalDesc, cx, 144, { align: 'center', maxWidth: 140, lineHeightFactor: 1.4 });

  // Botão / Chamada para Ação
  doc.setFillColor(...COLOR_PRIMARY);
  doc.roundedRect(cx - 50, 172, 100, 14, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_WHITE);
  doc.text('✦ Comece a organizar sua igreja hoje', cx, 180.5, { align: 'center' });

  // 4 Indicadores
  const cardW = 39;
  const cardH = 24;
  const startX = MARGIN + 4;
  const cardY = 205;
  const finalBadges = [
    { n: '18+', l: 'Módulos' },
    { n: '6', l: 'Perfis de Acesso' },
    { n: '3', l: 'Idiomas' },
    { n: '4', l: 'Planos Acessíveis' },
  ];

  finalBadges.forEach((fb, idx) => {
    const x = startX + idx * (cardW + 4);
    doc.setFillColor(20, 26, 40);
    doc.setDrawColor(40, 50, 70);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, cardY, cardW, cardH, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(fb.n, x + cardW / 2, cardY + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 190, 205);
    doc.text(fb.l, x + cardW / 2, cardY + 16, { align: 'center' });
  });

  // Rodapé da Contracapa
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130, 140, 160);
  doc.text('IGREJA APP — SISTEMA DE GERENCIAMENTO DE IGREJAS', cx, 255, { align: 'center' });
  doc.text('Dúvidas, suporte e contratação comercial pelo WhatsApp oficial do sistema', cx, 261, { align: 'center' });
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('www.igrejaapp.com.br', cx, 268, { align: 'center' });
}

// ====================================================================
// COMPILAÇÃO DO DOCUMENTO COMPLETO (16 PÁGINAS)
// ====================================================================

console.log('Gerando Página 1: Capa...');
buildPage1();

console.log('Gerando Página 2: Sobre o Sistema...');
doc.addPage();
buildPage2();

console.log('Gerando Página 3: O Problema que Resolvemos...');
doc.addPage();
buildPage3();

console.log('Gerando Página 4: Módulos Integrados...');
doc.addPage();
buildPage4();

console.log('Gerando Página 5: Dashboard...');
doc.addPage();
buildPage5();

console.log('Gerando Página 6: Painel de Congregação...');
doc.addPage();
buildPage6();

console.log('Gerando Página 7: Gestão de Membros...');
doc.addPage();
buildPage7();

console.log('Gerando Página 8: Financeiro e Modo Offline...');
doc.addPage();
buildPage8();

console.log('Gerando Página 9: Departamentos e Campanhas...');
doc.addPage();
buildPage9();

console.log('Gerando Página 10: Documentos e Atas...');
doc.addPage();
buildPage10();

console.log('Gerando Página 11: Eventos com Push e Patrimônio...');
doc.addPage();
buildPage11();

console.log('Gerando Página 12: Portal do Membro e Carteirinha...');
doc.addPage();
buildPage12();

console.log('Gerando Página 13: Carnês Digitais em 12 Parcelas...');
doc.addPage();
buildPage13();

console.log('Gerando Página 14: Segurança, RBAC, PWA e Idiomas...');
doc.addPage();
buildPage14();

console.log('Gerando Página 15: Planos e Preços Atualizados (2026)...');
doc.addPage();
buildPage15();

console.log('Gerando Página 16: Contracapa...');
doc.addPage();
buildPage16();

// Salva em buffer e grava no disco
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
const outputPath = path.resolve('public', 'IGREJA_APP_Apresentacao_Comercial_2026.pdf');
const rootPath = path.resolve('IGREJA_APP_Apresentacao_Comercial_2026.pdf');

fs.writeFileSync(outputPath, pdfBuffer);
fs.writeFileSync(rootPath, pdfBuffer);

console.log(`\n✅ PDF gerado com sucesso com 16 páginas!`);
console.log(`📁 Salvo em: ${rootPath}`);
console.log(`📁 Salvo em: ${outputPath}`);
console.log(`Tamanho do arquivo: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

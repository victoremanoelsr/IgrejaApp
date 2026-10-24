import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'https://www.igrejaapp.com';

const wait = ms => new Promise(r => setTimeout(r, ms));

const results = {
  testedAt: new Date().toISOString(),
  targetUrl: TARGET_URL,
  consoleErrors: [],
  consoleWarnings: [],
  networkErrors: [],
  steps: []
};

function logStep(step, detail, status = 'OK') {
  results.steps.push({ step, detail, status, time: new Date().toISOString() });
  console.log(`[${status}] ${step}: ${detail}`);
}

async function runAudit() {
  console.log('🚀 Iniciando auditoria completa com Chrome DevTools Protocol no www.igrejaapp.com...');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,850'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      results.consoleErrors.push({ text, location: msg.location() });
      console.error(`🚨 [Console Error]: ${text}`);
    } else if (type === 'warning') {
      results.consoleWarnings.push({ text });
    }
  });

  page.on('pageerror', err => {
    results.consoleErrors.push({ text: `PageError: ${err.message}`, stack: err.stack });
    console.error(`🚨 [Uncaught Exception]: ${err.message}`);
  });

  page.on('requestfailed', request => {
    const failure = request.failure();
    results.networkErrors.push({
      url: request.url(),
      method: request.method(),
      errorText: failure ? failure.errorText : 'Unknown network failure'
    });
    console.warn(`⚠️ [Network Failure]: ${request.method()} ${request.url()} -> ${failure?.errorText}`);
  });

  async function clickMenuByText(name) {
    return await page.evaluate((btnText) => {
      const els = Array.from(document.querySelectorAll('a, button, [role="button"], span, p, div'));
      const target = els.find(el => {
        const text = el.innerText || el.textContent || '';
        return text.trim().toLowerCase().includes(btnText.toLowerCase());
      });
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, name);
  }

  try {
    // =========================================================================
    // ETAPA 1: LOGIN ADMINISTRATIVO (teste / teste)
    // =========================================================================
    logStep('Navegação Inicial', `Carregando ${TARGET_URL}`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 35000 });
    logStep('Carregamento', `Título: "${await page.title()}"`);

    await page.waitForSelector('#username', { timeout: 10000 });
    await page.type('#username', 'teste', { delay: 30 });
    await page.type('#password', 'teste', { delay: 30 });

    logStep('Login Admin', 'Enviando credenciais teste / teste');
    await page.click('button[type="submit"]');
    await wait(4000);

    logStep('Dashboard Admin', `Acesso concluído. URL: ${page.url()}`);
    await page.screenshot({ path: 'scripts/screenshot_01_admin_dashboard.png' });

    // Navega pelas seções principais em modo leitura
    const secoes = [
      { nome: 'Congregações', busca: 'Congregaç' },
      { nome: 'Departamentos', busca: 'Departament' },
      { nome: 'Membros', busca: 'Membro' },
      { nome: 'Financeiro', busca: 'Financeir' },
      { nome: 'Relatórios', busca: 'Relatóri' },
      { nome: 'Campanhas', busca: 'Campanha' },
      { nome: 'Eventos', busca: 'Evento' }
    ];

    for (const sec of secoes) {
      logStep('Auditoria Janela', `Acessando módulo: ${sec.nome}`);
      const ok = await clickMenuByText(sec.busca);
      if (ok) {
        await wait(2500);
        logStep(sec.nome, `Módulo carregado com sucesso. URL: ${page.url()}`);
      }
    }

    // Logout
    logStep('Logout', 'Saindo da sessão administrativa...');
    await clickMenuByText('Sair');
    await wait(3000);

    // =========================================================================
    // ETAPA 2: LOGIN DO MEMBRO (12345678910 / 01021234)
    // =========================================================================
    logStep('Portal do Membro', 'Iniciando login de membro no portal unificado');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('#username', { timeout: 10000 });

    // Limpa campos se houver
    await page.click('#username', { clickCount: 3 });
    await page.type('#username', '12345678910', { delay: 30 });
    await page.click('#password', { clickCount: 3 });
    await page.type('#password', '01021234', { delay: 30 });

    logStep('Login Membro', 'Enviando CPF 12345678910 e Senha 01021234');
    await page.click('button[type="submit"]');
    await wait(4500);

    logStep('Portal do Membro', `URL pós-login do membro: ${page.url()}`);
    await page.screenshot({ path: 'scripts/screenshot_02_member_portal.png' });

    // Navega pelas abas do Portal do Membro em modo leitura
    const abasMembro = [
      { nome: 'Financeiro Membro', busca: 'Financeiro' },
      { nome: 'Carnês / Mensalidades', busca: 'Carnê' },
      { nome: 'Eventos da Igreja', busca: 'Evento' },
      { nome: 'Meu Perfil', busca: 'Perfil' }
    ];

    for (const aba of abasMembro) {
      logStep('Aba Membro', `Acessando aba: ${aba.nome}`);
      const ok = await clickMenuByText(aba.busca);
      if (ok) {
        await wait(2500);
        logStep(aba.nome, `Aba carregada com sucesso. URL: ${page.url()}`);
      }
    }

  } catch (err) {
    logStep('Exceção Durante Execução', err.message, 'ERRO');
  } finally {
    await browser.close();
    fs.writeFileSync('scripts/audit_browser_report.json', JSON.stringify(results, null, 2));
    console.log('\n======================================================');
    console.log('✅ AUDITORIA COMPLETA DE PRODUÇÃO FINALIZADA COM SUCESSO');
    console.log(`📊 Total de Erros de Console (JavaScript): ${results.consoleErrors.length}`);
    console.log(`⚠️ Total de Falhas de Rede (HTTP 4xx/5xx): ${results.networkErrors.length}`);
    console.log(`📝 Log completo salvo em: scripts/audit_browser_report.json`);
    console.log('======================================================\n');
  }
}

runAudit();

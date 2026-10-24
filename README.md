# ⛪ IgrejaApp — Sistema Completo de Gestão Eclesiástica

O **IgrejaApp** é uma plataforma moderna e completa (SaaS) desenvolvida para a gestão eclesiástica de igrejas sedes e congregações. Inclui controle de membresia, financeiro, emissão de carteirinhas, notificações Web Push em tempo real e automação de pagamentos de planos via Pix (Mercado Pago).

---

## 🚀 Principais Funcionalidades

- **Membresia & Secretaria**: Cadastro completo de membros, congregações, cargos e histórico de cartas/certificados.
- **Financeiro & Dízimos**: Lançamento de entradas, saídas, despesas fixas, campanhas e emissão de carnês/recibos.
- **Painéis Departamentais**: Painéis específicos para Mocidade, Infantil, Senhoras, Senhores e Missões.
- **Notificações Push PWA**: Envio de comunicados e eventos diretamente para o smartphone dos membros (Android e iOS).
- **Assinatura & Faturamento SaaS**: Integração nativa com Mercado Pago via Pix automático com liberação instantânea.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, TailwindCSS, Vite, Lucide Icons.
- **PWA**: Vite Plugin PWA com Service Worker nativo para Push Notifications.
- **Banco de Dados & Autenticação**: Supabase (PostgreSQL com Row Level Security rigoroso).
- **Serverless API**: Vercel Serverless Functions (`/api/create-pix`, `/api/mercadopago-webhook`, `/api/check-pix-status`, `/api/send-push`).
- **Pagamentos**: Mercado Pago SDK / REST API v1.

---

## ⚙️ Instalação e Desenvolvimento Local

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/victoremanoelsr/IgrejaApp.git
   cd IgrejaApp
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz baseado no exemplo:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_KEY=sua_chave_anonima_supabase
   VAPID_PUBLIC_KEY=sua_chave_publica_vapid
   VAPID_PRIVATE_KEY=sua_chave_privada_vapid
   MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_mercado_pago
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## 🔒 Segurança

Todas as funções críticas de desbloqueio, pagamentos e administração contam com políticas de **Row Level Security (RLS)** e privilégios restritos a administradores e `service_role`.

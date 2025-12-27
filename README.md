# SyncWatch

Extensão de navegador para assistir vídeos em sincronia com amigos, similar ao Teleparty.

## Tech Stack

- **Frontend (Extension):** TypeScript, Vite, Manifest V3
- **Backend (Signaling Server):** Node.js, Socket.io
- **Plataforma Inicial:** YouTube

## Estrutura do Projeto

```
syncwatch/
├── server/           # Servidor de sinalização Socket.io
│   └── src/
│       └── index.ts
└── extension/        # Extensão Chrome (Manifest V3)
    └── src/
        ├── content.ts      # Lógica de sincronização
        ├── background.ts   # Service worker
        └── popup/          # UI da extensão
```

## Requisitos

- Node.js 18+
- npm 9+
- Google Chrome ou navegador baseado em Chromium

## Instalação

```bash
# Instalar dependências
npm install
```

## Desenvolvimento

### 1. Iniciar o servidor

```bash
npm run dev:server
```

O servidor Socket.io vai rodar em `http://localhost:3000`

### 2. Buildar a extensão

```bash
npm run dev:extension
```

Isso gera a pasta `extension/dist` com hot-reload.

### 3. Carregar a extensão no Chrome

1. Acesse `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `extension/dist`

## Uso

1. Abra um vídeo no YouTube
2. Abra o popup da extensão ou use o console (F12)
3. Crie ou entre em uma sala:

```js
// Criar uma nova sala
window.syncWatch.createRoom()

// Entrar em uma sala existente
window.syncWatch.joinRoom("room_id_aqui")

// Ver estado atual
window.syncWatch.getState()
```

4. Compartilhe o ID da sala com seus amigos

## Lógica de Sincronização

- **Debounce:** Eventos são agrupados em 300ms para evitar spam
- **Anti-loop:** Flag `isRemoteAction` previne loops de eventos
- **Buffering:** Quando alguém está em buffer, todos pausam e aguardam
- **Tolerância:** Diferenças de tempo > 1 segundo disparam seek automático

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor e extensão simultaneamente |
| `npm run dev:server` | Inicia apenas o servidor |
| `npm run dev:extension` | Builda a extensão com watch |
| `npm run build:server` | Build de produção do servidor |
| `npm run build:extension` | Build de produção da extensão |

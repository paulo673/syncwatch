# Guia Completo: Setup de Ferramentas de Debugging e Logging

Este documento explica passo a passo como foi feita a instalação e configuração de todas as ferramentas de debugging e logging no projeto SyncWatch.

---

## Índice

1. [Instalação do Chrome DevTools MCP](#1-instalação-do-chrome-devtools-mcp)
2. [Criação do Sistema de Logging](#2-criação-do-sistema-de-logging)
3. [Integração no Content Script](#3-integração-no-content-script)
4. [Integração no Popup](#4-integração-no-popup)
5. [Visualizador de Logs](#5-visualizador-de-logs)
6. [Como Usar as Ferramentas](#6-como-usar-as-ferramentas)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Instalação do Chrome DevTools MCP

### 1.1. O que é Chrome DevTools MCP?

O **Chrome DevTools Model Context Protocol (MCP)** é um servidor MCP oficial do Google que permite que assistentes de IA (como Claude Code) tenham acesso completo ao Chrome DevTools. Lançado em setembro de 2025, ele resolve um problema fundamental: assistentes de IA programam "vendados" sem ver o que o código realmente faz no navegador.

### 1.2. Descoberta da ferramenta

Primeiro, pesquisei se existia um MCP para Chrome DevTools:

```bash
# Pesquisa web sobre MCPs disponíveis
WebSearch: "MCP Model Context Protocol Chrome DevTools browser extension debugging 2025"
```

**Resultados encontrados:**
- MCP oficial: `chrome-devtools-mcp`
- GitHub: https://github.com/ChromeDevTools/chrome-devtools-mcp
- Documentação: https://developer.chrome.com/blog/chrome-devtools-mcp

### 1.3. Comando de instalação

Para instalar um MCP no Claude Code, usei o comando `claude mcp add`:

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

**Breakdown do comando:**
- `claude mcp add` - Comando do Claude Code para adicionar um servidor MCP
- `chrome-devtools` - Nome/alias do servidor MCP (pode ser qualquer nome)
- `npx chrome-devtools-mcp@latest` - Comando que será executado para iniciar o servidor

### 1.4. O que acontece quando instala

O comando modifica o arquivo de configuração do Claude Code:

**Arquivo modificado:** `~/.claude.json`

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"],
      "type": "stdio"
    }
  }
}
```

### 1.5. Capacidades do Chrome DevTools MCP

O servidor expõe **26 ferramentas** organizadas em **6 categorias**:

#### Input Automation (7 tools)
- `click` - Clicar em elementos
- `type` - Digitar texto
- `press` - Pressionar teclas
- `hover` - Passar mouse sobre elementos
- `select` - Selecionar opções
- `scroll` - Rolar página
- `drag` - Arrastar elementos

#### Navigation (7 tools)
- `navigate` - Navegar para URL
- `reload` - Recarregar página
- `goBack` - Voltar
- `goForward` - Avançar
- `waitForNavigation` - Aguardar navegação
- `waitForSelector` - Aguardar elemento
- `getUrl` - Obter URL atual

#### Debugging (4 tools)
- `evaluate` - Executar JavaScript no contexto da página
- `getConsole` - Capturar mensagens do console
- `screenshot` - Tirar screenshot
- `pdf` - Gerar PDF da página

#### Network (2 tools)
- `captureNetwork` - Capturar requisições HTTP
- `setRequestInterception` - Interceptar requisições

#### Performance (3 tools)
- `startTrace` - Iniciar gravação de performance
- `stopTrace` - Parar gravação
- `getMetrics` - Obter métricas de performance

#### Emulation (3 tools)
- `setViewport` - Definir tamanho da viewport
- `emulateDevice` - Emular dispositivo móvel
- `setGeolocation` - Definir localização geográfica

### 1.6. Requisitos para usar o MCP

Para que o Chrome DevTools MCP funcione, o Chrome precisa ser iniciado com remote debugging habilitado:

```bash
# Linux
google-chrome --remote-debugging-port=9222

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Importante:**
- A porta `9222` é a porta padrão do Chrome DevTools Protocol
- O Chrome deve estar rodando com esse flag ANTES de usar o MCP
- Pode-se usar outra porta, mas 9222 é o padrão

---

## 2. Criação do Sistema de Logging

### 2.1. Por que criar um sistema de logging?

**Problemas identificados:**
- Logs do console desaparecem quando a aba é recarregada
- Difícil rastrear erros que aconteceram no passado
- Sem histórico persistente de eventos
- Debugging requer abrir DevTools manualmente
- Impossível ver o que aconteceu antes de um erro

**Solução:**
Sistema de logging centralizado que:
- ✅ Captura todos os logs automaticamente
- ✅ Salva no `chrome.storage.local` (persistente)
- ✅ Captura erros não tratados
- ✅ Exporta logs como JSON
- ✅ Acessível via console e popup

### 2.2. Estrutura do Logger

Criei o arquivo `extension/src/utils/logger.ts`:

```typescript
// Enum para níveis de log
export enum LogLevel {
  DEBUG = 0,   // Detalhes para debugging
  INFO = 1,    // Informações gerais
  WARN = 2,    // Avisos
  ERROR = 3,   // Erros
}

// Interface para entradas de log
export interface LogEntry {
  timestamp: number;      // Unix timestamp
  level: LogLevel;        // Nível do log
  context: string;        // Onde foi gerado (ex: "Content Script", "Popup")
  message: string;        // Mensagem principal
  data?: unknown;         // Dados adicionais (opcional)
  stack?: string;         // Stack trace (apenas para erros)
}
```

### 2.3. Classe Logger

#### 2.3.1. Propriedades

```typescript
class Logger {
  private logs: LogEntry[] = [];           // Array de logs em memória
  private maxLogs = 1000;                  // Máximo de logs mantidos
  private minLevel: LogLevel = LogLevel.DEBUG;  // Nível mínimo para logar

  constructor() {
    this.loadLogs();        // Carrega logs salvos
    this.setupErrorHandlers(); // Captura erros globais
  }
}
```

#### 2.3.2. Carregamento e salvamento de logs

```typescript
// Carregar logs do chrome.storage ao iniciar
private async loadLogs(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['syncwatch_logs']);
      if (result.syncwatch_logs) {
        this.logs = result.syncwatch_logs;
      }
    }
  } catch (error) {
    console.error('[Logger] Failed to load logs:', error);
  }
}

// Salvar logs no chrome.storage
private async saveLogs(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ syncwatch_logs: this.logs });
    }
  } catch (error) {
    console.error('[Logger] Failed to save logs:', error);
  }
}
```

**Por que `chrome.storage.local`?**
- Persistente (não é apagado quando a aba fecha)
- Compartilhado entre content script, popup e background
- Limite de 5MB (suficiente para milhares de logs)
- API assíncrona e confiável

#### 2.3.3. Captura automática de erros

```typescript
constructor() {
  this.loadLogs();

  // Capturar erros globais
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      this.error('Global Error Handler', event.error?.message || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Capturar promise rejections não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', event.reason?.message || String(event.reason), {
        reason: event.reason,
        stack: event.reason?.stack,
      });
    });
  }
}
```

**Por que capturar erros globais?**
- Detecta erros que escaparam do try/catch
- Registra erros de dependências (Socket.io, etc.)
- Útil para encontrar bugs escondidos

#### 2.3.4. Método principal de logging

```typescript
private log(level: LogLevel, context: string, message: string, data?: unknown): void {
  // Filtrar por nível mínimo
  if (level < this.minLevel) return;

  // Criar entrada de log
  const entry: LogEntry = {
    timestamp: Date.now(),
    level,
    context,
    message,
    data,
    stack: level >= LogLevel.ERROR ? new Error().stack : undefined,
  };

  // Adicionar aos logs
  this.logs.push(entry);

  // Manter apenas os últimos N logs
  if (this.logs.length > this.maxLogs) {
    this.logs = this.logs.slice(-this.maxLogs);
  }

  // Salvar no storage
  this.saveLogs();

  // Também logar no console (para desenvolvimento)
  const levelName = LogLevel[level];
  const timestamp = new Date(entry.timestamp).toISOString();
  const prefix = `[SyncWatch][${timestamp}][${levelName}][${context}]`;

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(prefix, message, data);
      break;
    case LogLevel.INFO:
      console.info(prefix, message, data);
      break;
    case LogLevel.WARN:
      console.warn(prefix, message, data);
      break;
    case LogLevel.ERROR:
      console.error(prefix, message, data);
      if (entry.stack) console.error('Stack:', entry.stack);
      break;
  }
}
```

#### 2.3.5. Métodos públicos

```typescript
// Métodos de conveniência para cada nível
debug(context: string, message: string, data?: unknown): void {
  this.log(LogLevel.DEBUG, context, message, data);
}

info(context: string, message: string, data?: unknown): void {
  this.log(LogLevel.INFO, context, message, data);
}

warn(context: string, message: string, data?: unknown): void {
  this.log(LogLevel.WARN, context, message, data);
}

error(context: string, message: string, data?: unknown): void {
  this.log(LogLevel.ERROR, context, message, data);
}

// Buscar logs com filtros
async getLogs(filter?: {
  level?: LogLevel;
  context?: string;
  limit?: number
}): Promise<LogEntry[]> {
  let filtered = this.logs;

  if (filter?.level !== undefined) {
    filtered = filtered.filter((log) => log.level >= filter.level);
  }

  if (filter?.context) {
    filtered = filtered.filter((log) => log.context.includes(filter.context));
  }

  if (filter?.limit) {
    filtered = filtered.slice(-filter.limit);
  }

  return filtered;
}

// Exportar logs como JSON
async exportLogs(): Promise<string> {
  const logs = await this.getLogs();
  return JSON.stringify(logs, null, 2);
}

// Download de logs
async downloadLogs(): Promise<void> {
  const logsJson = await this.exportLogs();
  const blob = new Blob([logsJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `syncwatch-logs-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

#### 2.3.6. Exportar para uso global

```typescript
// Instância global
export const logger = new Logger();

// Expor no window para acesso via console
if (typeof window !== 'undefined') {
  (window as unknown as { syncWatchLogger: Logger }).syncWatchLogger = logger;
}
```

---

## 3. Integração no Content Script

### 3.1. Importar o logger

No arquivo `extension/src/content.ts`, adicionei a importação:

```typescript
import { io, Socket } from "socket.io-client";
import { logger } from "./utils/logger";  // ← Novo
```

### 3.2. Adicionar logs estratégicos

Adicionei logs em pontos chave do código:

```typescript
function init(): void {
  console.log("[SyncWatch] Initializing...");
  logger.info("Content Script", "Initializing SyncWatch", { url: window.location.href });

  const checkForVideo = setInterval(() => {
    const video = findVideoElement();
    if (video) {
      clearInterval(checkForVideo);
      state.videoElement = video;

      console.log("[SyncWatch] Video element found");
      logger.info("Content Script", "Video element found");  // ← Log

      state.socket = initSocket();
      setupVideoListeners(video);

      // Expor API
      (window as unknown as { syncWatch: SyncWatchAPI }).syncWatch = { /* ... */ };

      console.log("[SyncWatch] Ready! Use window.syncWatch.createRoom()...");
      logger.info("Content Script", "SyncWatch API ready and exposed to window");  // ← Log
    }
  }, 500);

  setTimeout(() => {
    clearInterval(checkForVideo);
    if (!state.videoElement) {
      console.log("[SyncWatch] No video element found after 30 seconds");
      logger.warn("Content Script", "No video element found after 30 seconds", {
        url: window.location.href
      });  // ← Log de warning
    }
  }, 30000);
}
```

**Estratégia de logging:**
- ✅ Log INFO quando inicializa
- ✅ Log INFO quando encontra vídeo
- ✅ Log INFO quando API está pronta
- ✅ Log WARN se timeout (30s sem encontrar vídeo)
- ✅ Incluir dados contextuais (URL, etc.)

---

## 4. Integração no Popup

### 4.1. Adicionar botão de visualização de logs

No arquivo `extension/src/popup/index.html`, adicionei um botão:

```html
<div class="footer">
  Go to YouTube and open a video to start
</div>

<!-- Novo botão para ver logs -->
<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
  <button class="btn-secondary" id="viewLogs" style="width: 100%; font-size: 11px; padding: 8px;">
    View Logs
  </button>
</div>

<script src="popup.ts" type="module"></script>
```

### 4.2. Adicionar referência ao botão

No arquivo `extension/src/popup/popup.ts`:

```typescript
const viewLogsBtn = document.getElementById("viewLogs") as HTMLButtonElement;
```

### 4.3. Implementar visualizador de logs

```typescript
viewLogsBtn.addEventListener("click", async () => {
  try {
    // Buscar logs do storage
    const result = await chrome.storage.local.get(['syncwatch_logs']);
    const logs = result.syncwatch_logs || [];

    if (logs.length === 0) {
      alert("No logs found");
      return;
    }

    // Formatar logs como texto legível
    const logText = logs
      .slice(-50)  // Últimos 50 logs
      .map((log: {
        timestamp: number;
        level: number;
        context: string;
        message: string;
        data?: unknown
      }) => {
        const date = new Date(log.timestamp).toISOString();
        const level = ['DEBUG', 'INFO', 'WARN', 'ERROR'][log.level] || 'UNKNOWN';
        const data = log.data ? `\n  Data: ${JSON.stringify(log.data)}` : '';
        return `[${date}] [${level}] [${log.context}]\n  ${log.message}${data}`;
      })
      .join('\n\n');

    // Criar nova aba com logs
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url });

    // Oferecer download
    const download = confirm("Logs opened in new tab. Download as file?");
    if (download) {
      const a = document.createElement('a');
      const jsonBlob = new Blob([JSON.stringify(logs, null, 2)], {
        type: 'application/json'
      });
      a.href = URL.createObjectURL(jsonBlob);
      a.download = `syncwatch-logs-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("[SyncWatch Popup] Error viewing logs:", error);
    alert("Failed to view logs");
  }
});
```

**Fluxo do visualizador:**
1. Busca logs do `chrome.storage.local`
2. Formata últimos 50 logs para texto legível
3. Cria blob e abre em nova aba
4. Oferece download como JSON
5. Trata erros adequadamente

---

## 5. Visualizador de Logs

### 5.1. Formato de exibição

**Texto legível (na nova aba):**
```
[2025-12-29T10:30:45.123Z] [INFO] [Content Script]
  Initializing SyncWatch
  Data: {"url":"https://youtube.com/watch?v=xyz"}

[2025-12-29T10:30:46.456Z] [INFO] [Content Script]
  Video element found

[2025-12-29T10:30:47.789Z] [ERROR] [Content Script]
  Failed to connect
  Data: {"error":"ECONNREFUSED"}
```

**JSON (download):**
```json
[
  {
    "timestamp": 1703847045123,
    "level": 1,
    "context": "Content Script",
    "message": "Initializing SyncWatch",
    "data": {
      "url": "https://youtube.com/watch?v=xyz"
    }
  },
  {
    "timestamp": 1703847046456,
    "level": 1,
    "context": "Content Script",
    "message": "Video element found"
  }
]
```

---

## 6. Como Usar as Ferramentas

### 6.1. Chrome DevTools MCP

#### Pré-requisito: Iniciar Chrome com debugging

```bash
google-chrome --remote-debugging-port=9222
```

#### Comandos para Claude Code

**Capturar console logs:**
```
Use o Chrome DevTools MCP para capturar os console logs da aba atual
```

**Executar JavaScript:**
```
Use o Chrome DevTools MCP para executar: window.syncWatch
```

**Tirar screenshot:**
```
Use o Chrome DevTools MCP para tirar um screenshot da página atual
```

**Capturar erros:**
```
Use o Chrome DevTools MCP para:
1. Capturar os console logs
2. Filtrar apenas erros
3. Me mostrar
```

### 6.2. Sistema de Logging

#### Via console do Chrome

**No DevTools da aba do YouTube:**

```javascript
// Ver todos os logs
window.syncWatchLogger.getLogs().then(logs => console.table(logs));

// Ver últimos 10 logs
window.syncWatchLogger.getLogs({ limit: 10 }).then(logs => console.table(logs));

// Ver apenas erros
window.syncWatchLogger.getLogs({ level: 3 }).then(logs => console.table(logs));

// Filtrar por contexto
window.syncWatchLogger.getLogs({ context: "Content Script" })
  .then(logs => console.table(logs));

// Exportar como JSON string
window.syncWatchLogger.exportLogs().then(json => console.log(json));

// Download de logs
window.syncWatchLogger.downloadLogs();

// Limpar todos os logs
window.syncWatchLogger.clearLogs();

// Mudar nível mínimo de log
window.syncWatchLogger.setMinLevel(2); // Apenas WARN e ERROR
```

#### Via popup da extensão

1. Clicar no ícone da extensão
2. Clicar no botão "View Logs"
3. Logs abrem em nova aba
4. Opção de download como JSON

#### Programaticamente

```typescript
import { logger } from "./utils/logger";

// Logar em diferentes níveis
logger.debug("MyContext", "Debug info", { detail: 123 });
logger.info("MyContext", "Info message");
logger.warn("MyContext", "Warning message", { reason: "xyz" });
logger.error("MyContext", "Error occurred", { error: err });

// Buscar logs
const allLogs = await logger.getLogs();
const errors = await logger.getLogs({ level: LogLevel.ERROR });
const last20 = await logger.getLogs({ limit: 20 });
```

---

## 7. Troubleshooting

### 7.1. Chrome DevTools MCP não funciona

**Problema:** MCP não consegue conectar ao Chrome

**Soluções:**
1. Verificar se Chrome foi iniciado com `--remote-debugging-port=9222`
2. Verificar se a porta 9222 não está em uso
3. Tentar fechar todos os Chromes e reiniciar com o flag

**Verificar se está rodando:**
```bash
# Linux/Mac
curl http://localhost:9222/json
# Deve retornar JSON com lista de tabs
```

### 7.2. Logs não aparecem no storage

**Problema:** `chrome.storage.local` vazio

**Soluções:**
1. Verificar se a extensão tem permissão "storage" no manifest.json
2. Ver console para erros de "Failed to save logs"
3. Verificar quota do storage:

```javascript
chrome.storage.local.getBytesInUse(['syncwatch_logs'], (bytes) => {
  console.log('Bytes used:', bytes);
});
```

### 7.3. Logger não está disponível no window

**Problema:** `window.syncWatchLogger` é undefined

**Causas:**
1. Content script não foi carregado
2. Está em contexto errado (popup vs content script)

**Solução:**
- Verificar que está no DevTools da **aba do YouTube**, não do popup
- Verificar console para "[SyncWatch] Initializing..."

### 7.4. Build não inclui logger

**Problema:** Import do logger dá erro

**Solução:**
```bash
# Limpar build e rebuildar
rm -rf extension/dist
npm run dev:extension
```

---

## 8. Arquitetura Final

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code CLI                          │
│                           ↓                                  │
│              Chrome DevTools MCP Server                     │
│                           ↓                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Chrome Browser (port 9222)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  YouTube Tab (content script context)               │  │
│  │                                                       │  │
│  │  window.syncWatch = {                                │  │
│  │    createRoom(), joinRoom(), getState()             │  │
│  │  }                                                    │  │
│  │                                                       │  │
│  │  window.syncWatchLogger = {                          │  │
│  │    getLogs(), exportLogs(), downloadLogs()          │  │
│  │  }                                                    │  │
│  │                                                       │  │
│  │  utils/logger.ts                                     │  │
│  │    ↓ captura logs                                    │  │
│  │    ↓ captura erros globais                           │  │
│  │    ↓ salva em chrome.storage.local                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Extension Popup                                     │  │
│  │                                                       │  │
│  │  [View Logs] ← Botão                                │  │
│  │    ↓ lê chrome.storage.local                         │  │
│  │    ↓ formata logs                                    │  │
│  │    ↓ abre nova aba                                   │  │
│  │    ↓ oferece download                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Background Service Worker                           │  │
│  │  (pode também usar logger se necessário)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              chrome.storage.local                           │
│                                                              │
│  {                                                          │
│    "syncwatch_logs": [                                     │
│      { timestamp, level, context, message, data },         │
│      { timestamp, level, context, message, data },         │
│      ...                                                    │
│    ]                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Checklist de Implementação

### ✅ Instalação do Chrome DevTools MCP
- [x] Pesquisar MCPs disponíveis
- [x] Executar `claude mcp add chrome-devtools npx chrome-devtools-mcp@latest`
- [x] Verificar `~/.claude.json` foi modificado
- [x] Documentar capacidades (26 tools em 6 categorias)

### ✅ Sistema de Logging
- [x] Criar `extension/src/utils/logger.ts`
- [x] Implementar enum `LogLevel`
- [x] Implementar interface `LogEntry`
- [x] Implementar classe `Logger`
- [x] Adicionar métodos: debug, info, warn, error
- [x] Implementar salvamento em `chrome.storage.local`
- [x] Capturar erros globais (window.onerror)
- [x] Capturar promise rejections
- [x] Implementar getLogs com filtros
- [x] Implementar exportLogs
- [x] Implementar downloadLogs
- [x] Expor como `window.syncWatchLogger`

### ✅ Integração no Content Script
- [x] Importar logger
- [x] Adicionar log na inicialização
- [x] Adicionar log quando encontra vídeo
- [x] Adicionar log quando API está pronta
- [x] Adicionar log de warning no timeout

### ✅ Integração no Popup
- [x] Adicionar botão "View Logs" no HTML
- [x] Adicionar estilos do botão
- [x] Implementar event listener
- [x] Buscar logs do storage
- [x] Formatar logs para texto
- [x] Abrir logs em nova aba
- [x] Implementar download de JSON
- [x] Tratamento de erros

### ✅ Documentação
- [x] Criar `TROUBLESHOOTING.md`
- [x] Criar `DEV_WORKFLOW.md`
- [x] Criar `DEBUG_NOW.md`
- [x] Criar `SETUP_DEBUGGING_TOOLS.md` (este arquivo)

---

## 10. Comandos Úteis de Resumo

### Instalar MCP
```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

### Iniciar Chrome com debugging
```bash
google-chrome --remote-debugging-port=9222
```

### Verificar MCP instalado
```bash
cat ~/.claude.json | grep chrome-devtools
```

### Ver logs via console
```javascript
window.syncWatchLogger.getLogs({ limit: 20 }).then(logs => console.table(logs))
```

### Download logs via console
```javascript
window.syncWatchLogger.downloadLogs()
```

### Limpar logs
```javascript
window.syncWatchLogger.clearLogs()
```

---

## 11. Referências

- **Chrome DevTools MCP:**
  - Documentação oficial: https://developer.chrome.com/blog/chrome-devtools-mcp
  - GitHub: https://github.com/ChromeDevTools/chrome-devtools-mcp
  - Guia completo: https://vladimirsiedykh.com/blog/chrome-devtools-mcp-ai-browser-debugging-complete-guide-2025

- **Chrome DevTools Protocol:**
  - Protocolo: https://chromedevtools.github.io/devtools-protocol/
  - Domínios: https://chromedevtools.github.io/devtools-protocol/tot/

- **Chrome Storage API:**
  - Documentação: https://developer.chrome.com/docs/extensions/reference/storage/

---

**Autor:** Claude Code (Sonnet 4.5)
**Data:** 2025-12-29
**Projeto:** SyncWatch
**Versão:** 1.0

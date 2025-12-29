# Development Workflow - SyncWatch

Este guia detalha o workflow de desenvolvimento integrado com ferramentas de debugging e logging.

---

## 1. Chrome DevTools MCP (Instalado ✓)

O **Chrome DevTools MCP** foi instalado e permite que o Claude Code tenha acesso direto ao DevTools do Chrome, incluindo:

- 📊 **Console logs** em tempo real
- 🌐 **Network requests** e respostas
- 📸 **Screenshots** da página
- ⚡ **Performance traces**
- 🐛 **Debugging** avançado

### Como usar o Chrome DevTools MCP

#### 1. Iniciar o Chrome com remote debugging habilitado

```bash
# Linux
google-chrome --remote-debugging-port=9222

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

#### 2. Usar comandos do MCP no Claude Code

Depois que o Chrome estiver rodando com debugging habilitado, você pode pedir ao Claude:

- "Use o Chrome DevTools MCP para capturar os console logs da aba atual"
- "Tire um screenshot da página do YouTube"
- "Mostre os erros do console"
- "Capture as network requests"
- "Execute esse código no console da aba"

#### 3. Ferramentas disponíveis

O MCP expõe **26 ferramentas** organizadas em 6 categorias:

1. **Input automation** (7 tools) - Automatizar cliques, digitação, etc.
2. **Navigation** (7 tools) - Navegar entre páginas, recarregar, etc.
3. **Debugging** (4 tools) - Console logs, avaliar JavaScript, etc.
4. **Network** (2 tools) - Capturar requests e responses
5. **Performance** (3 tools) - Gravar traces de performance
6. **Emulation** (3 tools) - Emular dispositivos, localizações, etc.

---

## 2. Sistema de Logging Integrado

### Logger centralizado

Criamos um sistema de logging centralizado em `extension/src/utils/logger.ts` que:

- ✅ Captura **todos os logs** (DEBUG, INFO, WARN, ERROR)
- ✅ Salva logs no **chrome.storage.local** (persistente)
- ✅ Captura **erros não tratados** automaticamente
- ✅ Captura **promise rejections** não tratadas
- ✅ Mantém **stack traces** de erros
- ✅ Pode **exportar logs** para JSON

### Como usar o logger no código

```typescript
import { logger } from "./utils/logger";

// Debug
logger.debug("MyComponent", "Debug message", { someData: 123 });

// Info
logger.info("MyComponent", "Info message");

// Warning
logger.warn("MyComponent", "Warning message", { reason: "something" });

// Error
logger.error("MyComponent", "Error occurred", { error: err });
```

### Acessar logs via console do Chrome

Abra o DevTools na **aba do YouTube** e execute:

```javascript
// Ver todos os logs
window.syncWatchLogger.getLogs().then(logs => console.table(logs));

// Ver apenas erros
window.syncWatchLogger.getLogs({ level: 3 }).then(logs => console.table(logs));

// Ver últimos 10 logs
window.syncWatchLogger.getLogs({ limit: 10 }).then(logs => console.table(logs));

// Filtrar por contexto
window.syncWatchLogger.getLogs({ context: "Content Script" }).then(logs => console.table(logs));

// Exportar logs para JSON
window.syncWatchLogger.exportLogs().then(json => console.log(json));

// Download logs como arquivo
window.syncWatchLogger.downloadLogs();

// Limpar logs
window.syncWatchLogger.clearLogs();
```

### Acessar logs via chrome.storage

```javascript
chrome.storage.local.get(['syncwatch_logs'], (result) => {
  console.table(result.syncwatch_logs);
});
```

---

## 3. Workflow de Desenvolvimento Recomendado

### Setup inicial

```bash
# Terminal 1: Servidor Socket.io
npm run dev:server

# Terminal 2: Build da extensão (watch mode)
npm run dev:extension
```

### Debugging com Chrome DevTools MCP

1. **Inicie o Chrome com debugging habilitado:**
   ```bash
   google-chrome --remote-debugging-port=9222
   ```

2. **Carregue a extensão:**
   - Vá em `chrome://extensions/`
   - Ative "Modo do desenvolvedor"
   - Clique em "Carregar sem compactação"
   - Selecione `extension/dist`

3. **Abra uma página do YouTube:**
   - `youtube.com/watch?v=...`

4. **Use o Claude Code para debug:**
   ```
   Use o Chrome DevTools MCP para:
   - Capturar os console logs
   - Mostrar erros
   - Ver se window.syncWatch existe
   - Executar window.syncWatch.getState()
   ```

### Debugging manual

#### No DevTools da aba do YouTube:

```javascript
// Verificar se SyncWatch está carregado
console.log(window.syncWatch);

// Ver estado atual
window.syncWatch.getState();

// Criar sala
window.syncWatch.createRoom();

// Ver logs do sistema
window.syncWatchLogger.getLogs({ limit: 20 }).then(logs => console.table(logs));

// Ver apenas erros
window.syncWatchLogger.getLogs({ level: 3 }).then(logs => console.table(logs));
```

#### No console do background service worker:

```javascript
// Acessar: chrome://extensions/ > SyncWatch > "service worker"
console.log("Background worker logs");
```

---

## 4. Checklist de Debugging

Quando algo não funciona, verifique nesta ordem:

### ✅ 1. Servidor rodando?
```bash
# Terminal deve mostrar: "Socket.io server listening on port 3000"
npm run dev:server
```

### ✅ 2. Extensão buildada?
```bash
# Terminal deve mostrar: "built in XXXms"
npm run dev:extension
```

### ✅ 3. Extensão carregada no Chrome?
- Ir em `chrome://extensions/`
- Verificar se "SyncWatch" está ativo
- Se alterou código, clicar no botão de reload

### ✅ 4. Em uma página do YouTube com vídeo?
- URL deve ser `youtube.com/watch?v=...`
- **NÃO** funciona em: página inicial, playlists, canais, etc.

### ✅ 5. Content script carregado?
- Abrir DevTools na aba do YouTube
- Procurar por: `[SyncWatch] Initializing...`
- Procurar por: `[SyncWatch] Video element found`
- Procurar por: `[SyncWatch] Ready!`

### ✅ 6. window.syncWatch existe?
```javascript
// DevTools da aba do YouTube
console.log(window.syncWatch);
// Deve mostrar: {joinRoom, createRoom, getState, setUsername}
```

### ✅ 7. Ver logs do sistema?
```javascript
window.syncWatchLogger.getLogs({ limit: 20 }).then(logs => console.table(logs));
```

### ✅ 8. Usar Chrome DevTools MCP
Pedir ao Claude Code:
```
Use o Chrome DevTools MCP para capturar os console logs e erros da aba atual do YouTube
```

---

## 5. Comandos Úteis

### Development
```bash
# Rodar tudo (servidor + extensão)
npm run dev

# Apenas servidor
npm run dev:server

# Apenas extensão
npm run dev:extension
```

### Build de produção
```bash
# Build servidor
npm run build:server

# Build extensão
npm run build:extension
```

### Debugging
```bash
# Chrome com remote debugging
google-chrome --remote-debugging-port=9222

# Ver logs do build
tail -f /tmp/claude/-home-santos--dev-syncwatch/tasks/*.output
```

---

## 6. Estrutura de Logs

### Formato de log entry

```typescript
{
  timestamp: 1234567890,        // Unix timestamp
  level: 1,                     // 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
  context: "Content Script",    // Onde o log foi gerado
  message: "Video element found",  // Mensagem
  data: { url: "..." },         // Dados adicionais (opcional)
  stack: "Error: ...\n  at ..." // Stack trace (apenas erros)
}
```

### Níveis de log

- **DEBUG (0)**: Informações detalhadas para debugging
- **INFO (1)**: Informações gerais sobre o que está acontecendo
- **WARN (2)**: Avisos que não impedem a execução
- **ERROR (3)**: Erros que precisam ser corrigidos

---

## 7. Recursos Adicionais

### Documentação oficial
- [Chrome DevTools MCP - Google Blog](https://developer.chrome.com/blog/chrome-devtools-mcp)
- [Chrome DevTools MCP - GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

### Ferramentas instaladas
- ✅ Chrome DevTools MCP
- ✅ Sistema de logging centralizado
- ✅ Vite watch mode para hot reload

---

## 8. Troubleshooting Comum

### "window.syncWatch is undefined"

**Causas:**
- Content script não carregou
- Não está em uma página do YouTube com vídeo
- Elemento de vídeo não foi encontrado (ainda carregando)

**Solução:**
1. Verificar console: `[SyncWatch] Ready!`
2. Aguardar alguns segundos
3. Recarregar a página se necessário

### "Failed to create room"

**Causas:**
- Servidor não está rodando
- Problemas de conexão Socket.io

**Solução:**
1. Verificar se servidor está rodando: `npm run dev:server`
2. Ver console: `[SyncWatch] Connected to server`
3. Verificar logs: `window.syncWatchLogger.getLogs({ level: 3 })`

### Popup mostra "Loading..." indefinidamente

**Causas:**
- Content script não está pronto
- Não está em uma página do YouTube

**Solução:**
1. Verificar URL: deve ser `youtube.com/watch?v=...`
2. Abrir DevTools e verificar erros
3. Usar Chrome DevTools MCP para investigar

---

**Data de criação:** 2025-12-29

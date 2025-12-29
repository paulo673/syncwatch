# Como Debugar o Problema Atual

## Problema Reportado
- Botão "Create Room" clicado mas nada acontece
- Erro no console: `Cannot read properties of undefined (reading 'createRoom')`

---

## Ferramentas Disponíveis Agora ✅

1. **Chrome DevTools MCP** - Instalado e configurado
2. **Sistema de Logging** - Captura automática de erros
3. **Visualizador de Logs** - Botão no popup
4. **Watch Mode** - Build automático quando alterar código

---

## PASSO A PASSO - Debugar AGORA

### 1. Recarregar a extensão

```
1. Ir em: chrome://extensions/
2. Encontrar "SyncWatch"
3. Clicar no botão de RELOAD (🔄)
```

### 2. Iniciar Chrome com remote debugging

**Abrir um NOVO terminal e executar:**

```bash
# Linux
google-chrome --remote-debugging-port=9222

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

### 3. Abrir página do YouTube

```
1. Navegar para: https://youtube.com/watch?v=dQw4w9WgXcQ
2. Aguardar o vídeo carregar completamente
3. Abrir DevTools (F12)
4. Ir na aba Console
```

### 4. Verificar se SyncWatch está carregado

**No console do DevTools da aba do YouTube, executar:**

```javascript
// Verificar se existe
console.log("syncWatch:", window.syncWatch);

// Verificar logs
window.syncWatchLogger.getLogs({ limit: 10 }).then(logs => console.table(logs));

// Ver apenas erros
window.syncWatchLogger.getLogs({ level: 3 }).then(logs => console.table(logs));
```

### 5. Usar o Claude Code com Chrome DevTools MCP

**No Claude Code, perguntar:**

```
Use o Chrome DevTools MCP para:
1. Capturar os console logs da aba atual do YouTube
2. Verificar se existem erros
3. Executar: window.syncWatch
4. Executar: window.syncWatch.getState()
5. Capturar screenshot da página
```

### 6. Testar criar sala via console

**No console do DevTools da aba do YouTube:**

```javascript
// Tentar criar sala diretamente
const roomId = window.syncWatch.createRoom();
console.log("Room created:", roomId);

// Ver estado
window.syncWatch.getState();
```

### 7. Testar pelo popup

```
1. Clicar no ícone da extensão
2. Observar o status (deve mostrar "Ready" ou "Loading...")
3. Clicar em "Create Room"
4. Clicar em "View Logs" para ver o que aconteceu
```

### 8. Exportar logs

**No popup, clicar em "View Logs"** ou **no console executar:**

```javascript
// Download logs como JSON
window.syncWatchLogger.downloadLogs();

// Ou copiar logs
window.syncWatchLogger.exportLogs().then(json => {
  console.log(json);
  navigator.clipboard.writeText(json);
  alert("Logs copiados!");
});
```

---

## Comando Rápido para Claude Code

**Cole isso no chat do Claude Code:**

```
Use o Chrome DevTools MCP para investigar o erro da extensão SyncWatch:

1. Capture os console logs da aba do YouTube
2. Verifique se há erros (especialmente relacionados a "syncWatch")
3. Execute no console: window.syncWatch
4. Execute no console: window.syncWatchLogger.getLogs({ level: 3 })
5. Me mostre todos os erros encontrados

A página deve estar em: youtube.com/watch?v=...
O Chrome deve estar rodando com --remote-debugging-port=9222
```

---

## Se ainda não funcionar

### Opção 1: Verificar manualmente

```javascript
// No console do DevTools da aba do YouTube:

// 1. Verificar se script foi injetado
console.log("Scripts:", performance.getEntriesByType("resource")
  .filter(r => r.name.includes("syncwatch"))
);

// 2. Verificar DOM
console.log("Video element:", document.querySelector("video.html5-main-video"));

// 3. Forçar reinicialização (se necessário)
location.reload();
```

### Opção 2: Ver logs do background worker

```
1. Ir em: chrome://extensions/
2. Encontrar "SyncWatch"
3. Clicar em "service worker" (link azul)
4. Ver console logs do background
```

### Opção 3: Ver logs de build

```bash
# No terminal onde está rodando dev:extension
# Ver se há erros de compilação
tail -f /tmp/claude/-home-santos--dev-syncwatch/tasks/b4665de.output
```

---

## Estrutura de Debugging

```
┌─────────────────────────────────────────┐
│  Claude Code + Chrome DevTools MCP      │
│  ↓ pode capturar logs de:               │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  Chrome Browser (port 9222)             │
│  ├─ YouTube Tab                         │
│  │  ├─ window.syncWatch                 │
│  │  └─ window.syncWatchLogger           │
│  ├─ Background Worker                   │
│  └─ Extension Popup                     │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│  chrome.storage.local                   │
│  └─ syncwatch_logs (persistent)         │
└─────────────────────────────────────────┘
```

---

## Logs que queremos ver

Procure por estas mensagens no console:

✅ **Sucesso:**
```
[SyncWatch] Initializing...
[SyncWatch] Video element found
[SyncWatch] Connected to server
[SyncWatch] Ready! Use window.syncWatch...
```

❌ **Erro:**
```
[SyncWatch] No video element found after 30 seconds
[SyncWatch] Connection error: ...
TypeError: Cannot read properties of undefined...
```

---

## Próximos Passos

1. ✅ Recarregar extensão
2. ✅ Iniciar Chrome com debugging
3. ✅ Abrir YouTube
4. ✅ Verificar console
5. ✅ Usar Claude Code com MCP
6. ✅ Exportar logs
7. ✅ Reportar resultados

**Quando tiver os logs, cole aqui no chat para análise!**

---

Data: 2025-12-29

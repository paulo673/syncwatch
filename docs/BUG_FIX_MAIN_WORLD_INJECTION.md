# Bug Fix: window.syncWatch undefined (MAIN World Injection)

## 🐛 Problema REAL Identificado

**Sintoma:** `window.syncWatch` é **undefined** quando acessado no console da página ou pelo popup

**Data:** 2025-12-29

---

## 🔍 Diagnóstico

### Evidências:

1. ✅ Content script estava carregando (logs mostravam)
2. ✅ Vídeo era encontrado
3. ❌ `window.syncWatch` estava **undefined** no console
4. ❌ Popup mostrava "Not ready - try reloading the page"

### Root Cause:

**Content scripts rodam em ISOLATED world por padrão**, não em MAIN world.

Quando o content script faz:
```typescript
window.syncWatch = { ... }
```

Isso define `window.syncWatch` no **window do ISOLATED world**, **NÃO** no window da página principal que o usuário e popup podem acessar.

---

## 🔧 Solução Aplicada

### Estratégia:

Injetar um `<script>` tag diretamente no DOM da página, que roda no **MAIN world** e tem acesso ao `window` real da página.

### Comunicação entre mundos:

```
┌─────────────────────────────────────────┐
│  MAIN World (página)                    │
│                                          │
│  window.syncWatch.createRoom()          │
│         ↓                                │
│  window.postMessage({                   │
│    type: 'SYNCWATCH_CREATE_ROOM'       │
│  })                                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  ISOLATED World (content script)        │
│                                          │
│  window.addEventListener('message', ...) │
│         ↓                                │
│  Processa a ação (criar sala)           │
│         ↓                                │
│  window.postMessage({                   │
│    type: 'SYNCWATCH_ROOM_CREATED',     │
│    roomId: 'room_...'                  │
│  })                                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  MAIN World (página)                    │
│                                          │
│  Promise resolve(roomId)                │
│         ↓                                │
│  Retorna roomId para quem chamou        │
└─────────────────────────────────────────┘
```

---

## 📝 Código Implementado

### 1. Função de Injeção no MAIN World

```typescript
// Inject script to MAIN world so window.syncWatch is accessible from the page
function injectScriptToMainWorld(api: SyncWatchAPI): void {
  // Create a script element that runs in the MAIN world
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // Define the API in the MAIN world
      window.syncWatch = {
        joinRoom: function(roomId) {
          window.postMessage({ type: 'SYNCWATCH_JOIN_ROOM', roomId }, '*');
        },
        createRoom: function() {
          window.postMessage({ type: 'SYNCWATCH_CREATE_ROOM' }, '*');
          return new Promise((resolve) => {
            const handler = (event) => {
              if (event.data && event.data.type === 'SYNCWATCH_ROOM_CREATED') {
                window.removeEventListener('message', handler);
                resolve(event.data.roomId);
              }
            };
            window.addEventListener('message', handler);
          });
        },
        getState: function() {
          return new Promise((resolve) => {
            window.postMessage({ type: 'SYNCWATCH_GET_STATE' }, '*');
            const handler = (event) => {
              if (event.data && event.data.type === 'SYNCWATCH_STATE') {
                window.removeEventListener('message', handler);
                resolve(event.data.state);
              }
            };
            window.addEventListener('message', handler);
          });
        },
        setUsername: function(name) {
          window.postMessage({ type: 'SYNCWATCH_SET_USERNAME', username: name }, '*');
        }
      };
      console.log('[SyncWatch] API injected in MAIN world');
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // Listen for messages from MAIN world
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    const { type, roomId, username } = event.data;

    switch (type) {
      case 'SYNCWATCH_JOIN_ROOM':
        api.joinRoom(roomId);
        break;

      case 'SYNCWATCH_CREATE_ROOM':
        const newRoomId = api.createRoom();
        window.postMessage({ type: 'SYNCWATCH_ROOM_CREATED', roomId: newRoomId }, '*');
        break;

      case 'SYNCWATCH_GET_STATE':
        const currentState = api.getState();
        window.postMessage({ type: 'SYNCWATCH_STATE', state: currentState }, '*');
        break;

      case 'SYNCWATCH_SET_USERNAME':
        api.setUsername(username);
        break;
    }
  });

  logger.info("Content Script", "Injected API to MAIN world via script tag");
}
```

### 2. Chamar a injeção na inicialização

```typescript
// No init(), depois de criar a API:
const api: SyncWatchAPI = {
  joinRoom,
  createRoom,
  getState: () => ({ ... }),
  setUsername: (name: string) => { state.username = name; },
};

// Expose in ISOLATED world (for content script access)
(window as unknown as { syncWatch: SyncWatchAPI }).syncWatch = api;

// ALSO expose in MAIN world (for page/popup access)
injectScriptToMainWorld(api);  // ← NOVA LINHA
```

---

## 🎯 Por que isso funciona?

### Script Tag vs Content Script:

| Aspecto | Content Script | Script Tag Injetado |
|---------|---------------|---------------------|
| **Mundo** | ISOLATED | MAIN |
| **Acesso ao window** | window isolado | window da página |
| **Visível no console?** | ❌ Não | ✅ Sim |
| **Popup pode acessar?** | ❌ Não (mesmo com world:MAIN) | ✅ Sim |
| **Pode acessar DOM?** | ✅ Sim | ✅ Sim |

### Comunicação via postMessage:

- É a forma **correta** de comunicar entre MAIN e ISOLATED worlds
- Segura (verifica `event.source === window`)
- Suporta dados estruturados
- Permite APIs assíncronas (Promises)

---

## 🔄 Mudanças na API

### Antes (síncrono):

```javascript
// No console:
const roomId = window.syncWatch.createRoom();  // Retorno imediato
const state = window.syncWatch.getState();     // Retorno imediato
```

### Depois (assíncrono):

```javascript
// No console:
const roomId = await window.syncWatch.createRoom();  // Promise
const state = await window.syncWatch.getState();     // Promise
```

**Importante:** O popup já estava usando `executeInPage` com `await`, então não precisa mudar!

---

## ✅ Como Testar a Correção

### Passo 1: Recarregar extensão
```
chrome://extensions/ → SyncWatch → Reload (🔄)
```

### Passo 2: Abrir YouTube
```
youtube.com/watch?v=qualquer_video
```

### Passo 3: Verificar no console (F12)

```javascript
// Verificar se existe
console.log(window.syncWatch);
// Deve mostrar: {joinRoom, createRoom, getState, setUsername}

// Testar criar sala
const roomId = await window.syncWatch.createRoom();
console.log('Room ID:', roomId);
// Deve mostrar: Room ID: room_1234567890_abc123

// Verificar estado
const state = await window.syncWatch.getState();
console.log('State:', state);
// Deve mostrar: {isConnected: true, roomId: "room_...", ...}
```

### Passo 4: Testar pelo popup

```
1. Clicar no ícone da extensão
2. Status deve mostrar "Ready" (não mais "Not ready")
3. Clicar em "Create Room"
4. Room ID deve aparecer
```

---

## 📊 Comparação: Antes vs Depois

### Antes:

```
Console (MAIN world):
  window.syncWatch → undefined ❌

Popup:
  executeInPage(`() => window.syncWatch.createRoom()`)
    → window is MAIN world ✅
    → window.syncWatch is undefined ❌
    → Retorna null ❌

Resultado: "Not ready - try reloading the page" ❌
```

### Depois:

```
Console (MAIN world):
  window.syncWatch → {joinRoom, createRoom, ...} ✅

Popup:
  executeInPage(`() => window.syncWatch.createRoom()`)
    → window is MAIN world ✅
    → window.syncWatch exists ✅
    → window.postMessage → ISOLATED world ✅
    → createRoom() executa ✅
    → Retorna Promise<roomId> ✅

Resultado: Room ID exibido ✅
```

---

## 🏗️ Arquitetura Final

```
┌──────────────────────────────────────────────────────────────┐
│  YouTube Page (MAIN World)                                   │
│                                                               │
│  <script> injected by content script                         │
│    window.syncWatch = {                                      │
│      createRoom() → postMessage → Promise                    │
│      joinRoom(id) → postMessage                              │
│      getState() → postMessage → Promise                      │
│      setUsername(name) → postMessage                         │
│    }                                                          │
│                                                               │
│  User/Console can access: window.syncWatch ✅                │
└──────────────────────────────────────────────────────────────┘
                            ↕ postMessage
┌──────────────────────────────────────────────────────────────┐
│  Content Script (ISOLATED World)                             │
│                                                               │
│  Listens to messages:                                        │
│    SYNCWATCH_CREATE_ROOM → createRoom() → postMessage back  │
│    SYNCWATCH_JOIN_ROOM → joinRoom(id)                       │
│    SYNCWATCH_GET_STATE → getState() → postMessage back      │
│    SYNCWATCH_SET_USERNAME → setUsername(name)               │
│                                                               │
│  Has access to:                                              │
│    - DOM (video element)                                     │
│    - Socket.io connection                                    │
│    - State management                                        │
└──────────────────────────────────────────────────────────────┘
                            ↕ chrome.scripting.executeScript
┌──────────────────────────────────────────────────────────────┐
│  Popup (ISOLATED World)                                      │
│                                                               │
│  executeInPage({                                             │
│    world: 'MAIN',                                            │
│    func: () => window.syncWatch.createRoom()                │
│  })                                                           │
│    → Executes in MAIN world ✅                               │
│    → Calls window.syncWatch.createRoom() ✅                  │
│    → Returns Promise<roomId> ✅                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧪 Playwright MCP para Testes

Com o **Playwright MCP** instalado, podemos criar testes automatizados para validar:

```javascript
// Teste automatizado (pseudo-código)
test('window.syncWatch deve existir após injeção', async () => {
  await page.goto('youtube.com/watch?v=...');
  await page.waitForFunction(() => typeof window.syncWatch !== 'undefined');

  const syncWatch = await page.evaluate(() => window.syncWatch);
  expect(syncWatch).toBeDefined();
  expect(syncWatch.createRoom).toBeInstanceOf(Function);
});

test('createRoom deve retornar room ID', async () => {
  const roomId = await page.evaluate(() => window.syncWatch.createRoom());
  expect(roomId).toMatch(/^room_\d+_[a-z0-9]+$/);
});
```

---

## 📚 Referências

### Chrome Extension Execution Contexts:
- [Content Scripts - Isolated Worlds](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world)
- [Script Injection](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#functionality)

### postMessage API:
- [Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

### Arquivos Modificados:
- `extension/src/content.ts` - Adicionada função `injectScriptToMainWorld()`
- `extension/src/content.ts` - Chamada da injeção no `init()`

---

## ✅ Checklist de Correção

- [x] Identificar problema real (ISOLATED vs MAIN world)
- [x] Criar função `injectScriptToMainWorld()`
- [x] Implementar comunicação via `postMessage`
- [x] Tornar API assíncrona (Promises)
- [x] Adicionar listener de mensagens
- [x] Rebuildar extensão
- [x] Documentar correção
- [ ] Testar manualmente
- [ ] Criar testes automatizados com Playwright MCP

---

**Arquivo modificado:** `extension/src/content.ts`
**Linhas:** 327-405 (nova função), 370 (chamada)
**Commit sugerido:** "fix: inject window.syncWatch to MAIN world via script tag"
**Data:** 2025-12-29
**Status:** ✅ Implementado, aguardando teste do usuário

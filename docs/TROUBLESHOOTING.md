# Troubleshooting - SyncWatch

## Problema: Botão "Create Room" não funciona

### Sintomas
- Ao clicar no botão "Create Room" nada acontece
- Não é possível ver o ID da sala criada
- Erro no DevTools: `Uncaught TypeError: Cannot read properties of undefined (reading 'createRoom')`

---

## Análise dos Problemas

### 1. **Erro no console do DevTools**

**Causa:**
O erro `"Cannot read properties of undefined (reading 'createRoom')"` acontece porque:
- O objeto `window.syncWatch` **só existe na página do YouTube**, não no popup ou em outras páginas
- O README instrui usar `window.syncWatch.createRoom()` no console, mas isso **só funciona se você abrir o DevTools na aba do YouTube** (não no popup)
- Se você tentar executar o comando no console do DevTools do popup, esse objeto não existe nesse contexto

**Localização no código:**
- `content.ts:345-358` - o objeto `window.syncWatch` é criado apenas no contexto da página do YouTube

---

### 2. **Botão "Create Room" não funciona**

**Causa:**
O popup tenta executar código no contexto da página do YouTube através da função `executeInPage()` (`popup.ts:112`), mas isso depende de várias condições:

**Condições necessárias (todas devem ser verdadeiras):**
- ✓ Você deve estar em uma **página do YouTube com vídeo** (youtube.com/watch)
- ✓ O **content script deve ter sido carregado**
- ✓ O **elemento de vídeo deve ter sido encontrado** (o script procura por até 30s em intervalos de 500ms - veja `content.ts:331-362`)
- ✓ O objeto `window.syncWatch` deve ter sido criado

**Se qualquer condição falhar:**
- O `executeInPage()` retorna `null` silenciosamente
- O código não chama `refreshState()` (veja `popup.ts:113-115`)
- **Nenhum feedback é mostrado ao usuário** ⚠️

---

### 3. **Problemas de timing**

**Causa:**
- Se você abrir o popup **muito rápido** após carregar uma página do YouTube, o vídeo pode ainda não ter sido encontrado
- O content script leva até alguns segundos para encontrar o elemento de vídeo e criar o `window.syncWatch`
- Durante esse período, clicar em "Create Room" falhará silenciosamente

**Localização no código:**
- `content.ts:331-362` - intervalo de 500ms verificando se o vídeo existe, com timeout de 30s

---

### 4. **Falta de feedback visual**

**Problemas identificados:**
O código atual não tem:
- ❌ Indicação de loading/aguardando
- ❌ Mensagens de erro quando algo falha
- ❌ Validação se está em uma página do YouTube
- ❌ Verificação se o content script está pronto

---

## Como diagnosticar

### 1. Verificar se está em uma página do YouTube com vídeo
- Você deve estar em uma URL como: `youtube.com/watch?v=...`
- Não funciona em: página inicial do YouTube, playlists, canal, etc.

### 2. Verificar se o content script está carregado
Abra o DevTools **na aba do YouTube** (não no popup) e execute:
```js
console.log(window.syncWatch)
```

**Resultados possíveis:**
- **`undefined`** → O content script não terminou de carregar ou não encontrou o vídeo
- **Objeto `{joinRoom, createRoom, getState, setUsername}`** → O script está funcionando corretamente

### 3. Verificar mensagens no console
No console da aba do YouTube, procure por mensagens como:
```
[SyncWatch] Initializing...
[SyncWatch] Video element found
[SyncWatch] Ready! Use window.syncWatch.createRoom()...
```

Se essas mensagens não aparecerem, o content script não foi carregado ou não encontrou o vídeo.

---

## Soluções Aplicadas

### 1. Feedback visual no popup
- Adicionada mensagem de carregamento enquanto aguarda o content script
- Adicionadas mensagens de erro quando algo falha
- Validação se está em uma página do YouTube
- Desabilita botões quando não está pronto

### 2. Verificação de estado
- O popup agora verifica se `window.syncWatch` existe antes de tentar usar
- Mostra mensagens claras sobre o que fazer se não estiver funcionando

### 3. Melhor tratamento de erros
- Captura erros e mostra mensagens amigáveis ao usuário
- Logs detalhados no console para debug

### 4. Indicadores de status
- Status visual mostra se está "Ready", "Loading", "Not on YouTube", etc.
- Feedback imediato quando uma ação é realizada

---

## Uso Correto

### Para usar o popup (RECOMENDADO):
1. Abra uma página do YouTube com vídeo: `youtube.com/watch?v=...`
2. Aguarde o vídeo carregar completamente
3. Clique no ícone da extensão SyncWatch
4. Aguarde o status mudar para "Ready"
5. Clique em "Create Room" ou "Join Room"

### Para usar o console (ALTERNATIVO):
1. Abra uma página do YouTube com vídeo
2. Abra o DevTools **na aba do YouTube** (F12)
3. No console, execute:
   ```js
   // Criar sala
   window.syncWatch.createRoom()

   // Entrar em sala
   window.syncWatch.joinRoom("room_id_aqui")

   // Ver estado
   window.syncWatch.getState()
   ```

---

## Notas Técnicas

### Arquitetura da extensão
- **Content Script** (`content.ts`): Roda no contexto da página do YouTube, tem acesso ao DOM e ao elemento de vídeo
- **Popup** (`popup.ts`): Roda em um contexto isolado, precisa se comunicar com o content script via `chrome.scripting.executeScript`
- **Background Worker** (`background.ts`): Service worker que roda em segundo plano

### Comunicação entre contextos
- O popup não tem acesso direto ao `window.syncWatch`
- Usa `chrome.scripting.executeScript` para executar código no contexto da página
- Essa comunicação pode falhar se o content script não estiver pronto

---

Data da análise: 2025-12-29

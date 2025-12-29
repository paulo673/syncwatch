# Índice da Documentação - SyncWatch

Guia completo de toda a documentação do projeto SyncWatch.

---

## 📚 Documentação Principal

### 1. **README.md**
**Descrição:** Documentação principal do projeto
- Tech stack
- Estrutura do projeto
- Instalação e setup
- Como usar a extensão
- Scripts disponíveis

**Quando usar:** Primeira leitura, setup inicial do projeto

---

### 2. **TROUBLESHOOTING.md**
**Descrição:** Análise detalhada dos problemas encontrados e soluções aplicadas
- Sintomas do problema "Create Room não funciona"
- Análise técnica das causas
- 4 problemas principais identificados
- Como diagnosticar problemas
- Soluções implementadas
- Uso correto da extensão

**Quando usar:** Quando algo não está funcionando, para entender os problemas comuns

---

### 3. **DEV_WORKFLOW.md**
**Descrição:** Workflow completo de desenvolvimento e debugging
- Chrome DevTools MCP - o que é e como usar
- Sistema de logging integrado
- Workflow de desenvolvimento recomendado
- Checklist de debugging (8 passos)
- Comandos úteis
- Estrutura de logs
- Troubleshooting comum

**Quando usar:** Durante desenvolvimento, para seguir as melhores práticas

---

### 4. **DEBUG_NOW.md**
**Descrição:** Guia passo a passo para debugar problemas AGORA
- Ferramentas disponíveis
- 8 passos práticos para debug
- Comandos específicos para cada passo
- Como usar Chrome DevTools MCP
- Como exportar logs
- Estrutura de debugging
- Logs esperados (sucesso vs erro)

**Quando usar:** Quando encontrar um problema e precisar debugar imediatamente

---

### 5. **SETUP_DEBUGGING_TOOLS.md** ⭐
**Descrição:** Documentação técnica completa de como foram criadas todas as ferramentas
- Como foi instalado o Chrome DevTools MCP
- Como foi criado o sistema de logging
- Integração no content script
- Integração no popup
- Visualizador de logs
- Arquitetura completa
- Checklist de implementação
- Comandos úteis de resumo

**Quando usar:** Para entender como tudo foi implementado, replicar em outros projetos

---

### 6. **BUG_FIX_CREATE_ROOM.md** 🐛
**Descrição:** Correção detalhada do bug "Create Room não funciona"
- Problema identificado (ISOLATED vs MAIN world)
- Diagnóstico passo a passo
- Código antes e depois
- Explicação técnica dos Execution Worlds
- Como testar a correção
- Playwright MCP instalado para testes automatizados
- Lições aprendidas

**Quando usar:** Para entender a correção aplicada, aprender sobre execution contexts

---

## 🗂️ Organização por Caso de Uso

### Estou começando no projeto
1. Ler **README.md** primeiro
2. Seguir instruções de instalação
3. Se algo não funcionar, consultar **TROUBLESHOOTING.md**

### Estou desenvolvendo
1. Seguir **DEV_WORKFLOW.md** para workflow recomendado
2. Usar **DEBUG_NOW.md** quando encontrar problemas
3. Consultar **SETUP_DEBUGGING_TOOLS.md** para entender ferramentas

### Encontrei um bug
1. Seguir **DEBUG_NOW.md** imediatamente
2. Usar Chrome DevTools MCP para capturar logs
3. Consultar **TROUBLESHOOTING.md** para problemas conhecidos
4. Ver **DEV_WORKFLOW.md** seção "Troubleshooting Comum"

### Quero implementar ferramentas similares em outro projeto
1. Ler **SETUP_DEBUGGING_TOOLS.md** completamente
2. Seguir checklist de implementação
3. Adaptar código do `utils/logger.ts`

---

## 📋 Resumo de Cada Arquivo

| Arquivo | Propósito | Público-alvo | Tamanho |
|---------|-----------|--------------|---------|
| `README.md` | Documentação geral do projeto | Todos | Médio |
| `TROUBLESHOOTING.md` | Análise de problemas específicos | Usuários com problemas | Médio |
| `DEV_WORKFLOW.md` | Workflow de desenvolvimento | Desenvolvedores | Grande |
| `DEBUG_NOW.md` | Guia prático de debugging | Desenvolvedores com bugs | Médio |
| `SETUP_DEBUGGING_TOOLS.md` | Documentação técnica detalhada | Desenvolvedores avançados | Muito Grande |

---

## 🔍 Busca Rápida por Tópico

### Chrome DevTools MCP
- **O que é:** SETUP_DEBUGGING_TOOLS.md → Seção 1
- **Como instalar:** SETUP_DEBUGGING_TOOLS.md → Seção 1.3
- **Como usar:** DEV_WORKFLOW.md → Seção 1
- **Capacidades:** SETUP_DEBUGGING_TOOLS.md → Seção 1.5
- **Comandos:** DEBUG_NOW.md → Passo 5

### Sistema de Logging
- **Arquitetura:** SETUP_DEBUGGING_TOOLS.md → Seção 2
- **Como usar:** DEV_WORKFLOW.md → Seção 2
- **Comandos console:** SETUP_DEBUGGING_TOOLS.md → Seção 6.2
- **Via popup:** SETUP_DEBUGGING_TOOLS.md → Seção 5

### Problemas Comuns
- **Create Room não funciona:** TROUBLESHOOTING.md → Seção 2
- **window.syncWatch undefined:** TROUBLESHOOTING.md → Seção 1
- **Popup mostra Loading:** DEV_WORKFLOW.md → Seção 8
- **MCP não conecta:** SETUP_DEBUGGING_TOOLS.md → Seção 7.1

### Comandos
- **Instalação:** README.md → Instalação
- **Development:** README.md → Scripts
- **Chrome debugging:** DEV_WORKFLOW.md → Seção 3
- **Ver logs:** DEBUG_NOW.md → Passo 4

---

## 🛠️ Ferramentas Implementadas

### 1. Chrome DevTools MCP
```bash
# Instalado via:
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest

# Requer Chrome com:
google-chrome --remote-debugging-port=9222
```

**Arquivo de configuração:** `~/.claude.json`

**Capacidades:** 26 ferramentas em 6 categorias

**Documentação:** SETUP_DEBUGGING_TOOLS.md → Seção 1

---

### 2. Sistema de Logging

**Arquivo principal:** `extension/src/utils/logger.ts`

**Recursos:**
- 4 níveis de log (DEBUG, INFO, WARN, ERROR)
- Salvamento persistente em `chrome.storage.local`
- Captura automática de erros globais
- Exportação para JSON
- Filtros avançados
- Download de logs

**Como usar:**
```typescript
import { logger } from "./utils/logger";
logger.info("Context", "Message", { data });
```

**Console:**
```javascript
window.syncWatchLogger.getLogs({ limit: 20 })
```

**Popup:** Botão "View Logs"

**Documentação:** SETUP_DEBUGGING_TOOLS.md → Seção 2

---

### 3. Visualizador de Logs

**Localização:** Botão no popup da extensão

**Funcionalidades:**
- Exibe últimos 50 logs
- Abre em nova aba
- Download como JSON
- Formatação legível

**Documentação:** SETUP_DEBUGGING_TOOLS.md → Seção 5

---

## 🎯 Fluxo de Leitura Recomendado

### Para desenvolvedores novos:
```
README.md
    ↓
DEV_WORKFLOW.md (Seções 1-3)
    ↓
DEBUG_NOW.md (ler por alto)
    ↓
Começar a desenvolver
    ↓
Se tiver problema: DEBUG_NOW.md + TROUBLESHOOTING.md
```

### Para desenvolvedores experientes:
```
README.md (rápido)
    ↓
SETUP_DEBUGGING_TOOLS.md (para entender arquitetura)
    ↓
DEV_WORKFLOW.md (consulta rápida)
    ↓
Desenvolver
```

### Para resolver bugs:
```
DEBUG_NOW.md (seguir passo a passo)
    ↓
TROUBLESHOOTING.md (ver se é problema conhecido)
    ↓
DEV_WORKFLOW.md Seção 8 (troubleshooting comum)
    ↓
Se necessário: SETUP_DEBUGGING_TOOLS.md Seção 7
```

---

## 📊 Mapa Mental da Documentação

```
SyncWatch Documentation
│
├── 📖 README.md (Start Here)
│   ├── What is it?
│   ├── How to install?
│   └── How to use?
│
├── 🔧 DEV_WORKFLOW.md (Daily Development)
│   ├── Setup environment
│   ├── Development commands
│   ├── Debugging checklist
│   └── Common issues
│
├── 🐛 TROUBLESHOOTING.md (Problems)
│   ├── Known issues
│   ├── Root cause analysis
│   └── Solutions applied
│
├── 🚨 DEBUG_NOW.md (Emergency)
│   ├── Step-by-step debugging
│   ├── Quick commands
│   └── Export logs
│
├── 🏗️ SETUP_DEBUGGING_TOOLS.md (Architecture)
│   ├── How MCP was installed
│   ├── How logger was built
│   ├── Integration details
│   └── Technical reference
│
└── 📑 DOCS_INDEX.md (This file)
    ├── Navigation guide
    ├── Quick search
    └── Reading flows
```

---

## 🔗 Links Externos Úteis

### Chrome DevTools MCP
- [Blog oficial do Chrome](https://developer.chrome.com/blog/chrome-devtools-mcp)
- [GitHub oficial](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Guia completo](https://vladimirsiedykh.com/blog/chrome-devtools-mcp-ai-browser-debugging-complete-guide-2025)

### Chrome Extensions
- [Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### Socket.io
- [Documentação oficial](https://socket.io/docs/v4/)
- [Client API](https://socket.io/docs/v4/client-api/)

---

## 💡 Dicas de Navegação

### Procurando por código?
- Logger: `extension/src/utils/logger.ts`
- Content script: `extension/src/content.ts`
- Popup: `extension/src/popup/popup.ts`
- Background: `extension/src/background.ts`

### Procurando por comandos?
- Development: README.md → "Scripts Disponíveis"
- Debugging: DEBUG_NOW.md → "PASSO A PASSO"
- Console: SETUP_DEBUGGING_TOOLS.md → Seção 6.2

### Procurando por arquitetura?
- Geral: README.md → "Estrutura do Projeto"
- Logging: SETUP_DEBUGGING_TOOLS.md → Seção 8
- Debugging: DEV_WORKFLOW.md → fim do documento

### Procurando por troubleshooting?
- Problemas gerais: TROUBLESHOOTING.md
- Problemas de MCP: SETUP_DEBUGGING_TOOLS.md → Seção 7.1
- Problemas de logging: SETUP_DEBUGGING_TOOLS.md → Seções 7.2-7.4
- Problemas comuns: DEV_WORKFLOW.md → Seção 8

---

## 📝 Atualizações da Documentação

**Última atualização:** 2025-12-29

**Arquivos criados nesta sessão:**
- ✅ TROUBLESHOOTING.md
- ✅ DEV_WORKFLOW.md
- ✅ DEBUG_NOW.md
- ✅ SETUP_DEBUGGING_TOOLS.md
- ✅ DOCS_INDEX.md (este arquivo)

**Próximas melhorias sugeridas:**
- [ ] Adicionar diagramas visuais
- [ ] Criar guia de contribuição (CONTRIBUTING.md)
- [ ] Documentar API do servidor Socket.io
- [ ] Adicionar exemplos de uso avançado

---

**Criado por:** Claude Code (Sonnet 4.5)
**Data:** 2025-12-29
**Projeto:** SyncWatch
**Versão da documentação:** 1.0

# Role
Atue como um Engenheiro de Software Sênior Especialista em Extensões de Navegador e Sistemas em Tempo Real.

# Project Context
Estamos iniciando o desenvolvimento do "SyncWatch", uma extensão de navegador para assistir vídeos em sincronia (estilo Teleparty). O cenário de uso envolve alta latência (usuários na Irlanda e Brasil) e necessidade de contornar geoblocking via VPN.

# Tech Stack & Constraints
1.  **Frontend (Extension):** React, TypeScript, Vite.
2.  **Manifest Version:** OBRIGATORIAMENTE Manifest V3 (service workers em vez de background pages).
3.  **Backend (Signaling Server):** Node.js com Socket.io.
4.  **Target Platform Inicial:** YouTube (devido à facilidade de acesso ao DOM/HTML5 Video API).

# Objective
Sua tarefa é gerar o "Scaffolding" (estrutura inicial) do projeto e a lógica "Core" de sincronização. Não quero apenas o "Hello World", quero a arquitetura funcional para o MVP.

# Requirements

## 1. Project Structure (Monorepo)
Crie uma estrutura de diretórios clara separando `server` (backend) e `extension` (client).

## 2. Backend (Server)
Escreva o código básico do servidor `server/index.ts` que:
* Inicie um servidor Socket.io.
* Gerencie o conceito de "Rooms" (Salas).
* Tenha handlers para os eventos: `join_room`, `play`, `pause`, `seek`, `buffering_start`, `buffering_end`.

## 3. Frontend (Extension)
* **Manifest.json:** Gere o arquivo configurado corretamente para V3, com permissões para `activeTab` e `scripting`.
* **Content Script:** Crie um script `content.ts` que será injetado na página do YouTube. Ele deve:
    * Encontrar o elemento `<video>`.
    * Adicionar "EventListeners" nativos do HTML5 (`play`, `pause`, `seeking`, `waiting`).
    * Conectar ao Socket.io do servidor.

## 4. The Sync Logic (Critical)
Esta é a parte mais importante. Implemente a lógica de sincronização no `content.ts` considerando alta latência.
* **Debounce:** Evite loops de eventos (ex: se eu recebo um comando de `pause` do socket, meu player pausa, mas isso NÃO deve disparar um novo evento de `pause` de volta para o socket).
* **Buffering Handling:** Se o evento `waiting` (buffer) for disparado no player local, envie um evento `buffering_start` para o servidor. Se receber `buffering_start` do servidor, pause o vídeo localmente e mostre um `console.log("Aguardando parceiro...")`.
* **Tolerance:** Ao dar play, verifique a diferença de tempo (`currentTime`). Se a diferença for > 1 segundo, faça um `seek` antes de dar play.

# Output Expected
Forneça os códigos dos arquivos principais:
1.  `package.json` (raiz)
2.  `server/index.ts`
3.  `extension/manifest.json`
4.  `extension/src/content.ts` (Lógica pesada aqui)
5.  `extension/src/background.ts`

Explique brevemente como rodar o ambiente de desenvolvimento.
# Resumo Técnico: NCD by Jair Lima

## Visão Geral
NCD (New Change Directory) é um utilitário CLI multiplataforma (Windows, Linux, macOS) para navegação visual de diretórios no terminal. Inspirado no clássico Norton Change Directory, o projeto permite navegar, buscar, favoritar e mudar de diretório com integração nativa aos shells.

## Stack Tecnológico
- **Ambiente:** Node.js
- **Linguagem:** TypeScript
- **Interface TUI:** `blessed`
- **CLI:** `commander`
- **Distribuição:** Publicado no npm como `ncd-by-jair-lima`

## Arquitetura e Estrutura
O projeto é modularizado dentro do diretório `src/`:
- **`core/`**: Regras de negócio, indexação (`index-manager.ts`), busca (`search.ts`), histórico (`history.ts`), favoritos (`bookmarks.ts`), e utilitários de sistema de arquivos.
- **`ui/`**: Interface visual principal (`app.ts`).
- **`shell-integration.ts` & `setup.ts`**: Lógica de integração com Bash, PowerShell e CMD para alterar o diretório do processo pai.

### Fluxo de Funcionamento
1. A ferramenta carrega e mantém um índice JSON de diretórios (`~/.ncd_index.json`).
2. A busca usa múltiplos critérios de ranqueamento (exato, prefixo, tokens, substring).
3. Ao selecionar um diretório, o caminho é gravado em `~/.ncd_last`.
4. Wrappers instalados no shell (via `ncd setup`) leem esse arquivo temporário e executam o `cd` real no terminal do usuário.

## Estado Atual e Desafios (Atualizado em Março de 2026)
- **Funcionalidades Ativas:** Navegação com atalhos de teclado, busca ranqueada, integração funcional com múltiplos shells (correção recente no wrapper CMD em 18/03/2026), e indexação/varredura assíncrona para evitar travamentos.
- **Limitações Conhecidas:** A busca ainda não possui algoritmo *fuzzy* verdadeiro (correção de erros de digitação). A indexação completa (F5) ou a varredura física profunda em discos muito grandes ainda podem gerar custos de processamento.
- **Cobertura de Testes:** Testes básicos de regressão e regras de exclusão estão implementados em `tests/run.ts`, mas testes de persistência de dados e integração de shell podem ser expandidos.

## Observações para Continuidade (IA/Dev)
- Qualquer alteração na estrutura de arquivos ignorados deve ser ajustada em `src/core/directory-rules.ts`.
- Garantir que as atualizações na TUI mantenham a compatibilidade com hosts limitados (ex: ISE falha de forma graciosa).
- Preservar o sufixo "by Jair Lima" em todos os contextos de projeto e publicações.
- Sempre manter os arquivos temporários de estado do usuário documentados e limpos pós-uso.

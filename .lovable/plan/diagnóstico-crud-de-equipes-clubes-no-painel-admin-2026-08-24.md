# Diagnóstico: CRUD de Equipes (Clubes) no Painel Admin

## 1. Qual é o problema

Os botões **"+ Nova equipe"** e **"Editar"** funcionam tecnicamente (mudam o estado interno da tela), mas **o formulário aparece no final da página**, abaixo da lista completa dos 14 clubes. Como a lista é longa e cada clube ocupa uma linha com vários botões, o formulário abre fora da área visível e o usuário tem a impressão de que "nada aconteceu" ao clicar.

Não há erro de banco, de permissão nem de autenticação:

- A tabela `teams` existe, sem duplicidade, e está ligada às temporadas por `season_teams`.
- As permissões de acesso da API estão concedidas (anon/authenticated/service_role).
- As regras de segurança (RLS) estão corretas: leitura pública, escrita total para administradores (`has_role(uid,'admin')`), atualização para o gestor do próprio clube.
- O registro no log de auditoria usa função segura do servidor, sem bloqueio.
- Não há erros no console do navegador.

Existem ainda dois problemas secundários de usabilidade que reforçam a sensação de falha:

- Nenhum feedback visual ao clicar (a tela não rola até o formulário, não há destaque nem modal).
- Nenhuma indicação de "salvando" no botão Salvar, e erros do banco só aparecem como toast discreto.

## 2. Onde está o problema

Exclusivamente no frontend, no componente da seção de clubes do painel administrativo — a renderização condicional do formulário está posicionada depois da lista, sem foco, sem rolagem automática e sem diálogo.

## 3. Arquivos que precisam ser alterados

- `src/components/admin/teams.tsx` (único arquivo essencial)
- Nenhum outro arquivo é necessário. Nada de atletas, partidas, temporadas ou outras seções será tocado.

## 4. Tabelas / policies que precisam ser corrigidas

**Nenhuma.** Banco, chaves estrangeiras, permissões e policies foram verificados e estão corretos. Nenhuma migração será criada.

## 5. Como será feita a correção

1. Transformar o formulário de criação/edição em um **diálogo (modal)** que abre por cima da tela ao clicar em "+ Nova equipe" ou "Editar" — solução que elimina de vez o problema de posição.
2. Preencher o modal com os dados do clube ao editar e limpar ao criar; título dinâmico ("Nova equipe" / "Editar equipe").
3. Adicionar estado de carregamento no botão Salvar e mensagem de erro visível dentro do modal quando o banco recusar a operação.
4. Validação mínima: nome obrigatório; sigla gerada automaticamente quando vazia (comportamento já existente, mantido).
5. Fechar o modal e atualizar a lista automaticamente após salvar.

Nenhuma mudança em regras de negócio, permissões ou dados.

## 6. Como será testado

- Abrir `/admin` → aba **Clubes** como administrador.
- Clicar em "+ Nova equipe": o modal deve abrir imediatamente, visível.
- Criar um clube de teste e conferir se aparece na lista e persiste no banco.
- Clicar em "Editar" num clube existente, alterar cidade/cores, salvar e confirmar a alteração na lista e no banco.
- Conferir o registro das ações no log de auditoria.
- Verificar que "Adicionar/Remover da temporada", "Suspender" e "Excluir" continuam funcionando.
- Testar em largura de celular (~700px) para garantir que o modal é utilizável.
- Excluir o clube de teste ao final.

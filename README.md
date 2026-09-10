# Liga Legendária

Crie uma plataforma web completa, moderna, responsiva e profissional chamada LIGA REGIONAL, destinada à gestão de uma competição regional de futebol/futsal em formato de pontos corridos.

A plataforma deve funcionar como um sistema completo de campeonato, com área pública, área dos clubes, área dos atletas e painel administrativo da organização.

IMPORTANTE: não criar apenas uma landing page. Criar uma aplicação funcional, preparada para banco de dados, autenticação, cadastro, edição, consulta, classificação, estatísticas, gerenciamento de partidas e ranking histórico.

Utilize uma arquitetura moderna, segura, escalável e organizada.

1. CONCEITO DA PLATAFORMA

A Liga Regional será uma competição em formato de pontos corridos, com:

aproximadamente 12 a 14 equipes;

turno e returno;

todos contra todos;

mando de campo alternado;

jogos organizados pelos próprios clubes;

arbitragem oficial da competição;

classificação automática;

cadastro oficial de atletas;

janela de transferências;

estatísticas;

artilharia;

ranking histórico de clubes;

ranking histórico de atletas;

temporadas independentes, mas conectadas pelo histórico da Liga.

O conceito principal é:

"Os clubes organizam seus jogos. A Liga organiza a competição."

2. IDENTIDADE VISUAL

Criar uma identidade visual esportiva, moderna e profissional.

Referência estética:

grandes ligas esportivas;

plataformas modernas de futebol;

ESPN;

Sofascore;

OneFootball;

FIFA;

competições nacionais.

Não copiar nenhuma identidade visual existente.

Criar identidade própria.

Priorizar:

fundo escuro;

alto contraste;

tipografia forte;

elementos esportivos;

cards;

tabelas;

estatísticas;

números grandes;

microanimações;

sensação de velocidade e competição.

A interface deve funcionar muito bem em:

celular;

tablet;

desktop.

O mobile deve ser tratado como prioridade.

3. ESTRUTURA PRINCIPAL

Criar as seguintes áreas:

ÁREA PÚBLICA

Home

Campeonato

Classificação

Jogos

Resultados

Clubes

Atletas

Artilharia

Estatísticas

Ranking Histórico

Notícias

Regulamento

Sobre a Liga

Contato

4. HOME PAGE

Criar uma página inicial impactante.

Hero principal:

LIGA REGIONAL

Subtítulo:

Mais que um campeonato. Uma competição que constrói história.

Exibir:

temporada atual;

quantidade de clubes;

próxima rodada;

próximos jogos;

último resultado;

classificação resumida;

artilheiro;

ranking dos clubes.

Adicionar CTA:

VER CAMPEONATO

CONHEÇA A LIGA

5. TEMPORADAS

O sistema deve trabalhar com temporadas.

Exemplo:

Liga Regional 2026

Liga Regional 2027

Liga Regional 2028

Cada temporada deve possuir:

nome;

ano;

data inicial;

data final;

status;

clubes participantes;

regulamento;

tabela;

jogos;

classificação;

estatísticas;

campeão.

Status:

Planejamento

Inscrições abertas

Em andamento

Encerrada

A temporada deve ser selecionável na plataforma.

6. SISTEMA DE USUÁRIOS E PERMISSÕES

Criar autenticação.

Tipos de usuário:

ADMINISTRADOR DA LIGA

Acesso total.

Pode:

criar temporada;

cadastrar clubes;

aprovar clubes;

cadastrar atletas;

aprovar atletas;

criar tabela;

editar partidas;

homologar resultados;

controlar transferências;

controlar punições;

gerenciar rankings;

gerenciar notícias;

alterar regulamento;

gerenciar usuários.

GESTOR DO CLUBE

Acesso apenas ao próprio clube.

Pode:

editar informações do clube;

cadastrar atletas;

enviar documentos;

solicitar inscrições;

solicitar transferências;

consultar jogos;

informar disponibilidade;

visualizar pendências;

acompanhar estatísticas.

ATLETA

Pode:

visualizar seu perfil;

consultar clube atual;

visualizar seus jogos;

visualizar gols;

consultar cartões;

consultar ranking;

visualizar histórico.

USUÁRIO PÚBLICO

Acesso somente às informações públicas.

7. CADASTRO DE CLUBES

Criar página:

CLUBES

Cada clube terá:

nome;

nome abreviado;

escudo;

cidade;

bairro/região;

cores;

ano de fundação;

responsável;

telefone;

e-mail;

redes sociais;

elenco;

comissão;

histórico na Liga.

Página pública do clube:

GLADIADORES

Exibir:

escudo;

posição atual;

pontos;

jogos;

vitórias;

empates;

derrotas;

gols marcados;

gols sofridos;

saldo;

aproveitamento;

próximos jogos;

últimos resultados;

elenco;

artilheiro;

histórico.

8. CADASTRO DE ATLETAS

Criar sistema completo de registro.

Campos:

nome completo;

nome esportivo;

foto;

data de nascimento;

posição;

número;

clube;

documento;

status de registro;

data de inscrição;

histórico de clubes;

gols;

jogos;

cartões;

transferências.

Status:

Pendente

Em análise

Aprovado

Suspenso

Inativo

O atleta só poderá aparecer como apto para jogar depois de aprovado pela Liga.

9. JANELA DE TRANSFERÊNCIAS

Criar módulo:

TRANSFERÊNCIAS

A administração poderá configurar:

data de abertura;

data de fechamento;

temporada;

regras.

Durante a janela:

O gestor do clube poderá:

solicitar contratação;

solicitar transferência;

liberar atleta;

substituir atleta.

Toda transferência deverá gerar um registro histórico.

Exemplo:

João Silva

2026 — Gladiadores
2027 — Sem Recurso

O histórico jamais deverá ser apagado.

10. NÃO EXISTE TETO TÉCNICO

IMPORTANTE:

A plataforma NÃO deverá criar limite de pontuação técnica dos jogadores.

Não haverá:

teto salarial;

limite de força;

limite de pontuação do elenco;

bloqueio de contratação baseado em nível técnico.

Cada clube terá liberdade para montar seu elenco.

A pontuação e estatísticas dos atletas serão utilizadas exclusivamente para:

rankings;

estatísticas;

histórico;

artilharia;

desempenho.

11. FORMATO DO CAMPEONATO

Criar gerador de tabela.

A administração poderá selecionar:

número de clubes;

turno e returno;

data inicial;

intervalo entre rodadas.

O sistema deverá gerar automaticamente os confrontos.

Para 14 clubes:

Cada equipe fará:

26 partidas

13 adversários × 2 confrontos.

O sistema deverá definir automaticamente o mandante de cada partida.

12. PARTIDAS

Criar módulo:

JOGOS

Cada partida deverá conter:

temporada;

rodada;

mandante;

visitante;

data;

horário;

local;

endereço;

status;

árbitro;

placar;

gols;

cartões;

observações;

súmula.

Status:

A definir

Agendada

Confirmada

Em andamento

Encerrada

Adiada

Cancelada

W.O.

13. ORGANIZAÇÃO DOS JOGOS

A Liga NÃO será responsável por reservar as quadras.

O sistema deverá permitir que os clubes organizem seus jogos.

O mandante poderá:

entrar no sistema;

visualizar a partida;

propor data;

informar horário;

informar local;

enviar para confirmação do adversário.

O visitante poderá:

CONFIRMAR

ou

SOLICITAR ALTERAÇÃO

Quando ambos concordarem:

A partida ficará:

CONFIRMADA

A Liga receberá a informação automaticamente.

14. RESPONSABILIDADE DO MANDANTE

Na página da partida, mostrar claramente:

RESPONSABILIDADE DO MANDANTE

quadra;

horário;

local;

solicitação de arbitragem;

comunicação com visitante.

15. ARBITRAGEM

Criar módulo:

ARBITRAGEM

A Liga terá uma parceria oficial de arbitragem.

Cadastrar:

árbitros;

função;

telefone;

disponibilidade;

status.

O mandante poderá solicitar arbitragem para sua partida.

O sistema deverá registrar:

partida;

equipe de arbitragem;

valor;

status do pagamento;

confirmação.

A arbitragem será exclusiva da competição.

16. RATEIO DA ARBITRAGEM

O custo da arbitragem será dividido entre mandante e visitante.

Exemplo:

Arbitragem: R$ 200

Mandante: R$ 100

Visitante: R$ 100

Criar registro financeiro da partida.

Não incluir esse valor na taxa de inscrição da Liga.

17. CLASSIFICAÇÃO

Criar tabela automática.

Colunas:

| Pos | Clube | P | J | V | E | D | GP | GC | SG | AP |

Onde:

P = Pontos
J = Jogos
V = Vitórias
E = Empates
D = Derrotas
GP = Gols Pró
GC = Gols Contra
SG = Saldo de Gols
AP = Aproveitamento

A tabela deverá ser atualizada automaticamente após homologação do resultado.

18. CRITÉRIOS DE DESEMPATE

Permitir que o administrador configure a ordem.

Sugestão inicial:

Pontos

Vitórias

Saldo de gols

Gols marcados

Confronto direto

Disciplina

Sorteio

Não deixar esses critérios fixos no código.

O administrador deve poder alterar a ordem.

19. REGISTRO DO RESULTADO

Após uma partida:

O administrador ou usuário autorizado poderá lançar:

placar;

gols;

atletas autores dos gols;

cartões;

observações.

Exemplo:

GLADIADORES 4 × 2 SEM RECURSO

Gols:

12' João
18' Carlos
27' João
35' Pedro

Após a homologação:

classificação atualiza;

artilharia atualiza;

estatísticas atualizam;

ranking atualiza.

20. ARTILHARIA

Criar página:

ARTILHARIA

Ranking por:

temporada;

clube;

atleta.

Mostrar:

PosJogadorClubeGols

Permitir visualizar:

ARTILHARIA DA TEMPORADA

e

ARTILHARIA HISTÓRICA

21. RANKING HISTÓRICO DE ATLETAS

Criar ranking acumulado.

Exemplo:

MAIORES ARTILHEIROS DA HISTÓRIA

João — 47 gols

Carlos — 42 gols

Pedro — 38 gols

Esse ranking deverá acumular todas as temporadas.

Não apagar dados antigos.

22. RANKING HISTÓRICO DE CLUBES

Criar sistema de pontuação histórica dos clubes.

O administrador poderá definir a pontuação de cada posição e/ou conquista.

Exemplo:

Campeão → X pontos

Vice → X pontos

3º lugar → X pontos

Demais posições → X pontos

A pontuação histórica deverá ser configurável.

Criar página:

RANKING HISTÓRICO

PosClubePontos

Também mostrar:

títulos;

vices;

participações;

jogos;

vitórias;

gols;

temporadas disputadas.

23. RECORDES

Criar módulo:

RECORDES DA LIGA

Registrar automaticamente:

maior número de gols em uma partida;

maior goleada;

maior sequência de vitórias;

maior sequência invicta;

melhor ataque;

melhor defesa;

maior artilheiro de uma temporada;

maior artilheiro histórico;

maior pontuação;

maior aproveitamento.

24. ESTATÍSTICAS

Criar dashboard estatístico.

Filtros:

temporada;

clube;

atleta.

Mostrar gráficos e indicadores.

Exemplos:

gols por rodada;

média de gols;

vitórias;

aproveitamento;

cartões;

artilharia.

25. NOTÍCIAS

Criar módulo de notícias.

Admin poderá criar:

título;

subtítulo;

imagem;

conteúdo;

data;

categoria.

Categorias:

Liga;

Clubes;

Jogos;

Mercado;

Destaques;

Resultados.

26. REGULAMENTO

Criar página pública para o regulamento.

Permitir:

upload de PDF;

versão;

data de atualização.

Mostrar:

REGULAMENTO OFICIAL — TEMPORADA 2026

27. FILIAÇÃO

Criar módulo financeiro para filiação.

Cada clube deverá ter:

status de filiação;

valor;

vencimento;

pagamento;

comprovante;

situação.

Status:

Pendente

Pago

Em atraso

Isento

28. TAXA DE INSCRIÇÃO

Criar módulo separado da filiação.

A taxa de inscrição da competição será destinada à premiação.

O sistema deverá calcular:

Número de equipes inscritas × valor da inscrição = premiação total

Exemplo:

14 equipes × R$ 1.000 = R$ 14.000

Mostrar no painel administrativo:

PREMIAÇÃO ACUMULADA

R$ 14.000

Importante:

Não misturar financeiramente:

FILIAÇÃO

com

INSCRIÇÃO

A estrutura deverá permitir relatórios separados.

29. PAINEL ADMINISTRATIVO

Criar dashboard completo.

Mostrar:

TEMPORADA ATUAL

Clubes: 14

Jogos realizados: 72

Jogos restantes: 292

Gols: 438

Artilheiro: João

Líder: Gladiadores

30. MENU ADMINISTRATIVO

Criar:

Dashboard

Temporadas

Clubes

Atletas

Transferências

Partidas

Rodadas

Arbitragem

Classificação

Estatísticas

Rankings

Recordes

Financeiro

Filiações

Inscrições

Premiação

Notícias

Regulamento

Usuários

Configurações

31. SISTEMA DE NOTIFICAÇÕES

Criar notificações internas para:

partida aguardando confirmação;

transferência pendente;

atleta aguardando aprovação;

jogo próximo;

arbitragem solicitada;

pagamento pendente;

documento pendente.

32. DESIGN DA TABELA

A tabela da competição deve ser extremamente clara.

No celular:

Mostrar:

POS | TIME | PTS

Ao clicar no clube:

abrir detalhes.

No desktop:

Mostrar todas as estatísticas.

33. PÁGINA DA PARTIDA

Criar uma página visualmente forte.

Exemplo:

GLADIADORES

4 — 2

SEM RECURSO

Rodada 7

📅 15/09/2026
⏰ 20:00
📍 Ginásio X

GOLS

João — 12', 27'

Pedro — 35'

Carlos — 18'

34. PÁGINA DO ATLETA

Exibir:

Foto

Nome

Clube

Posição

Número

TEMPORADA

Jogos: 8

Gols: 11

Cartões: 2

HISTÓRICO

2026 — Gladiadores — 11 gols

2027 — Sem Recurso — 14 gols

Total histórico:

25 gols

35. EXPERIÊNCIA MOBILE

A aplicação deve ser extremamente bem adaptada para celular.

Criar navegação inferior no mobile:

INÍCIO

JOGOS

TABELA

RANKING

MENU

Priorizar carregamento rápido.

36. BANCO DE DADOS

Criar estrutura relacional adequada.

Entidades principais:

users

roles

seasons

teams

team_managers

players

player_registrations

transfers

matches

match_events

goals

cards

referees

referee_assignments

standings

club_rankings

player_rankings

payments

registrations

affiliations

news

regulations

records

notifications

37. INTEGRIDADE DOS DADOS

IMPORTANTE:

O sistema nunca deverá apagar estatísticas históricas quando:

atleta mudar de clube;

temporada terminar;

clube deixar a Liga;

nova temporada começar.

Todos os dados devem possuir histórico.

38. AUDITORIA

Criar registro de alterações administrativas.

Registrar:

usuário;

ação;

data;

horário;

informação alterada.

Exemplo:

"Administrador alterou resultado da partida X"

Isso é importante para transparência.

39. SEGURANÇA

Implementar:

autenticação;

autorização por função;

proteção das rotas;

validação dos dados;

proteção de informações privadas;

regras de acesso por clube.

Um gestor do Gladiadores jamais poderá editar informações do Sem Recurso.

40. CONFIGURAÇÕES DA LIGA

Criar painel para o administrador configurar:

nome da Liga;

logo;

temporada;

número de equipes;

pontuação;

critérios de desempate;

regras de inscrição;

janela de transferências;

valores;

premiação;

contatos;

redes sociais.

Evitar valores fixos no código.

Tudo que puder ser configurado pela administração deverá ser configurável.

41. LANDING PAGE COMERCIAL

Além da plataforma esportiva, criar uma página institucional para apresentar a Liga a:

clubes;

patrocinadores;

parceiros;

imprensa;

público.

Seções:

O QUE É A LIGA

COMO FUNCIONA

CLUBES

FORMATO

TECNOLOGIA

RANKING

PREMIAÇÃO

PATROCÍNIO

FAÇA PARTE

42. ÁREA PARA PATROCINADORES

Criar espaço para parceiros.

Mostrar:

logo;

nome;

categoria;

link;

destaque.

Permitir diferentes níveis:

MASTER

OFICIAL

APOIADOR

43. PREPARAR PARA EVOLUÇÃO

A arquitetura deve permitir futuramente adicionar:

Liga Feminina;

categorias de base;

segunda divisão;

Copa Regional;

Supercopa;

transmissão ao vivo;

estatísticas avançadas;

aplicativo;

notificações push;

integração com redes sociais;

sistema de patrocinadores;

venda de ingressos;

marketplace esportivo.

Não desenvolver essas funções agora, mas deixar a arquitetura preparada para expansão.

44. PRINCÍPIO FUNDAMENTAL

A Liga Regional não deve ser apenas um site.

Deve ser uma:

PLATAFORMA DE COMPETIÇÃO ESPORTIVA.

O site público mostra a competição.

O painel administrativo controla a competição.

Os clubes administram seus elencos e jogos.

Os atletas constroem seu histórico.

E o sistema registra toda a história da Liga.

45. FRASE OFICIAL

Utilizar como conceito institucional:

LIGA REGIONAL

Mais que um campeonato.

Uma competição que constrói história.

46. ENTREGA ESPERADA

Entregue uma aplicação funcional e navegável.

Não criar somente telas estáticas.

Criar:

páginas;

navegação;

banco de dados;

autenticação;

CRUDs;

relacionamentos;

permissões;

cálculos automáticos;

classificação;

estatísticas;

rankings;

histórico.

Começar pela estrutura principal da aplicação e pelo banco de dados.

Depois desenvolver:

autenticação;

temporadas;

clubes;

atletas;

partidas;

classificação;

estatísticas;

transferências;

arbitragem;

financeiro;

rankings;

notícias;

painel administrativo;

área pública.

Priorize uma experiência visual premium e profissional.

A plataforma deve parecer um produto esportivo real, pronto para ser apresentado aos clubes e patrocinadores.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ligaregional.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c6ae50d8-a4e2-4c04-a192-ce57cfe0a298).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

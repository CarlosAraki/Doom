# Project TODO

## Autenticação e Banco de Dados
- [x] Configurar template tRPC + Manus Auth + Database
- [x] Corrigir configuração do Drizzle para PostgreSQL
- [x] Resolver problema de conexão TLS com Neon (Confirmado via script de teste)
- [x] Criar tabelas no banco de dados (users, localAuth, gameScores) (Confirmado via introspecção)
- [ ] Testar registro de usuário com email/senha
- [ ] Testar login com email/senha
- [ ] Testar OAuth callback (Google/GitHub)

## Interface de Login
- [x] Página de login com tema retro/terminal
- [x] Página de registro
- [x] Botões de login social (Google, GitHub)
- [ ] Validação de formulários
- [ ] Mensagens de erro/sucesso

## Jogo DOOM
- [ ] Implementar interface do jogo
- [ ] Implementar lógica de gameplay
- [ ] Sistema de scores
- [ ] Leaderboard

## Testes
- [ ] Testes unitários para autenticação
- [ ] Testes de integração com banco de dados
- [ ] Testes de API tRPC

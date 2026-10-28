# Área do aluno · Trader Positivo

Área do aluno do Trader Positivo, com banco próprio (Supabase), separada do TraderSystem.

- `index.html`: entrar, criar conta, esqueci a senha e o painel do aluno
- `admin.html`: alunos (plano e "acesso até", +30 dias) e conteúdo (links de indicadores, lives, aulas e sala)
- `repo.js`: acesso aos dados (Supabase, ou modo demonstração quando não há configuração)
- `config.js`: endereço do Supabase e links
- `../supabase/schema.sql`: tabelas e regras de segurança

## Como o acesso funciona

1. O admin cadastra o **e-mail da compra** com o plano e a data "acesso até".
2. O aluno cria a conta na Área do aluno com esse mesmo e-mail.
3. Enquanto a data não passar, o banco entrega os links do plano dele. Depois que passa, ele continua entrando, mas tudo aparece bloqueado com o botão "Renovar".

A proteção está no banco (regras RLS do `schema.sql`), não na tela: quem não está em dia não recebe os links.

## Modo demonstração

Com `SUPABASE_URL` vazio em `config.js`, a área roda com dados de exemplo guardados só no navegador:

| Login | Situação |
| --- | --- |
| aluno@demo.com | Plano Sala, em dia |
| vencido@demo.com | Plano Lives, vencido |
| admin@demo.com | Administrador |

Qualquer senha funciona.

## Ligar ao banco real (conta do Marcelo)

1. Criar o projeto em [supabase.com](https://supabase.com) com o e-mail do Trader Positivo (região São Paulo).
2. **SQL Editor** → colar e rodar `supabase/schema.sql`.
3. No mesmo editor, cadastrar os admins:
   `insert into public.admins (email) values ('email.do.marcelo@...'), ('email.do.suporte@...');`
4. **Authentication → URL Configuration**: Site URL = endereço da Área do aluno (ex.: `https://traderpositivo.com.br/aluno/`) e o mesmo em Redirect URLs.
5. **Authentication → Email**: traduzir os modelos (confirmação e redefinição de senha). Para e-mails de verdade, ligar um SMTP (ex.: Brevo).
6. **Project Settings → API**: copiar a Project URL e a publishable/anon key para `config.js`.
7. Publicar e trocar os links "Área do aluno" do site para `aluno/`.

## Próximo passo: ligação com o TraderSystem

O TraderSystem tem banco e login próprios. Falta o Trader Positivo avisar o TraderSystem quando um aluno é liberado, renovado ou vence (criar/bloquear a conta pelo e-mail), e um login único entre os dois.

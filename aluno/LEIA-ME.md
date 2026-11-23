# Área do aluno · Trader Positivo

Plataforma do aluno do Trader Positivo, com banco próprio (Supabase), separada do TraderSystem.

| Arquivo | O que é |
| --- | --- |
| `index.html` + `app.js` | Entrada (Já tenho senha / Primeiro acesso / Esqueci a senha) e a plataforma |
| `admin.html` | Administração: alunos, agenda, cursos, aulas, análises, avisos, downloads e links |
| `repo.js` | Acesso aos dados (Supabase, ou modo demonstração quando não há configuração) |
| `config.js` | Endereço do Supabase e links (TraderSystem, renovação, suporte) |
| `estilo.css` | Visual |
| `../supabase/schema.sql` | Tabelas e regras de segurança |

## Telas do aluno

Início · Mentoria (gravações por bloco e encontros) · Sala ao vivo (agenda, entrar 15 min antes, caderno da sala) · Mercado (análises WIN/WDO, calendário econômico, relógio das bolsas) · Meus cursos · Curso · Aula (player, concluir, anotações com minuto) · Meu caderno · Indicadores · Explorar · Eventos abertos · Gestão de Risco (TraderSystem, adicional **Plus**).

## Como o acesso funciona

1. O admin cadastra o **e-mail da compra** com o plano, a data "acesso até" e, se for o caso, o **Plus TraderSystem**.
2. O aluno usa **Primeiro acesso** com esse mesmo e-mail e cria a senha.
3. Enquanto a data não passar, o banco entrega o conteúdo do plano. Depois, o aluno continua entrando, mas tudo aparece bloqueado com o botão "Renovar".

Planos: **Lives Gravadas** (gravações, cursos, análises, indicadores), **Sala ao Vivo** (+ sala e agenda), **Mentoria** (+ encontros da mentoria). O TraderSystem é adicional (Plus) em qualquer plano e abre em link à parte.

A proteção está no banco (regras RLS do `schema.sql`): quem não está em dia não recebe os links. O caderno de cada aluno só ele vê, nem o admin.

## Modo demonstração

Com `SUPABASE_URL` vazio em `config.js`, a área roda com dados de exemplo guardados só no navegador. Qualquer senha funciona:

| Login | Situação |
| --- | --- |
| aluno@demo.com | Plano Sala, em dia, com o Plus TraderSystem |
| lives@demo.com | Plano Lives, em dia, sem o Plus |
| vencido@demo.com | Plano Sala, vencido |
| admin@demo.com | Administrador |

## Ligar ao banco real (conta do Marcelo)

1. Criar o projeto em [supabase.com](https://supabase.com) com o e-mail do Trader Positivo (região São Paulo).
2. **SQL Editor** → colar e rodar `supabase/schema.sql`.
3. Cadastrar os admins: `insert into public.admins (email) values ('email.do.marcelo@...'), ('email.do.suporte@...');`
4. **Authentication → URL Configuration**: Site URL = endereço da Área do aluno (ex.: `https://traderpositivo.com.br/aluno/`), e o mesmo em Redirect URLs.
5. **Authentication → Email**: traduzir os modelos (confirmação e redefinição de senha) e ligar um SMTP (ex.: Brevo).
6. **Project Settings → API**: copiar a Project URL e a publishable/anon key para `config.js`.
7. Publicar e trocar os links "Área do aluno" do site para `aluno/`.

## Próximos passos

- Ligação com o TraderSystem: quando o Plus é ligado ou o plano vence, criar ou bloquear a conta no TraderSystem pelo e-mail, com login único.
- Prints no caderno (colar imagem), avisos no celular quando a sala abrir e progresso do vídeo.

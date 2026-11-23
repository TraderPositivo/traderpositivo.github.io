-- Trader Positivo — banco da Área do aluno (Supabase / Postgres)
-- Separado do GesRisk Trader. Rodar uma vez no SQL Editor do projeto Supabase.
--
-- Acesso:
--   1. O admin cadastra a ASSINATURA pelo e-mail do aluno (plano, "acesso até" e o Plus GesRisk Trader).
--   2. O aluno faz o "Primeiro acesso" com esse mesmo e-mail e cria a senha.
--   3. Enquanto "acesso_ate" for hoje ou depois, o banco entrega o conteúdo do plano dele.
--      Venceu: continua entrando, mas os links (aulas, sala, downloads) deixam de vir do banco.

-- ═══ TABELAS ════════════════════════════════════════════════════════════════

create table if not exists public.assinaturas (
  email          text primary key check (email = lower(email)),
  nome           text not null default '',
  plano          text not null default 'sala' check (plano in ('lives', 'sala', 'mentoria')),
  acesso_ate     date,
  tradersystem   boolean not null default false,      -- adicional "Plus": acesso ao GesRisk Trader
  observacao     text not null default '',
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.admins (
  email text primary key check (email = lower(email))
);

-- recado da equipe no topo do painel
create table if not exists public.avisos (
  id         bigint generated always as identity primary key,
  texto      text not null,
  link       text not null default '',
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- sala ao vivo, aulas da mentoria e eventos abertos
create table if not exists public.agenda (
  id      bigint generated always as identity primary key,
  tipo    text not null default 'sala' check (tipo in ('sala', 'mentoria', 'evento')),
  titulo  text not null default 'Sala ao vivo',
  inicio  timestamptz not null,
  fim     timestamptz,
  com     text not null default 'Marcelo',
  link    text not null default '',                  -- Zoom; vazio = usa o link padrão da sala
  planos  text[] not null default '{sala,mentoria}'
);

-- cursos e a biblioteca de gravações da sala (tipo 'gravacoes')
create table if not exists public.cursos (
  id         bigint generated always as identity primary key,
  tipo       text not null default 'curso' check (tipo in ('curso', 'gravacoes')),
  titulo     text not null,
  descricao  text not null default '',
  tema       text not null default 'Método',
  capa_url   text not null default '',
  planos     text[] not null default '{lives,sala,mentoria}',
  gratuito   boolean not null default false,
  ordem      int not null default 0,
  ativo      boolean not null default true
);

create table if not exists public.aulas (
  id            bigint generated always as identity primary key,
  curso_id      bigint not null references public.cursos(id) on delete cascade,
  bloco         text not null default '',             -- ex.: "Fundamentos", "Leitura de fluxo"
  numero        int not null default 1,
  titulo        text not null,
  descricao     text not null default '',
  duracao       text not null default '',             -- ex.: "1h42"
  video_url     text not null default '',             -- YouTube (não listado) ou outro link
  material_url  text not null default '',
  publicado_em  date not null default current_date
);

-- progresso do aluno em cada aula
create table if not exists public.progresso (
  email          text not null check (email = lower(email)),
  aula_id        bigint not null references public.aulas(id) on delete cascade,
  concluida      boolean not null default true,
  atualizado_em  timestamptz not null default now(),
  primary key (email, aula_id)
);

-- análises do dia (WIN, WDO e outros)
create table if not exists public.analises (
  id          bigint generated always as identity primary key,
  ativo       text not null default 'WIN',
  direcao     text not null default 'neutro' check (direcao in ('compra', 'venda', 'neutro')),
  momento     text not null default 'Pré-abertura',   -- Pré-abertura, Manhã, Tarde, Semanal
  texto       text not null,
  imagem_url  text not null default '',
  autor       text not null default 'Marcelo Ceribelli',
  criado_em   timestamptz not null default now()
);

-- caderno: anotações do aluno (só ele vê)
create table if not exists public.anotacoes (
  id         bigint generated always as identity primary key,
  email      text not null default lower(coalesce(auth.jwt() ->> 'email', '')),
  contexto   text not null default 'solta' check (contexto in ('aula', 'sala', 'solta')),
  ref_id     bigint,                                  -- aula, quando contexto = 'aula'
  ref_titulo text not null default '',
  minuto     text not null default '',                -- ex.: "12:40" do vídeo
  texto      text not null,
  criado_em  timestamptz not null default now()
);

-- downloads e links soltos: indicadores, instalação, link padrão da sala
create table if not exists public.conteudo (
  id          bigint generated always as identity primary key,
  tipo        text not null check (tipo in ('indicador', 'instalacao', 'sala')),
  titulo      text not null,
  descricao   text not null default '',
  url         text not null default '',
  plataforma  text not null default '',
  planos      text[] not null default '{lives,sala,mentoria}',
  ordem       int not null default 0,
  ativo       boolean not null default true
);

-- ═══ FUNÇÕES ════════════════════════════════════════════════════════════════

create or replace function public.hoje_sp() returns date
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

create or replace function public.meu_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.sou_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = public.meu_email())
$$;

-- plano do aluno logado, só se estiver em dia (null = sem acesso)
create or replace function public.meu_plano_ativo() returns text
language sql stable security definer set search_path = public as $$
  select plano from public.assinaturas
  where email = public.meu_email() and acesso_ate >= public.hoje_sp()
$$;

-- pode ver as aulas deste curso?
create or replace function public.posso_ver_curso(p_curso bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select public.sou_admin() or exists (
    select 1 from public.cursos c
    where c.id = p_curso and c.ativo
      and (c.gratuito or public.meu_plano_ativo() = any (c.planos))
  )
$$;

create or replace function public.tocar_atualizado() returns trigger
language plpgsql as $$ begin new.atualizado_em = now(); return new; end $$;

drop trigger if exists assinaturas_atualizado on public.assinaturas;
create trigger assinaturas_atualizado before update on public.assinaturas
  for each row execute function public.tocar_atualizado();

create or replace function public.renovar_assinatura(p_email text, p_dias int default 30) returns date
language plpgsql security definer set search_path = public as $$
declare nova date;
begin
  if not public.sou_admin() then raise exception 'Acesso negado'; end if;
  update public.assinaturas
     set acesso_ate = greatest(coalesce(acesso_ate, public.hoje_sp()), public.hoje_sp()) + p_dias
   where email = lower(p_email)
  returning acesso_ate into nova;
  return nova;
end $$;

-- ═══ SEGURANÇA (RLS) ════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array['assinaturas','admins','avisos','agenda','cursos','aulas','progresso','analises','anotacoes','conteudo'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
    execute format('drop policy if exists "admin gerencia" on public.%I', t);
    execute format('create policy "admin gerencia" on public.%I for all to authenticated using (public.sou_admin()) with check (public.sou_admin())', t);
  end loop;
end $$;
revoke execute on function public.renovar_assinatura(text, int) from anon;

drop policy if exists "vê a própria assinatura" on public.assinaturas;
create policy "vê a própria assinatura" on public.assinaturas for select to authenticated using (email = public.meu_email());

drop policy if exists "vê se é admin" on public.admins;
create policy "vê se é admin" on public.admins for select to authenticated using (email = public.meu_email());

drop policy if exists "logado vê avisos" on public.avisos;
create policy "logado vê avisos" on public.avisos for select to authenticated using (ativo);

-- eventos abertos: qualquer logado; sala e mentoria: aluno em dia do plano
drop policy if exists "vê a agenda" on public.agenda;
create policy "vê a agenda" on public.agenda for select to authenticated
  using (tipo = 'evento' or public.meu_plano_ativo() = any (planos));

-- a vitrine de cursos é aberta a quem está logado; as aulas, só a quem pode
drop policy if exists "logado vê a vitrine" on public.cursos;
create policy "logado vê a vitrine" on public.cursos for select to authenticated using (ativo);

drop policy if exists "vê as aulas liberadas" on public.aulas;
create policy "vê as aulas liberadas" on public.aulas for select to authenticated using (public.posso_ver_curso(curso_id));

drop policy if exists "aluno em dia vê análises" on public.analises;
create policy "aluno em dia vê análises" on public.analises for select to authenticated using (public.meu_plano_ativo() is not null);

drop policy if exists "aluno em dia vê o conteúdo do plano" on public.conteudo;
create policy "aluno em dia vê o conteúdo do plano" on public.conteudo for select to authenticated
  using (ativo and public.meu_plano_ativo() = any (planos));

-- progresso e caderno: cada um só o seu
drop policy if exists "meu progresso" on public.progresso;
create policy "meu progresso" on public.progresso for all to authenticated
  using (email = public.meu_email()) with check (email = public.meu_email());

drop policy if exists "meu caderno" on public.anotacoes;
create policy "meu caderno" on public.anotacoes for all to authenticated
  using (email = public.meu_email()) with check (email = public.meu_email());

-- o admin não lê o caderno de ninguém (a regra "admin gerencia" foi criada acima; removemos aqui)
drop policy if exists "admin gerencia" on public.anotacoes;

-- ═══ CONTEÚDO INICIAL (links vazios = "Em breve") ═══════════════════════════

insert into public.conteudo (tipo, titulo, descricao, plataforma, ordem, planos)
select * from (values
  ('sala',       'Link da sala ao vivo', 'Usado quando o encontro da agenda não tem link próprio.', '', 0, '{sala,mentoria}'::text[]),
  ('instalacao', 'Como instalar os indicadores', 'Passo a passo para MetaTrader 5 e Profit.', '', 0, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'VWAP Diário',        'Preço médio do dia, zerado a cada pregão. A âncora do setup.', 'MT5', 1, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'VWAP Ancorada',      'Até 4 VWAPs ancoradas com um clique: 2 de compra e 2 de venda.', 'MT5', 2, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Volume Profile',     'POC, VAH e VAL de 1 a 10 dias, com área de valor de 70%.', 'MT5', 3, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Fibonacci',          'Projeções de alvo 1.0, 1.27 e 1.618 a partir do último movimento.', 'MT5', 4, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Volume Agressão',    'Weis Wave de 5 ticks: quem está agredindo agora.', 'MT5 · Profit', 5, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Volume Negociado',   'Weis Wave de 15 ticks: o fluxo no contexto do dia.', 'MT5 · Profit', 6, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Força vs Resultado', 'Esforço (volume) contra resultado (preço) por onda, em 5 e 15 ticks.', 'MT5', 7, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Volume Barras',      'Pinta os candles por volume: branco, amarelo, laranja e vermelho.', 'MT5 · Profit', 8, '{lives,sala,mentoria}'::text[])
) as v(tipo, titulo, descricao, plataforma, ordem, planos)
where not exists (select 1 from public.conteudo);

insert into public.cursos (tipo, titulo, descricao, tema, planos, ordem)
select 'gravacoes', 'Gravações da sala', 'As gravações das sessões ao vivo, da mais recente para a primeira.', 'Sala ao vivo', '{lives,sala,mentoria}', 0
where not exists (select 1 from public.cursos where tipo = 'gravacoes');

-- primeiro admin: troque pelo e-mail real antes de rodar
-- insert into public.admins (email) values ('email.do.marcelo@exemplo.com') on conflict do nothing;

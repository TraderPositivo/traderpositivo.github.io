-- Trader Positivo — banco da Área do aluno (Supabase / Postgres)
-- Separado do TraderSystem. Rodar uma vez no SQL Editor do projeto Supabase.
--
-- Como funciona o acesso:
--   1. O admin cadastra a ASSINATURA pelo e-mail do aluno (plano + "acesso até").
--   2. O aluno cria a conta com esse mesmo e-mail.
--   3. Enquanto "acesso_ate" for hoje ou depois, ele vê o conteúdo do plano dele.
--      Venceu: continua entrando, mas o conteúdo (links) deixa de ser entregue pelo banco.

-- ── assinaturas: quem é aluno, de qual plano e até quando ──────────────────
create table if not exists public.assinaturas (
  email          text primary key check (email = lower(email)),
  nome           text not null default '',
  plano          text not null default 'sala' check (plano in ('lives', 'sala', 'mentoria')),
  acesso_ate     date,
  observacao     text not null default '',
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

-- ── admins: e-mails que administram (Marcelo e suporte) ─────────────────────
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);

-- ── conteudo: indicadores, lives, aulas, sala ao vivo, instalação ───────────
create table if not exists public.conteudo (
  id          bigint generated always as identity primary key,
  tipo        text not null check (tipo in ('indicador', 'live', 'aula', 'sala', 'instalacao')),
  titulo      text not null,
  descricao   text not null default '',
  url         text not null default '',
  plataforma  text not null default '',          -- ex.: 'MT5', 'MT5 · Profit'
  planos      text[] not null default '{lives,sala,mentoria}',
  ordem       int not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- ── funções de apoio ────────────────────────────────────────────────────────
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

create or replace function public.tocar_atualizado() returns trigger
language plpgsql as $$ begin new.atualizado_em = now(); return new; end $$;

drop trigger if exists assinaturas_atualizado on public.assinaturas;
create trigger assinaturas_atualizado before update on public.assinaturas
  for each row execute function public.tocar_atualizado();

-- ── segurança (RLS) ─────────────────────────────────────────────────────────
alter table public.assinaturas enable row level security;
alter table public.admins      enable row level security;
alter table public.conteudo    enable row level security;

-- ninguém sem login lê nada
revoke all on public.assinaturas, public.admins, public.conteudo from anon;
-- o Supabase dá privilégios amplos por padrão: deixamos só o necessário
revoke truncate, references, trigger on public.assinaturas, public.admins, public.conteudo from authenticated;

drop policy if exists "aluno vê a própria assinatura" on public.assinaturas;
create policy "aluno vê a própria assinatura" on public.assinaturas
  for select to authenticated using (email = public.meu_email() or public.sou_admin());

drop policy if exists "admin gerencia assinaturas" on public.assinaturas;
create policy "admin gerencia assinaturas" on public.assinaturas
  for all to authenticated using (public.sou_admin()) with check (public.sou_admin());

drop policy if exists "admin vê admins" on public.admins;
create policy "admin vê admins" on public.admins
  for select to authenticated using (email = public.meu_email() or public.sou_admin());

drop policy if exists "aluno em dia vê o conteúdo do plano" on public.conteudo;
create policy "aluno em dia vê o conteúdo do plano" on public.conteudo
  for select to authenticated using (
    public.sou_admin() or (ativo and public.meu_plano_ativo() = any (planos))
  );

drop policy if exists "admin gerencia conteúdo" on public.conteudo;
create policy "admin gerencia conteúdo" on public.conteudo
  for all to authenticated using (public.sou_admin()) with check (public.sou_admin());

-- ── renovar: soma dias a partir de hoje ou do vencimento atual ──────────────
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
revoke execute on function public.renovar_assinatura(text, int) from anon;

-- ── conteúdo inicial (links em branco = "Em breve" na tela) ─────────────────
insert into public.conteudo (tipo, titulo, descricao, plataforma, ordem, planos)
select * from (values
  ('sala',       'Sala ao vivo',        'Segunda a sexta, das 9h ao meio-dia, operando WIN e WDO.', '', 0, '{sala,mentoria}'::text[]),
  ('instalacao', 'Como instalar os indicadores', 'Passo a passo para MetaTrader 5 e Profit.', '', 0, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'VWAP Diário',         'Preço médio do dia, zerado a cada pregão. A âncora do setup.', 'MT5', 1, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'VWAP Ancorada',       'Até 4 VWAPs ancoradas com um clique: 2 de compra e 2 de venda.', 'MT5', 2, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Volume Profile',      'POC, VAH e VAL de 1 a 10 dias, com área de valor de 70%.', 'MT5', 3, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Fibonacci',           'Projeções de alvo 1.0, 1.27 e 1.618 a partir do último movimento.', 'MT5', 4, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Volume Agressão',     'Weis Wave de 5 ticks: quem está agredindo agora.', 'MT5 · Profit', 5, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Volume Negociado',    'Weis Wave de 15 ticks: o fluxo no contexto do dia.', 'MT5 · Profit', 6, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Força vs Resultado',  'Esforço (volume) contra resultado (preço) por onda, em 5 e 15 ticks.', 'MT5', 7, '{lives,sala,mentoria}'::text[]),
  ('indicador',  'Volume Barras',       'Pinta os candles por volume: branco, amarelo, laranja e vermelho.', 'MT5 · Profit', 8, '{lives,sala,mentoria}'::text[])
) as v(tipo, titulo, descricao, plataforma, ordem, planos)
where not exists (select 1 from public.conteudo);

-- ── primeiro admin: troque pelo e-mail real antes de rodar ──────────────────
-- insert into public.admins (email) values ('email.do.marcelo@exemplo.com') on conflict do nothing;

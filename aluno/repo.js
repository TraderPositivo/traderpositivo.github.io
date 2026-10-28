// Camada de dados da Área do aluno: mesma interface para o Supabase (real)
// e para o modo demonstração (localStorage). As telas só falam com `repo`.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'

export const PLANOS = { lives: 'Lives Gravadas', sala: 'Sala ao Vivo', mentoria: 'Mentoria' }
export const DEMO = !SUPABASE_URL

export function hojeSP() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
export function maisDias(iso, dias) {
  const d = new Date((iso || hojeSP()) + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}
export const emDia = (a) => !!a?.acesso_ate && a.acesso_ate >= hojeSP()

// ── Supabase ────────────────────────────────────────────────────────────────
async function criarRepoSupabase() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const ok = ({ data, error }) => { if (error) throw new Error(traduzir(error.message)); return data }

  return {
    async sessao() {
      const { data } = await sb.auth.getSession()
      const u = data.session?.user
      return u ? { email: u.email.toLowerCase(), nome: u.user_metadata?.nome || '' } : null
    },
    aoMudarSessao(cb) { sb.auth.onAuthStateChange((evento) => cb(evento)) },
    async entrar(email, senha) { ok(await sb.auth.signInWithPassword({ email, password: senha })) },
    async criarConta(nome, email, senha) {
      const data = ok(await sb.auth.signUp({ email, password: senha, options: { data: { nome }, emailRedirectTo: location.href.split('#')[0] } }))
      return { precisaConfirmar: !data.session }
    },
    async esqueci(email) { ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] })) },
    async novaSenha(senha) { ok(await sb.auth.updateUser({ password: senha })) },
    async sair() { await sb.auth.signOut() },

    async minhaAssinatura() {
      return ok(await sb.from('assinaturas').select('*').eq('email', (await this.sessao()).email).maybeSingle())
    },
    async souAdmin() { return ok(await sb.rpc('sou_admin')) === true },
    async conteudo() { return ok(await sb.from('conteudo').select('*').eq('ativo', true).order('ordem')) },

    async listarAssinaturas() { return ok(await sb.from('assinaturas').select('*').order('acesso_ate', { ascending: true, nullsFirst: true })) },
    async salvarAssinatura(a) {
      const linha = { email: a.email.trim().toLowerCase(), nome: a.nome || '', plano: a.plano, acesso_ate: a.acesso_ate || null, observacao: a.observacao || '' }
      ok(await sb.from('assinaturas').upsert(linha))
    },
    async renovar(email, dias = 30) { ok(await sb.rpc('renovar_assinatura', { p_email: email, p_dias: dias })) },
    async removerAssinatura(email) { ok(await sb.from('assinaturas').delete().eq('email', email)) },

    async listarConteudoAdmin() { return ok(await sb.from('conteudo').select('*').order('tipo').order('ordem')) },
    async salvarConteudo(c) {
      const linha = { tipo: c.tipo, titulo: c.titulo, descricao: c.descricao || '', url: c.url || '', plataforma: c.plataforma || '', planos: c.planos, ordem: +c.ordem || 0, ativo: c.ativo !== false }
      if (c.id) ok(await sb.from('conteudo').update(linha).eq('id', c.id))
      else ok(await sb.from('conteudo').insert(linha))
    },
    async removerConteudo(id) { ok(await sb.from('conteudo').delete().eq('id', id)) },
  }
}

function traduzir(msg) {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (/User already registered/i.test(msg)) return 'Já existe uma conta com esse e-mail. Use "Entrar" ou "Esqueci a senha".'
  if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/rate limit/i.test(msg)) return 'Muitas tentativas. Espere alguns minutos e tente de novo.'
  return msg
}

// ── Modo demonstração ───────────────────────────────────────────────────────
// Logins de exemplo (qualquer senha):
//   aluno@demo.com  → plano Sala, em dia
//   vencido@demo.com → plano Lives, vencido
//   admin@demo.com   → administrador
function criarRepoDemo() {
  const CHAVE = 'tp-area-demo'
  const semente = () => ({
    sessao: null,
    admins: ['admin@demo.com'],
    assinaturas: [
      { email: 'aluno@demo.com', nome: 'Aluno Exemplo', plano: 'sala', acesso_ate: maisDias(hojeSP(), 30), observacao: '' },
      { email: 'vencido@demo.com', nome: 'Aluno Vencido', plano: 'lives', acesso_ate: maisDias(hojeSP(), -5), observacao: 'Não renovou' },
    ],
    conteudo: [
      ['sala', 'Sala ao vivo', 'Segunda a sexta, das 9h ao meio-dia, operando WIN e WDO.', '', '', ['sala', 'mentoria'], 0],
      ['instalacao', 'Como instalar os indicadores', 'Passo a passo para MetaTrader 5 e Profit.', '', '', ['lives', 'sala', 'mentoria'], 0],
      ['indicador', 'VWAP Diário', 'Preço médio do dia, zerado a cada pregão. A âncora do setup.', '', 'MT5', null, 1],
      ['indicador', 'VWAP Ancorada', 'Até 4 VWAPs ancoradas com um clique: 2 de compra e 2 de venda.', '', 'MT5', null, 2],
      ['indicador', 'Volume Profile', 'POC, VAH e VAL de 1 a 10 dias, com área de valor de 70%.', '', 'MT5', null, 3],
      ['indicador', 'Fibonacci', 'Projeções de alvo 1.0, 1.27 e 1.618 a partir do último movimento.', '', 'MT5', null, 4],
      ['indicador', 'Volume Agressão', 'Weis Wave de 5 ticks: quem está agredindo agora.', '', 'MT5 · Profit', null, 5],
      ['indicador', 'Volume Negociado', 'Weis Wave de 15 ticks: o fluxo no contexto do dia.', '', 'MT5 · Profit', null, 6],
      ['indicador', 'Força vs Resultado', 'Esforço (volume) contra resultado (preço) por onda, em 5 e 15 ticks.', '', 'MT5', null, 7],
      ['indicador', 'Volume Barras', 'Pinta os candles por volume: branco, amarelo, laranja e vermelho.', '', 'MT5 · Profit', null, 8],
      ['live', 'VWAP como nível de entrada: 3 setups ao vivo', '24/10 · 1h42', 'https://www.youtube.com/', '', null, 1],
      ['aula', 'Metodologia e leitura de fluxo', 'Playlist com as aulas base', 'https://www.youtube.com/', '', null, 1],
    ].map(([tipo, titulo, descricao, url, plataforma, planos, ordem], i) => ({
      id: i + 1, tipo, titulo, descricao, url, plataforma, planos: planos || ['lives', 'sala', 'mentoria'], ordem, ativo: true,
    })),
    proximoId: 100,
  })
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || semente() } catch (_) { return semente() } }
  const gravar = (db) => { try { localStorage.setItem(CHAVE, JSON.stringify(db)) } catch (_) {} }
  let db = ler()
  const salvar = () => gravar(db)
  const ouvintes = []
  const avisar = (e) => ouvintes.forEach((cb) => cb(e))
  const minha = () => db.assinaturas.find((a) => a.email === db.sessao?.email) || null
  const admin = () => db.admins.includes(db.sessao?.email)

  return {
    async sessao() { return db.sessao },
    aoMudarSessao(cb) { ouvintes.push(cb) },
    async entrar(email) {
      email = email.trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.')
      db.sessao = { email, nome: minha()?.nome || '' }; salvar(); avisar('SIGNED_IN')
    },
    async criarConta(nome, email) {
      email = email.trim().toLowerCase()
      db.sessao = { email, nome }; salvar(); avisar('SIGNED_IN')
      return { precisaConfirmar: false }
    },
    async esqueci() {},
    async novaSenha() {},
    async sair() { db.sessao = null; salvar(); avisar('SIGNED_OUT') },

    async minhaAssinatura() { return minha() },
    async souAdmin() { return admin() },
    async conteudo() {
      // mesma regra do banco: admin vê tudo; aluno em dia vê o do plano dele
      if (admin()) return db.conteudo.filter((c) => c.ativo).sort((a, b) => a.ordem - b.ordem)
      const a = minha()
      if (!emDia(a)) return []
      return db.conteudo.filter((c) => c.ativo && c.planos.includes(a.plano)).sort((x, y) => x.ordem - y.ordem)
    },

    async listarAssinaturas() { return [...db.assinaturas].sort((a, b) => (a.acesso_ate || '').localeCompare(b.acesso_ate || '')) },
    async salvarAssinatura(a) {
      const email = a.email.trim().toLowerCase()
      const linha = { email, nome: a.nome || '', plano: a.plano, acesso_ate: a.acesso_ate || null, observacao: a.observacao || '' }
      const i = db.assinaturas.findIndex((x) => x.email === email)
      if (i >= 0) db.assinaturas[i] = linha; else db.assinaturas.push(linha)
      salvar()
    },
    async renovar(email, dias = 30) {
      const a = db.assinaturas.find((x) => x.email === email)
      const base = a.acesso_ate && a.acesso_ate > hojeSP() ? a.acesso_ate : hojeSP()
      a.acesso_ate = maisDias(base, dias); salvar()
    },
    async removerAssinatura(email) { db.assinaturas = db.assinaturas.filter((x) => x.email !== email); salvar() },

    async listarConteudoAdmin() { return [...db.conteudo].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.ordem - b.ordem) },
    async salvarConteudo(c) {
      const linha = { ...c, ordem: +c.ordem || 0, ativo: c.ativo !== false }
      if (c.id) db.conteudo = db.conteudo.map((x) => (x.id === c.id ? linha : x))
      else db.conteudo.push({ ...linha, id: db.proximoId++ })
      salvar()
    },
    async removerConteudo(id) { db.conteudo = db.conteudo.filter((x) => x.id !== id); salvar() },
    reiniciarDemo() { db = semente(); salvar() },
  }
}

export const repo = DEMO ? criarRepoDemo() : await criarRepoSupabase()

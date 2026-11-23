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

// tabelas que o admin edita e a chave de cada uma
export const CHAVES = { assinaturas: 'email', avisos: 'id', agenda: 'id', cursos: 'id', aulas: 'id', analises: 'id', conteudo: 'id' }

// ── Supabase ────────────────────────────────────────────────────────────────
async function criarRepoSupabase() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const ok = ({ data, error }) => { if (error) throw new Error(traduzir(error.message)); return data }
  let emailAtual = ''

  return {
    async sessao() {
      const { data } = await sb.auth.getSession()
      const u = data.session?.user
      emailAtual = u?.email?.toLowerCase() || ''
      return u ? { email: emailAtual, nome: u.user_metadata?.nome || '' } : null
    },
    aoMudarSessao(cb) { sb.auth.onAuthStateChange((evento) => cb(evento)) },
    async entrar(email, senha) { ok(await sb.auth.signInWithPassword({ email, password: senha })) },
    async primeiroAcesso(nome, email, senha) {
      const data = ok(await sb.auth.signUp({ email, password: senha, options: { data: { nome }, emailRedirectTo: location.href.split('#')[0] } }))
      return { precisaConfirmar: !data.session }
    },
    async esqueci(email) { ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] })) },
    async novaSenha(senha) { ok(await sb.auth.updateUser({ password: senha })) },
    async sair() { await sb.auth.signOut() },

    async minhaAssinatura() { return ok(await sb.from('assinaturas').select('*').eq('email', emailAtual).maybeSingle()) },
    async souAdmin() { return ok(await sb.rpc('sou_admin')) === true },
    async avisos() { return ok(await sb.from('avisos').select('*').eq('ativo', true).order('criado_em', { ascending: false })) },
    async agenda() {
      const desde = new Date(Date.now() - 3 * 3600e3).toISOString()
      return ok(await sb.from('agenda').select('*').gte('inicio', desde).order('inicio'))
    },
    async cursos() { return ok(await sb.from('cursos').select('*').eq('ativo', true).order('ordem')) },
    async aulas() { return ok(await sb.from('aulas').select('*').order('curso_id').order('numero')) },
    async meuProgresso() { return new Set(ok(await sb.from('progresso').select('aula_id').eq('concluida', true)).map((p) => p.aula_id)) },
    async marcarAula(aulaId, concluida) {
      ok(await sb.from('progresso').upsert({ email: emailAtual, aula_id: aulaId, concluida, atualizado_em: new Date().toISOString() }))
    },
    async analises() { return ok(await sb.from('analises').select('*').order('criado_em', { ascending: false }).limit(100)) },
    async conteudo() { return ok(await sb.from('conteudo').select('*').eq('ativo', true).order('ordem')) },
    async anotacoes() { return ok(await sb.from('anotacoes').select('*').order('criado_em', { ascending: false })) },
    async salvarAnotacao(a) {
      const linha = { contexto: a.contexto, ref_id: a.ref_id || null, ref_titulo: a.ref_titulo || '', minuto: a.minuto || '', texto: a.texto }
      if (a.id) ok(await sb.from('anotacoes').update(linha).eq('id', a.id))
      else ok(await sb.from('anotacoes').insert(linha))
    },
    async removerAnotacao(id) { ok(await sb.from('anotacoes').delete().eq('id', id)) },

    // admin
    async listar(tabela) { return ok(await sb.from(tabela).select('*')) },
    async salvar(tabela, obj) {
      const chave = CHAVES[tabela]
      const linha = { ...obj }
      if (tabela === 'assinaturas') linha.email = linha.email.trim().toLowerCase()
      if (chave !== 'id') return ok(await sb.from(tabela).upsert(linha))
      const id = linha.id
      delete linha.id // id é gerado pelo banco: editar = update, criar = insert
      if (id) ok(await sb.from(tabela).update(linha).eq('id', id))
      else ok(await sb.from(tabela).insert(linha))
    },
    async remover(tabela, valor) { ok(await sb.from(tabela).delete().eq(CHAVES[tabela], valor)) },
    async renovar(email, dias = 30) { ok(await sb.rpc('renovar_assinatura', { p_email: email, p_dias: dias })) },
  }
}

function traduzir(msg) {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (/User already registered/i.test(msg)) return 'Esse e-mail já tem senha. Use a aba "Já tenho senha" ou "Esqueci minha senha".'
  if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/rate limit/i.test(msg)) return 'Muitas tentativas. Espere alguns minutos e tente de novo.'
  return msg
}

// ── Modo demonstração ───────────────────────────────────────────────────────
// Logins de exemplo (qualquer senha):
//   aluno@demo.com   → plano Sala, em dia, com o Plus GesRisk Trader
//   lives@demo.com   → plano Lives, em dia, sem o Plus
//   vencido@demo.com → plano Sala, vencido
//   admin@demo.com   → administrador
function semente() {
  const hoje = hojeSP()
  const em = (dias, hora) => {
    const d = new Date(maisDias(hoje, dias) + `T${hora}:00-03:00`)
    return d.toISOString()
  }
  const yt = '' // aulas de exemplo sem vídeo: o admin cola o link do YouTube de cada aula
  const blocos = ['Fundamentos', 'Leitura de fluxo', 'Indicadores', 'Gestão de risco', 'Entradas e execução']
  const titulosGravacoes = [
    'VWAP como referência: compra acima, venda abaixo', 'Weis Wave na prática: exaustão de onda', 'Volume Profile: POC, VAH e VAL no WIN',
    'Gestão de risco: stop diário e meta', 'Retorno à VWAP: o ponto de entrada', 'Mini dólar: leitura de fluxo no WDO',
    'Força vs Resultado: absorção antes da virada', 'Dia lateral: como evitar o overtrading',
  ]
  let aulaId = 1
  const aulas = []
  titulosGravacoes.forEach((t, i) => aulas.push({ id: aulaId++, curso_id: 1, bloco: blocos[i % blocos.length], numero: i + 1, titulo: t, descricao: 'Gravação da sala ao vivo', duracao: ['1h42', '58min', '1h12', '45min', '1h30', '1h05', '1h18', '2h05'][i], video_url: yt, material_url: '', publicado_em: maisDias(hoje, -(titulosGravacoes.length - i) * 3) }))
  const curso2 = ['O que é o mini índice', 'O que é o mini dólar', 'Margem, ponto e tick', 'Horários do pregão', 'Custos de operar', 'Montando a plataforma']
  curso2.forEach((t, i) => aulas.push({ id: aulaId++, curso_id: 2, bloco: 'Primeiros passos', numero: i + 1, titulo: t, descricao: '', duracao: `${12 + i * 3}min`, video_url: yt, material_url: '', publicado_em: hoje }))
  const curso3 = ['Instalando no MetaTrader 5', 'Instalando no Profit', 'VWAP Diário e Ancorada', 'Volume Profile', 'Weis Wave e Força vs Resultado', 'Volume Barras e Fibonacci']
  curso3.forEach((t, i) => aulas.push({ id: aulaId++, curso_id: 3, bloco: 'Indicadores', numero: i + 1, titulo: t, descricao: '', duracao: `${15 + i * 4}min`, video_url: yt, material_url: '', publicado_em: hoje }))
  const curso4 = ['Risco fixo por operação', 'Stop diário e mensal', 'Loss limit na mesa proprietária', 'Usando o GesRisk Trader']
  curso4.forEach((t, i) => aulas.push({ id: aulaId++, curso_id: 4, bloco: 'Gestão', numero: i + 1, titulo: t, descricao: '', duracao: `${20 + i * 5}min`, video_url: yt, material_url: '', publicado_em: hoje }))

  return {
    sessao: null,
    admins: ['admin@demo.com'],
    assinaturas: [
      { email: 'aluno@demo.com', nome: 'Aluno Exemplo', plano: 'sala', acesso_ate: maisDias(hoje, 30), tradersystem: true, observacao: '' },
      { email: 'lives@demo.com', nome: 'Aluna Lives', plano: 'lives', acesso_ate: maisDias(hoje, 12), tradersystem: false, observacao: '' },
      { email: 'vencido@demo.com', nome: 'Aluno Vencido', plano: 'sala', acesso_ate: maisDias(hoje, -5), tradersystem: false, observacao: 'Não renovou' },
    ],
    avisos: [{ id: 1, texto: 'Sala ao vivo de segunda a sexta, das 9h ao meio-dia. Entre 10 minutos antes.', link: '', ativo: true, criado_em: new Date().toISOString() }],
    agenda: [0, 1, 2, 3, 4].map((d, i) => ({ id: i + 1, tipo: 'sala', titulo: 'Sala ao vivo', inicio: em(d, '09:00'), fim: em(d, '12:00'), com: 'Marcelo', link: '', planos: ['sala', 'mentoria'] }))
      .concat([{ id: 10, tipo: 'mentoria', titulo: 'Encontro da mentoria', inicio: em(2, '19:30'), fim: em(2, '21:00'), com: 'Marcelo', link: '', planos: ['mentoria'] },
        { id: 11, tipo: 'evento', titulo: 'Aula aberta: como ler o fluxo no WIN', inicio: em(6, '20:00'), fim: em(6, '21:00'), com: 'Marcelo', link: '', planos: ['lives', 'sala', 'mentoria'] }]),
    cursos: [
      { id: 1, tipo: 'gravacoes', titulo: 'Gravações da sala', descricao: 'As gravações das sessões ao vivo, da mais recente para a primeira.', tema: 'Sala ao vivo', capa_url: '', planos: ['lives', 'sala', 'mentoria'], gratuito: false, ordem: 0, ativo: true },
      { id: 2, tipo: 'curso', titulo: 'Primeiros passos no WIN e WDO', descricao: 'Para quem está começando nos minicontratos da B3.', tema: 'Iniciante', capa_url: '', planos: ['lives', 'sala', 'mentoria'], gratuito: true, ordem: 1, ativo: true },
      { id: 3, tipo: 'curso', titulo: 'Indicadores Trader Positivo', descricao: 'Instalação e uso de cada indicador, no MT5 e no Profit.', tema: 'Indicadores', capa_url: '', planos: ['lives', 'sala', 'mentoria'], gratuito: false, ordem: 2, ativo: true },
      { id: 4, tipo: 'curso', titulo: 'Gestão de risco na prática', descricao: 'Risco por operação, stops, loss limit e o GesRisk Trader.', tema: 'Gestão de risco', capa_url: '', planos: ['sala', 'mentoria'], gratuito: false, ordem: 3, ativo: true },
    ],
    aulas,
    progresso: [{ email: 'aluno@demo.com', aula_id: 9, concluida: true }, { email: 'aluno@demo.com', aula_id: 10, concluida: true }],
    analises: [
      { id: 1, ativo: 'WIN', direcao: 'compra', momento: 'Pré-abertura', texto: 'Abriu acima da VWAP de ontem e segurou o POC. Compra em retorno à VWAP com Weis mostrando exaustão vendedora.', imagem_url: '', autor: 'Marcelo Ceribelli', criado_em: em(0, '08:40') },
      { id: 2, ativo: 'WDO', direcao: 'venda', momento: 'Pré-abertura', texto: 'Dólar testando a VAH do dia anterior com volume fraco. Venda só com confirmação de rejeição.', imagem_url: '', autor: 'Marcelo Ceribelli', criado_em: em(0, '08:45') },
      { id: 3, ativo: 'WIN', direcao: 'neutro', momento: 'Tarde', texto: 'Mercado lateral entre VAL e POC. Sem operação até romper com volume.', imagem_url: '', autor: 'Marcelo Ceribelli', criado_em: em(-1, '14:10') },
      { id: 4, ativo: 'WIN', direcao: 'venda', momento: 'Manhã', texto: 'Força vs Resultado mostrou absorção na máxima. Venda com alvo na VWAP.', imagem_url: '', autor: 'Marcelo Ceribelli', criado_em: em(-2, '10:20') },
    ],
    anotacoes: [],
    conteudo: [
      ['sala', 'Link da sala ao vivo', 'Usado quando o encontro da agenda não tem link próprio.', 'https://zoom.us/', '', ['sala', 'mentoria'], 0],
      ['instalacao', 'Como instalar os indicadores', 'Passo a passo para MetaTrader 5 e Profit.', '', '', null, 0],
      ['indicador', 'VWAP Diário', 'Preço médio do dia, zerado a cada pregão. A âncora do setup.', '', 'MT5', null, 1],
      ['indicador', 'VWAP Ancorada', 'Até 4 VWAPs ancoradas com um clique: 2 de compra e 2 de venda.', '', 'MT5', null, 2],
      ['indicador', 'Volume Profile', 'POC, VAH e VAL de 1 a 10 dias, com área de valor de 70%.', '', 'MT5', null, 3],
      ['indicador', 'Fibonacci', 'Projeções de alvo 1.0, 1.27 e 1.618 a partir do último movimento.', '', 'MT5', null, 4],
      ['indicador', 'Volume Agressão', 'Weis Wave de 5 ticks: quem está agredindo agora.', '', 'MT5 · Profit', null, 5],
      ['indicador', 'Volume Negociado', 'Weis Wave de 15 ticks: o fluxo no contexto do dia.', '', 'MT5 · Profit', null, 6],
      ['indicador', 'Força vs Resultado', 'Esforço (volume) contra resultado (preço) por onda, em 5 e 15 ticks.', '', 'MT5', null, 7],
      ['indicador', 'Volume Barras', 'Pinta os candles por volume: branco, amarelo, laranja e vermelho.', '', 'MT5 · Profit', null, 8],
    ].map(([tipo, titulo, descricao, url, plataforma, planos, ordem], i) => ({ id: i + 1, tipo, titulo, descricao, url, plataforma, planos: planos || ['lives', 'sala', 'mentoria'], ordem, ativo: true })),
    proximoId: 1000,
  }
}

function criarRepoDemo() {
  const CHAVE = 'tp-area-demo-v2'
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || semente() } catch (_) { return semente() } }
  let db = ler()
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)) } catch (_) {} }
  const ouvintes = []
  const avisar = (e) => ouvintes.forEach((cb) => cb(e))
  const eu = () => db.sessao?.email || ''
  const minha = () => db.assinaturas.find((a) => a.email === eu()) || null
  const admin = () => db.admins.includes(eu())
  const planoAtivo = () => (emDia(minha()) ? minha().plano : null)
  const podeCurso = (id) => { const c = db.cursos.find((x) => x.id === id); return admin() || (!!c && c.ativo && (c.gratuito || c.planos.includes(planoAtivo()))) }
  const copia = (x) => JSON.parse(JSON.stringify(x))

  return {
    async sessao() { return db.sessao },
    aoMudarSessao(cb) { ouvintes.push(cb) },
    async entrar(email) {
      email = email.trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.')
      db.sessao = { email, nome: minha()?.nome || '' }; salvar(); avisar('SIGNED_IN')
    },
    async primeiroAcesso(nome, email) {
      db.sessao = { email: email.trim().toLowerCase(), nome }; salvar(); avisar('SIGNED_IN')
      return { precisaConfirmar: false }
    },
    async esqueci() {},
    async novaSenha() {},
    async sair() { db.sessao = null; salvar(); avisar('SIGNED_OUT') },

    async minhaAssinatura() { return copia(minha()) },
    async souAdmin() { return admin() },
    async avisos() { return copia(db.avisos.filter((a) => a.ativo)) },
    async agenda() {
      const desde = Date.now() - 3 * 3600e3
      return copia(db.agenda.filter((e) => new Date(e.inicio).getTime() >= desde && (admin() || e.tipo === 'evento' || e.planos.includes(planoAtivo())))
        .sort((a, b) => a.inicio.localeCompare(b.inicio)))
    },
    async cursos() { return copia(db.cursos.filter((c) => c.ativo).sort((a, b) => a.ordem - b.ordem)) },
    async aulas() { return copia(db.aulas.filter((a) => podeCurso(a.curso_id))) },
    async meuProgresso() { return new Set(db.progresso.filter((p) => p.email === eu() && p.concluida).map((p) => p.aula_id)) },
    async marcarAula(aulaId, concluida) {
      db.progresso = db.progresso.filter((p) => !(p.email === eu() && p.aula_id === aulaId))
      db.progresso.push({ email: eu(), aula_id: aulaId, concluida }); salvar()
    },
    async analises() { return planoAtivo() || admin() ? copia([...db.analises].sort((a, b) => b.criado_em.localeCompare(a.criado_em))) : [] },
    async conteudo() { return copia(db.conteudo.filter((c) => c.ativo && (admin() || c.planos.includes(planoAtivo()))).sort((a, b) => a.ordem - b.ordem)) },
    async anotacoes() { return copia(db.anotacoes.filter((a) => a.email === eu()).sort((a, b) => b.criado_em.localeCompare(a.criado_em))) },
    async salvarAnotacao(a) {
      if (a.id) db.anotacoes = db.anotacoes.map((x) => (x.id === a.id && x.email === eu() ? { ...x, ...a } : x))
      else db.anotacoes.push({ ...a, id: db.proximoId++, email: eu(), criado_em: new Date().toISOString() })
      salvar()
    },
    async removerAnotacao(id) { db.anotacoes = db.anotacoes.filter((x) => !(x.id === id && x.email === eu())); salvar() },

    async listar(tabela) { return copia(db[tabela]) },
    async salvar(tabela, obj) {
      const chave = CHAVES[tabela]
      const linha = { ...obj }
      if (tabela === 'assinaturas') linha.email = linha.email.trim().toLowerCase()
      if (chave === 'id' && !linha.id) { linha.id = db.proximoId++; db[tabela].push(linha) }
      else {
        const i = db[tabela].findIndex((x) => x[chave] === linha[chave])
        if (i >= 0) db[tabela][i] = { ...db[tabela][i], ...linha }; else db[tabela].push(linha)
      }
      salvar()
    },
    async remover(tabela, valor) { db[tabela] = db[tabela].filter((x) => x[CHAVES[tabela]] !== valor); salvar() },
    async renovar(email, dias = 30) {
      const a = db.assinaturas.find((x) => x.email === email)
      a.acesso_ate = maisDias(a.acesso_ate && a.acesso_ate > hojeSP() ? a.acesso_ate : hojeSP(), dias); salvar()
    },
    reiniciarDemo() { db = semente(); salvar() },
  }
}

export const repo = DEMO ? criarRepoDemo() : await criarRepoSupabase()

// Área do aluno · Trader Positivo — casca, rotas (#/...) e telas
import { repo, DEMO, PLANOS, emDia, hojeSP } from './repo.js'
import { TRADERSYSTEM_URL, RENOVAR_URL, SUPORTE_URL, NOME_SALA } from './config.js'

const $ = (id) => document.getElementById(id)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const link = (u) => (/^https?:\/\//i.test(u || '') ? u : '')
const TZ = 'America/Sao_Paulo'
const dataBR = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
const diaCurto = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: TZ })
const mesCurto = (iso) => new Date(iso).toLocaleDateString('pt-BR', { month: 'short', timeZone: TZ }).replace('.', '').toUpperCase()
const semana = (iso) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: TZ }).replace('.', '').toUpperCase()
const diaSP = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: TZ })
function rotuloDia(iso) {
  const d = diaSP(iso), hoje = hojeSP()
  const amanha = new Date(Date.now() + 864e5).toLocaleDateString('sv-SE', { timeZone: TZ })
  return d === hoje ? 'HOJE' : d === amanha ? 'AMANHÃ' : semana(iso)
}
function falta(iso) {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000)
  if (m <= 0) return 'agora'
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60
  return d ? `${d}d ${h}h` : h ? `${h}h${String(mm).padStart(2, '0')}` : `${mm} min`
}
function quando(iso) {
  const d = diaSP(iso)
  if (d === hojeSP()) return `hoje, ${hora(iso)}`
  return `${dataBR(d).slice(0, 5)}, ${hora(iso)}`
}
function ytId(u) {
  const m = String(u || '').match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/|\/shorts\/)([\w-]{11})/)
  return m ? m[1] : ''
}

// ── ícones (traço simples) ──────────────────────────────────────────────────
const I = {
  inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  mentoria: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  sala: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
  mercado: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  cursos: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/><path d="M6.5 17A2.5 2.5 0 0 0 4 19.5"/>',
  caderno: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  indicadores: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  explorar: '<circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
  eventos: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  sistema: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  mais: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  externo: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
}
const icone = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${I[n] || ''}</svg>`

// ── estado ──────────────────────────────────────────────────────────────────
const S = { sessao: null, assin: null, admin: false, liberado: false, plus: false, d: {} }
const plano = () => S.assin?.plano
async function carregarTudo() {
  const [assin, admin] = await Promise.all([repo.minhaAssinatura(), repo.souAdmin()])
  S.assin = assin; S.admin = admin
  S.liberado = admin || emDia(assin)
  S.plus = admin || (S.liberado && !!assin?.tradersystem)
  const [avisos, agenda, cursos, aulas, progresso, analises, conteudo, anotacoes] = await Promise.all([
    repo.avisos(), repo.agenda(), repo.cursos(), repo.aulas(), repo.meuProgresso(), repo.analises(), repo.conteudo(), repo.anotacoes(),
  ])
  S.d = { avisos, agenda, cursos, aulas, progresso, analises, conteudo, anotacoes }
}
const aulasDe = (cursoId) => S.d.aulas.filter((a) => a.curso_id === cursoId).sort((a, b) => a.numero - b.numero)
const cursoGravacoes = () => S.d.cursos.find((c) => c.tipo === 'gravacoes')
const cursoLiberado = (c) => S.admin || (c.gratuito) || (S.liberado && c.planos.includes(plano()))
const linkSalaPadrao = () => S.d.conteudo.find((c) => c.tipo === 'sala')?.url || ''

// ── menu ────────────────────────────────────────────────────────────────────
const MENU = [
  ['inicio', 'Início', 'inicio'], ['mentoria', 'Mentoria', 'mentoria'], ['sala', 'Sala ao vivo', 'sala'], ['mercado', 'Mercado', 'mercado'],
  ['cursos', 'Meus cursos', 'cursos'], ['caderno', 'Meu caderno', 'caderno'], ['indicadores', 'Indicadores', 'indicadores'],
  ['explorar', 'Explorar', 'explorar'], ['eventos', 'Eventos abertos', 'eventos'],
]
function desenharMenu() {
  const sistema = S.plus
    ? `<a class="item-menu" href="${esc(TRADERSYSTEM_URL)}" target="_blank" rel="noopener">${icone('sistema')}Gestão de Risco <span class="tag plus">PLUS</span></a>`
    : `<a class="item-menu" href="#/tradersystem" data-rota="tradersystem">${icone('sistema')}Gestão de Risco <span class="tag plus">PLUS</span></a>`
  $('menuLateral').innerHTML = `
    <a class="logo" href="#/inicio"><img src="../favicon.svg" alt=""><b>Trader Positivo<span>ÁREA DO ALUNO</span></b></a>
    ${MENU.map(([r, t, ic]) => `<a class="item-menu" href="#/${r}" data-rota="${r}">${icone(ic)}${t}</a>`).join('')}
    <div class="menu-sep"></div>
    ${sistema}
    ${S.admin ? `<a class="item-menu" href="admin.html">${icone('mais')}Administração</a>` : ''}
    <div class="menu-rodape">Conteúdo educacional. Não é recomendação de investimento.</div>`
  $('barraInferior').innerHTML = [['inicio', 'Início', 'inicio'], ['mentoria', 'Mentoria', 'mentoria'], ['sala', 'Ao vivo', 'sala'], ['mercado', 'Mercado', 'mercado'], ['cursos', 'Cursos', 'cursos']]
    .map(([r, t, ic]) => `<a href="#/${r}" data-rota="${r}">${icone(ic)}${t}</a>`).join('') + `<button type="button" id="maisMenu">${icone('mais')}Mais</button>`
  $('maisMenu').onclick = abrirMenu
  const nome = S.assin?.nome || S.sessao.nome || S.sessao.email
  $('avatar').textContent = nome.trim()[0]?.toUpperCase() || '?'
  $('topoAdmin').hidden = !S.admin
  $('menuConta').innerHTML = `<div class="quem">${esc(S.sessao.email)}<br>${S.admin ? 'Administrador' : esc(PLANOS[plano()] || 'Sem plano')}</div>
    <a href="#/inicio">Meu plano</a>${S.admin ? '<a href="admin.html">Administração</a>' : ''}
    <a href="${esc(SUPORTE_URL)}" target="_blank" rel="noopener">Falar com a equipe</a><button type="button" id="sair">Sair</button>`
  $('sair').onclick = async () => { await repo.sair(); iniciar() }
  $('atendimento').href = SUPORTE_URL
}
function abrirMenu() { $('menuLateral').classList.add('aberto'); $('veu').hidden = false }
function fecharMenu() { $('menuLateral').classList.remove('aberto'); $('veu').hidden = true }
$('abrirMenu').onclick = abrirMenu
$('veu').onclick = fecharMenu
$('avatar').onclick = (e) => { e.stopPropagation(); $('menuConta').hidden = !$('menuConta').hidden }
document.addEventListener('click', () => { $('menuConta').hidden = true })

// ── pedaços reutilizados ────────────────────────────────────────────────────
function faixaAcesso() {
  if (DEMO) return `<div class="faixa demo"><span>Modo demonstração: dados de exemplo só neste navegador.</span><button type="button" data-acao="reiniciar">Reiniciar exemplo</button></div>`
  return ''
}
function faixaPlano() {
  if (S.admin) return ''
  if (!S.assin) return `<div class="faixa ruim"><span>Não encontramos um plano para ${esc(S.sessao.email)}. Entre com o e-mail da compra ou <a href="${esc(SUPORTE_URL)}" target="_blank" rel="noopener">fale com a equipe</a>.</span></div>`
  if (!S.liberado) return `<div class="faixa ruim"><span style="flex:1">Seu plano venceu em <b>${dataBR(S.assin.acesso_ate)}</b>. Renove para voltar à sala, às gravações e aos indicadores.</span><a class="btn ouro peq" href="${esc(RENOVAR_URL)}">Renovar</a></div>`
  return `<div class="faixa ok"><span>Seu acesso está liberado até <b>${dataBR(S.assin.acesso_ate)}</b>: sala ao vivo, gravações, cursos${S.plus ? ', indicadores e o TraderSystem' : ' e indicadores'}.</span></div>`
}
function bloqueado(oque) {
  return `<div class="card vazio">${icone('cadeado', 'style="width:28px;height:28px;margin-bottom:8px"')}<br>
    ${S.assin ? `${esc(oque)} volta assim que o plano for renovado.` : `${esc(oque)} é para alunos com plano ativo.`}<br><br>
    <a class="btn ouro peq" href="${esc(RENOVAR_URL)}">${S.assin ? 'Renovar plano' : 'Conhecer os planos'}</a></div>`
}
function cartaoEncontro(e, grande = false) {
  return `<div style="display:flex;gap:14px;align-items:center">
    <div style="text-align:center;min-width:58px;border:1px solid var(--linha2);border-radius:12px;padding:6px 4px">
      <div class="fraco" style="font-size:11px;font-weight:700">${rotuloDia(e.inicio)}</div>
      <div class="mono" style="font-size:${grande ? 28 : 22}px;font-weight:700;line-height:1.1">${diaCurto(e.inicio)}</div>
      <div class="fraco" style="font-size:11px;font-weight:700">${mesCurto(e.inicio)}</div>
    </div>
    <div style="min-width:0">
      <div class="mono" style="color:var(--gold2);font-weight:700">${hora(e.inicio)}</div>
      <div style="font-weight:700;font-size:${grande ? 19 : 16}px">${esc(e.titulo)}</div>
      <div class="fraco">${e.fim ? `até ${hora(e.fim)} · ` : ''}com ${esc(e.com)} · Zoom</div>
    </div></div>`
}
function analiseCard(a) {
  const dir = { compra: 'Compra', venda: 'Venda', neutro: 'Neutro' }[a.direcao]
  return `<div class="card" style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="tag">${esc(a.momento)}</span></div>
    <div style="display:flex;gap:8px;align-items:center"><b class="mono" style="font-size:20px">${esc(a.ativo)}</b><span class="tag ${a.direcao}">${dir}</span></div>
    ${link(a.imagem_url) ? `<img src="${esc(a.imagem_url)}" alt="" style="width:100%;border-radius:10px;border:1px solid var(--linha)">` : ''}
    <p style="font-size:14.5px">${esc(a.texto)}</p>
    <div class="fraco">${esc(a.autor)} · ${quando(a.criado_em)}</div></div>`
}
function aulaLinha(a, feito) {
  return `<a class="card" href="#/aula/${a.id}" style="display:flex;gap:14px;align-items:center;padding:14px 16px;color:var(--fg)">
    <div style="width:40px;height:40px;border-radius:10px;display:grid;place-items:center;flex-shrink:0;background:${feito ? 'var(--green-bg)' : 'var(--gold-bg)'};color:${feito ? 'var(--green)' : 'var(--gold2)'}">${icone(feito ? 'check' : 'play', 'style="width:18px;height:18px"')}</div>
    <div style="min-width:0;flex:1"><div class="fraco">Aula ${a.numero}${a.bloco ? ' · ' + esc(a.bloco) : ''}</div><div style="font-weight:700">${esc(a.titulo)}</div></div>
    ${a.duracao ? `<span class="mono fraco">${esc(a.duracao)}</span>` : ''}</a>`
}
function caixaAnotacao(contexto, ref = {}) {
  return `<form class="nova-anotacao" data-contexto="${contexto}" data-ref="${esc(ref.id || '')}" data-reftitulo="${esc(ref.titulo || '')}">
    ${contexto === 'aula' ? '<div class="grupo" style="max-width:140px"><label>Minuto do vídeo</label><input class="campo" name="minuto" placeholder="12:40"></div>' : ''}
    <textarea class="campo" name="texto" placeholder="Escreva sua anotação..." required></textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px;flex-wrap:wrap">
      <span class="fraco">Só você vê suas anotações.</span><button class="btn ouro peq" type="submit">Salvar anotação</button></div>
    <p class="msg"></p></form>`
}
function listaAnotacoes(lista, comApagar = true) {
  if (!lista.length) return '<div class="card vazio">Nada anotado ainda.</div>'
  return lista.map((n) => `<div class="card" style="padding:14px 16px">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
      <div class="fraco">${{ aula: 'Aula', sala: 'Sala ao vivo', solta: 'Anotação solta' }[n.contexto]}${n.ref_titulo ? ' · ' + esc(n.ref_titulo) : ''}${n.minuto ? ` · <a href="#/aula/${n.ref_id}">${esc(n.minuto)}</a>` : ''} · ${quando(n.criado_em)}</div>
      ${comApagar ? `<button class="btn contorno peq" data-apagar-nota="${n.id}" type="button">Apagar</button>` : ''}</div>
    <p style="margin-top:6px;white-space:pre-wrap">${esc(n.texto)}</p></div>`).join('')
}

// ── telas ───────────────────────────────────────────────────────────────────
const TELAS = {}

TELAS.inicio = () => {
  const nome = (S.assin?.nome || S.sessao.nome || S.sessao.email.split('@')[0]).split(' ')[0]
  const h = Number(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, timeZone: TZ }))
  const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const proximo = S.d.agenda.find((e) => e.tipo !== 'evento' && new Date(e.fim || e.inicio) > new Date())
  const grav = cursoGravacoes(), aulasGrav = grav ? aulasDe(grav.id) : []
  const ultima = [...aulasGrav].sort((a, b) => b.numero - a.numero)[0]
  const aviso = S.d.avisos[0]
  return `${faixaAcesso()}${faixaPlano()}
  <div style="margin-bottom:16px"><h2 style="font-size:30px">${saud}, ${esc(nome)}</h2>
    <p class="fraco" style="margin-top:4px">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })} · ${esc(NOME_SALA)}</p></div>
  ${aviso ? `<div class="card" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px;padding:14px 18px">
    <div><div class="olho">📣 Aviso da equipe</div><div style="margin-top:4px">${esc(aviso.texto)}</div></div>${link(aviso.link) ? `<a class="btn contorno peq" href="${esc(aviso.link)}" target="_blank" rel="noopener">Ler</a>` : ''}</div>` : ''}

  <div class="card realce" style="display:grid;gap:18px;grid-template-columns:minmax(0,1fr);background:linear-gradient(120deg, rgba(212,165,44,.10), var(--card) 55%)">
    <div>
      <div class="olho">✦ Comece por aqui</div>
      <h2 class="display" style="font-size:clamp(34px,6vw,54px);margin:10px 0 12px">Bem-vindo à<br><em>${esc(NOME_SALA)}</em></h2>
      <p class="sub" style="max-width:40em">Operação ao vivo de WIN e WDO, com leitura de fluxo e gestão de risco. Tudo o que o seu plano inclui está aqui, num lugar só.</p>
      <div class="chips" style="margin-top:16px">
        <a class="chip" href="#/sala">🔴 Sala ao vivo</a><a class="chip" href="#/mentoria">▶ Gravações</a><a class="chip" href="#/cursos">📚 Cursos</a>
        <a class="chip" href="#/mercado">📈 Análises do dia</a><a class="chip" href="#/indicadores">⚙ Indicadores</a><a class="chip" href="#/caderno">✎ Caderno</a>
      </div>
    </div>
  </div>

  <div class="grade g3" style="margin-top:14px">
    <div class="card">
      <div class="card-topo"><span class="olho">Próximo encontro</span>${proximo ? `<span class="tag ouro">${new Date(proximo.inicio) <= new Date() ? 'AO VIVO' : 'em ' + falta(proximo.inicio)}</span>` : ''}</div>
      ${!S.liberado ? bloqueado('A sala ao vivo') : proximo ? `${cartaoEncontro(proximo, true)}<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><a class="btn ouro peq" href="#/sala">Ver encontro</a></div><p class="fraco" style="margin-top:10px">A sala abre 15 min antes.</p>`
        : '<p class="sub">Nenhum encontro marcado.</p>'}
    </div>
    <div class="card">
      <div class="card-topo"><span class="olho">Última gravação</span>${ultima ? '<span class="tag">Novo</span>' : ''}</div>
      ${!S.liberado ? bloqueado('As gravações') : ultima ? `<div style="font-weight:700;font-size:18px">${esc(ultima.titulo)}</div>
        <p class="fraco" style="margin:6px 0 14px">Gravação da sala · Aula ${ultima.numero}${ultima.bloco ? ' · ' + esc(ultima.bloco) : ''}${ultima.duracao ? ' · ' + esc(ultima.duracao) : ''}</p>
        <a class="btn ouro peq" href="#/aula/${ultima.id}">${icone('play', 'style="width:14px;height:14px"')} Assistir agora</a>` : '<p class="sub">As gravações aparecem aqui.</p>'}
    </div>
    <div class="card ${S.liberado ? '' : 'realce'}">
      <div class="card-topo"><span class="olho">Meu plano</span>${S.admin ? '<span class="tag ouro">Admin</span>' : S.liberado ? '<span class="tag compra">Ativo</span>' : '<span class="tag venda">Vencido</span>'}</div>
      <div style="font-weight:700;font-size:20px">${S.admin ? 'Acesso completo' : esc(PLANOS[plano()] || 'Sem plano')}</div>
      <p class="fraco" style="margin:4px 0 12px">${S.assin ? (S.liberado ? 'Liberado até ' : 'Venceu em ') + dataBR(S.assin.acesso_ate) : ''}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--linha);border-radius:12px">
        <div><div style="font-weight:700">TraderSystem <span class="tag plus">PLUS</span></div><div class="fraco">${S.plus ? 'Incluído no seu plano' : 'Adicional da assinatura'}</div></div>
        ${S.plus ? `<a class="btn leve peq" href="${esc(TRADERSYSTEM_URL)}" target="_blank" rel="noopener">Abrir ↗</a>` : '<a class="btn contorno peq" href="#/tradersystem">Conhecer</a>'}
      </div>
      ${!S.liberado && !S.admin ? `<a class="btn ouro" style="width:100%;margin-top:12px" href="${esc(RENOVAR_URL)}">Renovar plano</a>` : ''}
    </div>
  </div>

  <div class="secao"><div class="secao-topo"><h3>Últimas análises</h3><a href="#/mercado" class="fraco">Ver todas →</a></div>
    ${!S.liberado ? bloqueado('As análises do dia') : S.d.analises.length ? `<div class="grade g3">${S.d.analises.slice(0, 3).map(analiseCard).join('')}</div>` : '<div class="card vazio">As análises do dia aparecem aqui.</div>'}</div>

  <div class="grade g2 secao">
    <div class="card"><div class="card-topo"><span class="olho">Caderno de anotações</span><a href="#/caderno" class="fraco">Abrir →</a></div>${caixaAnotacao('solta')}</div>
    <div class="card"><div class="card-topo"><span class="olho">Mercado hoje</span><a href="#/mercado/relogio" class="fraco">Relógio →</a></div>${resumoMercado()}</div>
  </div>`
}

// relógio das bolsas: horários de referência no fuso de cada praça
const PRACAS = [
  { nome: 'B3 · São Paulo', tz: 'America/Sao_Paulo', abre: '09:00', fecha: '18:25', foco: 'WIN e WDO' },
  { nome: 'Nova York', tz: 'America/New_York', abre: '09:30', fecha: '16:00', foco: 'S&P 500, Nasdaq, Dow' },
  { nome: 'Londres', tz: 'Europe/London', abre: '08:00', fecha: '16:30', foco: 'FTSE, libra' },
  { nome: 'Tóquio', tz: 'Asia/Tokyo', abre: '09:00', fecha: '15:00', foco: 'Nikkei, iene' },
]
function estadoPraca(p) {
  const agora = new Date()
  const dia = agora.toLocaleDateString('en-US', { weekday: 'short', timeZone: p.tz })
  const hm = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: p.tz })
  const aberta = !['Sat', 'Sun'].includes(dia) && hm >= p.abre && hm < p.fecha
  return { aberta, hm }
}
function resumoMercado() {
  const b3 = estadoPraca(PRACAS[0]), ny = estadoPraca(PRACAS[1])
  return `<ul style="list-style:none;display:grid;gap:10px">
    <li class="sub">B3 ${b3.aberta ? '<b style="color:var(--green)">aberta</b>' : '<b style="color:var(--fg3)">fechada</b>'} agora (${b3.hm}). Foco: mini índice (WIN) e mini dólar (WDO).</li>
    <li class="sub">Nova York ${ny.aberta ? '<b style="color:var(--green)">aberta</b>' : '<b style="color:var(--fg3)">fechada</b>'} (${ny.hm} lá). O humor de lá mexe no índice daqui.</li>
    <li class="sub">Confira as notícias de alto impacto no <a href="#/mercado/calendario">calendário econômico</a> antes de operar.</li></ul>`
}

TELAS.mentoria = (args) => {
  const grav = cursoGravacoes()
  const lista = grav ? aulasDe(grav.id) : []
  const blocos = [...new Set(lista.map((a) => a.bloco).filter(Boolean))]
  const filtro = args[0] ? decodeURIComponent(args[0]) : ''
  const prox = lista.find((a) => !S.d.progresso.has(a.id))
  const encontros = S.d.agenda.filter((e) => e.tipo === 'mentoria')
  const mostradas = [...lista].filter((a) => !filtro || a.bloco === filtro).sort((a, b) => b.numero - a.numero)
  return `${faixaAcesso()}${faixaPlano()}
  <div class="cabeca-pag"><div class="olho">${esc(NOME_SALA)}</div><h2>Mentoria</h2><p>As gravações das sessões ao vivo e os encontros da mentoria.</p></div>
  ${!S.liberado ? bloqueado('A mentoria') : `
  <div class="grade g2">
    <div class="card realce"><div class="olho">Gravações da sala</div>
      <p class="sub" style="margin:8px 0 14px">${prox ? (S.d.progresso.size ? 'Continue de onde parou:' : 'Você ainda não começou: comece pela aula 1.') : 'Você já assistiu a todas. 🎉'}</p>
      ${prox ? `<div style="font-weight:700;font-size:18px">${esc(prox.titulo)}</div><p class="fraco" style="margin:4px 0 14px">Aula ${prox.numero}${prox.bloco ? ' · ' + esc(prox.bloco) : ''}</p>
      <a class="btn ouro peq" href="#/aula/${prox.id}">${icone('play', 'style="width:14px;height:14px"')} ${S.d.progresso.size ? 'Continuar' : 'Começar pela aula 1'}</a>` : ''}
    </div>
    <div class="card"><div class="card-topo"><span class="olho">Encontros da mentoria</span><a class="fraco" href="#/sala">Agenda completa →</a></div>
      ${encontros.length ? encontros.slice(0, 3).map((e) => `<div style="margin-bottom:12px">${cartaoEncontro(e)}</div>`).join('') : `<p class="sub">${plano() === 'mentoria' || S.admin ? 'Nenhum encontro marcado.' : 'Os encontros fazem parte do plano Mentoria.'}</p>`}
    </div>
  </div>
  <div class="secao"><div class="secao-topo"><div><h3>Gravações</h3><p class="fraco">Da mais recente para a primeira. Filtre por bloco.</p></div></div>
    <div class="chips" style="margin-bottom:14px"><a class="chip" href="#/mentoria" aria-pressed="${!filtro}">Todas <b>${lista.length}</b></a>
      ${blocos.map((b) => `<a class="chip" href="#/mentoria/${encodeURIComponent(b)}" aria-pressed="${filtro === b}">${esc(b)} <b>${lista.filter((a) => a.bloco === b).length}</b></a>`).join('')}</div>
    <div style="display:grid;gap:8px">${mostradas.length ? mostradas.map((a) => aulaLinha(a, S.d.progresso.has(a.id))).join('') : '<div class="card vazio">As gravações aparecem aqui.</div>'}</div>
  </div>`}`
}

TELAS.sala = () => {
  const sessoes = S.d.agenda.filter((e) => e.tipo !== 'evento')
  const prox = sessoes.find((e) => new Date(e.fim || e.inicio) > new Date())
  const agora = Date.now()
  const aberta = prox && agora >= new Date(prox.inicio).getTime() - 15 * 60e3 && agora <= new Date(prox.fim || prox.inicio).getTime()
  const url = link(prox?.link) || link(linkSalaPadrao())
  const notas = S.d.anotacoes.filter((n) => n.contexto === 'sala').slice(0, 5)
  return `${faixaAcesso()}${faixaPlano()}
  <div class="cabeca-pag"><h2>Sala ao vivo</h2><p>Segunda a sexta, operando WIN e WDO ao vivo com o Marcelo.</p></div>
  ${!S.liberado ? bloqueado('A sala ao vivo') : !['sala', 'mentoria'].includes(plano()) && !S.admin ? `<div class="card vazio">A sala ao vivo faz parte dos planos Sala ao Vivo e Mentoria.<br><br><a class="btn ouro peq" href="${esc(RENOVAR_URL)}">Conhecer os planos</a></div>` : `
  <div class="grade g2">
    <div class="card realce"><div class="card-topo"><span class="olho">Próxima sessão</span>${prox ? `<span class="tag ouro">${aberta ? 'AO VIVO' : 'em ' + falta(prox.inicio)}</span>` : ''}</div>
      ${prox ? `${cartaoEncontro(prox, true)}
        <div style="margin-top:16px">${(aberta || S.admin) && url ? `<a class="btn ouro" href="${esc(url)}" target="_blank" rel="noopener">🔴 Entrar na sala</a>` : `<span class="btn travado">O botão de entrar aparece 15 min antes</span>`}</div>`
      : '<p class="sub">Nenhuma sessão marcada.</p>'}
    </div>
    <div class="card"><div class="card-topo"><span class="olho">Próximas sessões</span></div>
      ${sessoes.slice(0, 5).map((e) => `<div style="padding:10px 0;border-top:1px solid var(--linha)">${cartaoEncontro(e)}</div>`).join('') || '<p class="sub">Nenhuma sessão marcada.</p>'}
    </div>
  </div>
  <div class="secao card"><div class="card-topo"><span class="olho">Caderno da sala</span><a class="fraco" href="#/caderno/sala">Tudo da sala →</a></div>
    ${caixaAnotacao('sala', { titulo: `Sala ao vivo · ${dataBR(hojeSP())}` })}
    <div style="display:grid;gap:8px;margin-top:14px">${listaAnotacoes(notas)}</div></div>`}`
}

TELAS.mercado = (args) => {
  const aba = args[0] || 'analises'
  const filtroAtivo = args[1] || 'todos'
  const abas = `<div class="chips" style="margin-bottom:16px">
    <a class="chip" href="#/mercado/analises" aria-pressed="${aba === 'analises'}">Análises</a>
    <a class="chip" href="#/mercado/calendario" aria-pressed="${aba === 'calendario'}">Calendário econômico</a>
    <a class="chip" href="#/mercado/relogio" aria-pressed="${aba === 'relogio'}">Relógio das bolsas</a></div>`
  let corpo = ''
  if (aba === 'analises') {
    const lista = S.d.analises.filter((a) => filtroAtivo === 'todos' || (filtroAtivo === 'outros' ? !['WIN', 'WDO'].includes(a.ativo) : a.ativo === filtroAtivo.toUpperCase()))
    corpo = !S.liberado ? bloqueado('As análises do dia') : `<p class="fraco" style="margin-bottom:10px">Publicações do Marcelo e da equipe.</p>
      <div class="chips" style="margin-bottom:14px">${[['todos', 'Todos'], ['win', 'WIN'], ['wdo', 'WDO'], ['outros', 'Outros']].map(([v, t]) => `<a class="chip" href="#/mercado/analises/${v}" aria-pressed="${filtroAtivo === v}">${t}</a>`).join('')}</div>
      ${lista.length ? `<div class="grade g3">${lista.map(analiseCard).join('')}</div>` : '<div class="card vazio">Nenhuma análise com esse filtro.</div>'}`
  } else if (aba === 'relogio') {
    corpo = `<div class="grade g2">${PRACAS.map((p) => { const e = estadoPraca(p); return `<div class="card"><div class="card-topo"><b>${p.nome}</b><span class="tag ${e.aberta ? 'compra' : ''}">${e.aberta ? 'Aberta' : 'Fechada'}</span></div>
      <div class="mono" style="font-size:34px;font-weight:700">${e.hm}</div><p class="fraco">Pregão ${p.abre}–${p.fecha} (hora local) · ${p.foco}</p></div>` }).join('')}</div>
      <p class="fraco" style="margin-top:12px">Horários de referência. Feriados e mudanças de horário podem alterar a abertura; confira sempre a B3.</p>`
  } else {
    corpo = `<div class="card" style="padding:8px"><div id="calendarioTV" style="min-height:600px"></div></div><p class="fraco" style="margin-top:8px">Calendário fornecido pelo TradingView.</p>`
  }
  return `${faixaAcesso()}<div class="cabeca-pag"><h2>Mercado</h2><p>Análises do dia, calendário econômico e o relógio das bolsas.</p></div>${abas}${corpo}`
}

TELAS.cursos = (args) => {
  const filtro = args[0] || 'todos'
  const meus = S.d.cursos.filter((c) => c.tipo === 'curso' && cursoLiberado(c)).map((c) => {
    const aulas = aulasDe(c.id), feitas = aulas.filter((a) => S.d.progresso.has(a.id)).length
    return { ...c, total: aulas.length, feitas }
  })
  const lista = meus.filter((c) => filtro === 'todos' || (filtro === 'andamento' ? c.feitas > 0 && c.feitas < c.total : c.total > 0 && c.feitas === c.total))
  return `${faixaAcesso()}${faixaPlano()}
  <div class="cabeca-pag"><h2>Meus cursos</h2><p>Tudo o que está liberado para você, com o quanto já avançou em cada um.</p></div>
  <div class="chips" style="margin-bottom:16px">
    <a class="chip" href="#/cursos" aria-pressed="${filtro === 'todos'}">Todos <b>${meus.length}</b></a>
    <a class="chip" href="#/cursos/andamento" aria-pressed="${filtro === 'andamento'}">Em andamento <b>${meus.filter((c) => c.feitas > 0 && c.feitas < c.total).length}</b></a>
    <a class="chip" href="#/cursos/concluidos" aria-pressed="${filtro === 'concluidos'}">Concluídos <b>${meus.filter((c) => c.total && c.feitas === c.total).length}</b></a></div>
  ${lista.length ? `<div class="grade g3">${lista.map(cartaoCurso).join('')}</div>` : `<div class="card vazio">${meus.length ? 'Nenhum curso com esse filtro.' : 'Nenhum curso liberado. Veja os cursos em <a href="#/explorar">Explorar</a>.'}</div>`}`
}
function cartaoCurso(c) {
  const pct = c.total ? Math.round((c.feitas / c.total) * 100) : 0
  return `<a class="card" href="#/curso/${c.id}" style="display:flex;flex-direction:column;gap:10px;color:var(--fg)">
    <div style="aspect-ratio:16/8;border-radius:12px;background:${link(c.capa_url) ? `center/cover url('${esc(c.capa_url)}')` : 'linear-gradient(135deg,#1b1608,#0d0f12)'};border:1px solid var(--linha);display:flex;align-items:flex-end;padding:12px">
      ${link(c.capa_url) ? '' : `<span class="display" style="font-size:24px">${esc(c.titulo)}</span>`}</div>
    <div class="fraco">${esc(c.tema)}${c.gratuito ? ' · Gratuito' : ''}</div><div style="font-weight:700;font-size:17px">${esc(c.titulo)}</div>
    <div class="barra-prog"><i style="width:${pct}%"></i></div>
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="fraco">${c.feitas} de ${c.total} aulas</span><span class="btn leve peq">${c.feitas ? 'Continuar' : 'Começar'}</span></div></a>`
}

TELAS.curso = (args) => {
  const c = S.d.cursos.find((x) => String(x.id) === args[0])
  if (!c) return '<div class="card vazio">Curso não encontrado. <a href="#/cursos">Voltar</a></div>'
  if (!cursoLiberado(c)) return `${faixaPlano()}<div class="cabeca-pag"><h2>${esc(c.titulo)}</h2></div>${bloqueado('Este curso')}`
  const aulas = aulasDe(c.id)
  const blocos = [...new Set(aulas.map((a) => a.bloco || 'Aulas'))]
  const feitas = aulas.filter((a) => S.d.progresso.has(a.id)).length
  const prox = aulas.find((a) => !S.d.progresso.has(a.id)) || aulas[0]
  return `${faixaAcesso()}<a class="fraco" href="#/cursos">← Meus cursos</a>
  <div class="cabeca-pag" style="margin-top:10px"><div class="olho">${esc(c.tema)}</div><h2>${esc(c.titulo)}</h2><p>${esc(c.descricao)}</p></div>
  <div class="card realce" style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
    <div style="flex:1;min-width:200px"><div class="fraco">${feitas} de ${aulas.length} aulas concluídas</div><div class="barra-prog" style="margin-top:8px"><i style="width:${aulas.length ? Math.round(feitas / aulas.length * 100) : 0}%"></i></div></div>
    ${prox ? `<a class="btn ouro" href="#/aula/${prox.id}">${icone('play', 'style="width:14px;height:14px"')} ${feitas ? 'Continuar' : 'Começar'}</a>` : ''}</div>
  ${blocos.map((b) => `<div class="secao"><h3 style="margin-bottom:10px">${esc(b)}</h3><div style="display:grid;gap:8px">
    ${aulas.filter((a) => (a.bloco || 'Aulas') === b).map((a) => aulaLinha(a, S.d.progresso.has(a.id))).join('')}</div></div>`).join('') || '<div class="card vazio secao">As aulas deste curso aparecem aqui.</div>'}`
}

TELAS.aula = (args) => {
  const a = S.d.aulas.find((x) => String(x.id) === args[0])
  if (!a) return `${faixaPlano()}${S.liberado ? '<div class="card vazio">Aula não encontrada. <a href="#/cursos">Voltar</a></div>' : bloqueado('Esta aula')}`
  const c = S.d.cursos.find((x) => x.id === a.curso_id)
  const irmas = aulasDe(a.curso_id), i = irmas.findIndex((x) => x.id === a.id)
  const ant = irmas[i - 1], prox = irmas[i + 1]
  const feito = S.d.progresso.has(a.id)
  const id = ytId(a.video_url)
  const notas = S.d.anotacoes.filter((n) => n.contexto === 'aula' && n.ref_id === a.id)
  const voltar = c?.tipo === 'gravacoes' ? '#/mentoria' : `#/curso/${a.curso_id}`
  return `<a class="fraco" href="${voltar}">← ${esc(c?.titulo || 'Voltar')}</a>
  <div class="cabeca-pag" style="margin-top:10px"><div class="olho">Aula ${a.numero}${a.bloco ? ' · ' + esc(a.bloco) : ''}${a.duracao ? ' · ' + esc(a.duracao) : ''}</div><h2>${esc(a.titulo)}</h2>${a.descricao ? `<p>${esc(a.descricao)}</p>` : ''}</div>
  <div class="card" style="padding:0;overflow:hidden">
    ${id ? `<div style="aspect-ratio:16/9;background:#000"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="${esc(a.titulo)}" style="width:100%;height:100%;border:0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
      : `<div style="aspect-ratio:16/9;display:grid;place-items:center;background:#000;text-align:center;padding:20px">${link(a.video_url) ? `<a class="btn ouro" href="${esc(a.video_url)}" target="_blank" rel="noopener">${icone('play', 'style="width:14px;height:14px"')} Abrir a aula</a>` : '<span class="fraco">O vídeo desta aula ainda não foi publicado.</span>'}</div>`}
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center">
    <button class="btn ${feito ? 'leve' : 'ouro'}" type="button" data-concluir="${a.id}" data-feito="${feito}">${feito ? '✓ Concluída' : 'Marcar como concluída'}</button>
    ${link(a.material_url) ? `<a class="btn contorno" href="${esc(a.material_url)}" target="_blank" rel="noopener">Material da aula</a>` : ''}
    <span style="flex:1"></span>
    ${ant ? `<a class="btn contorno peq" href="#/aula/${ant.id}">← Anterior</a>` : ''}${prox ? `<a class="btn contorno peq" href="#/aula/${prox.id}">Próxima →</a>` : ''}
  </div>
  <div class="secao card"><div class="card-topo"><span class="olho">Minhas anotações desta aula</span><a class="fraco" href="#/caderno/aula">Caderno →</a></div>
    ${caixaAnotacao('aula', { id: a.id, titulo: a.titulo })}<div style="display:grid;gap:8px;margin-top:14px">${listaAnotacoes(notas)}</div></div>`
}

TELAS.caderno = (args) => {
  const filtro = args[0] || 'todas'
  const lista = S.d.anotacoes.filter((n) => filtro === 'todas' || n.contexto === filtro)
  const conta = (c) => S.d.anotacoes.filter((n) => n.contexto === c).length
  return `${faixaAcesso()}<div class="cabeca-pag"><h2>Meu caderno</h2><p>Tudo o que você anotou nas aulas e na sala ao vivo, num lugar só. O minuto leva de volta ao ponto da aula.</p>
    <p class="fraco" style="margin-top:6px">Só você vê suas anotações. Nem a equipe tem acesso.</p></div>
  <div class="chips" style="margin-bottom:14px">${[['todas', 'Todas', S.d.anotacoes.length], ['aula', 'Aulas', conta('aula')], ['sala', 'Sala ao vivo', conta('sala')], ['solta', 'Anotações soltas', conta('solta')]]
    .map(([v, t, n]) => `<a class="chip" href="#/caderno/${v}" aria-pressed="${filtro === v}">${t} <b>${n}</b></a>`).join('')}
    <button class="chip" type="button" onclick="window.print()">Imprimir</button></div>
  <div class="card" style="margin-bottom:14px"><div class="olho" style="margin-bottom:10px">Nova anotação</div>${caixaAnotacao('solta')}</div>
  <div style="display:grid;gap:8px">${listaAnotacoes(lista)}</div>`
}

TELAS.indicadores = () => {
  const inds = S.d.conteudo.filter((c) => c.tipo === 'indicador')
  const inst = S.d.conteudo.find((c) => c.tipo === 'instalacao')
  return `${faixaAcesso()}${faixaPlano()}<div class="cabeca-pag"><h2>Indicadores Trader Positivo</h2><p>Os indicadores usados ao vivo na sala, para MetaTrader 5 e Profit.</p></div>
  ${!S.liberado ? bloqueado('O download dos indicadores') : `
  <div class="card realce" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">
    <div><b>Como instalar</b><div class="fraco">Passo a passo para MetaTrader 5 e Profit.</div></div>
    ${link(inst?.url) ? `<a class="btn leve peq" href="${esc(inst.url)}" target="_blank" rel="noopener">Ver o passo a passo</a>` : '<span class="btn travado peq">Em breve</span>'}</div>
  <div class="grade g3">${inds.map((c) => `<div class="card" style="display:flex;flex-direction:column;gap:8px">
    ${c.plataforma ? `<span class="tag ouro" style="align-self:flex-start">${esc(c.plataforma)}</span>` : ''}<b style="font-size:17px">${esc(c.titulo)}</b><p class="sub" style="flex:1">${esc(c.descricao)}</p>
    <div>${link(c.url) ? `<a class="btn ouro peq" href="${esc(c.url)}" target="_blank" rel="noopener">Baixar</a>` : '<span class="btn travado peq">Em breve</span>'}</div></div>`).join('')}</div>
  <p class="fraco" style="margin-top:12px">Saiba o que cada um faz na <a href="../indicadores.html" target="_blank" rel="noopener">página dos indicadores</a>.</p>`}`
}

TELAS.explorar = (args) => {
  const filtro = args[0] || 'todos'
  const cursos = S.d.cursos.filter((c) => c.tipo === 'curso')
  const lista = cursos.filter((c) => filtro === 'todos' || (filtro === 'liberados' ? cursoLiberado(c) : filtro === 'gratuitos' ? c.gratuito : true))
  return `${faixaAcesso()}<div class="cabeca-pag"><h2>Explorar cursos</h2><p>Todos os cursos do Trader Positivo. Os que estão liberados para você abrem direto.</p></div>
  <div class="chips" style="margin-bottom:16px">${[['todos', 'Todos'], ['liberados', 'Liberados para mim'], ['gratuitos', 'Gratuitos']].map(([v, t]) => `<a class="chip" href="#/explorar/${v}" aria-pressed="${filtro === v}">${t}</a>`).join('')}</div>
  <div class="grade g3">${lista.map((c) => {
    const ok = cursoLiberado(c), total = aulasDe(c.id).length
    const planosTxt = c.planos.map((p) => PLANOS[p]).join(', ')
    return `<div class="card" style="display:flex;flex-direction:column;gap:10px">
      <div style="aspect-ratio:16/8;border-radius:12px;background:${link(c.capa_url) ? `center/cover url('${esc(c.capa_url)}')` : 'linear-gradient(135deg,#1b1608,#0d0f12)'};border:1px solid var(--linha);display:flex;align-items:flex-end;padding:12px">${link(c.capa_url) ? '' : `<span class="display" style="font-size:24px">${esc(c.titulo)}</span>`}</div>
      <div class="fraco">${esc(c.tema)}${ok && total ? ` · ${total} aulas` : ''}${c.gratuito ? ' · Gratuito' : ''}</div><b style="font-size:17px">${esc(c.titulo)}</b><p class="sub" style="flex:1">${esc(c.descricao)}</p>
      ${ok ? `<a class="btn ouro peq" href="#/curso/${c.id}">Começar</a>` : `<div class="fraco">${icone('cadeado', 'style="width:14px;height:14px;vertical-align:-2px"')} Incluído em: ${esc(planosTxt)}</div><a class="btn contorno peq" href="${esc(RENOVAR_URL)}">Liberar o curso</a>`}</div>`
  }).join('') || '<div class="card vazio">Nenhum curso com esse filtro.</div>'}</div>`
}

TELAS.eventos = () => {
  const eventos = S.d.agenda.filter((e) => e.tipo === 'evento')
  return `${faixaAcesso()}<div class="cabeca-pag"><h2>Eventos abertos</h2><p>Aulas ao vivo abertas, gratuitas para quem tem cadastro na Área do aluno.</p></div>
  ${eventos.length ? `<div class="grade g2">${eventos.map((e) => `<div class="card">${cartaoEncontro(e, true)}<div style="margin-top:14px">${link(e.link) ? `<a class="btn ouro peq" href="${esc(e.link)}" target="_blank" rel="noopener">Participar</a>` : '<span class="btn travado peq">O link aparece perto da hora</span>'}</div></div>`).join('')}</div>`
    : '<div class="card vazio">Nenhuma aula aberta marcada agora. Enquanto isso, veja os cursos gratuitos em <a href="#/explorar/gratuitos">Explorar</a>.</div>'}
  <p class="fraco" style="margin-top:12px">A sala ao vivo do dia a dia fica em <a href="#/sala">Sala ao vivo</a>.</p>`
}

TELAS.tradersystem = () => `${faixaAcesso()}
  <div class="cabeca-pag"><div class="olho">Adicional da assinatura</div><h2>Gestão de Risco · TraderSystem <span class="tag plus" style="vertical-align:middle">PLUS</span></h2>
    <p>O sistema de gestão de risco que o Marcelo usa ao vivo: plano do pregão, contratos pelo risco, dashboard das contas e performance. Ele roda à parte, com login próprio.</p></div>
  <div class="grade g2">
    <div class="card realce"><b style="font-size:18px">O que você ganha</b>
      <ul style="margin:12px 0 0 18px;display:grid;gap:6px" class="sub"><li>Plano do pregão com contratos calculados pelo risco</li><li>Dashboard com resultado do dia e do ciclo</li><li>Alerta de loss limit e metas</li><li>Importação do CSV do Profit e performance do período</li></ul></div>
    <div class="card">${S.plus
      ? `<b style="font-size:18px">Incluído no seu plano</b><p class="sub" style="margin:8px 0 16px">Abre em outra aba. Entre com o mesmo e-mail.</p><a class="btn ouro" href="${esc(TRADERSYSTEM_URL)}" target="_blank" rel="noopener">Abrir o TraderSystem ↗</a>`
      : `<b style="font-size:18px">Adicione à sua assinatura</b><p class="sub" style="margin:8px 0 16px">O TraderSystem é um adicional. Fale com a equipe para incluir no seu plano.</p><a class="btn ouro" href="${esc(SUPORTE_URL)}" target="_blank" rel="noopener">Quero o TraderSystem</a>
         <p class="fraco" style="margin-top:10px"><a href="../sistema.html" target="_blank" rel="noopener">Ver como funciona ↗</a></p>`}</div>
  </div>`

const TITULOS = { inicio: 'Início', mentoria: 'Mentoria', sala: 'Sala ao vivo', mercado: 'Mercado', cursos: 'Meus cursos', curso: 'Curso', aula: 'Aula', caderno: 'Meu caderno', indicadores: 'Indicadores', explorar: 'Explorar', eventos: 'Eventos abertos', tradersystem: 'Gestão de Risco' }

// ── roteador ────────────────────────────────────────────────────────────────
function rotaAtual() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const nome = TELAS[partes[0]] ? partes[0] : 'inicio'
  return { nome, args: partes.slice(1) }
}
function render() {
  if ($('telaApp').hidden) return
  const { nome, args } = rotaAtual()
  $('pagina').innerHTML = TELAS[nome](args)
  $('tituloPagina').textContent = TITULOS[nome]
  const ativo = { curso: 'cursos', aula: rotaAula() }[nome] || nome
  document.querySelectorAll('[data-rota]').forEach((el) => el.setAttribute('aria-current', el.dataset.rota === ativo ? 'page' : 'false'))
  fecharMenu()
  if (nome === 'mercado' && (args[0] === 'calendario')) montarCalendario()
}
function rotaAula() {
  const a = S.d.aulas?.find((x) => String(x.id) === rotaAtual().args[0])
  const c = a && S.d.cursos.find((x) => x.id === a.curso_id)
  return c?.tipo === 'gravacoes' ? 'mentoria' : 'cursos'
}
window.addEventListener('hashchange', () => { render(); scrollTo(0, 0) })
setInterval(() => { const n = rotaAtual().nome; if (['inicio', 'sala'].includes(n) && !document.querySelector('textarea:focus,input:focus')) render() }, 60000)

function montarCalendario() {
  const alvo = $('calendarioTV'); if (!alvo || alvo.dataset.ok) return
  alvo.dataset.ok = '1'
  const s = document.createElement('script')
  s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
  s.async = true
  s.textContent = JSON.stringify({ colorTheme: 'dark', isTransparent: true, width: '100%', height: 600, locale: 'br', importanceFilter: '0,1', countryFilter: 'br,us,eu,cn' })
  alvo.appendChild(s)
}

// ── ações dentro das páginas ────────────────────────────────────────────────
$('pagina').addEventListener('submit', async (e) => {
  const f = e.target.closest('.nova-anotacao'); if (!f) return
  e.preventDefault()
  const texto = f.texto.value.trim(); if (!texto) return
  const msg = f.querySelector('.msg')
  try {
    await repo.salvarAnotacao({ contexto: f.dataset.contexto, ref_id: f.dataset.ref ? Number(f.dataset.ref) : null, ref_titulo: f.dataset.reftitulo, minuto: f.minuto?.value.trim() || '', texto })
    S.d.anotacoes = await repo.anotacoes(); render()
  } catch (err) { msg.textContent = err.message; msg.className = 'msg erro' }
})
$('pagina').addEventListener('click', async (e) => {
  const concluir = e.target.closest('[data-concluir]')
  if (concluir) {
    const id = Number(concluir.dataset.concluir), feito = concluir.dataset.feito === 'true'
    concluir.disabled = true
    await repo.marcarAula(id, !feito)
    S.d.progresso = await repo.meuProgresso(); render()
  }
  const apagar = e.target.closest('[data-apagar-nota]')
  if (apagar && confirm('Apagar esta anotação?')) { await repo.removerAnotacao(Number(apagar.dataset.apagarNota)); S.d.anotacoes = await repo.anotacoes(); render() }
  if (e.target.closest('[data-acao="reiniciar"]')) { repo.reiniciarDemo(); location.reload() }
})

// ── entrada ────────────────────────────────────────────────────────────────
let aba = 'entrar'
function trocarAba(nova) {
  aba = nova
  document.querySelectorAll('#abasEntrada button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.aba === aba))
  const primeiro = aba === 'primeiro'
  $('grupoNome').hidden = !primeiro
  $('tituloEntrada').textContent = primeiro ? 'Primeiro acesso' : 'Entrar'
  $('textoEntrada').textContent = primeiro ? 'Use o mesmo e-mail da compra e crie a sua senha.' : 'Já criou a sua senha? Entre com o e-mail e a senha.'
  $('rotuloSenha').textContent = primeiro ? 'Crie uma senha' : 'Senha'
  $('senha').autocomplete = primeiro ? 'new-password' : 'current-password'
  $('botaoEntrada').textContent = primeiro ? 'Criar minha senha →' : 'Entrar →'
  $('esqueci').hidden = primeiro
  $('peEntrada').hidden = primeiro
  $('msgEntrada').textContent = ''
}
$('abasEntrada').onclick = (e) => { const b = e.target.closest('button'); if (b) trocarAba(b.dataset.aba) }
$('irPrimeiro').onclick = (e) => { e.preventDefault(); trocarAba('primeiro') }
const msg = (el, texto, tipo = 'erro') => { el.textContent = texto; el.className = 'msg ' + tipo }
$('formEntrada').onsubmit = async (e) => {
  e.preventDefault()
  const email = $('email').value.trim(), senha = $('senha').value, nome = $('nome').value.trim()
  if (!/^\S+@\S+\.\S+$/.test(email)) return msg($('msgEntrada'), 'Informe um e-mail válido.')
  if (!DEMO && senha.length < 6) return msg($('msgEntrada'), 'A senha precisa ter pelo menos 6 caracteres.')
  if (aba === 'primeiro' && !nome) return msg($('msgEntrada'), 'Informe seu nome.')
  $('botaoEntrada').disabled = true
  try {
    if (aba === 'primeiro') {
      const r = await repo.primeiroAcesso(nome, email, senha)
      if (r.precisaConfirmar) return msg($('msgEntrada'), 'Pronto! Confirme pelo link que enviamos para o seu e-mail e depois entre.', 'ok')
    } else await repo.entrar(email, senha)
    await iniciar()
  } catch (err) { msg($('msgEntrada'), err.message) }
  finally { $('botaoEntrada').disabled = false }
}
$('esqueci').onclick = async () => {
  const email = $('email').value.trim()
  if (!/^\S+@\S+\.\S+$/.test(email)) return msg($('msgEntrada'), 'Digite seu e-mail acima e clique de novo em "Esqueci minha senha".')
  try { await repo.esqueci(email); msg($('msgEntrada'), 'Se houver conta com esse e-mail, enviamos um link para criar uma nova senha.', 'ok') }
  catch (err) { msg($('msgEntrada'), err.message) }
}
$('formNovaSenha').onsubmit = async (e) => {
  e.preventDefault()
  const s = $('novaSenha').value
  if (s.length < 6) return msg($('msgNovaSenha'), 'A senha precisa ter pelo menos 6 caracteres.')
  try { await repo.novaSenha(s); msg($('msgNovaSenha'), 'Senha alterada!', 'ok'); setTimeout(() => { location.hash = ''; iniciar() }, 900) }
  catch (err) { msg($('msgNovaSenha'), err.message) }
}
repo.aoMudarSessao((evento) => { if (evento === 'PASSWORD_RECOVERY') mostrar('telaNovaSenha') })

function mostrar(t) { ['telaEntrada', 'telaNovaSenha', 'telaApp'].forEach((x) => ($(x).hidden = x !== t)) }

async function iniciar() {
  if (location.hash.includes('type=recovery')) return mostrar('telaNovaSenha')
  $('demoEntrada').hidden = !DEMO
  S.sessao = await repo.sessao()
  if (!S.sessao) { mostrar('telaEntrada'); return }
  try {
    await carregarTudo()
    desenharMenu()
    mostrar('telaApp')
    render()
  } catch (err) { mostrar('telaEntrada'); msg($('msgEntrada'), 'Não foi possível carregar: ' + err.message) }
}
iniciar()

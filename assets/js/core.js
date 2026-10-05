// Núcleo compartilhado: carga dos JSON, validação dos campos obrigatórios,
// renderização de itens, lista de fontes e botão de correção.

export const CLASSIFICACOES = {
  fato: { emoji: '🟢', rotulo: 'Fato comprovado', descricao: 'Documento oficial, decisão judicial ou dado estatístico.' },
  acusacao: { emoji: '🟡', rotulo: 'Acusação / delação / investigação', descricao: 'Ainda não julgado, ou anulado.' },
  analise: { emoji: '🔵', rotulo: 'Análise / opinião', descricao: 'Avaliação de economistas, juristas ou jornalistas, com o nome do autor.' },
};

const OBRIGATORIOS = ['fonte_nome', 'fonte_url', 'fonte_data', 'classificacao', 'verificado_em'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const $ = (sel, raiz = document) => raiz.querySelector(sel);

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function carregarJSON(caminho) {
  const r = await fetch(caminho, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Falha ao carregar ${caminho} (HTTP ${r.status})`);
  return r.json();
}

// Devolve a lista de campos obrigatórios ausentes ou inválidos. Item com qualquer falha não é exibido.
export function camposFaltantes(item) {
  const faltam = OBRIGATORIOS.filter(c => !String(item[c] ?? '').trim());
  if (item.classificacao && !CLASSIFICACOES[item.classificacao]) faltam.push('classificacao (valor inválido)');
  if (item.fonte_url && !/^https?:\/\//.test(item.fonte_url)) faltam.push('fonte_url (não é um link)');
  if (item.fonte_data && item.fonte_data !== 's.d.' && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(item.fonte_data)) faltam.push('fonte_data (formato)');
  return faltam;
}

export function separarValidos(itens, origem) {
  const validos = [];
  let ocultos = 0;
  for (const item of itens) {
    const faltam = camposFaltantes(item);
    if (faltam.length) {
      ocultos++;
      console.warn(`[${origem}] item "${item.id ?? item.titulo}" ocultado; faltam: ${faltam.join(', ')}`);
    } else {
      validos.push(item);
    }
  }
  return { validos, ocultos };
}

// Aceita "AAAA", "AAAA-MM" ou "AAAA-MM-DD" e formata sem inventar precisão que a data não tem.
export function formatarData(iso) {
  if (!iso || iso === 's.d.') return 'sem data de publicação';
  const [a, m, d] = iso.split('-');
  if (d) return `${d}/${m}/${a}`;
  if (m) return `${MESES[+m - 1]}/${a}`;
  return a;
}

export const anoDe = iso => iso.slice(0, 4);

export function seloClassificacao(chave) {
  const c = CLASSIFICACOES[chave];
  return `<span class="selo selo-${esc(chave)}" title="${esc(c.descricao)}">${c.emoji} ${esc(c.rotulo)}</span>`;
}

// Numera as fontes na ordem em que aparecem, sem repetir o mesmo link.
export class RegistroFontes {
  constructor() { this.lista = []; this.porUrl = new Map(); }
  numero(nome, url, data) {
    if (!this.porUrl.has(url)) {
      this.lista.push({ nome, url, data });
      this.porUrl.set(url, this.lista.length);
    }
    return this.porUrl.get(url);
  }
  doItem(item) {
    const fontes = [{ nome: item.fonte_nome, url: item.fonte_url, data: item.fonte_data }, ...(item.fontes_adicionais ?? [])];
    return fontes.map(f => ({ ...f, n: this.numero(f.nome, f.url, f.data) }));
  }
  html() {
    return this.lista.map((f, i) =>
      `<li id="fonte-${i + 1}"><span class="fonte-nome">${esc(f.nome)}</span> <span class="fonte-data">(${esc(formatarData(f.data))})</span><br>` +
      `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.url)}</a></li>`).join('');
  }
}

// Gráfico de barras simples. A fonte do gráfico é a própria fonte do item, repetida logo abaixo dele.
function htmlGrafico(g, fonte) {
  const max = Math.max(...g.valores.map(Math.abs));
  const temNegativo = g.valores.some(v => v < 0);
  const alturaUtil = 120, base = temNegativo ? 20 + alturaUtil / 2 : 20 + alturaUtil, largura = 44;
  const escala = (temNegativo ? alturaUtil / 2 : alturaUtil) / max;
  const barras = g.valores.map((v, i) => {
    const h = Math.max(1, Math.abs(v) * escala), x = 8 + i * largura, y = v >= 0 ? base - h : base;
    return `<rect class="${v < 0 ? 'barra-neg' : 'barra'}" x="${x}" y="${y}" width="${largura - 12}" height="${h}"></rect>` +
      `<text x="${x + (largura - 12) / 2}" y="${v >= 0 ? y - 4 : y + h + 11}" text-anchor="middle">${esc(String(v).replace('.', ','))}</text>` +
      `<text x="${x + (largura - 12) / 2}" y="${20 + alturaUtil + 30}" text-anchor="middle">${esc(g.rotulos[i])}</text>`;
  }).join('');
  const w = 8 + g.valores.length * largura;
  return `<figure class="grafico"><figcaption>${esc(g.titulo)}</figcaption>
    <svg viewBox="0 0 ${w} ${alturaUtil + 56}" role="img" aria-label="${esc(g.titulo)}"><line x1="0" x2="${w}" y1="${base}" y2="${base}"></line>${barras}</svg>
    <p class="fonte-data">Fonte do gráfico: ${esc(fonte)}</p></figure>`;
}

export function htmlItem(item, registro, { mostrarData = true, respostaRecolhida = false } = {}) {
  const fontes = registro.doItem(item);
  const linhasFonte = fontes.map(f =>
    `<li><a class="ref" href="#fonte-${f.n}">[${f.n}]</a> <a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.nome)}</a>` +
    ` <span class="fonte-data">· ${esc(formatarData(f.data))}</span></li>`).join('');
  return `
<article class="item${item.destaque ? ' item-destaque' : ''}" id="${esc(item.id)}">
  <header class="item-topo">
    ${mostrarData && item.data ? `<time datetime="${esc(item.data)}">${esc(formatarData(item.data))}</time>` : ''}
    ${seloClassificacao(item.classificacao)}
  </header>
  <h3>${esc(item.titulo)}</h3>
  ${item.texto ? (respostaRecolhida ? `<details><summary>Ver resposta</summary><p>${esc(item.texto)}</p></details>` : `<p>${esc(item.texto)}</p>`) : ''}
  ${item.grafico ? htmlGrafico(item.grafico, item.fonte_nome) : ''}
  ${item.status_juridico ? `<p class="status"><strong>Status jurídico atual:</strong> ${esc(item.status_juridico)}</p>` : ''}
  <footer class="item-rodape">
    <ul class="item-fontes">${linhasFonte}</ul>
    <span class="verificado">Última verificação: ${esc(formatarData(item.verificado_em))}</span>
    <button type="button" class="link-botao" data-erro="${esc(item.id)}" data-erro-titulo="${esc(item.titulo)}">Encontrou um erro? Envie a fonte</button>
  </footer>
</article>`;
}

export function textoBuscavel(item) {
  return [item.titulo, item.texto, item.status_juridico, item.fonte_nome, item.data].join(' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export const normalizarBusca = q => q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Cabeçalho, rodapé e diálogo de correção, iguais em todas as páginas.
export async function montarMoldura(paginaAtual) {
  const site = await carregarJSON('data/site.json');
  const nav = [['index.html', 'Início'], ['linha-do-tempo.html', 'Linha do tempo'], ['metodologia.html', 'Metodologia']];
  $('#cabecalho').innerHTML = `
    <div class="largura cabecalho-linha">
      <a class="marca" href="index.html">${esc(site.nome)}<small>${esc(site.subtitulo)}</small></a>
      <nav aria-label="Principal">${nav.map(([href, rotulo]) =>
        `<a href="${href}"${href === paginaAtual ? ' aria-current="page"' : ''}>${rotulo}</a>`).join('')}</nav>
    </div>`;
  $('#rodape').insertAdjacentHTML('beforeend', `
    <p class="rodape-nota">Conteúdo crítico por definição editorial: o site reúne apenas problemas, escândalos e polêmicas. Cada item traz fonte, classificação e status jurídico, inclusive anulações e arquivamentos. Atualizado em ${esc(formatarData(site.atualizado_em))}.</p>
    <button type="button" class="botao" data-erro="">Encontrou um erro? Envie a fonte</button>
    <dialog id="dialogo-erro">
      <form method="dialog">
        <h2>Enviar correção</h2>
        <p id="erro-alvo" class="fonte-data"></p>
        <label>Link da fonte que comprova a correção (obrigatório)
          <input type="url" id="erro-url" required placeholder="https://">
        </label>
        <label>O que está errado e qual é o dado correto
          <textarea id="erro-texto" rows="4" required></textarea>
        </label>
        <output id="erro-saida"></output>
        <div class="dialogo-acoes">
          <button type="button" class="botao" id="erro-gerar">Gerar mensagem</button>
          <button class="link-botao" value="fechar" formnovalidate>Fechar</button>
        </div>
      </form>
    </dialog>`);

  const dialogo = $('#dialogo-erro');
  let alvo = '';
  document.addEventListener('click', ev => {
    const botao = ev.target.closest('[data-erro]');
    if (!botao) return;
    alvo = botao.dataset.erro ? `Item: ${botao.dataset.erroTitulo} (${location.pathname.split('/').pop()}#${botao.dataset.erro})` : `Página: ${document.title}`;
    $('#erro-alvo').textContent = alvo;
    $('#erro-saida').textContent = '';
    dialogo.showModal();
  });
  $('#erro-gerar').addEventListener('click', () => {
    const url = $('#erro-url'), texto = $('#erro-texto');
    if (!url.reportValidity() || !texto.reportValidity()) return;
    const corpo = `${alvo}\nFonte: ${url.value}\nCorreção: ${texto.value}`;
    if (site.contato_correcoes) {
      location.href = `mailto:${site.contato_correcoes}?subject=${encodeURIComponent('Correção – ' + site.nome)}&body=${encodeURIComponent(corpo)}`;
    } else {
      $('#erro-saida').textContent = `Canal de envio ainda não configurado (campo "contato_correcoes" em data/site.json). Copie a mensagem:\n\n${corpo}`;
    }
  });
  return site;
}

export function htmlRodapeFontes(registro, ocultos) {
  return `
    <h2>Fontes desta página</h2>
    ${registro.lista.length ? `<ol class="lista-fontes">${registro.html()}</ol>` : '<p>Nenhuma fonte listada: esta página ainda não tem itens publicados.</p>'}
    ${ocultos ? `<p class="aviso">${ocultos} item(ns) não exibido(s) por falta de campos obrigatórios de fonte.</p>` : ''}`;
}

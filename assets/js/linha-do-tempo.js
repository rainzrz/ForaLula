import { $, esc, carregarJSON, separarValidos, htmlItem, RegistroFontes, CLASSIFICACOES, anoDe, textoBuscavel, normalizarBusca, montarMoldura, htmlRodapeFontes } from './core.js';

const site = await montarMoldura('linha-do-tempo.html');
const { validos, ocultos } = separarValidos(await carregarJSON('data/linha-do-tempo.json'), 'linha-do-tempo');
// Evento só com o ano vai para o fim daquele ano: a posição dentro do ano é desconhecida.
const chave = e => e.data.padEnd(10, "~");
const eventos = validos.sort((a, b) => chave(a).localeCompare(chave(b)));

// As fontes são numeradas uma vez, sobre a lista completa, para que o número não mude ao filtrar.
const registro = new RegistroFontes();
const cartoes = new Map(eventos.map(e => [e.id, htmlItem(e, registro)]));
$('#rodape-fontes').innerHTML = htmlRodapeFontes(registro, ocultos);

const filtros = { busca: '', classificacoes: new Set(Object.keys(CLASSIFICACOES)), categoria: '', destaques: false };

$('#filtro-classificacao').innerHTML = Object.entries(CLASSIFICACOES).map(([chave, c]) =>
  `<label class="caixa"><input type="checkbox" value="${chave}" checked> <span class="selo selo-${chave}">${esc(c.rotulo)}</span></label>`).join('');
const categoriasUsadas = [...new Set(eventos.map(e => e.categoria))];
$('#filtro-categoria').innerHTML = '<option value="">Todas as categorias</option>' +
  categoriasUsadas.map(c => `<option value="${esc(c)}">${esc(site.categorias[c] ?? c)}</option>`).join('');

function desenhar() {
  const q = normalizarBusca(filtros.busca);
  const visiveis = eventos.filter(e =>
    filtros.classificacoes.has(e.classificacao) &&
    (!filtros.categoria || e.categoria === filtros.categoria) &&
    (!filtros.destaques || e.destaque) &&
    (!q || textoBuscavel(e).includes(q)));

  const porAno = new Map();
  for (const e of visiveis) {
    const ano = anoDe(e.data);
    if (!porAno.has(ano)) porAno.set(ano, []);
    porAno.get(ano).push(e);
  }

  $('#anos').innerHTML = [...porAno.keys()].map(ano => `<a href="#ano-${ano}">${ano}</a>`).join('');
  $('#contagem').textContent = `${visiveis.length} de ${eventos.length} eventos`;
  $('#linha').innerHTML = porAno.size
    ? [...porAno].map(([ano, lista]) =>
        `<section class="ano" id="ano-${ano}"><h2>${ano}</h2>${lista.map(e => cartoes.get(e.id)).join('')}</section>`).join('')
    : '<p class="vazio">Nenhum evento corresponde aos filtros.</p>';
}

$('#busca').addEventListener('input', ev => { filtros.busca = ev.target.value; desenhar(); });
$('#filtro-categoria').addEventListener('change', ev => { filtros.categoria = ev.target.value; desenhar(); });
$('#filtro-destaques').addEventListener('change', ev => { filtros.destaques = ev.target.checked; desenhar(); });
$('#filtro-classificacao').addEventListener('change', ev => {
  filtros.classificacoes[ev.target.checked ? 'add' : 'delete'](ev.target.value);
  desenhar();
});

desenhar();
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();

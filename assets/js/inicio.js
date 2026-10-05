import { $, esc, carregarJSON, separarValidos, seloClassificacao, formatarData, textoBuscavel, normalizarBusca, montarMoldura, CLASSIFICACOES, RegistroFontes, htmlRodapeFontes } from './core.js';
import { montarCarrossel } from './carrossel.js';

await montarMoldura('index.html');
const temas = await carregarJSON('data/temas.json');

// Índice de busca: linha do tempo + todos os temas já publicados.
const indice = [];
const contagem = new Map();
async function indexar(arquivo, pagina, origem) {
  const { validos } = separarValidos(await carregarJSON(arquivo), origem);
  for (const item of validos) indice.push({ item, pagina, origem });
  return validos.length;
}
const totalLinha = await indexar('data/linha-do-tempo.json', 'linha-do-tempo.html', 'Linha do tempo');
await Promise.all(temas.filter(t => t.arquivo).map(async t =>
  contagem.set(t.id, await indexar(t.arquivo, `tema.html?id=${t.id}`, t.titulo))));

// Números em destaque: só aparecem se o item de origem existir e estiver válido; a fonte e o selo vêm dele.
const registro = new RegistroFontes();
$('#destaques').innerHTML = (await carregarJSON('data/destaques.json')).map(d => {
  const achado = indice.find(({ item }) => item.id === d.id);
  if (!achado) return '';
  const refs = registro.doItem(achado.item).map(f => `<a class="ref" href="#fonte-${f.n}">[${f.n}]</a>`).join(' ');
  const pagina = d.tema === 'linha-do-tempo' ? 'linha-do-tempo.html' : `tema.html?id=${esc(d.tema)}`;
  return `<div class="cartao-numero"><a class="numero" href="${pagina}#${esc(d.id)}">${esc(d.numero)}</a>
    <p>${esc(d.rotulo)} ${refs}</p>${seloClassificacao(achado.item.classificacao)}</div>`;
}).join('');
$('#rodape-fontes').innerHTML = htmlRodapeFontes(registro, 0);

$('#legenda').innerHTML = Object.entries(CLASSIFICACOES).map(([chave, c]) =>
  `<li>${seloClassificacao(chave)} <span>${esc(c.descricao)}</span></li>`).join('');

$('#temas').innerHTML =
  `<a class="cartao-tema publicado" href="linha-do-tempo.html"><span class="numero">1</span><h3>Linha do tempo interativa</h3>
     <p>Da presidência do sindicato (1975) ao terceiro mandato, com os eventos negativos em destaque.</p>
     <span class="situacao">${totalLinha} eventos verificados</span></a>` +
  temas.map(t => {
    const n = contagem.get(t.id) ?? 0;
    return `<a class="cartao-tema${n ? ' publicado' : ''}" href="tema.html?id=${esc(t.id)}"><span class="numero">${t.numero}</span><h3>${esc(t.titulo)}</h3>
      <p>${esc(t.escopo)}</p><span class="situacao">${n ? `${n} itens verificados` : 'Em verificação de fontes'}</span></a>`;
  }).join('');

montarCarrossel($('#destaques'));
montarCarrossel($('#temas'));

// Letreiro decorativo: a lista vai duas vezes para o laço emendar sem salto.
$('#letreiro').innerHTML = temas.map(t => `<span>${esc(t.titulo)}</span>`).join('').repeat(2);

const filtroClasse = $('#busca-classificacao');
filtroClasse.innerHTML = '<option value="">Todas as classificações</option>' +
  Object.entries(CLASSIFICACOES).map(([chave, c]) => `<option value="${chave}">${esc(c.rotulo)}</option>`).join('');

function buscar() {
  const q = normalizarBusca($('#busca').value);
  const classe = filtroClasse.value;
  const saida = $('#resultados');
  if (q.length < 2 && !classe) { saida.innerHTML = ''; return; }
  const achados = indice.filter(({ item }) => (!classe || item.classificacao === classe) && (!q || textoBuscavel(item).includes(q)));
  saida.innerHTML = achados.length
    ? `<p class="fonte-data">${achados.length} resultado(s)</p><ul class="lista-resultados">` + achados.map(({ item, pagina, origem }) =>
        `<li><a href="${pagina}#${esc(item.id)}">${esc(item.titulo)}</a><br>
         <span class="fonte-data">${esc(origem)}${item.data ? ' · ' + esc(formatarData(item.data)) : ''}</span> ${seloClassificacao(item.classificacao)}</li>`).join('') + '</ul>'
    : '<p class="vazio">Nenhum item verificado corresponde à busca.</p>';
}
$('#busca').addEventListener('input', buscar);
filtroClasse.addEventListener('change', buscar);

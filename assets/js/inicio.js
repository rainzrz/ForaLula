import { $, esc, carregarJSON, separarValidos, seloClassificacao, formatarData, textoBuscavel, normalizarBusca, montarMoldura, CLASSIFICACOES } from './core.js';

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

const filtroClasse = $('#busca-classificacao');
filtroClasse.innerHTML = '<option value="">Todas as classificações</option>' +
  Object.entries(CLASSIFICACOES).map(([chave, c]) => `<option value="${chave}">${c.emoji} ${esc(c.rotulo)}</option>`).join('');

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

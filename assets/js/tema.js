import { $, esc, carregarJSON, separarValidos, htmlItem, RegistroFontes, CLASSIFICACOES, textoBuscavel, normalizarBusca, montarMoldura, htmlRodapeFontes } from './core.js';

await montarMoldura('tema.html');
const temas = await carregarJSON('data/temas.json');
const tema = temas.find(t => t.id === new URLSearchParams(location.search).get('id'));

if (!tema) {
  $('#titulo').textContent = 'Tema não encontrado';
  $('#conteudo').innerHTML = '<p class="vazio">Volte ao <a href="index.html">início</a> e escolha um tema.</p>';
} else {
  document.title = `${tema.titulo} – Dossiê Lula e PT`;
  $('#titulo').textContent = `${tema.numero}. ${tema.titulo}`;
  $('#escopo').textContent = tema.escopo;

  const { validos, ocultos } = tema.arquivo ? separarValidos(await carregarJSON(tema.arquivo), tema.id) : { validos: [], ocultos: 0 };
  const registro = new RegistroFontes();
  const cartoes = new Map(validos.map(i => [i.id, htmlItem(i, registro, { respostaRecolhida: tema.id === 'flash-cards' })]));
  $('#rodape-fontes').innerHTML = htmlRodapeFontes(registro, ocultos);

  if (!validos.length) {
    $('#filtros').hidden = true;
    $('#conteudo').innerHTML = `<p class="vazio">Seção em verificação de fontes. Nenhum item foi publicado ainda: pelas regras do site, só entra o que tem fonte conferida.
      Enquanto isso, os eventos já verificados estão na <a href="linha-do-tempo.html">linha do tempo</a>.</p>`;
  } else {
    const ativas = new Set(Object.keys(CLASSIFICACOES));
    $('#filtro-classificacao').innerHTML = Object.entries(CLASSIFICACOES).map(([chave, c]) =>
      `<label class="caixa"><input type="checkbox" value="${chave}" checked> ${c.emoji} ${esc(c.rotulo)}</label>`).join('');
    const desenhar = () => {
      const q = normalizarBusca($('#busca').value);
      const visiveis = validos.filter(i => ativas.has(i.classificacao) && (!q || textoBuscavel(i).includes(q)));
      $('#contagem').textContent = `${visiveis.length} de ${validos.length} itens`;
      $('#conteudo').innerHTML = visiveis.map(i => cartoes.get(i.id)).join('') || '<p class="vazio">Nenhum item corresponde aos filtros.</p>';
    };
    $('#busca').addEventListener('input', desenhar);
    $('#filtro-classificacao').addEventListener('change', ev => { ativas[ev.target.checked ? 'add' : 'delete'](ev.target.value); desenhar(); });
    desenhar();
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
}

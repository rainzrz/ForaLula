# Dossiê Lula e PT

Site estático (HTML/CSS/JS, sem build) com conteúdo crítico sobre Lula e o PT. Todo item tem fonte, classificação, status jurídico e data de verificação.

## Rodar localmente

Os dados são carregados por `fetch`, então é preciso um servidor HTTP (abrir o arquivo direto não funciona):

```
python -m http.server 8000
```

Depois abra http://localhost:8000.

## Estrutura

```
index.html              início: legenda, busca geral, grade de temas
linha-do-tempo.html     linha do tempo navegável por ano
tema.html?id=<id>       página genérica de tema
metodologia.html        regras editoriais
assets/css/site.css
assets/js/core.js       validação, renderização de itens, fontes, correções
data/site.json          nome do site, categorias, contato para correções
data/temas.json         lista dos temas; "arquivo": null = ainda sem itens
data/linha-do-tempo.json
data/temas/<id>.json    itens de cada tema (criar ao publicar a seção)
```

## Formato de um item

```json
{
  "id": "identificador-unico",
  "data": "2021-03-08",
  "titulo": "…",
  "texto": "…",
  "categoria": "processos",
  "destaque": true,
  "classificacao": "fato",
  "status_juridico": "…",
  "fonte_nome": "…",
  "fonte_url": "https://…",
  "fonte_data": "2021-03-08",
  "fontes_adicionais": [{ "nome": "…", "url": "https://…", "data": "2021-03-09" }],
  "verificado_em": "2026-10-04"
}
```

- Obrigatórios: `fonte_nome`, `fonte_url`, `fonte_data`, `classificacao`, `verificado_em`. Item sem eles é ocultado por `core.js` e contado no rodapé.
- `classificacao`: `fato`, `acusacao` ou `analise`.
- `data` e `fonte_data`: `AAAA`, `AAAA-MM` ou `AAAA-MM-DD`. `fonte_data` aceita `"s.d."` para página institucional sem data.
- `status_juridico`: obrigatório sempre que o item tratar de processo ou investigação.
- `grafico` (opcional): `{ "titulo": "…", "rotulos": ["2020", "2021"], "valores": [1.5, -0.6] }` desenha um gráfico de barras no item; a fonte exibida abaixo dele é a `fonte_nome` do próprio item.
- No tema `flash-cards`, `titulo` é a pergunta e `texto` é a resposta, que aparece recolhida.

## Publicar um tema

1. Criar `data/temas/<id>.json` com os itens já verificados.
2. Em `data/temas.json`, trocar `"arquivo": null` por `"arquivo": "data/temas/<id>.json"`.

## Correções

Preencher `contato_correcoes` em `data/site.json` com o e-mail que receberá as correções. Enquanto estiver vazio, o botão gera a mensagem para o leitor copiar.

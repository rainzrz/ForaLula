// Efeitos visuais, iguais em todas as páginas. Nada aqui muda o conteúdo: sem este arquivo,
// ou com "reduzir movimento" ligado no sistema, a página aparece inteira e parada.

const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ponteiroFino = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Retícula de impressão na capa: pontos de meio-tom que crescem e encolhem conforme um campo
// de ruído que escorre devagar, e incham perto do ponteiro.
const FRAGMENTO = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform vec2 uPonteiro;
uniform float uTempo;
uniform float uEscala;
float sorteio(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(sorteio(i), sorteio(i + vec2(1., 0.)), f.x), mix(sorteio(i + vec2(0., 1.)), sorteio(i + vec2(1., 1.)), f.x), f.y);
}
float camadas(vec2 p) {
  float soma = 0., peso = .5;
  for (int i = 0; i < 4; i++) { soma += peso * ruido(p); p = p * 2.03 + vec2(1.7, 9.2); peso *= .5; }
  return soma;
}
void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / (420. * uEscala);
  float campo = camadas(uv + vec2(uTempo * .035, -uTempo * .025) + camadas(uv * 1.4 - uTempo * .04));
  float d = distance(px, uPonteiro) / (150. * uEscala);
  campo += .4 * exp(-d * d);
  vec2 grade = mat2(.8776, -.4794, .4794, .8776) * px / (10. * uEscala);
  float raio = .5 * smoothstep(.26, .68, campo);
  float ponto = 1. - smoothstep(raio - .07, raio + .07, length(fract(grade) - .5));
  // some perto do topo, para emendar com o cabeçalho liso
  ponto *= 1. - smoothstep(uRes.y - 60. * uEscala, uRes.y, px.y);
  gl_FragColor = vec4(mix(vec3(.769, .129, .122), vec3(.612, .09, .086), ponto * .8), 1.);
}`;

function tramaDaCapa() {
  const capa = document.querySelector('.capa');
  if (!capa) return;
  const tela = document.createElement('canvas');
  tela.className = 'capa-trama';
  tela.setAttribute('aria-hidden', 'true');
  const gl = tela.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  const compilar = (tipo, codigo) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, codigo);
    gl.compileShader(s);
    return s;
  };
  const programa = gl.createProgram();
  gl.attachShader(programa, compilar(gl.VERTEX_SHADER, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }'));
  gl.attachShader(programa, compilar(gl.FRAGMENT_SHADER, FRAGMENTO));
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) return;
  gl.useProgram(programa);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(programa, 'p');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  const u = nome => gl.getUniformLocation(programa, nome);
  const uRes = u('uRes'), uPonteiro = u('uPonteiro'), uTempo = u('uTempo'), uEscala = u('uEscala');
  capa.prepend(tela);

  const escala = Math.min(devicePixelRatio || 1, 1.5);
  const alvo = [-9999, -9999], ponteiro = [-9999, -9999];
  let visivel = true, quadro = 0;

  const pintar = ms => {
    quadro = 0;
    ponteiro[0] += (alvo[0] - ponteiro[0]) * .12;
    ponteiro[1] += (alvo[1] - ponteiro[1]) * .12;
    gl.uniform2f(uRes, tela.width, tela.height);
    gl.uniform2f(uPonteiro, ponteiro[0], ponteiro[1]);
    gl.uniform1f(uTempo, ms / 1000);
    gl.uniform1f(uEscala, escala);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    agendar();
  };
  const agendar = () => {
    if (!quadro && !calmo && visivel && !document.hidden) quadro = requestAnimationFrame(pintar);
  };

  new ResizeObserver(() => {
    tela.width = Math.max(1, Math.round(capa.clientWidth * escala));
    tela.height = Math.max(1, Math.round(capa.clientHeight * escala));
    gl.viewport(0, 0, tela.width, tela.height);
    if (calmo) pintar(0); else agendar();
  }).observe(capa);
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; agendar(); }).observe(capa);
  document.addEventListener('visibilitychange', agendar);
  capa.addEventListener('pointermove', ev => {
    const r = capa.getBoundingClientRect();
    alvo[0] = (ev.clientX - r.left) * escala;
    alvo[1] = (r.bottom - ev.clientY) * escala;
  }, { passive: true });
  capa.addEventListener('pointerleave', () => { alvo[0] = alvo[1] = -9999; });
}

// Barra de leitura no topo.
function barraDeLeitura() {
  const barra = document.createElement('div');
  barra.className = 'progresso';
  barra.setAttribute('aria-hidden', 'true');
  document.body.append(barra);
  let pedido = false;
  const medir = () => {
    pedido = false;
    const total = document.documentElement.scrollHeight - innerHeight;
    barra.style.transform = `scaleX(${total > 0 ? Math.min(1, scrollY / total) : 0})`;
  };
  const pedir = () => { if (!pedido) { pedido = true; requestAnimationFrame(medir); } };
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir);
  new ResizeObserver(pedir).observe(document.body);
}

// Título da capa: cada palavra entra como um carimbo.
function carimbar() {
  const h1 = document.querySelector('.capa h1');
  if (!h1 || h1.querySelector('.palavra') || !h1.textContent.trim()) return;
  h1.replaceChildren(...h1.textContent.trim().split(/\s+/).flatMap((palavra, i) => {
    const span = document.createElement('span');
    span.className = 'palavra';
    span.style.setProperty('--i', i);
    span.textContent = palavra;
    return i ? [' ', span] : [span];
  }));
}

// Conta de zero até o número. O texto final é sempre o original, caractere por caractere.
function contar(el, atraso) {
  const no = el.firstChild;
  if (!no || no.nodeType !== Node.TEXT_NODE) return;
  const original = no.nodeValue;
  const partes = original.split(/(\d+(?:,\d+)?)/);
  el.setAttribute('aria-label', original);
  el.style.minHeight = `${el.offsetHeight}px`;
  const inicio = performance.now() + atraso, duracao = 1200;
  const passo = agora => {
    const t = Math.min(1, Math.max(0, (agora - inicio) / duracao));
    if (t === 1) { no.nodeValue = original; el.style.minHeight = ''; return; }
    const e = 1 - (1 - t) ** 3;
    no.nodeValue = partes.map((parte, i) => {
      if (i % 2 === 0) return parte;
      const casas = (parte.split(',')[1] ?? '').length;
      return (parseFloat(parte.replace(',', '.')) * e).toFixed(casas).replace('.', ',');
    }).join('');
    requestAnimationFrame(passo);
  };
  passo(performance.now());
}

// Folhas que são "coladas" ao entrar na tela, títulos grifados e barras de gráfico que crescem.
const FOLHAS = '.cartao-numero, .cartao-tema, .item, .faixa-pior';
const preparados = new WeakSet();
// Ao filtrar, a lista é redesenhada inteira; nesse caso os itens aparecem direto, sem animar de novo.
let filtrando = false;

const olho = new IntersectionObserver(entradas => {
  let ordem = 0;
  for (const { target: el, isIntersecting } of entradas) {
    if (!isIntersecting) continue;
    olho.unobserve(el);
    // cartão de carrossel não é "colado": quem cuida da opacidade dele é o foco do carrossel
    if (!el.classList.contains('colar')) {
      el.classList.add('visto');
      // conta todos os números do carrossel de uma vez, inclusive as cópias do laço, para nenhum recomeçar depois
      if (el.matches('.cartao-numero')) {
        for (const irmao of el.parentElement.querySelectorAll('.cartao-numero:not(.contado)')) {
          irmao.classList.add('contado');
          contar(irmao.querySelector('.numero'), 0);
        }
      }
      continue;
    }
    const atraso = Math.min(ordem++, 6) * 70;
    el.style.setProperty('--atraso', `${atraso}ms`);
    el.classList.add('colado');
    setTimeout(() => { el.classList.remove('colar', 'colado'); el.style.removeProperty('--atraso'); }, atraso + 1200);
    if (el.matches('.cartao-numero')) contar(el.querySelector('.numero'), atraso);
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

function preparar() {
  carimbar();
  for (const el of document.querySelectorAll(`${FOLHAS}, .grafico, main > h2`)) {
    if (preparados.has(el)) continue;
    preparados.add(el);
    if (el.matches('h2')) {
      const grifo = document.createElement('span');
      grifo.className = 'grifo';
      grifo.append(...el.childNodes);
      el.append(grifo);
    } else if (filtrando) {
      continue;
    } else if (el.matches('.grafico')) {
      el.classList.add('crescer');
      el.querySelectorAll('rect').forEach((barra, i) => { barra.style.transitionDelay = `${i * 60}ms`; });
    } else if (!el.closest('.carrossel')) {
      el.classList.add('colar');
    }
    olho.observe(el);
  }
}

// Cartão que inclina e recebe luz conforme o ponteiro.
function luzNosCartoes() {
  let atual = null;
  const soltar = () => { atual?.classList.remove('inclinado'); atual = null; };
  document.addEventListener('pointermove', ev => {
    const el = ev.target.closest?.('.cartao-tema, .faixa-pior') ?? null;
    if (el !== atual) { soltar(); atual = el; el?.classList.add('inclinado'); }
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.setProperty('--rx', `${(.5 - y) * 9}deg`);
    el.style.setProperty('--ry', `${(x - .5) * 9}deg`);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', soltar);
}

tramaDaCapa();
barraDeLeitura();
if (!calmo) {
  const marcarFiltro = () => { filtrando = true; setTimeout(() => { filtrando = false; }); };
  document.addEventListener('input', marcarFiltro, true);
  document.addEventListener('change', marcarFiltro, true);
  preparar();
  new MutationObserver(preparar).observe(document.body, { childList: true, subtree: true });
  if (ponteiroFino) luzNosCartoes();
}

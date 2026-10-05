// Carrossel horizontal em laço: o cartão do centro fica em foco e os vizinhos esmaecem.
// Arrastar, rolar, usar as setas ou tocar num cartão vizinho leva esse cartão para o centro.
// A lista é repetida antes e depois de si mesma, para sempre haver um cartão de cada lado.

const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function montarCarrossel(trilho) {
  const originais = [...trilho.children];
  const n = originais.length;
  if (!n) return;
  const copias = () => originais.map(el => {
    const copia = el.cloneNode(true);
    copia.setAttribute('aria-hidden', 'true');
    for (const link of copia.querySelectorAll('a, button')) link.tabIndex = -1;
    if (copia.matches('a')) copia.tabIndex = -1;
    return copia;
  });
  trilho.prepend(...copias());
  trilho.append(...copias());
  const cartoes = [...trilho.children];

  trilho.classList.add('carrossel');
  trilho.insertAdjacentHTML('afterend', `
    <div class="carrossel-controles">
      <button type="button" class="carrossel-seta" data-passo="-1" aria-label="Anterior">←</button>
      <span class="carrossel-conta"></span>
      <button type="button" class="carrossel-seta" data-passo="1" aria-label="Próximo">→</button>
    </div>`);
  const controles = trilho.nextElementSibling;
  const conta = controles.querySelector('.carrossel-conta');

  let foco = -1, pedido = false, parado = 0;
  const centro = el => el.offsetLeft + el.offsetWidth / 2;
  const irPara = (i, suave = !calmo) =>
    trilho.scrollTo({ left: centro(cartoes[Math.max(0, Math.min(cartoes.length - 1, i))]) - trilho.clientWidth / 2, behavior: suave ? 'smooth' : 'instant' });
  const medir = () => {
    pedido = false;
    const meio = trilho.scrollLeft + trilho.clientWidth / 2;
    let melhor = 0, menor = Infinity;
    cartoes.forEach((c, i) => {
      const d = Math.abs(centro(c) - meio);
      if (d < menor) { menor = d; melhor = i; }
    });
    if (melhor === foco) return;
    cartoes[foco]?.classList.remove('em-foco');
    foco = melhor;
    cartoes[foco].classList.add('em-foco');
    conta.textContent = `${foco % n + 1} / ${n}`;
  };
  // parou numa das cópias: salta, sem animação, para o mesmo cartão na lista do meio
  const voltarAoMeio = () => {
    if (foco >= n && foco < 2 * n) return;
    trilho.classList.add('carrossel-salto');
    irPara(n + foco % n, false);
    medir();
    void trilho.offsetWidth;
    requestAnimationFrame(() => trilho.classList.remove('carrossel-salto'));
  };

  trilho.addEventListener('scroll', () => {
    if (!pedido) { pedido = true; requestAnimationFrame(medir); }
    clearTimeout(parado);
    parado = setTimeout(voltarAoMeio, 140);
  }, { passive: true });
  new ResizeObserver(() => { if (foco >= 0) irPara(foco, false); }).observe(trilho);
  controles.addEventListener('click', ev => {
    const passo = ev.target.closest('[data-passo]')?.dataset.passo;
    if (passo) irPara(foco + Number(passo));
  });
  // o primeiro toque num cartão vizinho só traz o cartão para o centro; o link abre no cartão em foco
  trilho.addEventListener('click', ev => {
    const i = cartoes.findIndex(c => c.contains(ev.target));
    if (i >= 0 && i !== foco) { ev.preventDefault(); irPara(i); }
  });
  trilho.addEventListener('focusin', ev => {
    const i = cartoes.findIndex(c => c.contains(ev.target));
    if (i >= 0 && i !== foco) irPara(i);
  });

  trilho.classList.add('carrossel-salto');
  irPara(n, false);
  medir();
  requestAnimationFrame(() => trilho.classList.remove('carrossel-salto'));
}

// Presentation only. No access to account data, persistence, focus or save flows.
export function createMotion(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set(), openStates = new WeakMap(), disclosureAnimations = new WeakMap();
  let lastKey;
  function play(element, distance, duration, delay = 0) {
    if (!element || reduced.matches || typeof element.animate !== 'function') return null;
    const animation = element.animate([
      {opacity: 0.45, transform: `translateY(${distance}px)`},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'none'});
    animation.id = 'calendar-motion';
    active.add(animation);
    animation.finished.then(() => active.delete(animation), () => active.delete(animation));
    return animation;
  }
  function registerDetails(scope) {
    for (const details of scope.querySelectorAll('details')) openStates.set(details, details.open);
  }
  function enter(key) {
    registerDetails(root);
    if (key === lastKey) return;
    lastKey = key;
    for (const animation of active) animation.cancel();
    active.clear();
    // Two small focal points, not every row/card. Typing and sync do not replay.
    play(root.querySelector('.page-heading'), 6, 220);
    play(root.querySelector('.stats, .debt-overview, .safety-metrics'), 8, 260, 30);
  }
  function disclosure(details) {
    if (details.tagName !== 'DETAILS') return;
    const previous = openStates.get(details);
    openStates.set(details, details.open);
    disclosureAnimations.get(details)?.cancel();
    if (previous === false && details.open) {
      const body = [...details.children].find(child => child.tagName !== 'SUMMARY');
      const animation = play(body, 4, 180);
      if (animation) disclosureAnimations.set(details, animation);
    }
  }
  function stop() {
    for (const animation of active) animation.cancel();
    active.clear();
  }
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
  window.addEventListener('beforeprint', stop);
  return {enter, disclosure, registerDetails};
}

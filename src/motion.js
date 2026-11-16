// Presentation only. No access to account data, persistence, focus or save flows.
export function createMotion(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set(), openStates = new WeakMap(), disclosureAnimations = new WeakMap();
  let lastKey, lastNavigation;
  function play(element, distance, duration, delay = 0, axis = 'Y', bar = false) {
    if (!element || reduced.matches || typeof element.animate !== 'function') return null;
    const animation = element.animate([
      {opacity: bar ? 0.7 : 0.45, transform: bar ? 'scaleX(.15)' : `translate${axis}(${distance}px)`},
      {opacity: 1, transform: bar ? 'scaleX(1)' : 'translate(0,0)'}
    ], {duration, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'none'});
    animation.id = 'calendar-motion';
    active.add(animation);
    animation.finished.then(() => active.delete(animation), () => active.delete(animation));
    return animation;
  }
  function registerDetails(scope) {
    for (const details of scope.querySelectorAll('details')) openStates.set(details, details.open);
  }
  function enter(key, navigation = {}) {
    registerDetails(root);
    if (key === lastKey) return;
    const direction = lastNavigation?.scope === navigation.scope && Number.isFinite(navigation.period) && Number.isFinite(lastNavigation?.period) ? Math.sign(navigation.period - lastNavigation.period) : 0;
    lastNavigation = navigation;
    lastKey = key;
    for (const animation of active) animation.cancel();
    active.clear();
    // Two small focal points, not every row/card. Typing and sync do not replay.
    play(root.querySelector('.page-heading'), direction ? direction * 6 : 6, 220, 0, direction ? 'X' : 'Y');
    play(root.querySelector('.stats, .debt-overview, .safety-metrics'), direction ? direction * 12 : 8, 260, 30, direction ? 'X' : 'Y');
  }
  function disclosure(details) {
    if (details.tagName !== 'DETAILS') return;
    const previous = openStates.get(details);
    openStates.set(details, details.open);
    for (const animation of disclosureAnimations.get(details) || []) animation.cancel();
    if (previous === false && details.open) {
      const body = [...details.children].find(child => child.tagName !== 'SUMMARY');
      const animations = [];
      const animation = play(body, 4, 180);
      if (animation) animations.push(animation);
      // Only reveal real, nonzero chart fills on this explicit opening.
      const bars = [...details.querySelectorAll('.chart-fill')].filter(bar => parseFloat(bar.parentElement.style.getPropertyValue('--share')) > 0).slice(0, 24);
      bars.forEach((bar, index) => {
        const reveal = play(bar, 0, 320, Math.min(index * 18, 120), 'X', true);
        if (reveal) animations.push(reveal);
      });
      disclosureAnimations.set(details, animations);
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

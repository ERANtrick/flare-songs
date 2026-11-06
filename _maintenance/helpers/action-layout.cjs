const assert = require('node:assert/strict');

async function measureActions(page) {
  return page.evaluate(() => {
    // One CSS pixel covers fractional clientWidth/clientHeight rounding only.
    const epsilon = 1;
    const rect = node => {
      const r = node.getBoundingClientRect();
      return {left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height};
    };
    const inside = (a, b) => a.left >= b.left - epsilon && a.right <= b.right + epsilon &&
      a.top >= b.top - epsilon && a.bottom <= b.bottom + epsilon;
    const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > epsilon &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > epsilon;
    const buttons = [...document.querySelectorAll('#surprise-area .surprise-action')].filter(node => !node.hidden).map(node => {
      const label = node.querySelector('[data-surprise-label]');
      const range = document.createRange();
      range.selectNodeContents(label);
      const bounds = rect(node), labelBounds = rect(label);
      const textRects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0).map(r =>
        ({left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height}));
      const image = node.querySelector('.surprise-icon, .surprise-star');
      // The pick icon is intentionally hidden while its label says Close.
      const icon = image && !image.hidden ? rect(image) : null;
      const cx = (bounds.left + bounds.right) / 2, cy = (bounds.top + bounds.bottom) / 2;
      const centerInViewport = cx >= 0 && cx < innerWidth && cy >= 0 && cy < innerHeight;
      const hit = centerInViewport ? document.elementFromPoint(cx, cy) : null;
      const style = getComputedStyle(node);
      return {id:node.id, bounds, labelBounds, text:label.textContent.trim(), textRects, icon,
        // Diagnostic only: fallback font runs may have different tops on one line.
        lines:new Set(textRects.map(r => r.top.toFixed(2))).size,
        textInside:textRects.length > 0 && textRects.every(r => inside(r, bounds) && inside(r, labelBounds)),
        textOverflow:label.scrollWidth > label.clientWidth + epsilon || label.scrollHeight > label.clientHeight + epsilon,
        iconInside:!icon || (icon.width > 0 && icon.height > 0 && inside(icon, bounds) &&
          (image.tagName !== 'IMG' || image.complete && image.naturalWidth > 0)),
        iconTextOverlap:!!icon && textRects.some(r => overlaps(r, icon)),
        overflow:node.scrollWidth > node.clientWidth + epsilon || node.scrollHeight > node.clientHeight + epsilon,
        parentInside:inside(bounds, rect(node.parentElement)),
        enabled:!node.disabled && style.pointerEvents !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0,
        centerInViewport, centerHit:!centerInViewport || !!hit && node.contains(hit),
        pressed:node.getAttribute('aria-pressed')};
    });
    const collisions = [];
    for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
      if (overlaps(buttons[i].bounds, buttons[j].bounds)) collisions.push([buttons[i].id, buttons[j].id]);
    }
    const neighbors = [...document.querySelectorAll('#surprise-song-title, #surprise-session, .surprise-meta, .surprise-artwork')]
      .filter(node => node.getClientRects().length).map(node => ({id:node.id || node.className, bounds:rect(node)}));
    const neighborCollisions = [];
    for (const button of buttons.filter(b => b.id !== 'surprise-pick')) for (const neighbor of neighbors) {
      if (overlaps(button.bounds, neighbor.bounds)) neighborCollisions.push([button.id, neighbor.id]);
    }
    return {buttons, collisions, neighborCollisions};
  });
}

function assertActions(layout, width, context) {
  const diagnostic = JSON.stringify({context, layout});
  assert.deepEqual(layout.buttons.map(b => b.id).sort(),
    ['surprise-pick', 'surprise-play', 'surprise-favorite', 'surprise-history', 'surprise-again'].sort(), diagnostic);
  assert.deepEqual(layout.collisions, [], 'button overlap: ' + diagnostic);
  assert.deepEqual(layout.neighborCollisions, [], 'neighbor overlap: ' + diagnostic);
  for (const button of layout.buttons) {
    const message = JSON.stringify({context, button});
    assert.ok(button.bounds.width > 0 && button.bounds.height > 0 && button.text.length > 0, 'visible content: ' + message);
    assert.ok(button.bounds.height >= (width < 992 ? 48 : 44), 'target height: ' + message);
    assert.equal(button.textInside, true, 'text containment: ' + message);
    assert.equal(button.textOverflow, false, 'text clipping: ' + message);
    assert.equal(button.iconInside, true, 'icon containment: ' + message);
    assert.equal(button.iconTextOverlap, false, 'icon/text overlap: ' + message);
    assert.equal(button.overflow, false, 'button overflow: ' + message);
    assert.equal(button.parentInside, true, 'parent containment: ' + message);
    assert.equal(button.enabled, true, 'enabled target: ' + message);
    assert.equal(button.centerHit, true, 'target occlusion: ' + message);
  }
}

async function probeActionChecks(page) {
  // Test-only DOM mutations, restored even if a probe fails. They never edit CSS files.
  async function withStyle(selector, mutate, run) {
    const node = page.locator(selector), original = await node.getAttribute('style');
    try { await node.evaluate(mutate); return await run(); }
    finally { await node.evaluate((n, style) => style === null ? n.removeAttribute('style') : n.setAttribute('style', style), original); }
  }
  await page.setViewportSize({width:375, height:1200});
  return withStyle('[data-surprise-label="history"]', n => {n.style.maxWidth='8em';}, async () => {
    const wrapped = await measureActions(page);
    assertActions(wrapped, 375, 'forced multiline positive control');
    assert.ok(wrapped.buttons.find(b => b.id === 'surprise-history').lines > 1, 'positive control must actually wrap');
    const probes = [];
    await withStyle('[data-surprise-label="history"]', n => {n.style.height='1px';n.style.overflow='hidden';}, async () => {
      const clipped = await measureActions(page);
      assert.throws(() => assertActions(clipped, 375, 'injected text clipping'), /text containment|text clipping/);
      probes.push('text clipping rejected');
    });
    await withStyle('#surprise-history .surprise-icon', n => {
      const range = document.createRange();range.selectNodeContents(n.parentElement.querySelector('[data-surprise-label]'));
      const text = range.getClientRects()[0], icon = n.getBoundingClientRect();
      n.style.transform=`translate(${text.left-icon.left}px, ${text.top-icon.top}px)`;
    }, async () => {
      const collision = await measureActions(page);
      assert.throws(() => assertActions(collision, 375, 'injected icon collision'), /icon\/text overlap/);
      probes.push('icon/text overlap rejected');
    });
    await withStyle('#surprise-history', n => {
      n.style.transform=`translateY(${document.getElementById('surprise-play').getBoundingClientRect().top-n.getBoundingClientRect().top}px)`;
    }, async () => {
      const collision = await measureActions(page);
      assert.throws(() => assertActions(collision, 375, 'injected button collision'), /button overlap/);
      probes.push('button overlap rejected');
    });
    await withStyle('#surprise-pick', n => {
      Object.assign(n.style, {minHeight:'0', height:'10px', padding:'0', fontSize:'1px', lineHeight:'1px'});
    }, async () => {
      const tooSmall = await measureActions(page);
      assert.throws(() => assertActions(tooSmall, 375, 'injected small target'), /target height/);
      probes.push('small target rejected');
    });
    assertActions(await measureActions(page), 375, 'after restoring negative controls');
    return {multilineAccepted:true, wrappedButton:wrapped.buttons.find(b => b.id === 'surprise-history'), probes};
  });
}

module.exports = {measureActions, assertActions, probeActionChecks};

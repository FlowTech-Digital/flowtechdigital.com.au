(function () {
  'use strict';
  var form = document.getElementById('intake-form');
  if (!form) return;

  // Query parameters may select only these offer IDs. User-supplied strings
  // never become HTML, prices, analytics labels or submission metadata.
  var offers = {
    'website-fix-sprint': { title: 'Website Fix Sprint', price: '$295', value: 295, category: 'website-fix', scope: 'One eligible small website issue, with up to two delivery hours. We check suitability and agree on the specific fix before you proceed.' },
    'brand-polish': { title: 'Brand Polish Pack', price: '$495', value: 495, category: 'brand-polish', scope: 'Polish your existing identity: one avatar, two platform covers, a styling sheet and organised files, with one consolidated revision within four delivery hours. Existing usable brand assets are required; a new logo is a separate service.' },
    'launch': { title: 'Launch website', price: 'From $2,000', value: 2000, category: 'website', scope: 'A focused website for a new or growing business. We confirm the pages, content, requirements and final quote with you.' },
    'business': { title: 'Business website', price: 'From $4,000', value: 4000, category: 'website', scope: 'A website with room for an established business to grow. We confirm the pages, integrations and requirements before quoting.' },
    'pro': { title: 'Pro website', price: 'From $7,000', value: 7000, category: 'website', scope: 'A more extensive website project. We assess functionality, content and integrations before agreeing on the scope and price.' },
    'logo-essentials': { title: 'Logo Essentials', price: 'From $990', value: 990, category: 'branding', scope: 'A new logo for your business. Tell us about your audience, existing identity and the direction you have in mind.' },
    'brand-identity': { title: 'Brand Identity', price: 'From $2,750', value: 2750, category: 'branding', scope: 'A cohesive identity for your business. We agree on the creative direction, deliverables and final quote first.' },
    'brand-launch': { title: 'Brand Launch Bundle', price: 'From $4,950', value: 4950, category: 'branding', scope: 'A coordinated branding and website project. We check the included work and any additional requirements with you before you proceed.' },
    'care-basic': { title: 'Basic Care', price: '$99/month', value: 99, category: 'website-care', scope: 'Monthly care for an eligible existing website. We confirm the platform, access, included allowance and recurring arrangement before issuing an invoice.' },
    'care-standard': { title: 'Standard Care', price: '$199/month', value: 199, category: 'website-care', scope: 'Monthly care with a defined update allowance. We assess your existing website and confirm the included work and recurring arrangement first.' },
    'care-plus': { title: 'Plus Care', price: '$399/month', value: 399, category: 'website-care', scope: 'Monthly care for a website needing a broader support allowance. Platform suitability, access and included work are agreed before you proceed.' },
    'ai-starter': { title: 'AI Starter', price: 'From $499', value: 499, category: 'ai-influencer', scope: 'A starting point for an AI influencer project. Tell us about the purpose, audience and content you need.' },
    'ai-professional': { title: 'AI Professional', price: 'From $999', value: 999, category: 'ai-influencer', scope: 'A broader AI influencer package. We confirm your content needs, deliverables and final quote before you proceed.' },
    'ai-enterprise': { title: 'AI Enterprise', price: 'From $1,999', value: 1999, category: 'ai-influencer', scope: 'A more extensive AI influencer project. We assess the intended channels, content and requirements with you.' },
    'not-sure': { title: 'Let’s find the right service', price: 'Scope first', value: 0, category: 'unsure', scope: 'Describe the problem or project. We’ll recommend a suitable next step and confirm the scope and price before you commit.' }
  };
  var select = document.getElementById('offer');
  var website = document.getElementById('website');
  var message = document.getElementById('problem');
  var status = document.getElementById('form-status');
  var error = document.getElementById('form-error');
  var button = form.querySelector('button[type="submit"]');
  var success = document.getElementById('form-success');
  var isSending = false;
  var started = false;

  function validOffer(id) { return Object.prototype.hasOwnProperty.call(offers, id); }
  function currentOffer() { return offers[validOffer(select.value) ? select.value : 'not-sure']; }
  function offerMetadata(id) {
    var key = validOffer(id) ? id : 'not-sure';
    return { offer_id: key, offer_category: offers[key].category, offer_value: offers[key].value, currency: 'AUD' };
  }
  function analytics(eventName, id) {
    // Only allowlisted offer metadata is sent; no field values or URL parameters.
    if (typeof window.gtag !== 'function') return;
    try { window.gtag('event', eventName, offerMetadata(id)); } catch (_) { /* Analytics must not interrupt an enquiry. */ }
  }
  function updateOffer() {
    if (!validOffer(select.value)) select.value = 'not-sure';
    var offer = currentOffer();
    var isFix = select.value === 'website-fix-sprint';
    var isCare = offer.category === 'website-care';
    var isPolish = select.value === 'brand-polish';
    var needsWebsite = isFix || isCare;
    document.getElementById('offer-title').textContent = offer.title;
    document.getElementById('offer-price').textContent = offer.price;
    document.getElementById('offer-scope').textContent = offer.scope;
    document.getElementById('offer-summary').hidden = false;
    website.required = needsWebsite;
    document.getElementById('website-required').hidden = !needsWebsite;
    document.getElementById('website-optional').hidden = needsWebsite;
    document.getElementById('website-help').textContent = needsWebsite
      ? 'Required for this service. Use the full address, starting with https:// or http://.'
      : 'If you have a website, use its full address, starting with https:// or http://.';
    document.getElementById('problem-label').textContent = isFix ? 'What isn’t working?' : isPolish ? 'What would you like to polish?' : isCare ? 'What does your website need?' : 'What would you like to improve?';
    document.getElementById('problem-help').textContent = isFix
      ? 'Describe one issue and where you see it. A page link and the device or browser you use can help.'
      : isPolish ? 'Tell us about your existing logo or identity, the two platforms you need covers for, and the assets you already have.'
      : isCare ? 'Tell us about your website platform, the updates you expect and any existing support arrangement.'
      : 'A few clear sentences are enough to get started.';
    message.placeholder = isFix ? 'For example: the quote button doesn’t respond on my phone.'
      : isPolish ? 'For example: our logo is ready, but our YouTube and Facebook covers need a consistent finish.'
      : isCare ? 'For example: we need monthly content updates and help maintaining our existing website.'
      : 'Tell us what isn’t working, or what you would like to create.';
  }
  var requested = new URLSearchParams(window.location.search).get('offer');
  if (requested && validOffer(requested)) select.value = requested;
  else select.value = 'not-sure';
  updateOffer();
  select.addEventListener('change', updateOffer);
  form.addEventListener('focusin', function (event) {
    if (started || !/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName) || event.target.name === '_gotcha') return;
    started = true;
    analytics('form_start', select.value);
  });
  function setStatus(text, state) { status.textContent = text; status.dataset.state = state || ''; }
  function releaseButton() {
    isSending = false;
    button.disabled = false;
    button.removeAttribute('aria-disabled');
    form.removeAttribute('aria-busy');
    button.textContent = 'Send enquiry ↗';
  }
  form.addEventListener('submit', async function (event) {
    // Action/method remain a native POST fallback without JavaScript.
    // A failed asynchronous attempt never starts a second, automatic POST.
    event.preventDefault();
    if (isSending || form.hidden) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!validOffer(select.value)) { select.value = 'not-sure'; updateOffer(); }
    isSending = true;
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    error.hidden = true;
    setStatus('Sending your enquiry…', 'sending');
    var selectedId = select.value;
    var data = new FormData(form);
    data.set('offer', selectedId);
    data.set('service', offers[selectedId].title);
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, 20000) : null;
    try {
      var response = await fetch(form.action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' }, signal: controller ? controller.signal : undefined });
      if (!response.ok) throw new Error('Submission not confirmed');
      analytics('generate_lead', selectedId);
      form.hidden = true;
      form.removeAttribute('aria-busy');
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    } catch (_) {
      // An accepted request could lose its response. Preserve the details and
      // allow a deliberate retry rather than automatically duplicate it.
      setStatus('', '');
      error.textContent = 'We couldn’t confirm submission. Your details are still here. Check your connection before trying again. You can also email hello@flowtechdigital.com.au or call 0477 482 827.';
      error.hidden = false;
      releaseButton();
      error.focus();
    } finally {
      if (timer !== null) window.clearTimeout(timer);
    }
  });
})();

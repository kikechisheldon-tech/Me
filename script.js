// ---------- Hamburger nav ----------
const navOverlay = document.getElementById('navOverlay');
const menuOpen = document.getElementById('menuOpen');
const menuClose = document.getElementById('menuClose');
if (menuOpen) menuOpen.onclick = () => navOverlay.classList.add('open');
if (menuClose) menuClose.onclick = () => navOverlay.classList.remove('open');
document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => navOverlay.classList.remove('open')));

// mark the current page's nav link as active
const current = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-link').forEach(l => {
  if (l.getAttribute('href') === current) l.classList.add('active');
});

// ---------- Scroll reveal ----------
const revealEls = document.querySelectorAll('.reveal, .reveal-img');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach((el, i) => {
  el.style.transitionDelay = (i % 4) * 0.08 + 's';
  io.observe(el);
});

// ---------- Time-based greeting (homepage only) ----------
const greetingEl = document.getElementById('greeting');
if (greetingEl) {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 5) greeting = 'Good night';
  else if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else if (hour < 23) greeting = 'Good evening';
  else greeting = 'Good night';
  greetingEl.innerHTML = `${greeting}, I'm <b>Sheldon Kikechi.</b>`;
}

// ---------- Quick message form (used on contact.html) ----------
const contactInput = document.getElementById('quickContact');
const messageInput = document.getElementById('quickMessage');
const sendBtn = document.getElementById('sendBtn');
if (sendBtn) {
  function refreshSendBtn(){
    sendBtn.classList.toggle('active', contactInput.value.trim() && messageInput.value.trim());
  }
  contactInput.addEventListener('input', refreshSendBtn);
  messageInput.addEventListener('input', refreshSendBtn);
  // Form submits for real via formsubmit.co (see contact.html action attribute) —
  // no JS interception needed, the browser just POSTs it.
}

// ---------- M-Pesa Donate via PesaPal (contact.html only) ----------
const donateBtn = document.getElementById('donateTriggerBtn');
if (donateBtn) {
  document.querySelectorAll('.amount-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('donateAmount').value = btn.dataset.amt;
    });
  });

  donateBtn.addEventListener('click', async () => {
    const amount = document.getElementById('donateAmount').value;
    const phone = document.getElementById('donatePhone').value.trim();
    const email = document.getElementById('donateEmail').value.trim();
    if (!amount || Number(amount) < 10) { alert('Enter an amount of at least KES 10.'); return; }
    if (!phone) { alert('Enter your M-Pesa phone number.'); return; }

    donateBtn.disabled = true;
    donateBtn.textContent = 'Processing...';
    try {
      const res = await fetch('/.netlify/functions/pesapal-donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, phone, email })
      });
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert('Something went wrong starting the payment. Please try again.');
        donateBtn.disabled = false;
        donateBtn.textContent = '✈ Send via M-Pesa';
      }
    } catch (err) {
      alert('Could not reach the payment server. Please try again.');
      donateBtn.disabled = false;
      donateBtn.textContent = '✈ Send via M-Pesa';
    }
  });
}

// ---------- AI Assistant Widget (every page) ----------
(function() {
  const bubble = document.createElement('button');
  bubble.className = 'ai-bubble';
  bubble.setAttribute('aria-label', 'Ask AI about Sheldon');
  bubble.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg>';
  document.body.appendChild(bubble);

  const backdrop = document.createElement('div');
  backdrop.className = 'ai-panel-backdrop';
  backdrop.innerHTML = `
    <div class="ai-panel">
      <div class="ai-panel-header">
        <h3>Ask about Sheldon</h3>
        <button class="modal-close" id="aiClose">✕</button>
      </div>
      <div class="ai-messages" id="aiMessages">
        <div class="ai-msg bot">Hey! I'm Sheldon's site assistant — ask me about his work, chess, or how to reach him.</div>
      </div>
      <div class="ai-input-row">
        <input type="text" id="aiInput" placeholder="Type a question...">
        <button id="aiSend">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  bubble.addEventListener('click', () => backdrop.classList.add('open'));
  backdrop.querySelector('#aiClose').addEventListener('click', () => backdrop.classList.remove('open'));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.classList.remove('open'); });

  const messagesEl = backdrop.querySelector('#aiMessages');
  const inputEl = backdrop.querySelector('#aiInput');
  const aiSendBtn = backdrop.querySelector('#aiSend');
  const history = [];

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = 'ai-msg ' + (role === 'user' ? 'user' : 'bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  async function sendAiMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    inputEl.value = '';
    aiSendBtn.disabled = true;
    const typingEl = addMessage('bot', 'Typing...');
    try {
      const res = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const data = await res.json();
      messagesEl.removeChild(typingEl);
      const reply = data.reply || "Sorry, something went wrong. Try reaching Sheldon directly via the Contact page.";
      addMessage('bot', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      messagesEl.removeChild(typingEl);
      addMessage('bot', "I couldn't connect right now — try the Contact page to reach Sheldon directly.");
    }
    aiSendBtn.disabled = false;
  }

  aiSendBtn.addEventListener('click', sendAiMessage);
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendAiMessage(); });
})();


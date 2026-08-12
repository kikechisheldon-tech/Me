// Reads OPENROUTER_API_KEY from Netlify environment variables — never hardcode it here.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let messages;
  try {
    const body = JSON.parse(event.body || '{}');
    messages = body.messages;
    if (!Array.isArray(messages)) throw new Error('missing messages array');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const systemPrompt = `You are the professional AI assistant on Sheldon Kikechi's personal portfolio website.
You are NOT Sheldon — you are his assistant, and you speak about him in the third person to visitors of his site.
Keep a professional, friendly, helpful tone. Keep replies short (2-4 sentences) unless the visitor asks for more detail.

Facts about Sheldon you can share:
- Full name: Sheldon Kikechi, age 19, based in Kenya.
- Chess Grandmaster — represented his school from local competitions up to the National level.
- Software engineer and digital product builder — builds websites, custom software, mobile apps, does system architecture and AI integration.
- Also into music, gaming, anime, and is a big cat person.
- Site sections: Home, Work, Services, About Me, Contact Me.
- Featured work: two personalized, passcode-locked birthday websites, linked on the Work page.
- Services offered: Web Design & Development, Custom Software Systems, Mobile Application Development, System Architecture, AI Integration.
- Best way to reach Sheldon directly: WhatsApp (fastest response) or email — both linked clearly on the Contact Me page. Direct visitors there rather than guessing contact details yourself.
- Visitors can also support his work via the M-Pesa donate option on the Contact Me page.

If asked something you don't know, say you're not sure and suggest they ask Sheldon directly via the Contact Me page. Never invent facts about him beyond what's listed here.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.URL || 'https://sheldonkikechi.netlify.app',
        'X-Title': 'Sheldon Kikechi Portfolio Assistant'
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 400
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data.error || 'Upstream error' }) };
    }

    const reply = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "Sorry, I couldn't generate a response just now.";

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

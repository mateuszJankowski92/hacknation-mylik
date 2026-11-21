export const SIMULATOR_HTML = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MYLIK: symulator SMS</title>
<style>
	:root { color-scheme: only light; }
	* { box-sizing: border-box; }
	body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #ffffff; font-family: system-ui, sans-serif; color: #1b2430; }
	.phone { width: 360px; max-width: 100%; height: 640px; max-height: 100vh; background: #fff; border-radius: 28px; display: flex; flex-direction: column; overflow: hidden; border: 8px solid #1b2430; }
	.phone__header { padding: 14px 16px; background: #1b2430; color: #fff; }
	.phone__title { font-size: 16px; font-weight: 600; }
	.phone__note { font-size: 12px; opacity: .75; margin-top: 2px; }
	.phone__thread { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #f4f6f9; }
	.bubble { max-width: 82%; padding: 8px 12px; border-radius: 16px; font-size: 14px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
	.bubble--out { align-self: flex-end; background: #2a5fd0; color: #fff; border-bottom-right-radius: 4px; }
	.bubble--in { align-self: flex-start; background: #fff; border: 1px solid #d5dbe3; border-bottom-left-radius: 4px; }
	.phone__form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #d5dbe3; background: #fff; }
	.phone__input { flex: 1; resize: none; font: inherit; font-size: 14px; padding: 8px 10px; border: 1px solid #b9c2cf; border-radius: 12px; }
	.phone__send { font: inherit; font-weight: 600; padding: 0 16px; border: 0; border-radius: 12px; background: #2a5fd0; color: #fff; cursor: pointer; }
	.phone__send:disabled { opacity: .5; cursor: default; }
	.phone__counter { font-size: 11px; color: #5b6675; padding: 0 12px 8px; text-align: right; background: #fff; }
</style>
</head>
<body>
<main class="phone">
	<header class="phone__header">
		<div class="phone__title">MYLIK (symulator SMS)</div>
		<div class="phone__note">To tylko symulacja telefonu. Nic nie idzie do operatora.</div>
	</header>
	<div class="phone__thread" id="thread" aria-live="polite"></div>
	<form class="phone__form" id="form">
		<textarea class="phone__input" id="input" rows="2" maxlength="480" placeholder="Wpisz, co chcesz sprawdzić" aria-label="Treść SMS"></textarea>
		<button class="phone__send" id="send" type="submit">Wyślij</button>
	</form>
	<div class="phone__counter" id="counter">0 / 480</div>
</main>
<script>
(function () {
	var MAX_CHARS = 480;
	var FAKE_NUMBER = '+48500000000';
	var thread = document.getElementById('thread');
	var form = document.getElementById('form');
	var input = document.getElementById('input');
	var send = document.getElementById('send');
	var counter = document.getElementById('counter');

	function addBubble(kind, text) {
		var el = document.createElement('div');
		el.className = 'bubble bubble--' + kind;
		el.textContent = text;
		thread.appendChild(el);
		thread.scrollTop = thread.scrollHeight;
	}

	input.addEventListener('input', function () {
		counter.textContent = input.value.length + ' / ' + MAX_CHARS;
	});

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		var text = input.value.trim();
		if (!text) return;
		addBubble('out', text);
		input.value = '';
		counter.textContent = '0 / ' + MAX_CHARS;
		send.disabled = true;
		fetch('/sms/webhook', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ from: FAKE_NUMBER, text: text })
		})
			.then(function (res) { return res.text(); })
			.then(function (reply) { addBubble('in', reply); })
			.catch(function () { addBubble('in', 'Nie udało się połączyć z usługą. Zgłoszenie nie zostało ocenione. Spróbuj ponownie później.'); })
			.then(function () { send.disabled = false; input.focus(); });
	});
})();
</script>
</body>
</html>
`;

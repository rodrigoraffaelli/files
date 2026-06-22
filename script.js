/* ============================================================
   SEATUP — SCRIPT.JS
   Integração: AeroDataBox (primária) → AviationStack (backup)
   Sem mock. Se nenhuma API achar o voo → WhatsApp.
   ============================================================ */

// ╔════════════════════════════════════════════════════════════════════╗
// ║  CONFIGURAÇÃO: INSIRA SUAS CHAVES AQUI                            ║
// ║  AeroDataBox: https://rapidapi.com/aedbx-aedbx/api/aerodatabox    ║
// ║  AviationStack: https://aviationstack.com                         ║
// ╚════════════════════════════════════════════════════════════════════╝

const AERODATABOX_KEY   = '6ae8bfd17fmshf17bab6649e8d92p1b5e8djsn2f0c2249de0d';   // x-rapidapi-key
const AVIATIONSTACK_KEY = '139bc4bc235a4d246a4bad860cd1d1f0'; // access_key
const WHATSAPP_NUMERO   = '5511999999999';         // só números, com DDD

/* ============================================================
   FIX 1 — MÁSCARA DE DATA DD/MM/AAAA
   ============================================================ */
(function() {
  const dateInput = document.getElementById('flight-date');
  if (!dateInput) return;

  function formatarInput(valor) {
    const digits = valor.replace(/\D/g, '').slice(0, 8);
    let formatted = '';
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length >= 3) formatted += '/' + digits.slice(2, 4);
    if (digits.length >= 5) formatted += '/' + digits.slice(4, 8);
    return formatted;
  }

  dateInput.addEventListener('input', function(e) {
    e.target.value = formatarInput(e.target.value);
  });

  dateInput.addEventListener('paste', function(e) {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    e.target.value = formatarInput(pasted);
  });
})();

/* ============================================================
   UTILITÁRIOS DE DATA
   ============================================================ */
function converterDataParaAPI(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return dateStr;
}

function formatarData(dateStr) {
  if (!dateStr) return '---';
  let day, month, year;

  if (dateStr.includes('/')) {
    [day, month, year] = dateStr.split('/');
  } else if (dateStr.includes('-')) {
    [year, month, day] = dateStr.split('-');
  } else {
    return dateStr;
  }

  if (!day || !month || !year) return '---';

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mesIndex = parseInt(month, 10) - 1;
  if (mesIndex < 0 || mesIndex > 11) return '---';

  return `${parseInt(day, 10)} de ${meses[mesIndex]} de ${year}`;
}

function formatarHorario(isoString) {
  if (!isoString) return '---';
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  // Se já vier HH:MM
  if (/^\d{2}:\d{2}$/.test(isoString)) return isoString;
  return '---';
}

function getDotClass(airlineIata) {
  const map = {
    'LA': 'dot-latam',
    'JJ': 'dot-latam',
    'G3': 'dot-gol',
    'AD': 'dot-azul',
    'AA': 'dot-american',
    'UA': 'dot-united'
  };
  return map[airlineIata] || 'dot-default';
}

/* ============================================================
   API 1: AERODATABOX (RapidAPI) — PRIMÁRIA
   ============================================================ */
async function buscarAeroDataBox(flightNumber, dataISO) {
  if (!AERODATABOX_KEY || AERODATABOX_KEY.startsWith('SEU_')) {
    console.log('→ AeroDataBox: chave não configurada');
    return null;
  }

  try {
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber)}/${dataISO}`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-host': 'aerodatabox.p.rapidapi.com',
        'x-rapidapi-key': AERODATABOX_KEY
      }
    });

    if (!response.ok) {
      console.warn('→ AeroDataBox: HTTP', response.status);
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('→ AeroDataBox: voo não encontrado');
      return null;
    }

    const f = data[0];

    const depAirport = f.departure?.airport?.name || 'Aeroporto de Origem';
    const depIata    = f.departure?.airport?.iata || '';
    const arrAirport = f.arrival?.airport?.name   || 'Aeroporto de Destino';
    const arrIata    = f.arrival?.airport?.iata   || '';
    const airline    = f.airline?.name            || 'Companhia Aérea';
    const airlineIata= f.airline?.iata            || '';

    return {
      flight:      flightNumber,
      from:        depIata ? `${depAirport} (${depIata})` : depAirport,
      fromCode:    depIata,
      to:          arrIata ? `${arrAirport} (${arrIata})` : arrAirport,
      toCode:      arrIata,
      depTime:     formatarHorario(f.departure?.scheduledTime?.local),
      arrTime:     formatarHorario(f.arrival?.scheduledTime?.local),
      terminal:    f.departure?.terminal || '3',
      airline:     airline,
      airlineIata: airlineIata,
      dotClass:    getDotClass(airlineIata)
    };

  } catch (err) {
    console.error('→ AeroDataBox: erro', err.message);
    return null;
  }
}

/* ============================================================
   API 2: AVIATIONSTACK — BACKUP ALTEREI AQUI
   ============================================================ */
async function buscarAviationStack(flightNumber) {
  if (!AVIATIONSTACK_KEY || AVIATIONSTACK_KEY.startsWith('SUA_')) {
    console.log('→ AviationStack: chave não configurada');
    return null;
  }

  try {
    const params = new URLSearchParams({
      access_key:  AVIATIONSTACK_KEY,
      flight_iata: flightNumber,
      limit:       '5'
    });

    const response = await fetch(`https://api.aviationstack.com/v1/flights?${params}`);
    if (!response.ok) {
      console.warn('→ AviationStack: HTTP', response.status);
      return null;
    }

    const data = await response.json();
    if (data.error) {
      console.warn('→ AviationStack: erro', data.error);
      return null;
    }
    if (!data.data || data.data.length === 0) {
      console.warn('→ AviationStack: voo não encontrado');
      return null;
    }

    const f = data.data.find(function(item) {
      return item.flight && item.flight.iata &&
             item.flight.iata.toUpperCase() === flightNumber.toUpperCase();
    }) || data.data[0];

    const depAirport = f.departure?.airport || (f.departure?.iata ? '' : 'Aeroporto de Origem');
    const depIata    = f.departure?.iata || '';
    const arrAirport = f.arrival?.airport   || (f.arrival?.iata ? '' : 'Aeroporto de Destino');
    const arrIata    = f.arrival?.iata || '';
    const airline    = f.airline?.name || 'Companhia Aérea';
    const airlineIata= f.airline?.iata || '';

    return {
      flight:      flightNumber,
      from:        depIata ? `${depAirport || depIata} (${depIata})` : depAirport,
      fromCode:    depIata,
      to:          arrIata ? `${arrAirport || arrIata} (${arrIata})` : arrAirport,
      toCode:      arrIata,
      depTime:     f.departure?.scheduled ? f.departure.scheduled.slice(11, 16) : '',
      arrTime:     f.arrival?.scheduled   ? f.arrival.scheduled.slice(11, 16)   : '',
      terminal:    f.departure?.terminal  || '',
      airline:     airline,
      airlineIata: airlineIata,
      dotClass:    getDotClass(airlineIata)
    };

  } catch (err) {
    console.error('→ AviationStack: erro', err.message);
    return null;
  }
}

/* ============================================================
   PÁGINA INDEX: Busca de Voo (cascata de APIs)
   ============================================================ */
async function buscarVoo(event) {
  event.preventDefault();

  const flightNumber = document.getElementById('flight-number').value.trim().toUpperCase();
  const flightDate   = document.getElementById('flight-date').value.trim();
  const passenger    = document.getElementById('passenger-name').value.trim().toUpperCase();
  const resultBox    = document.getElementById('search-result');

  if (!flightNumber || !flightDate || !passenger) {
    alert('Preencha todos os campos para buscar o upgrade.');
    return;
  }

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(flightDate)) {
    alert('Por favor, insira a data no formato DD/MM/AAAA. Exemplo: 15/07/2026');
    return;
  }

  const btn = event.target.querySelector('button[type="submit"]');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = 'BUSCANDO VOO...';
  btn.disabled = true;
  if (resultBox) resultBox.innerHTML = '<p class="searching-msg">🔎 Buscando voo nas fontes oficiais...</p>';

  const dataISO = converterDataParaAPI(flightDate);
  let flightData = null;

  // 1) Tenta AeroDataBox
  flightData = await buscarAeroDataBox(flightNumber, dataISO);

  // 2) Fallback: AviationStack
  if (!flightData) {
    flightData = await buscarAviationStack(flightNumber);
  }

  // 3) Último recurso: WhatsApp
  if (!flightData) {
    mostrarFallbackWhatsApp(flightNumber, flightDate, resultBox);
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    return;
  }

  // Salva e vai para resultados
  sessionStorage.setItem('seatup_flight', JSON.stringify({
    flight:      flightData.flight,
    from:        flightData.from,
    fromCode:    flightData.fromCode,
    to:          flightData.to,
    toCode:      flightData.toCode,
    depTime:     flightData.depTime,
    arrTime:     flightData.arrTime,
    terminal:    flightData.terminal,
    date:        formatarData(flightDate),
    dateRaw:     flightDate,
    dateISO:     dataISO,
    airline:     flightData.airline,
    airlineIata: flightData.airlineIata,
    dotClass:    flightData.dotClass,
    passenger:   passenger
  }));

  window.location.href = 'resultado.html';
}

/* ============================================================
   WHATSAPP FALLBACK
   ============================================================ */
function mostrarFallbackWhatsApp(voo, dataBR, container) {
  const mensagem = encodeURIComponent(
    `Olá! Gostaria de verificar o voo ${voo} do dia ${dataBR}. Pode me ajudar?`
  );
  const linkWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensagem}`;

  const html = `
    <div class="fallback-whatsapp">
      <div class="fallback-icon">🛫</div>
      <h3>Voo não encontrado</h3>
      <p>Não localizamos o voo <strong>${voo}</strong> na data <strong>${dataBR}</strong> em nossas fontes oficiais.</p>
      <p>Não se preocupe! Fale conosco pelo WhatsApp que verificamos pessoalmente:</p>
      <a href="${linkWhatsApp}" target="_blank" rel="noopener" class="btn-whatsapp">
        📱 Falar no WhatsApp
      </a>
      <p class="fallback-sub">Respondemos em até 5 minutos em horário comercial.</p>
    </div>
  `;

  if (container) {
    container.innerHTML = html;
  } else {
    const fallback = document.createElement('div');
    fallback.innerHTML = html;
    const form = document.getElementById('flight-search');
    if (form) form.after(fallback.firstElementChild);
  }
}

/* ============================================================
   PÁGINA RESULTADO: Preencher com dados do voo ALTEREI AQUI
   ============================================================ */
(function() {
  if (!window.location.pathname.includes('resultado')) return;

  const raw = sessionStorage.getItem('seatup_flight');
  if (!raw) { window.location.href = '/'; return; }

  const d = JSON.parse(raw);

  document.getElementById('result-flight-code').textContent = d.flight;
  document.getElementById('result-from').textContent        = d.from;
  document.getElementById('result-to').textContent          = d.to;
  document.getElementById('result-dep-time').textContent    = d.depTime;
  document.getElementById('result-arr-time').textContent    = d.arrTime;
  document.getElementById('result-date').textContent        = d.date || formatarData(d.dateRaw) || '';
  document.getElementById('result-terminal').textContent    = 'Terminal ' + d.terminal;
  document.getElementById('result-passenger').textContent   = d.passenger;
  document.getElementById('result-airline').textContent     = d.airline;

  const dot = document.getElementById('airline-dot');
  if (dot) dot.className = 'airline-dot ' + d.dotClass;

  // Atualizar links dos botões de upgrade com os dados do voo ALTEREI AQUI
  document.querySelectorAll('.btn-upgrade').forEach(function(link) {
    const href = new URL(link.href, window.location.origin);
    href.searchParams.set('flight',  d.flight);
    href.searchParams.set('from',    d.from);
    href.searchParams.set('fromCode', d.fromCode || '');
    href.searchParams.set('to',      d.to);
    href.searchParams.set('toCode',  d.toCode || '');
    href.searchParams.set('date',    d.date || formatarData(d.dateRaw) || '');
    href.searchParams.set('dateRaw', d.dateRaw || '');
    href.searchParams.set('depTime', d.depTime || '');
    href.searchParams.set('arrTime', d.arrTime || '');
    href.searchParams.set('airline', d.airline || '');
    link.href = href.toString();
  });

  iniciarTimer('countdown', 10);
})();

/* ============================================================
   PÁGINA PAGAMENTO: Preencher resumo com data correta alterei aqui (---)
   ============================================================ */
(function() {
  if (!window.location.pathname.includes('pagamento')) return;

  const params = new URLSearchParams(window.location.search);
  const raw    = sessionStorage.getItem('seatup_flight');

  let d = raw ? JSON.parse(raw) : {};

  // Prioridade: URL params > sessionStorage
  const flight  = params.get('flight')  || d.flight  || '';
  const from    = params.get('from')    || d.from    || '';
  const to      = params.get('to')      || d.to      || '';
  const depTime = params.get('depTime') || d.depTime || '';
  const arrTime = params.get('arrTime') || d.arrTime || '';
  const airline = params.get('airline') || d.airline || '';

  let dataExibir = params.get('date');
  if (!dataExibir && d.date) dataExibir = d.date;
  if (!dataExibir && params.get('dateRaw')) dataExibir = formatarData(params.get('dateRaw'));
  if (!dataExibir && d.dateRaw) dataExibir = formatarData(d.dateRaw);
  if (!dataExibir) dataExibir = '---';

  // Preenche IDs legados (se existirem)
  const legados = {
    'pay-flight': flight,
    'pay-route':  `${from.split('(')[1]?.replace(')', '') || from} → ${to.split('(')[1]?.replace(')', '') || to}`,
    'pay-date':   dataExibir,
    'pay-upgrade': params.get('upgrade') || 'Assento Premium'
  };

  Object.entries(legados).forEach(function([id, val]) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  const brl = params.get('price') || '81';
  const eth = params.get('eth')   || '0.0045';

  const payBrl = document.getElementById('pay-brl');
  if (payBrl) payBrl.textContent = `R$ ${brl},00`;

  const payEth = document.getElementById('pay-eth');
  if (payEth) payEth.textContent = `${eth} ETH`;

  iniciarTimer('payment-timer', 10);
})();

/* ============================================================
   TIMER
   ============================================================ */
function iniciarTimer(elementId, minutos) {
  let total = minutos * 60;
  const el = document.getElementById(elementId);
  if (!el) return;

  const interval = setInterval(function() {
    total--;
    const m = Math.floor(total / 60);
    const s = total % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (total <= 0) {
      clearInterval(interval);
      el.textContent = '00:00';
    }
  }, 1000);
}

/* ============================================================
   COPIAR ENDEREÇO
   ============================================================ */
function copiarEndereco() {
  const addr = document.getElementById('wallet-address').textContent.trim();
  navigator.clipboard.writeText(addr).then(function() {
    const btn = document.querySelector('.btn-copy-addr');
    if (btn) {
      btn.textContent = 'COPIADO!';
      setTimeout(function() { btn.textContent = 'COPIAR'; }, 2000);
    }
  }).catch(function() {
    const ta = document.createElement('textarea');
    ta.value = addr;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const btn = document.querySelector('.btn-copy-addr');
    if (btn) {
      btn.textContent = 'COPIADO!';
      setTimeout(function() { btn.textContent = 'COPIAR'; }, 2000);
    }
  });
}

/* ============================================================
   FIX 2 — POPUPS DE NOTIFICAÇÃO SOCIAL
   ============================================================ */
(function() {
  if (window.innerWidth < 768) return;
  if (window.location.pathname.includes('pagamento')) return;

  const nomes    = ['Marcelo', 'Amanda', 'Lucas', 'Fernanda', 'Ricardo', 'Juliana', 'Thiago', 'Camila', 'Bruno', 'Patrícia', 'Eduardo', 'Renata', 'Felipe', 'Natália', 'Gustavo'];
  const destinos = ['Santiago', 'Buenos Aires', 'Miami', 'Lisboa', 'Nova York', 'Orlando', 'Lima', 'Bogotá', 'Madri', 'Paris', 'Roma', 'Cancún', 'Londres', 'Bariloche', 'Santiago'];
  const upgrades = ['Assento Premium', 'Premium Economy', 'Primeira Fileira'];
  const valores  = ['R$ 27', 'R$ 43', 'R$ 54'];
  const tempos   = ['agora mesmo', 'há 12 seg', 'há 28 seg', 'há 45 seg', 'há 1 min', 'há 2 min'];
  const cores    = ['#1a56db', '#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb'];

  const container = document.getElementById('social-toasts');
  if (!container) return;

  function criarToast() {
    const nome    = nomes[Math.floor(Math.random() * nomes.length)];
    const destino = destinos[Math.floor(Math.random() * destinos.length)];
    const upgrade = upgrades[Math.floor(Math.random() * upgrades.length)];
    const valor   = valores[Math.floor(Math.random() * valores.length)];
    const tempo   = tempos[Math.floor(Math.random() * tempos.length)];
    const cor     = cores[Math.floor(Math.random() * cores.length)];
    const iniciais = nome.split(' ').map(function(n) { return n[0]; }).join('').slice(0, 2);

    const toast = document.createElement('div');
    toast.className = 'social-toast';
    toast.innerHTML =
      '<div class="social-toast-avatar" style="background:' + cor + '">' + iniciais + '</div>' +
      '<div class="social-toast-body">' +
        '<strong>' + nome + '</strong> fez upgrade para <strong>' + upgrade + '</strong> — ' + destino +
        '<span class="social-toast-time">' + tempo + ' • ' + valor + '</span>' +
      '</div>';

    container.appendChild(toast);

    setTimeout(function() {
      if (toast.parentNode) toast.remove();
    }, 5000);

    const toasts = container.querySelectorAll('.social-toast');
    if (toasts.length > 2) toasts[0].remove();
  }

  setTimeout(function() {
    criarToast();
    function agendar() {
      const delay = 8000 + Math.random() * 12000;
      setTimeout(function() {
        criarToast();
        agendar();
      }, delay);
    }
    agendar();
  }, 5000);
})();

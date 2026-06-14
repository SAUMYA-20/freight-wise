/**
 * Route Optimization & Multi-Modal Congestion Intelligence
 *
 * Primary routing: OSRM (free, no key) → OpenRouteService → Google Maps / Mapbox
 * Geocoding: OpenStreetMap Nominatim (free) → OpenRouteService
 * Traffic: Google Maps / Mapbox (live) → time-of-day traffic model on OSRM routes
 * Congestion sources:
 *   - Road: OSRM / OpenRouteService / Google / Mapbox
 *   - Port: MarineTraffic (with mock fallback)
 *   - Air: AviationStack (with mock fallback)
 *   - Border: U.S. CBP Border Wait Times API (free)
 */

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY;
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const HERE_API_KEY = process.env.HERE_API_KEY;
const AVIATIONSTACK_KEY = process.env.AVIATIONSTACK_API_KEY;
const MARINETRAFFIC_KEY = process.env.MARINETRAFFIC_API_KEY;

const OSRM_BASE = 'https://router.project-osrm.org';

// ── Major logistics hubs by country ──────────────────────────
const PORTS_BY_COUNTRY = {
  China: { name: 'Shanghai (Yangshan)', code: 'CNSHA', lat: 30.626, lon: 122.061 },
  India: { name: 'Jawaharlal Nehru (Nhava Sheva)', code: 'INNSA', lat: 18.952, lon: 72.948 },
  'United States': { name: 'Port of Los Angeles', code: 'USLAX', lat: 33.740, lon: -118.272 },
  'United Kingdom': { name: 'Port of Felixstowe', code: 'GBFXT', lat: 51.961, lon: 1.351 },
  Germany: { name: 'Port of Hamburg', code: 'DEHAM', lat: 53.546, lon: 9.966 },
  UAE: { name: 'Jebel Ali', code: 'AEJEA', lat: 25.003, lon: 55.062 },
  Singapore: { name: 'Port of Singapore', code: 'SGSIN', lat: 1.264, lon: 103.822 },
  Netherlands: { name: 'Port of Rotterdam', code: 'NLRTM', lat: 51.922, lon: 4.479 },
  Japan: { name: 'Port of Yokohama', code: 'JPYOK', lat: 35.443, lon: 139.638 },
  'South Korea': { name: 'Port of Busan', code: 'KRPUS', lat: 35.102, lon: 129.040 },
  Brazil: { name: 'Port of Santos', code: 'BRSSZ', lat: -23.960, lon: -46.333 },
  Australia: { name: 'Port of Melbourne', code: 'AUMEL', lat: -37.840, lon: 144.946 },
  Canada: { name: 'Port of Vancouver', code: 'CAVAN', lat: 49.283, lon: -123.121 },
  France: { name: 'Port of Le Havre', code: 'FRLEH', lat: 49.494, lon: 0.108 },
  Italy: { name: 'Port of Genoa', code: 'ITGOA', lat: 44.407, lon: 8.933 },
  Spain: { name: 'Port of Valencia', code: 'ESVLC', lat: 39.452, lon: -0.326 },
  Mexico: { name: 'Port of Manzanillo', code: 'MXZLO', lat: 19.053, lon: -104.318 },
  Indonesia: { name: 'Port of Tanjung Priok', code: 'IDTPP', lat: -6.104, lon: 106.880 },
  'Saudi Arabia': { name: 'King Abdullah Port', code: 'SAKAP', lat: 22.400, lon: 39.083 },
  'South Africa': { name: 'Port of Durban', code: 'ZADUR', lat: -29.858, lon: 31.029 },
};

const AIRPORTS_BY_COUNTRY = {
  China: { name: 'Shanghai Pudong (PVG)', iata: 'PVG' },
  India: { name: 'Indira Gandhi Intl (DEL)', iata: 'DEL' },
  'United States': { name: 'Los Angeles Intl (LAX)', iata: 'LAX' },
  'United Kingdom': { name: 'Heathrow (LHR)', iata: 'LHR' },
  Germany: { name: 'Frankfurt (FRA)', iata: 'FRA' },
  UAE: { name: 'Dubai Intl (DXB)', iata: 'DXB' },
  Singapore: { name: 'Changi (SIN)', iata: 'SIN' },
  Netherlands: { name: 'Amsterdam Schiphol (AMS)', iata: 'AMS' },
  Japan: { name: 'Narita (NRT)', iata: 'NRT' },
  'South Korea': { name: 'Incheon (ICN)', iata: 'ICN' },
  Brazil: { name: 'São Paulo Guarulhos (GRU)', iata: 'GRU' },
  Australia: { name: 'Sydney (SYD)', iata: 'SYD' },
  Canada: { name: 'Toronto Pearson (YYZ)', iata: 'YYZ' },
  France: { name: 'Charles de Gaulle (CDG)', iata: 'CDG' },
  Italy: { name: 'Malpensa (MXP)', iata: 'MXP' },
  Spain: { name: 'Madrid Barajas (MAD)', iata: 'MAD' },
  Mexico: { name: 'Mexico City (MEX)', iata: 'MEX' },
  Indonesia: { name: 'Soekarno-Hatta (CGK)', iata: 'CGK' },
  'Saudi Arabia': { name: 'King Abdulaziz (JED)', iata: 'JED' },
  'South Africa': { name: 'OR Tambo (JNB)', iata: 'JNB' },
};

// ── Helpers ──────────────────────────────────────────────────
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function congestionLevel(score) {
  if (score >= 75) return 'severe';
  if (score >= 55) return 'high';
  if (score >= 35) return 'moderate';
  if (score >= 15) return 'low';
  return 'clear';
}

function levelColor(level) {
  const map = { clear: '#059669', low: '#0D9488', moderate: '#F59E0B', high: '#EA580C', severe: '#DC2626' };
  return map[level] || '#6B7280';
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...options.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function extractCountry(input, geoName) {
  const sources = [input, geoName].filter(Boolean);
  const countries = Object.keys(PORTS_BY_COUNTRY);

  for (const src of sources) {
    for (const country of countries) {
      if (src.toLowerCase().includes(country.toLowerCase())) return country;
    }
    // Match common aliases
    const aliases = {
      usa: 'United States', us: 'United States', uk: 'United Kingdom',
      uae: 'UAE', korea: 'South Korea',
    };
    for (const [alias, country] of Object.entries(aliases)) {
      if (src.toLowerCase().includes(alias)) return country;
    }
  }
  return null;
}
async function geocodeLocation(query) {
  // Try OpenRouteService geocoding if key available
  if (ORS_API_KEY) {
    try {
      const url = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(query)}&size=1`;
      const data = await fetchJSON(url);
      if (data.features?.length) {
        const f = data.features[0];
        const [lon, lat] = f.geometry.coordinates;
        return {
          name: f.properties.label || f.properties.name || query,
          lat,
          lon,
          source: 'OpenRouteService',
        };
      }
    } catch (err) {
      console.warn('ORS geocode failed:', err.message);
    }
  }

  // Free fallback: OpenStreetMap Nominatim
  const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const results = await fetchJSON(nomUrl, {
    headers: { 'User-Agent': 'ZODFarAway-RouteOptimizer/1.0' },
  });
  if (!results?.length) throw new Error(`Could not geocode location: "${query}"`);
  return {
    name: results[0].display_name,
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    source: 'OpenStreetMap',
  };
}

// ── Traffic delay estimation (when no live traffic API) ────────
function estimateTrafficDelay(durationMinutes, origin, destination) {
  const hour = new Date().getHours();
  const isUrban = (name) => /city|metro|downtown|district|county|shanghai|los angeles|london|mumbai|delhi|berlin|paris|tokyo|new york|chicago|houston|dubai|singapore/i.test(name);

  let multiplier = 1.0;
  // Rush hour peaks
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) multiplier = 1.25;
  else if (hour >= 10 && hour <= 15) multiplier = 1.12;
  else if (hour >= 22 || hour <= 5) multiplier = 0.95;

  if (isUrban(origin.name) || isUrban(destination.name)) multiplier += 0.08;

  const seed = hashSeed(`${origin.lat}-${destination.lat}-${hour}`);
  multiplier += (seed % 10) / 100; // 0–9% variance

  const withTraffic = Math.round(durationMinutes * multiplier);
  const delay = Math.max(0, withTraffic - durationMinutes);
  return { durationWithTrafficMinutes: withTraffic, congestionDelayMinutes: delay };
}

function buildRouteResult(source, routes) {
  const primary = routes[0];
  const congestionScore = Math.min(
    100,
    Math.round((primary.congestionDelayMinutes / Math.max(primary.durationMinutes, 1)) * 100 + 10)
  );
  return {
    source,
    distanceKm: primary.distanceKm,
    durationMinutes: primary.durationMinutes,
    durationWithTrafficMinutes: primary.durationWithTrafficMinutes,
    congestionDelayMinutes: primary.congestionDelayMinutes,
    routes,
    score: congestionScore,
    level: congestionLevel(congestionScore),
    congestionScore,
    congestionLevel: congestionLevel(congestionScore),
  };
}

function parseOSRMSteps(legs) {
  const steps = [];
  for (const leg of legs) {
    for (const step of (leg.steps || [])) {
      const name = step.name || step.ref || '';
      const maneuver = step.maneuver?.type || 'continue';
      const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';
      steps.push({
        message: name ? `${maneuver}${modifier} onto ${name}` : `${maneuver}${modifier}`,
        distanceMeters: step.distance || 0,
      });
    }
  }
  return steps.slice(0, 10);
}

// ── OSRM (free, no API key) ──────────────────────────────────
async function getOSRMRoute(origin, destination) {
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=false&steps=true&alternatives=true&geometries=geojson`;
  const data = await fetchJSON(url);

  if (data.code !== 'Ok' || !data.routes?.length) throw new Error(`OSRM: ${data.code || 'No route'}`);

  const routes = data.routes.map((route, idx) => {
    const durationMinutes = Math.round(route.duration / 60);
    const traffic = estimateTrafficDelay(durationMinutes, origin, destination);
    return {
      label: idx === 0 ? 'Recommended' : `Alternative ${idx}`,
      distanceKm: parseFloat((route.distance / 1000).toFixed(1)),
      durationMinutes,
      durationWithTrafficMinutes: traffic.durationWithTrafficMinutes,
      congestionDelayMinutes: traffic.congestionDelayMinutes,
      instructions: parseOSRMSteps(route.legs || []),
      incidents: [],
    };
  });

  return buildRouteResult('OSRM (OpenStreetMap)', routes);
}

// ── OpenRouteService (free API key) ──────────────────────────
async function getORSRoute(origin, destination) {
  const url = `https://api.openrouteservice.org/v2/directions/driving-hgv?api_key=${ORS_API_KEY}`;
  const body = {
    coordinates: [[origin.lon, origin.lat], [destination.lon, destination.lat]],
    preference: 'fastest',
    alternative_routes: { target_count: 2, share_factor: 0.6 },
    instructions: true,
    language: 'en',
  };

  const data = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!data.routes?.length) throw new Error('ORS: No route found');

  const routes = data.routes.map((route, idx) => {
    const summary = route.summary;
    const durationMinutes = Math.round(summary.duration / 60);
    const traffic = estimateTrafficDelay(durationMinutes, origin, destination);
    const instructions = (route.segments || []).flatMap((seg) =>
      (seg.steps || []).slice(0, 4).map((step) => ({
        message: step.instruction || 'Continue',
        distanceMeters: step.distance || 0,
      }))
    ).slice(0, 10);

    return {
      label: idx === 0 ? 'Recommended' : `Alternative ${idx}`,
      distanceKm: parseFloat((summary.distance / 1000).toFixed(1)),
      durationMinutes,
      durationWithTrafficMinutes: traffic.durationWithTrafficMinutes,
      congestionDelayMinutes: traffic.congestionDelayMinutes,
      instructions,
      incidents: [],
    };
  });

  return buildRouteResult('OpenRouteService', routes);
}

// ── Mapbox (live traffic) ────────────────────────────────────
async function getMapboxRoute(origin, destination) {
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?alternatives=true&steps=true&overview=false&access_token=${MAPBOX_TOKEN}`;
  const data = await fetchJSON(url);

  if (data.code !== 'Ok' || !data.routes?.length) throw new Error(`Mapbox: ${data.code || 'No route'}`);

  const routes = data.routes.map((route, idx) => {
    const durationMinutes = Math.round(route.duration / 60);
    const baseMinutes = Math.round((route.duration - (route.duration_typical ? route.duration - route.duration_typical : 0)) / 60);
    const trafficMinutes = Math.round(route.duration / 60);
    const delayMinutes = route.duration_typical
      ? Math.max(0, Math.round((route.duration - route.duration_typical) / 60))
      : estimateTrafficDelay(durationMinutes, origin, destination).congestionDelayMinutes;

    const instructions = (route.legs || []).flatMap((leg) =>
      (leg.steps || []).slice(0, 4).map((step) => ({
        message: step.maneuver?.instruction || step.name || 'Continue',
        distanceMeters: step.distance || 0,
      }))
    ).slice(0, 10);

    return {
      label: idx === 0 ? 'Recommended' : `Alternative ${idx}`,
      distanceKm: parseFloat((route.distance / 1000).toFixed(1)),
      durationMinutes: baseMinutes || durationMinutes,
      durationWithTrafficMinutes: trafficMinutes,
      congestionDelayMinutes: delayMinutes,
      instructions,
      incidents: [],
    };
  });

  return buildRouteResult('Mapbox (live traffic)', routes);
}

async function getGoogleRoute(origin, destination) {
  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lon}`,
    destination: `${destination.lat},${destination.lon}`,
    mode: 'driving',
    departure_time: 'now',
    traffic_model: 'best_guess',
    alternatives: 'true',
    key: GOOGLE_MAPS_KEY,
  });
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
  const data = await fetchJSON(url);

  if (data.status !== 'OK' || !data.routes?.length) throw new Error(`Google Directions: ${data.status}`);

  const routes = data.routes.map((route, idx) => {
    const leg = route.legs[0];
    const durationSec = leg.duration.value;
    const trafficSec = leg.duration_in_traffic?.value || durationSec;
    return {
      label: idx === 0 ? 'Recommended' : `Alternative ${idx}`,
      distanceKm: parseFloat((leg.distance.value / 1000).toFixed(1)),
      durationMinutes: Math.round(durationSec / 60),
      durationWithTrafficMinutes: Math.round(trafficSec / 60),
      congestionDelayMinutes: Math.max(0, Math.round((trafficSec - durationSec) / 60)),
      summary: route.summary,
      instructions: leg.steps.slice(0, 8).map((s) => ({
        message: s.html_instructions?.replace(/<[^>]+>/g, '') || '',
        distanceMeters: s.distance.value,
      })),
      incidents: [],
    };
  });

  return buildRouteResult('Google Maps (live traffic)', routes);
}

function getFallbackRoute(origin, destination) {
  const distanceKm = parseFloat(haversineKm(origin.lat, origin.lon, destination.lat, destination.lon).toFixed(1));
  const roadFactor = 1.35;
  const adjustedKm = distanceKm * roadFactor;
  const avgSpeedKmh = 65;
  const durationMinutes = Math.round((adjustedKm / avgSpeedKmh) * 60);
  const traffic = estimateTrafficDelay(durationMinutes, origin, destination);
  const congestionScore = Math.min(
    100,
    Math.round((traffic.congestionDelayMinutes / durationMinutes) * 80 + 15)
  );

  const routes = [{
    label: 'Estimated Route',
    distanceKm: parseFloat(adjustedKm.toFixed(1)),
    durationMinutes,
    durationWithTrafficMinutes: traffic.durationWithTrafficMinutes,
    congestionDelayMinutes: traffic.congestionDelayMinutes,
    instructions: [
      { message: `Depart from ${origin.name.split(',')[0]}`, distanceMeters: 0 },
      { message: `Continue toward ${destination.name.split(',')[0]}`, distanceMeters: adjustedKm * 500 },
      { message: `Arrive at ${destination.name.split(',')[0]}`, distanceMeters: adjustedKm * 1000 },
    ],
    incidents: [],
  }];

  return {
    source: 'Estimated (routing unavailable)',
    distanceKm: parseFloat(adjustedKm.toFixed(1)),
    durationMinutes,
    durationWithTrafficMinutes: traffic.durationWithTrafficMinutes,
    congestionDelayMinutes: traffic.congestionDelayMinutes,
    routes,
    score: congestionScore,
    level: congestionLevel(congestionScore),
    congestionScore,
    congestionLevel: congestionLevel(congestionScore),
  };
}

async function getRoadCongestion(origin, destination) {
  const providers = [
    { name: 'Google Maps', fn: () => GOOGLE_MAPS_KEY && getGoogleRoute(origin, destination) },
    { name: 'Mapbox', fn: () => MAPBOX_TOKEN && getMapboxRoute(origin, destination) },
    { name: 'OpenRouteService', fn: () => ORS_API_KEY && getORSRoute(origin, destination) },
    { name: 'OSRM', fn: () => getOSRMRoute(origin, destination) },
  ];

  for (const provider of providers) {
    try {
      const result = await provider.fn();
      if (result) return result;
    } catch (err) {
      console.warn(`${provider.name} routing failed:`, err.message);
    }
  }

  return getFallbackRoute(origin, destination);
}

// ── Port congestion ──────────────────────────────────────────
async function getPortCongestion(originCountry, destCountry) {
  const originPort = PORTS_BY_COUNTRY[originCountry];
  const destPort = PORTS_BY_COUNTRY[destCountry];

  if (!originPort && !destPort) {
    return {
      level: 'unknown',
      score: 0,
      source: 'No port data',
      origin: null,
      destination: null,
      message: 'No major port mapped for selected countries.',
    };
  }

  const ports = [originPort, destPort].filter(Boolean);
  const portDetails = [];

  for (const port of ports) {
    let detail = await fetchMarineTrafficPort(port);
    if (!detail) detail = generatePortCongestion(port);
    portDetails.push(detail);
  }

  const maxScore = Math.max(...portDetails.map((p) => p.score));
  return {
    level: congestionLevel(maxScore),
    score: maxScore,
    source: portDetails.some((p) => p.source === 'MarineTraffic') ? 'MarineTraffic' : 'Port Intelligence (estimated)',
    origin: portDetails.find((p) => p.code === originPort?.code) || null,
    destination: portDetails.find((p) => p.code === destPort?.code) || null,
    ports: portDetails,
  };
}

async function fetchMarineTrafficPort(port) {
  if (!MARINETRAFFIC_KEY) return null;
  try {
    // MarineTraffic port congestion endpoint (requires subscription)
    const url = `https://services.marinetraffic.com/api/portcongestion/${MARINETRAFFIC_KEY}?portid=${port.code}`;
    const data = await fetchJSON(url);
    if (data?.DATA?.length) {
      const d = data.DATA[0];
      const score = Math.min(100, Math.round((d.WAITING || 0) * 3 + (d.ANCHORAGE || 0) * 2));
      return {
        name: port.name,
        code: port.code,
        waitingShips: d.WAITING || 0,
        atAnchorage: d.ANCHORAGE || 0,
        avgBerthWaitHours: d.AVG_WAIT_HOURS || null,
        score,
        level: congestionLevel(score),
        source: 'MarineTraffic',
      };
    }
  } catch {
    // fall through to mock
  }
  return null;
}

function generatePortCongestion(port) {
  const hour = new Date().getUTCHours();
  const seed = hashSeed(`${port.code}-${hour}-${new Date().getDate()}`);
  const waitingShips = (seed % 25) + 3;
  const atAnchorage = (seed % 12) + 1;
  const avgBerthWaitHours = parseFloat(((seed % 72) + 8).toFixed(1));
  const score = Math.min(100, Math.round(waitingShips * 2.5 + atAnchorage * 3 + avgBerthWaitHours * 0.4));

  return {
    name: port.name,
    code: port.code,
    waitingShips,
    atAnchorage,
    avgBerthWaitHours,
    queueLength: waitingShips + atAnchorage,
    score,
    level: congestionLevel(score),
    source: 'Port Intelligence (estimated)',
  };
}

// ── Air cargo congestion ─────────────────────────────────────
async function getAirCongestion(originCountry, destCountry) {
  const originAirport = AIRPORTS_BY_COUNTRY[originCountry];
  const destAirport = AIRPORTS_BY_COUNTRY[destCountry];

  if (!originAirport && !destAirport) {
    return {
      level: 'unknown',
      score: 0,
      source: 'No airport data',
      message: 'No major cargo airport mapped for selected countries.',
    };
  }

  const airports = [originAirport, destAirport].filter(Boolean);
  const details = [];

  for (const airport of airports) {
    let detail = await fetchAviationStack(airport);
    if (!detail) detail = generateAirCongestion(airport);
    details.push(detail);
  }

  const maxScore = Math.max(...details.map((a) => a.score));
  return {
    level: congestionLevel(maxScore),
    score: maxScore,
    source: details.some((a) => a.source === 'AviationStack') ? 'AviationStack' : 'Air Intelligence (estimated)',
    origin: details.find((a) => a.iata === originAirport?.iata) || null,
    destination: details.find((a) => a.iata === destAirport?.iata) || null,
    airports: details,
  };
}

async function fetchAviationStack(airport) {
  if (!AVIATIONSTACK_KEY) return null;
  try {
    const url = `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_KEY}&dep_iata=${airport.iata}&flight_status=active&limit=50`;
    const data = await fetchJSON(url);
    const flights = data.data || [];
    const delayed = flights.filter((f) => {
      const dep = f.departure;
      if (!dep?.scheduled || !dep?.actual) return false;
      const delay = (new Date(dep.actual) - new Date(dep.scheduled)) / 60000;
      return delay > 15;
    }).length;

    const score = Math.min(100, Math.round((delayed / Math.max(flights.length, 1)) * 100 + flights.length * 0.5));
    return {
      name: airport.name,
      iata: airport.iata,
      activeFlights: flights.length,
      delayedFlights: delayed,
      avgDelayMinutes: delayed > 0 ? Math.round((delayed / flights.length) * 30) : 0,
      score,
      level: congestionLevel(score),
      source: 'AviationStack',
    };
  } catch {
    return null;
  }
}

function generateAirCongestion(airport) {
  const seed = hashSeed(`${airport.iata}-${new Date().getHours()}`);
  const activeFlights = (seed % 80) + 20;
  const delayedFlights = Math.round(activeFlights * ((seed % 40) / 100));
  const avgDelayMinutes = delayedFlights > 0 ? (seed % 90) + 10 : 0;
  const score = Math.min(100, Math.round((delayedFlights / activeFlights) * 90 + 5));

  return {
    name: airport.name,
    iata: airport.iata,
    activeFlights,
    delayedFlights,
    avgDelayMinutes,
    cargoTerminalActivity: ['Normal', 'Elevated', 'High', 'Critical'][seed % 4],
    score,
    level: congestionLevel(score),
    source: 'Air Intelligence (estimated)',
  };
}

// ── Border congestion ────────────────────────────────────────
async function getBorderCongestion(originCountry, destCountry) {
  const crossings = [];

  // U.S. CBP Border Wait Times — free public API
  if (originCountry === 'United States' || destCountry === 'United States' ||
      originCountry === 'Mexico' || destCountry === 'Mexico' ||
      originCountry === 'Canada' || destCountry === 'Canada') {
    try {
      const res = await fetch('https://bwt.cbp.gov/api/bwt', {
        headers: { Accept: 'application/json', 'User-Agent': 'ZODFarAway-RouteOptimizer/1.0' },
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          const data = await res.json();
          const relevant = (Array.isArray(data) ? data : [])
            .filter((c) => {
              const name = (c.port_name || c.PortName || '').toLowerCase();
              return name.includes('commercial') || name.includes('truck') || name.includes('cargo');
            })
            .slice(0, 6);

          for (const c of relevant) {
            const wait = parseInt(c.wait_time || c.WaitTime || c.standard_lane_time || '0', 10) || 0;
            crossings.push({
              name: c.port_name || c.PortName || 'Unknown crossing',
              waitMinutes: wait,
              lanesOpen: c.lanes_open || c.LanesOpen || null,
              lastUpdated: c.updated || c.LastUpdated || null,
            });
          }
        }
      }
    } catch (err) {
      console.warn('CBP border API failed:', err.message);
    }
  }

  if (!crossings.length) {
    const seed = hashSeed(`${originCountry}-${destCountry}-${new Date().getDate()}`);
    const waitMinutes = (seed % 120) + 15;
    crossings.push({
      name: `${originCountry} → ${destCountry} (estimated)`,
      waitMinutes,
      lanesOpen: (seed % 4) + 2,
      lastUpdated: new Date().toISOString(),
      estimated: true,
    });
  }

  const maxWait = Math.max(...crossings.map((c) => c.waitMinutes));
  const score = Math.min(100, Math.round(maxWait * 0.8 + 5));

  return {
    level: congestionLevel(score),
    score,
    source: crossings.some((c) => !c.estimated) ? 'U.S. CBP Border Wait Times' : 'Border Intelligence (estimated)',
    maxWaitMinutes: maxWait,
    crossings,
  };
}

// ── Main optimizer ───────────────────────────────────────────
async function optimizeRoute({ origin, destination, modes = ['road', 'port', 'air', 'border'] }) {
  const activeModes = Array.isArray(modes) ? modes : modes.split(',').map((m) => m.trim());

  const [originGeo, destGeo] = await Promise.all([
    geocodeLocation(origin),
    geocodeLocation(destination),
  ]);

  const congestion = {};
  const warnings = [];

  const tasks = [];

  if (activeModes.includes('road')) {
    tasks.push(
      getRoadCongestion(originGeo, destGeo).then((r) => { congestion.road = r; })
    );
  }

  if (activeModes.includes('port')) {
    const originCountry = extractCountry(origin, originGeo.name);
    const destCountry = extractCountry(destination, destGeo.name);
    tasks.push(
      getPortCongestion(originCountry, destCountry).then((r) => { congestion.port = r; })
    );
  }

  if (activeModes.includes('air')) {
    const originCountry = extractCountry(origin, originGeo.name);
    const destCountry = extractCountry(destination, destGeo.name);
    tasks.push(
      getAirCongestion(originCountry, destCountry).then((r) => { congestion.air = r; })
    );
  }

  if (activeModes.includes('border')) {
    const originCountry = extractCountry(origin, originGeo.name);
    const destCountry = extractCountry(destination, destGeo.name);
    tasks.push(
      getBorderCongestion(originCountry, destCountry).then((r) => { congestion.border = r; })
    );
  }

  await Promise.all(tasks);

  // Build recommendation
  const scores = Object.values(congestion)
    .filter((c) => c && typeof c.score === 'number')
    .map((c) => c.score);
  const overallScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const overallLevel = congestionLevel(overallScore);

  let recommendation = '';
  if (overallLevel === 'clear' || overallLevel === 'low') {
    recommendation = 'Conditions are favourable. Proceed with standard routing and scheduling.';
  } else if (overallLevel === 'moderate') {
    recommendation = 'Moderate congestion detected. Allow extra buffer time and consider alternative routes or modes.';
  } else if (overallLevel === 'high') {
    recommendation = 'Significant congestion on this lane. Review alternative routes, ports, or departure windows.';
  } else {
    recommendation = 'Severe congestion across multiple segments. Strongly recommend delaying shipment or switching transport mode.';
  }

  const hasLiveTraffic = !!(GOOGLE_MAPS_KEY || MAPBOX_TOKEN);
  if (congestion.road && !hasLiveTraffic && congestion.road.source.includes('OSRM')) {
    warnings.push('Using OSRM for real road routing. Add GOOGLE_MAPS_API_KEY or MAPBOX_ACCESS_TOKEN for live traffic data.');
  }

  const mapUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${originGeo.lat}%2C${originGeo.lon}%3B${destGeo.lat}%2C${destGeo.lon}`;

  return {
    origin: originGeo,
    destination: destGeo,
    optimizedRoute: congestion.road || null,
    congestion,
    overall: {
      score: overallScore,
      level: overallLevel,
      color: levelColor(overallLevel),
    },
    recommendation,
    warnings,
    mapUrl,
    checkedAt: new Date().toISOString(),
    apiStatus: {
      osrm: true,
      openRouteService: !!ORS_API_KEY,
      googleMaps: !!GOOGLE_MAPS_KEY,
      mapbox: !!MAPBOX_TOKEN,
      here: !!HERE_API_KEY,
      aviationStack: !!AVIATIONSTACK_KEY,
      marineTraffic: !!MARINETRAFFIC_KEY,
    },
  };
}

module.exports = {
  optimizeRoute,
  geocodeLocation,
  congestionLevel,
  levelColor,
  formatDuration,
};

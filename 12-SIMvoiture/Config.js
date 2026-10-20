const SimConfig = {
  defaults: {
    name: 'Atlas', population: 48, rays: 7, speedInput: true, hidden: [12], activation: 'sigmoid',
    sight: 220, fov: 150, maxSpeed: 5, maxForce: 0.5, turn: 0.5,
    mutation: 0.15, sigma: 0.1, elite: 2, tournament: 5,
    lifespan: 1800, checkpointTimeout: 300, width: 110, laps: 1, seed: 42,
    tracks: ['aurora'], autoStop: false, circuitSeed:42, difficulty:2, randomCount:1
  },
  ranges: {
    population: [8, 160, true], rays: [3, 15, true], sight: [60, 500], fov: [30, 300],
    maxSpeed: [1, 12], maxForce: [0.05, 1.5], turn: [0.05, 1.2], mutation: [0, 1],
    sigma: [0, 1], elite: [0, 10, true], tournament: [2, 10, true],
    lifespan: [300, 7200, true], checkpointTimeout: [60, 1800, true],
    width: [70, 140], laps: [1, 5, true], seed: [0, 2147483647, true],
    circuitSeed:[0,2147483647,true], difficulty:[1,3,true], randomCount:[1,3,true]
  },
  validate(input) {
    const config = { ...this.defaults, ...input };
    config.name = String(config.name).trim().slice(0, 40);
    if (!config.name) throw new Error('Donne un nom au cerveau.');
    for (const [key, [low, high, integer]] of Object.entries(this.ranges)) {
      if (typeof config[key] !== 'number' || !Number.isFinite(config[key]) || config[key] < low || config[key] > high || (integer && !Number.isInteger(config[key]))) {
        throw new Error(`Réglage ${key} : valeur attendue entre ${low} et ${high}.`);
      }
    }
    if (config.elite >= config.population) throw new Error('L’élite doit être plus petite que la population.');
    if (!Array.isArray(config.hidden) || config.hidden.length < 1 || config.hidden.length > 3 || config.hidden.some(n => !Number.isInteger(n) || n < 2 || n > 32)) throw new Error('Choisis 1 à 3 couches cachées, de 2 à 32 neurones chacune.');
    if (!['sigmoid', 'relu', 'tanh'].includes(config.activation)) throw new Error('Activation inconnue.');
    if (typeof config.speedInput !== 'boolean' || typeof config.autoStop !== 'boolean') throw new Error('Options invalides.');
    if (!Array.isArray(config.tracks) || !config.tracks.length || config.tracks.length > 3 || new Set(config.tracks).size !== config.tracks.length || config.tracks.some(id => !CircuitGenerator.validId(id))) throw new Error('Sélectionne au moins un circuit valide.');
    return { ...config, hidden: [...config.hidden], tracks: [...config.tracks] };
  },
  inputs(config) { return config.rays + Number(config.speedInput); }
};

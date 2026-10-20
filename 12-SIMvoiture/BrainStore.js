const BrainStore = {
  key: 'simvoiture.brains.v1',
  pack(name, brain, config, training) {
    return {format: 'SIMvoiture', version: 1,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: String(name).trim().slice(0,40) || 'Cerveau', savedAt: new Date().toISOString(),
      config: SimConfig.validate(config), weights: brain.serialize(), training};
  },
  validate(data) {
    if (!data || data.format !== 'SIMvoiture' || data.version !== 1 || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 40 || typeof data.id !== 'string' || data.id.length > 100) throw new Error('Ce fichier n’est pas un cerveau SIMvoiture v1.');
    const brain = Brain.fromData(data.config, data.weights);
    brain.dispose();
    const summary = data.training || {};
    if (![summary.generation, summary.fitness].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Métadonnées d’entraînement invalides.');
    if (summary.evaluations !== undefined && (!Array.isArray(summary.evaluations) || summary.evaluations.length > 3 || summary.evaluations.some(item => !item || !CircuitGenerator.validId(item.track) || typeof item.finished !== 'boolean' || ![item.fitness,item.frames,item.passed].every(value => Number.isFinite(value) && value >= 0)))) throw new Error('Bilan des circuits invalide.');
    if (summary.seenTracks !== undefined && (!Array.isArray(summary.seenTracks) || summary.seenTracks.length>256 || summary.seenTracks.some(item=>!item || !CircuitGenerator.validId(item.track) || !Number.isFinite(item.width) || item.width<70 || item.width>140))) throw new Error('Historique des pistes invalide.');
    return {...data, name: data.name.trim(), config: SimConfig.validate(data.config)};
  },
  read(storage = localStorage) {
    const raw = storage.getItem(this.key);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length > 30) throw new Error('Bibliothèque locale invalide.');
    return list.map(item => this.validate(item));
  },
  save(list, storage = localStorage) {
    if (list.length > 30) throw new Error('Maximum 30 cerveaux dans la bibliothèque. Exporte-les en JSON pour les garder.');
    storage.setItem(this.key, JSON.stringify(list));
  },
  parse(text) {
    if (text.length > 2 * 1024 * 1024) throw new Error('Fichier trop volumineux (maximum 2 Mo).');
    return this.validate(JSON.parse(text));
  }
};

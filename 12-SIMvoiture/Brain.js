// Extension du NeuralNetwork fourni dans 9b, sans modifier le fichier original.
class Brain extends NeuralNetwork {
  constructor(config) {
    // createModel est appelé par le constructeur du TP avant l'affectation
    // de config : hidden_nodes porte ici les réglages des couches.
    const valid = SimConfig.validate(config);
    super(SimConfig.inputs(valid), { layers: valid.hidden, activation: valid.activation }, 2);
    this.config = valid;
  }

  createModel() {
    const model = tf.sequential();
    this.hidden_nodes.layers.forEach((units, index) => model.add(tf.layers.dense({
      units, ...(index === 0 ? { inputShape: [this.input_nodes] } : {}),
      activation: this.hidden_nodes.activation
    })));
    model.add(tf.layers.dense({ units: 2, activation: 'sigmoid' }));
    return model;
  }

  copy() {
    return tf.tidy(() => {
      const child = new Brain(this.config);
      child.model.setWeights(this.model.getWeights().map(weight => weight.clone()));
      return child;
    });
  }

  mutate(rate, sigma = this.config.sigma, rng = () => random(1), gaussian = () => randomGaussian(0, sigma)) {
    // Même mutation des poids par bruit gaussien que NeuralNetwork.mutate (TP).
    tf.tidy(() => {
      const weights = this.model.getWeights().map(weight => {
        const values = weight.dataSync().slice();
        for (let i = 0; i < values.length; i++) if (rng() < rate) values[i] += gaussian();
        return tf.tensor(values, weight.shape);
      });
      this.model.setWeights(weights);
    });
  }

  predictFast(inputs) { return DenseInference.predict(this,inputs); }
  traceFast(inputs) { return DenseInference.trace(this,inputs); }

  trace(inputs) {
    return tf.tidy(() => {
      let value = tf.tensor2d([inputs]);
      const layers = [Array.from(inputs)];
      for (const layer of this.model.layers) {
        value = layer.apply(value);
        layers.push(Array.from(value.dataSync()));
      }
      return { layers, weights: this.model.getWeights().map(weight => ({ shape: [...weight.shape], values: Array.from(weight.dataSync()) })) };
    });
  }

  serialize() {
    return tf.tidy(() => this.model.getWeights().map(weight => ({ shape: [...weight.shape], values: Array.from(weight.dataSync()) })));
  }

  static fromData(config, weights) {
    const valid = SimConfig.validate(config);
    const sizes = [SimConfig.inputs(valid), ...valid.hidden, 2];
    if (!Array.isArray(weights) || weights.length !== (sizes.length - 1) * 2) throw new Error('Nombre de tenseurs incompatible.');
    for (let i = 0; i < sizes.length - 1; i++) {
      for (let bias = 0; bias < 2; bias++) {
        const expected = bias ? [sizes[i + 1]] : [sizes[i], sizes[i + 1]];
        const item = weights[i * 2 + bias];
        if (!item || JSON.stringify(item.shape) !== JSON.stringify(expected) || !Array.isArray(item.values) || item.values.length !== expected.reduce((a, b) => a * b, 1) || item.values.some(n => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 10000)) throw new Error('Poids ou dimensions du cerveau invalides.');
      }
    }
    const brain = new Brain(valid);
    try { tf.tidy(() => brain.model.setWeights(weights.map(item => tf.tensor(item.values, item.shape)))); }
    catch (error) { brain.dispose(); throw error; }
    return brain;
  }
}

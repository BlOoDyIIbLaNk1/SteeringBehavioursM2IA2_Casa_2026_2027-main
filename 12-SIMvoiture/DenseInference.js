// Passage avant dense du MÊME modèle TensorFlow, sans créer de tenseurs par pas.
// Le modèle du TP reste la source des poids, des activations et des mutations.
// Les arrondis Float32 reproduisent matMul -> biasAdd -> activation du backend CPU.
const DenseInference = {
  cache: new WeakMap(),
  compiled(brain) {
    const tensors = brain.model.getWeights();
    let cached = this.cache.get(brain);
    if (!cached || tensors.some((tensor,i) => tensor.dataId !== cached.ids[i])) {
      const sizes = [brain.input_nodes,...brain.config.hidden,2];
      cached = {
        ids:tensors.map(tensor=>tensor.dataId),
        weights:tensors.map(tensor=>tensor.dataSync().slice()),
        display:tensors.map(tensor=>({shape:[...tensor.shape],values:Array.from(tensor.dataSync())})),
        buffers:sizes.map(size=>new Float32Array(size))
      };
      this.cache.set(brain,cached);
    }
    return cached;
  },
  predict(brain,inputs) {
    if (inputs.length !== brain.input_nodes) throw new Error('Nombre d’entrées incompatible.');
    const cached = this.compiled(brain);
    cached.buffers[0].set(inputs);
    for(let layer=0;layer<cached.buffers.length-1;layer++) {
      const source=cached.buffers[layer],out=cached.buffers[layer+1];
      const weights=cached.weights[layer*2],bias=cached.weights[layer*2+1];
      const activation=layer===cached.buffers.length-2 ? 'sigmoid' : brain.config.activation;
      for(let j=0;j<out.length;j++) {
        let sum=0;
        for(let i=0;i<source.length;i++) sum+=source[i]*weights[i*out.length+j];
        const value=Math.fround(Math.fround(sum)+bias[j]);
        out[j]=activation==='sigmoid' ? 1/(1+Math.exp(-value)) : activation==='tanh' ? Math.tanh(value) : Math.max(0,value);
      }
    }
    // Vue de travail propre à ce cerveau ; le contrôleur la lit immédiatement.
    return cached.buffers[cached.buffers.length-1];
  },
  trace(brain,inputs) {
    this.predict(brain,inputs);
    const cached=this.compiled(brain);
    return {layers:cached.buffers.map(buffer=>Array.from(buffer)),weights:cached.display};
  }
};

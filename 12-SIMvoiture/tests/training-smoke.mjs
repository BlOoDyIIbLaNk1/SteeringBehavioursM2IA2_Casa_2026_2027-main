// Essai d'endurance, pas un test garantissant la convergence stochastique.
// Aucun cerveau préprogrammé : uniquement sélection et mutations du TP.
import {tf,config,Evolution} from './harness.mjs';
const sim = new Evolution(config({population:40,hidden:[10],lifespan:2400,checkpointTimeout:240}));
const start=performance.now();
const limit=Number(process.argv[2] || 20);
while(sim.generation<=limit) {
  sim.step();
  if(performance.now()-start>60000) break;
}
console.log(JSON.stringify({generations:sim.generation-1,seconds:(performance.now()-start)/1000,
  first:sim.history[0],last:sim.history.at(-1),best:sim.champion&&{fitness:sim.champion.fitness,generation:sim.champion.generation,evaluations:sim.champion.evaluations}},null,2));
sim.dispose();console.log('Tenseurs restants :',tf.memory().numTensors);

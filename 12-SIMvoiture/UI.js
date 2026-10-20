// Contrôles DOM uniquement : aucune décision de pilotage dans l'interface.
const SimUI = {
  library: [], selectedBrains: new Set(), mode: 'training',
  fields: {
    track: [['width','Largeur de piste',1],['laps','Tours à réussir',1]],
    random: [['circuitSeed','Graine du circuit',1],['difficulty','Difficulté (1 à 3)',1],['randomCount','Pistes par expérience',1]],
    'race-random': [['circuitSeed','Graine du circuit',1],['difficulty','Difficulté (1 à 3)',1]],
    network: [['rays','Rayons = entrées',1]],
    car: [['sight','Portée des rayons',1],['fov','Champ visuel (°)',1],['maxSpeed','Vitesse max (px/pas)',0.1],['maxForce','Force max',0.05],['turn','Braquage max (rad)',0.05]],
    evolution: [['population','Population',1],['mutation','Probabilité mutation',0.01],['sigma','Écart-type du bruit',0.01],['elite','Élite conservée',1],['tournament','Taille du tournoi',1],['lifespan','Durée max (pas)',60],['checkpointTimeout','Sans progrès (pas)',60],['seed','Graine évolution',1]],
    race: [['width','Largeur de piste',1],['laps','Tours',1],['maxSpeed','Vitesse max commune',0.1],['maxForce','Force max commune',0.05]]
  },
  nodes:new Map(),
  el(id) {
    if(!this.nodes.has(id)) {const node=document.getElementById(id);if(node)this.nodes.set(id,node);}
    return this.nodes.get(id);
  },
  text(id, value) {const node=this.el(id),text=String(value);if(node.textContent!==text)node.textContent=text;},
  message(text, error = false) { this.text('message', text); this.el('message').classList.toggle('error',error); },
  guard(action) { try { action(); } catch(error) { this.message(error.message, true); } },
  init() {
    for (const [group, fields] of Object.entries(this.fields)) {
      const container = this.el(`${group}-fields`);
      for (const [key,label,step] of fields) {
        const wrapper = document.createElement('label'); wrapper.textContent = label;
        const input = document.createElement('input');
        input.id = group.startsWith('race') ? `race-${key}` : key;
        input.type = 'number'; input.required = true;
        input.min = SimConfig.ranges[key][0]; input.max = SimConfig.ranges[key][1];
        input.step = step; input.value = SimConfig.defaults[key];
        wrapper.append(input); container.append(wrapper);
      }
    }
    try { this.library = BrainStore.read(); }
    catch(error) { this.message(`Bibliothèque indisponible : ${error.message} Tu peux importer une sauvegarde JSON.`, true); }
    this.renderLibrary();
    this.architecture();
    this.trackControls();
    this.el('recommended').onclick = () => {
      this.el('seed-brain').value = '';
      this.fillConfig({...SimConfig.defaults,tracks:[CircuitGenerator.id(42,2)]});
      this.message('Réglages conseillés chargés. Tu peux lancer l’entraînement ; l’expérience en cours n’a pas été modifiée.');
    };
    this.raceTrackControls();
    this.el('track-source').onchange = () => this.trackControls();
    this.el('race-track').onchange = () => this.raceTrackControls();
    this.el('new-training-track').onclick = () => this.guard(() => {
      this.el('circuitSeed').value = Math.floor(Math.random()*2147483648);
      const id = CircuitGenerator.id(Number(this.el('circuitSeed').value),Number(this.el('difficulty').value));
      const preview = new SimTrack(id,Number(this.el('width').value));
      if (!SimApp.sim) { SimApp.preview = preview; this.update(); }
      this.message(`${preview.name} prêt. ${SimApp.sim ? 'Clique Démarrer pour ouvrir une nouvelle expérience ; la piste en cours reste inchangée.' : 'Lance l’entraînement pour apprendre sur cette piste.'}`);
    });
    this.el('new-race-track').onclick = () => { this.el('race-circuitSeed').value = Math.floor(Math.random()*2147483648); this.message('Nouvelle graine choisie. Lance la course pour construire ce circuit.'); };
    this.el('test-unseen').onclick = () => this.guard(() => {
      const config = this.readRaceConfig();
      const entries = this.library.filter(item => this.selectedBrains.has(item.id));
      if (!entries.length || entries.length>8) throw new Error('Coche 1 à 8 cerveaux dans la bibliothèque.');
      const track = CircuitGenerator.freshId(entries,config.width,Number(this.el('race-difficulty').value));
      const simulation = new SimRace(entries,track.id,config.width,config.maxSpeed,config.maxForce,config.laps,{evaluation:true,track});
      this.el('race-track').value = 'random'; this.el('race-circuitSeed').value = track.recipe.seed;
      this.raceTrackControls(); SimApp.replace(simulation,'race');
      this.message(`Test sur ${track.name} : graine absente des entraînements sauvegardés. Les poids restent figés ; attends le bilan pour voir si le cerveau généralise.`);
    });
    this.el('training-form').addEventListener('input',() => this.architecture());
    this.el('training-form').addEventListener('submit',event => {
      event.preventDefault();
      this.guard(() => {
        const config = this.readConfig();
        const entry = this.library.find(item => item.id === this.el('seed-brain').value);
        let seed;
        try {
          if (entry) {
            if (JSON.stringify([config.rays,config.speedInput,config.hidden,config.activation]) !== JSON.stringify([entry.config.rays,entry.config.speedInput,entry.config.hidden,entry.config.activation])) throw new Error('Pour réutiliser ces poids, garde la même architecture et les mêmes entrées, ou choisis de nouveaux cerveaux.');
            seed = Brain.fromData(config, entry.weights);
          }
          const simulation = new Evolution(config, seed,entry ? CircuitGenerator.knownTracks([entry]) : []);
          SimApp.replace(simulation, 'training');
          this.message(`Entraînement de ${config.name} : ${config.population} voitures, ${config.tracks.length} circuit(s). Les réglages sont appliqués.`);
        } finally { seed?.dispose(); }
      });
    });
    this.el('seed-brain').addEventListener('change',() => {
      const entry = this.library.find(item => item.id === this.el('seed-brain').value);
      if (entry) this.fillConfig(entry.config);
    });
    this.el('race-form').addEventListener('submit',event => {
      event.preventDefault(); this.guard(() => {
        const config = this.readRaceConfig();
        const entries = this.library.filter(item => this.selectedBrains.has(item.id));
        const id = this.el('race-track').value === 'random' ? CircuitGenerator.id(Number(this.el('race-circuitSeed').value),Number(this.el('race-difficulty').value)) : this.el('race-track').value;
        SimApp.replace(new SimRace(entries,id,config.width,config.maxSpeed,config.maxForce,config.laps),'race');
        this.message('Course lancée. Les cerveaux sont figés : ni mutation ni assistance au pilotage.');
      });
    });
    this.el('training-tab').onclick = () => this.switchMode('training');
    this.el('race-tab').onclick = () => this.switchMode('race');
    this.el('pause').onclick = () => {
      const sim = SimApp.sim; if (!sim) return;
      if (sim.paused) { if (sim.resume) sim.resume(); else sim.paused = false; }
      else sim.paused = true;
      SimApp.clock.reset(); this.update();
    };
    this.el('step').onclick = () => {
      const sim = SimApp.sim; if (!sim) return;
      if (sim.goalReached && sim.paused) sim.nextGeneration();
      sim.paused = false; sim.step(); sim.paused = true;
      SimApp.clock.reset(); this.update();
    };
    this.el('select-leader').onclick = () => { SimApp.selectedId = SimApp.sim?.bestCar()?.id ?? 0; this.update(); };
    this.el('time-scale').onchange = () => { SimApp.clock.reset(); SimApp.measuredSteps=0;SimApp.measureTime=performance.now(); };
    this.el('save-brain').onclick = () => this.guard(() => {
      if (!(SimApp.sim instanceof Evolution)) throw new Error('Lance un entraînement pour enregistrer son meilleur cerveau.');
      const entry = SimApp.sim.exportBest(this.el('name').value.trim() || SimApp.sim.config.name);
      const list = [...this.library,entry]; BrainStore.save(list); this.library = list;
      this.renderLibrary(); this.message(`${entry.name} enregistré (génération ${entry.training.generation}). Exporte son JSON pour le conserver hors du navigateur.`);
    });
    this.el('import-brain').onchange = async event => {
      for (const file of event.target.files) {
        try {
          if (file.size > 2 * 1024 * 1024) throw new Error('Maximum 2 Mo par cerveau.');
          const entry = BrainStore.parse(await file.text());
          const list = [...this.library.filter(item => item.id !== entry.id),entry];
          BrainStore.save(list); this.library = list; this.renderLibrary();
          this.message(`${entry.name} importé. Coche-le pour la course ou réutilise-le pour l’entraînement.`);
        } catch(error) { this.message(`${file.name} : ${error.message}`,true); break; }
      }
      event.target.value = '';
    };
    document.addEventListener('keydown',event => {
      if (event.target.closest('input,select,textarea,button,[contenteditable]')) return;
      if (event.key.toLowerCase() === 'd') this.el('debug').checked = !this.el('debug').checked;
      if (event.code === 'Space') { event.preventDefault(); this.el('pause').click(); }
    });
    this.text('engine-status','TF.js / CPU · prêt');
    this.update();
  },
  readConfig() {
    const values = Object.fromEntries(Object.keys(SimConfig.ranges).map(key => [key, Number(this.el(key).value)]));
    return SimConfig.validate({...values, name:this.el('name').value,
      hidden:this.el('hidden').value.split(',').map(value => Number(value.trim())),
      activation:this.el('activation').value,speedInput:this.el('speedInput').checked,autoStop:this.el('autoStop').checked,
      tracks:this.el('track-source').value === 'random'
        ? Array.from({length:values.randomCount},(_,i) => CircuitGenerator.id((values.circuitSeed+i)%2147483648,values.difficulty))
        : [...document.querySelectorAll('input[name=track]:checked')].map(input => input.value)});
  },
  readRaceConfig() {
    return SimConfig.validate({...SimConfig.defaults,...Object.fromEntries(this.fields.race.map(([key]) => [key,Number(this.el(`race-${key}`).value)]))});
  },
  trackControls() {
    const random = this.el('track-source').value === 'random';
    this.el('random-settings').hidden = !random;
    this.el('track-options').hidden = random;
  },
  raceTrackControls() {
    const random = this.el('race-track').value === 'random';
    this.el('race-random-fields').hidden = !random;
    this.el('new-race-track').hidden = !random;
  },
  fillConfig(config) {
    for (const key of Object.keys(SimConfig.ranges)) this.el(key).value = config[key];
    this.el('name').value = config.name;
    this.el('hidden').value = config.hidden.join(', ');
    this.el('activation').value = config.activation;
    this.el('speedInput').checked = config.speedInput;
    this.el('autoStop').checked = config.autoStop;
    document.querySelectorAll('input[name=track]').forEach(input => input.checked = config.tracks.includes(input.value));
    const recipe = CircuitGenerator.parse(config.tracks[0]);
    this.el('track-source').value = recipe ? 'random' : 'fixed';
    if (recipe) { this.el('circuitSeed').value = recipe.seed; this.el('difficulty').value = recipe.difficulty; this.el('randomCount').value = config.tracks.length; }
    this.trackControls();
    this.architecture();
  },
  architecture() {
    const inputs = Number(this.el('rays').value) + Number(this.el('speedInput').checked);
    this.text('architecture',`${inputs} entrées → ${this.el('hidden').value || '?'} → 2 sorties`);
  },
  switchMode(mode) {
    this.mode = mode;
    for (const value of ['training','race']) {
      this.el(`${value}-tab`).classList.toggle('active',value === mode);
      this.el(`${value}-tab`).setAttribute('aria-pressed',String(value === mode));
      this.el(`${value}-form`).hidden = value !== mode;
    }
    // Changer de formulaire ne détruit pas l'expérience en cours.
  },
  renderLibrary() {
    const container = this.el('brain-list'); container.replaceChildren();
    const selectedSeed = this.el('seed-brain').value;
    const select = this.el('seed-brain'); select.replaceChildren(new Option('Nouveaux cerveaux aléatoires',''));
    if (!this.library.length) {
      const empty = document.createElement('p'); empty.className = 'hint'; empty.textContent = 'Ton premier pilote commence ici. Entraîne, sauvegarde, puis compare.'; container.append(empty);
    }
    this.library.forEach(entry => {
      select.append(new Option(entry.name,entry.id));
      const card = document.createElement('div'); card.className = 'brain-card';
      const label = document.createElement('label');
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = this.selectedBrains.has(entry.id);
      check.onchange = () => check.checked ? this.selectedBrains.add(entry.id) : this.selectedBrains.delete(entry.id);
      label.append(check,document.createTextNode(entry.name));
      const info = document.createElement('small');
      const completed = entry.training.evaluations?.filter(item => item.finished).length || 0;
      const evaluated = entry.training.evaluations?.length || 0;
      info.textContent = `${SimConfig.inputs(entry.config)} → ${entry.config.hidden.join(' → ')} → 2 · G${entry.training.generation} · fitness ${Math.round(entry.training.fitness)} · ${completed}/${evaluated} pistes réussies${evaluated ? '' : ' (provisoire)'}`;
      const actions = document.createElement('div'); actions.className = 'actions';
      const exportButton = document.createElement('button'); exportButton.className = 'quiet'; exportButton.textContent = 'Exporter JSON ↗';
      exportButton.onclick = () => this.download(entry);
      const reuse = document.createElement('button'); reuse.className = 'quiet'; reuse.textContent = 'Réentraîner';
      reuse.onclick = () => { this.switchMode('training'); select.value = entry.id; this.fillConfig(entry.config); this.message('Réglages du cerveau chargés. Clique Démarrer pour reprendre son évolution.'); };
      const remove = document.createElement('button'); remove.className = 'quiet'; remove.textContent = '×'; remove.setAttribute('aria-label',`Supprimer ${entry.name}`);
      remove.onclick = () => this.guard(() => {
        if (!confirm(`Retirer « ${entry.name} » de la bibliothèque ? Exporte son JSON avant si tu veux le garder.`)) return;
        const list = this.library.filter(item => item.id !== entry.id); BrainStore.save(list); this.library = list; this.selectedBrains.delete(entry.id); this.renderLibrary();
      });
      actions.append(exportButton,reuse,remove); card.append(label,info,actions); container.append(card);
    });
    select.value = this.library.some(item => item.id === selectedSeed) ? selectedSeed : '';
  },
  download(entry) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(entry,null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = `${entry.name.replace(/[^a-zA-Z0-9_-]/g,'_')}.simvoiture.json`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  },
  update() {
    const sim = SimApp.sim, training = sim instanceof Evolution;
    const network=this.el('network'),rect=network.getBoundingClientRect();
    const networkVisible=rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth;
    const track = sim?.track || SimApp.preview;
    if (track && track!==this.lastTrack) {
      this.lastTrack=track;
      this.el('track-name').replaceChildren(document.createTextNode(track.name));
      const subtitle = document.createElement('span'); subtitle.textContent = track.subtitle;
      this.el('track-name').append(subtitle);
    }
    if(track)this.text('circuit-info',`${track.name.toUpperCase()} / ${!sim ? 'PRÊT À APPRENDRE' : training ? `${sim.trackIndex + 1} SUR ${sim.tracks.length}` : sim.evaluation ? 'TEST INÉDIT' : 'COURSE FANTÔME'}`);
    this.el('pause').disabled = !sim || Boolean(sim.finished);
    this.el('step').disabled = !sim || Boolean(sim.finished);
    this.el('save-brain').disabled = !training;
    this.text('pause',sim?.paused ? 'Reprendre' : 'Pause');
    this.text('run-state',!sim ? 'PRÊT' : sim.finished ? 'TERMINÉ' : sim.paused ? 'EN PAUSE' : sim.pendingGeneration ? 'ÉVOLUTION' : 'EN PISTE');
    this.text('mode-label',training || !sim ? '01 / ENTRAÎNEMENT' : sim.evaluation ? 'TEST / PISTE INÉDITE' : '02 / COURSE');
    if (!sim) return;
    const best = sim.bestCar();
    if (training) {
      ['GÉNÉRATION','EN PISTE','RECORD ÉVALUÉ','RÉUSSITE / GÉN.'].forEach((value,index) => this.text(`stat-label-${index+1}`,value));
      [sim.generation,sim.pendingGeneration ? `${sim.pendingGeneration.children.length}/${sim.cars.length} prêts` : `${sim.cars.filter(car => !car.dead && !car.finished).length}/${sim.cars.length}`,sim.champion ? Math.round(sim.champion.fitness) : '—',`${Math.round((sim.history.at(-1)?.success || 0) * 100)} %`].forEach((value,index) => this.text(`stat-${index+1}`,value));
      if(this.historySim!==sim || this.historyPoint!==sim.history.at(-1)) {
        NetworkView.history(this.el('history'),sim.history);this.historySim=sim;this.historyPoint=sim.history.at(-1);
      }
      this.text('history-caption',sim.history.length ? `Génération ${sim.history.at(-1).generation} · meilleur ${Math.round(sim.history.at(-1).best)} · moyenne ${Math.round(sim.history.at(-1).mean)}. ${sim.goalReached ? 'Objectif 60 % atteint.' : 'Évaluation sur toutes les pistes sélectionnées.'}` : 'Première génération en cours. Aucun pilote confirmé pour le moment.');
    } else {
      if(this.historySim!==sim) {NetworkView.history(this.el('history'),[]);this.historySim=sim;}
      ['TEMPS SIMULÉ','EN PISTE','ARRIVÉES','LEADER'].forEach((value,index) => this.text(`stat-label-${index+1}`,value));
      [`${(sim.ticks / 60).toFixed(1)} s`,`${sim.cars.filter(car => !car.dead && !car.finished).length}/${sim.cars.length}`,sim.cars.filter(car => car.finished).length,`#${best.id + 1}`].forEach((value,index) => this.text(`stat-${index+1}`,value));
      this.text('history-caption','Course : les modèles ne changent pas. Le classement utilise les arrivées, puis les checkpoints validés.');
      if (sim.evaluation) {
        this.text('history-caption',sim.finished ? sim.results().map(result => `${result.name} : ${result.finished ? `réussi en ${result.seconds.toFixed(2)} s` : `${Math.round(result.progress)} % · ${result.reason}`}`).join(' / ') : 'Test de généralisation : graine inédite, aucun apprentissage. Réussite ou échec seront affichés à l’arrivée.');
        if (sim.finished && !sim.reported) { this.message(`Bilan du test inédit — ${this.el('history-caption').textContent}. Un essai ne garantit pas la réussite sur toutes les pistes.`); sim.reported = true; }
      }
    }
    const standings = training ? [...sim.cars].sort((a,b) => b.fitness - a.fitness) : sim.standings();
    this.text('ranking-title',training ? 'Population · sélectionner une voiture' : sim.finished ? 'Résultat final' : 'Classement en direct');
    const container=this.el('standings');
    if(this.rowsSim!==sim) {this.rowsSim=sim;this.rows=new Map();container.replaceChildren();}
    const focused=container.contains(document.activeElement);
    standings.forEach((car,index) => {
      let row=this.rows.get(car.id);
      if(!row) {
        row=document.createElement('button');row.className='standing';row.dataset.carId=car.id;
        row.style.borderLeft=`3px solid ${CarRenderer.color(car.id)}`;
        row.append(document.createElement('span'),document.createElement('span'));
        row.onclick=()=>{SimApp.selectedId=Number(row.dataset.carId);this.update();};
        this.rows.set(car.id,row);container.append(row);
      }
      const name=`${String(index+1).padStart(2,'0')}  ${car.name}`;
      const status=car.finished ? `✓ ${(car.age/60).toFixed(2)} s` : car.dead ? `× CP ${car.passed}` : `CP ${car.passed} · ${car.vel.mag().toFixed(1)}`;
      if(row.firstChild.textContent!==name)row.firstChild.textContent=name;
      if(row.lastChild.textContent!==status)row.lastChild.textContent=status;
      const selected=String(car.id===SimApp.selectedId);
      if(row.getAttribute('aria-pressed')!==selected)row.setAttribute('aria-pressed',selected);
      if(!focused && container.children[index]!==row)container.insertBefore(row,container.children[index]||null);
    });
    const car = sim.cars.find(item => item.id === SimApp.selectedId) || best;
    if (!car) return;
    if(this.previewId!==car.id) {
      const preview=this.el('car-preview');preview.hidden=false;
      CarRenderer.preview(preview,car.id);this.previewId=car.id;
    }
    this.text('car-name',car.name); this.text('car-state',car.reason || 'EN PISTE');
    this.text('car-description',`#${car.id+1} · ${(car.age/60).toFixed(1)} s simulées · capteurs ${car.config.fov}° / ${car.config.sight} px`);
    this.text('car-speed',`${car.vel.mag().toFixed(2)}`); this.text('car-checkpoints',`${car.passed}`);
    this.text('car-laps',`${car.laps}/${car.config.laps}`); this.text('car-fitness',Math.round(car.fitness));
    this.text('network-shape',[SimConfig.inputs(car.config),...car.config.hidden,2].join('–'));
    if(networkVisible && (!this.networkVisible || this.networkCar!==car || this.networkAge!==car.age)) {
      NetworkView.draw(network,car);this.networkCar=car;this.networkAge=car.age;
    }
    this.networkVisible=networkVisible;
    const sensors=this.el('sensor-values');
    if(sensors.children.length!==car.inputs.length) {
      sensors.replaceChildren(...Array.from({length:car.inputs.length},()=>{
        const item=document.createElement('span');item.className='sensor';return item;
      }));
    }
    car.inputs.forEach((value,index) => {
      const text=`${index<car.config.rays?`R${index+1}`:'V'} ${value.toFixed(2)}`;
      if(sensors.children[index].textContent!==text)sensors.children[index].textContent=text;
    });
    this.text('turn-value',`${((car.outputs[0]*2-1)*180/Math.PI*car.config.turn).toFixed(1)}°`);
    this.text('throttle-value',`${Math.round(car.outputs[1]*100)} %`);
    this.el('turn-meter').value = car.outputs[0]; this.el('throttle-meter').value = car.outputs[1];
  }
};

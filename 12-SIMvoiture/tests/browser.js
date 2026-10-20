// Scénarios reproductibles de l'interface : uniquement événements DOM.
// L'évolution n'est pas forcée et aucune réussite d'apprentissage n'est simulée.
const frame = document.getElementById('app');
const results = document.getElementById('results');
const key = 'simvoiture.brains.qa.v1';
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
async function reloadFrame(url) {
  const loaded = new Promise(resolve => frame.addEventListener('load',resolve,{once:true}));
  frame.src = url;
  await loaded;
}
async function until(check,timeout=20000) {
  const start=performance.now();
  while(!check()) { if(performance.now()-start>timeout) throw new Error('Délai dépassé'); await wait(70); }
}
function assert(value,label) { if(!value) throw new Error(label); results.textContent+=`✓ ${label}\n`; }
function input(doc,id,value) {
  const element=doc.getElementById(id);element.value=value;
  element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));
}
document.getElementById('run').onclick = async event => {
  event.target.disabled=true;results.textContent='';
  try {
    localStorage.removeItem(key);
    await reloadFrame('../index.html?qa=1&run='+Date.now());
    await until(()=>frame.contentDocument?.getElementById('engine-status')?.textContent.includes('prêt'));
    const doc=frame.contentDocument,el=id=>doc.getElementById(id),text=id=>el(id).textContent;
    assert(el('track-canvas').querySelector('canvas')?.width===1200,'Vrai canvas p5 initialisé');
    assert(el('track-source').value==='random','Génération procédurale proposée par défaut');
    assert(parseFloat(frame.contentWindow.getComputedStyle(doc.querySelector('.hint')).fontSize)>=13,'Aides agrandies et lisibles');
    input(doc,'name','QA Atlas');input(doc,'population',8);input(doc,'hidden','6, 4');input(doc,'rays',5);
    input(doc,'circuitSeed',1234);input(doc,'difficulty',1);input(doc,'randomCount',2);
    input(doc,'lifespan',300);input(doc,'checkpointTimeout',60);input(doc,'time-scale','max');
    assert(['32','64','128','256','max'].every(value=>[...el('time-scale').options].some(option=>option.value===value)),'Accélérations au-delà de 16× et mode MAX disponibles');
    el('start-training').click();
    await until(()=>text('network-shape')==='6–6–4–2');
    assert(text('message').includes('8 voitures'),'Réglages appliqués et population créée');
    assert(el('sensor-values').children.length===6,'Entrées et réseau réel cohérents');
    assert(!el('car-preview').hidden&&el('car-preview').width===280,'Aperçu de la livrée sélectionnée disponible dans le garage');
    await until(()=>Number(text('stat-1'))>=2);
    assert(text('history-caption').includes('meilleur'),'Génération évaluée et graphe alimenté');
    await until(()=>el('performance').dataset.fps&&text('performance').includes('MAX demandé'));
    assert(Number(el('performance').dataset.fps)>0&&Number(el('performance').dataset.rate)>=0,'FPS et vitesse réellement mesurés, demande MAX explicitement distinguée');
    el('pause').click();
    const description=text('car-description');await wait(350);
    assert(description===text('car-description')&&text('run-state')==='EN PAUSE','Pause : simulation figée');
    const stableRow=el('standings').firstChild,stableSensor=el('sensor-values').firstChild;
    await wait(350);
    assert(el('standings').contains(stableRow),'Classement actualisé sans recréer les boutons');
    assert(el('sensor-values').firstChild===stableSensor,'Capteurs actualisés sans recréer les éléments DOM');
    el('step').click();assert(text('run-state')==='EN PAUSE','Pas à pas sans reprendre le temps');
    el('select-leader').click();
    const rows=[...el('standings').querySelectorAll('button')];rows.at(-1).click();
    assert(el('standings').querySelector('[aria-pressed=true]')?.dataset.carId===rows.at(-1).dataset.carId,'Sélection individuelle dans la population');
    const debug=el('debug').checked;
    doc.body.dispatchEvent(new KeyboardEvent('keydown',{key:'d',bubbles:true}));
    assert(el('debug').checked!==debug,'Touche D synchronisée avec la case capteurs');
    el('name').dispatchEvent(new KeyboardEvent('keydown',{key:'d',bubbles:true}));
    assert(el('debug').checked!==debug,'Touche D ignorée dans un champ de saisie');
    el('save-brain').click();
    assert(JSON.parse(localStorage.getItem(key)).length===1,'Meilleur cerveau enregistré dans la bibliothèque');
    const fileData=JSON.parse(localStorage.getItem(key))[0];
    assert(fileData.config.tracks.join(',')==='random:1234:1,random:1235:1'&&fileData.training.evaluations.length===2,'Même cerveau évalué sur deux pistes générées avant sélection');
    fileData.name='QA Import';fileData.id='qa-import';
    const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(fileData)],'qa.json',{type:'application/json'}));
    el('import-brain').files=transfer.files;el('import-brain').dispatchEvent(new Event('change',{bubbles:true}));
    await until(()=>el('brain-list').querySelectorAll('.brain-card').length===2);
    assert(text('message').includes('importé'),'Import JSON valide avec poids et architecture');
    const broken=new DataTransfer();broken.items.add(new File(['{"format":"non"}'],'invalide.json',{type:'application/json'}));
    el('import-brain').files=broken.files;el('import-brain').dispatchEvent(new Event('change',{bubbles:true}));
    await until(()=>el('message').classList.contains('error'));
    assert(JSON.parse(localStorage.getItem(key)).length===2,'Import invalide refusé sans altérer les sauvegardes');
    el('race-tab').click();el('race-form').querySelector('button[type=submit]').click();
    assert(text('message').includes('entre 2 et 8'),'Course refusée sans assez de cerveaux');
    el('brain-list').querySelectorAll('input[type=checkbox]').forEach(box=>box.click());
    const before=localStorage.getItem(key);
    input(doc,'race-track','sierra');el('race-form').querySelector('button[type=submit]').click();
    await until(()=>text('mode-label').includes('COURSE'));
    assert(el('standings').children.length===2&&text('track-name').includes('Sierra'),'Course de deux cerveaux sur le circuit choisi');
    await until(()=>text('run-state')==='TERMINÉ');
    assert(localStorage.getItem(key)===before,'Course terminée : cerveaux sauvegardés inchangés');
    el('standings').querySelector('button').click();
    assert(text('car-name').startsWith('QA'),'Inspection du réseau disponible après la course');
    el('brain-list').querySelectorAll('input[type=checkbox]')[1].click();
    el('test-unseen').click();
    await until(()=>text('mode-label').includes('INÉDITE'));
    assert(el('standings').children.length===1&&!['1234','1235'].includes(el('race-circuitSeed').value),'Test inédit accessible avec un seul cerveau et une graine non apprise');
    await until(()=>text('run-state')==='TERMINÉ');
    assert(text('message').includes('Bilan du test inédit'),'Bilan visible de généralisation, réussite ou échec');
    assert(localStorage.getItem(key)===before,'Tester une piste inconnue ne modifie pas le cerveau sauvegardé');
    // Rechargement réel : vérifie la persistance plutôt qu'un état en mémoire.
    await reloadFrame('../index.html?qa=1&reload='+Date.now());
    await until(()=>frame.contentDocument?.getElementById('engine-status')?.textContent.includes('prêt')&&frame.contentDocument.getElementById('brain-list').children.length===2);
    assert(true,'Bibliothèque restaurée après rechargement');
    results.textContent+='\nSUCCÈS — 28 vérifications intégrées.\n';
  } catch(error) {results.textContent+=`\nÉCHEC : ${error.message}\n`;}
  finally {event.target.disabled=false;}
};

import * as THREE from "../build/three.module.js";

import Stats from "./jsm/libs/stats.module.js";
import { GUI } from "./jsm/libs/dat.gui.module.js";
import { OrbitControls } from "./jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./jsm/loaders/GLTFLoader.js";

let container, stats, clock, gui, mixer, actions, activeAction, previousAction;
let camera, scene, renderer, model, model_mixa, model_rigify, enviroment;

// CONFIGURACIÓN DE PROPIEDAD Y VALOR INICIAL DEL CICLO DE ANIMACIÓN (CLIP)
// EL NOMBRE DE ESTA PROPIEDAD ('ciclo') ESTÁ VINCULADO CON EL NOMBRE A MOSTRAR EN EL MENÚ
// i.e. LO QUE SE MUESTRA EN EL MENÚ ES 'ciclo'.
const api = { ciclo: "Caminar" };

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.25,
    500
  );
  camera.position.set(0, 20, 10);
  camera.lookAt(new THREE.Vector3(90, -45, 0));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xB2FFFF); //e0e0e0
  scene.fog = new THREE.Fog(0x90aede, 20, 300); //0x90aede, 20, 100

  // SE CREA UN RELOJ
  clock = new THREE.Clock();

  // ------------------ LUCES ------------------
  // LUZ HEMISFÉRICA
  /*
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd1d4ff);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);
  */
  // LUZ DIRECCIONAL
  const dirLight = new THREE.DirectionalLight(0xf6ca97, 0.6);
  dirLight.position.set(-30, 20, 10);
  scene.add(dirLight);
  // ------------------ MODELO 3D ------------------

  const loader = new GLTFLoader();
  //loader.load( 'models/gltf/RobotExpressive/te.glb', function ( gltf ) {
  loader.load(
    "models/gltf/toph/toph_unido.glb",
    function (gltf) { 
      model = gltf.scene;
      scene.add(model);
      model_rigify = scene.getObjectByName('Rigify')
      model_mixa = scene.getObjectByName('Mixamo')
      model_mixa.visible = false;
      console.log(model_mixa);
      console.log(model_rigify);
      createGUI(model, gltf.animations);
    },

    undefined,
    function (e) {
      console.error(e);
    }
  );

  loader.load(
    "models/gltf/toph/academy.glb",
    function (gltf) { 
      enviroment = gltf.scene;
      scene.add(enviroment);
    },

    undefined,
    function (e) {
      console.error(e);
    }
  );

  // PROCESO DE RENDERIZADO DE LA ESCENA
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // CONFIGURACIÓN DE FUNCION CallBack EN CASO DE CAMBIO DE TAMAÑO DE LA VENTANA
  window.addEventListener("resize", onWindowResize, false);

  // CONTROL DE ORBITACIÓN CON EL MOUSE
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.target.set(0, 2, 0);
  controls.update();

  // ------------------ ESTADOS ------------------
  stats = new Stats();
  container.appendChild(stats.dom);
}

function createGUI(model, animations) {
  // OPCIONES (CONSTANTES) PARA MENÚ DE CICLOS
  const ciclos = ["Caminar", "Saltar", "Rocas", "Muro"];
  // OPCIONES (CONSTANTES) PARA MENÚ DE CAPTURAS DE MOVIMIENTO
  const capturas = ["Pelea", "Ataque", "Pushup", "Gang", "Macarena"];

  gui = new GUI();
  mixer = new THREE.AnimationMixer(model);

  actions = {};

  // SE VISUALIZA EN CONSOLA LOS NOMBRES DE LAS ANIMACIONES
  console.log("Lista de animaciones: ");
  console.log(animations);

  // RECORRIDO DEL ARREGLO DE ANIMACIONES PASADO COMO PARÁMETRO
  for (let i = 0; i < animations.length; i++) {
    // TRANSFORMACIÓN DE ANIMACIONES A "CLIPS"
    const clip = animations[i];
    const action = mixer.clipAction(clip);
    actions[clip.name] = action;

    // SE CONFIGURAN LOS CLIPS QUE << NO >> REALIZARÁN UN LOOP INFINITO QUE SON:
    //
    // 	1. Todos aquellos cuyos nombres aparecen en el arreglo "capturas"
    // 		--> capturas.indexOf( clip.name ) >= 0
    //
    //	2. Sólo 'Death', 'Sitting' y 'Standing' del arreglo ciclos
    // 		--> ciclos.indexOf( clip.name ) >= 4
    //
    if (capturas.indexOf(clip.name) >= 0 || ciclos.indexOf(clip.name) >= 4) {
      action.clampWhenFinished = true;
      action.loop = THREE.LoopOnce;
    }
  }

  // ------------------ CICLOS ------------------
  // SE CONFIGURA EL MENÚ PARA SELECCIÓN DE CICLOS
  const ciclosFolder = gui.addFolder("Ciclos de animación");
  // SE CONFIGURA SUB-MENÚ (LISTA DESPLEGABLE)
  const clipCtrl = ciclosFolder.add(api, "ciclo").options(ciclos);

  // SE DEFINE FUNCIÓN TIPO CallBack, EJECUTABLE CADA QUE SE SELECCIONE UNA OPCIÓN DEL MENÚ DESPLEGABLE
  clipCtrl.onChange(function () {
    model_mixa.visible = false;
    model_rigify.visible = true;
    console.log('se seleccionó la opción "' + api.ciclo + '""');
    // SEGÚN EL CICLO SELECCIONADO, SE USA SU NOMBRE Y UN VALOR NUMÉRICO (duración)
    fadeToAction(api.ciclo, 0.5);
  });

  ciclosFolder.open();

  const capturaFolder = gui.addFolder("Captura de Movimiento");


  function crearCapturaCallback(name) {

    api[name] = function () {
        model_mixa.visible = true;
        model_rigify.visible = false;
      console.log('se dio clic sobre la opción "' + name + '""');
      fadeToAction(name, 0.2);
      mixer.addEventListener("finished", restoreState);
    };
    capturaFolder.add(api, name);
  }

  function restoreState() {
    mixer.removeEventListener("finished", restoreState);
    fadeToAction(api.ciclo, 0.2);
  }

  for (let i = 0; i < capturas.length; i++) {
    crearCapturaCallback(capturas[i]);
  }
  capturaFolder.open();

  activeAction = actions["Caminar"];
  activeAction.play();
}
/** ---------------------------------------------------------------------------------------------
DE PREFERENCIA ***NO MODIFICAR*** LAS SIGUIENTES FUNCIONES A MENOS QUE SEA ESTRICAMENTE NECESARIO
--------------------------------------------------------------------------------------------- **/

// FUNCIÓN PARA EL CONTROL DE TRANSICIONES ENTRE ANIMACIONES
function fadeToAction(name, duration) {
  previousAction = activeAction;
  activeAction = actions[name];

  if (previousAction !== activeAction) {
    previousAction.fadeOut(duration);
  }

  activeAction
    .reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(duration)
    .play();
}

// FUNCIÓN PARA EL REESCALADO DE VENTANA
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// PARA LA ANIMACIÓN - INVOCACIÓN RECURSIVA
function animate() {
  const dt = clock.getDelta();

  if (mixer) mixer.update(dt);

  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  stats.update();
}

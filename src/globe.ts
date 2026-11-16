import * as THREE from "three";

export function createGlobe(): HTMLElement {
  const container = document.createElement("span");
  container.className = "globe-container";
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", "Вращающаяся планета Земля");

  const size = 76;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 3.5;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  });

  renderer.setSize(size, size);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  container.append(renderer.domElement);

  const geometry = new THREE.SphereGeometry(1, 64, 64);

  const texture = new THREE.TextureLoader().load(
    "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  );

  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0,
  });

  const globe = new THREE.Mesh(geometry, material);
  globe.rotation.z = 0.12;
  scene.add(globe);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.035, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0x39cfff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    }),
  );

  scene.add(atmosphere);

  scene.add(new THREE.AmbientLight(0xffffff, 1.8));

  const sunlight = new THREE.DirectionalLight(0xffffff, 2.5);
  sunlight.position.set(3, 2, 5);
  scene.add(sunlight);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let hovered = false;
  let lastTime = 0;

  container.addEventListener("mouseenter", () => {
    hovered = true;
  });

  container.addEventListener("mouseleave", () => {
    hovered = false;
  });

  function animate(time: number): void {
    const delta = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.05);

    lastTime = time;

    if (!reducedMotion.matches) {
      globe.rotation.y += delta * (hovered ? 0.08 : 0.25);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  return container;
}

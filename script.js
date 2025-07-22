const loaderElement = document.getElementById('loader');
const body = document.querySelector('body');
let scene, camera, renderer, clock, controls;
let isPaused = false;
let planets = [];
let stars;
let orbits = [];
let planetLabels = [];
let followMode = false;
let followTarget = null;
let timeMultiplier = 1;
let planetScale = 1;
let showOrbits = true;
let showLabels = true;
let showStars = true;

const planetData = [
    { 
        name: 'Mercury', 
        radius: 0.38, 
        semiMajorAxis: 18, 
        speed: 1.6, 
        texture: './textures/2k_mercury.jpg', 
        axialTilt: 0.03, 
        roughness: 0.9,
        distance: '57.9 million km',
        temperature: '167°C (day), -173°C (night)',
        moons: 0,
        facts: 'Smallest planet in our solar system'
    },
    { 
        name: 'Venus', 
        radius: 0.95, 
        semiMajorAxis: 25, 
        speed: 1.2, 
        texture: './textures/2k_venus_atmosphere.jpg', 
        axialTilt: 177.4, 
        roughness: 0.7,
        distance: '108.2 million km',
        temperature: '462°C',
        moons: 0,
        facts: 'Hottest planet due to greenhouse effect'
    },
    { 
        name: 'Earth', 
        radius: 1.0, 
        semiMajorAxis: 35, 
        speed: 1.0, 
        texture: './textures/2k_earth_daymap.jpg', 
        clouds: './textures/2k_earth_clouds.jpg', 
        axialTilt: 23.44, 
        roughness: 0.5,
        distance: '149.6 million km',
        temperature: '15°C (average)',
        moons: 1,
        facts: 'Only known planet with life'
    },
    { 
        name: 'Mars', 
        radius: 0.53, 
        semiMajorAxis: 48, 
        speed: 0.8, 
        texture: './textures/2k_mars.jpg', 
        axialTilt: 25.19, 
        roughness: 0.9,
        distance: '227.9 million km',
        temperature: '-65°C (average)',
        moons: 2,
        facts: 'The Red Planet with polar ice caps'
    },
    { 
        name: 'Jupiter', 
        radius: 4.5, 
        semiMajorAxis: 70, 
        speed: 0.4, 
        texture: './textures/2k_jupiter.jpg', 
        axialTilt: 3.13, 
        roughness: 1.0,
        distance: '778.5 million km',
        temperature: '-110°C',
        moons: 79,
        facts: 'Largest planet with Great Red Spot'
    },
    { 
        name: 'Saturn', 
        radius: 3.8, 
        semiMajorAxis: 95, 
        speed: 0.3, 
        texture: './textures/2k_saturn.jpg', 
        ringTexture: './textures/2k_saturn_ring_alpha.png', 
        axialTilt: 26.73, 
        roughness: 1.0,
        distance: '1.43 billion km',
        temperature: '-140°C',
        moons: 82,
        facts: 'Famous for its prominent ring system'
    },
    { 
        name: 'Uranus', 
        radius: 2.5, 
        semiMajorAxis: 120, 
        speed: 0.2, 
        texture: './textures/2k_uranus.jpg', 
        axialTilt: 97.77, 
        roughness: 1.0,
        distance: '2.87 billion km',
        temperature: '-195°C',
        moons: 27,
        facts: 'Tilted sideways, spins on its side'
    },
    { 
        name: 'Neptune', 
        radius: 2.4, 
        semiMajorAxis: 145, 
        speed: 0.1, 
        texture: './textures/2k_neptune.jpg', 
        axialTilt: 28.32, 
        roughness: 1.0,
        distance: '4.50 billion km',
        temperature: '-200°C',
        moons: 14,
        facts: 'Windiest planet with speeds up to 2,100 km/h'
    }
];

const sunTextureUrl = './textures/2k_sun.jpg';
const backgroundTextureUrl = './textures/2k_stars_milky_way.jpg';
const sunCoronaUrl = './textures/glow.png';

function init() {
    THREE.TextureLoader.prototype.crossOrigin = 'anonymous';
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    body.appendChild(renderer.domElement);
    clock = new THREE.Clock();

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    camera.position.set(0, 80, 200);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xfff4e5, 3.5, 3000);
    scene.add(sunLight);

    const backLight = new THREE.DirectionalLight(0x557799, 0.3);
    backLight.position.set(-50, 30, -50);
    scene.add(backLight);

    const envMapLoader = new THREE.TextureLoader();
    envMapLoader.load(backgroundTextureUrl, function(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
    });

    const loadingManager = new THREE.LoadingManager(() => {
        loaderElement.style.display = 'none';
    }, (url, itemsLoaded, itemsTotal) => {
        loaderElement.textContent = `Loading... ${Math.round(itemsLoaded / itemsTotal * 100)}%`;
    });
    createSolarSystem(loadingManager);
    stars = createBackgroundStars();

    setupUI();
    addEventListeners();
    animate();
}

function createSolarSystem(manager) {
    const textureLoader = new THREE.TextureLoader(manager);

    const sunTexture = textureLoader.load(sunTextureUrl);
    const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 64), sunMaterial);
    
    const sunLightGeometry = new THREE.SphereGeometry(10.2, 64, 64);
    const sunLightMaterial = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { time: { value: 0 } },
        vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vNormal; uniform float time; void main() { float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); gl_FragColor = vec4(1.0, 0.6, 0.1, intensity) * (0.8 + 0.2 * sin(time*2.0)); }`
    });
    const sunGlowEffect = new THREE.Mesh(sunLightGeometry, sunLightMaterial);
    sun.add(sunGlowEffect);
    scene.add(sun);
    
    planets.push({ mesh: sun, isSun: true });

    planetData.forEach(data => {
        const planetTexture = textureLoader.load(data.texture);
        
        const planetMaterial = new THREE.MeshStandardMaterial({
            map: planetTexture,
            metalness: 0.0,
            roughness: data.roughness,
            envMapIntensity: 0.5
        });

        const planetMesh = new THREE.Mesh(
            new THREE.SphereGeometry(data.radius, 64, 64),
            planetMaterial
        );
        planetMesh.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
        
        const planetObj = {
            mesh: planetMesh,
            data: data,
            angle: Math.random() * 2 * Math.PI
        };
        scene.add(planetMesh);
        planets.push(planetObj);
        
        const eccentricity = 0.1; 
        const semiMinorAxis = data.semiMajorAxis * Math.sqrt(1 - (eccentricity * eccentricity));
        const curve = new THREE.EllipseCurve(0, 0, data.semiMajorAxis, semiMinorAxis, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(128);
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        orbitLine.rotation.x = Math.PI / 2;
        scene.add(orbitLine);

        if (data.clouds) {
            const cloudMesh = new THREE.Mesh(
                new THREE.SphereGeometry(data.radius + 0.05, 32, 32),
                new THREE.MeshPhongMaterial({ map: textureLoader.load(data.clouds), transparent: true, opacity: 0.8 })
            );
            planetMesh.add(cloudMesh);
            planetObj.clouds = cloudMesh;
        }

        if (data.ringTexture) {
            const ringGeo = new THREE.RingGeometry(data.radius + 1.5, data.radius + 5, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                map: textureLoader.load(data.ringTexture),
                side: THREE.DoubleSide, transparent: true, opacity: 0.9
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = -0.5 * Math.PI;
            planetMesh.add(ringMesh);
        }

        if (data.name === 'Earth') {
            const atmosphereMat = new THREE.ShaderMaterial({
                uniforms: { "c": { value: 0.5 }, "p": { value: 4.0 } },
                vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize( normalMatrix * normal ); gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
                fragmentShader: `varying vec3 vNormal; uniform float c; uniform float p; void main() { float intensity = pow( c - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), p ); gl_FragColor = vec4( 0.2, 0.5, 1.0, 1.0 ) * intensity; }`,
                side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true
            });
            const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(data.radius + 0.3, 32, 32), atmosphereMat);
            planetMesh.add(atmosphere);
        }
    });
}

function createBackgroundStars() {
    const vertices = [];
    for (let i = 0; i < 20000; i++) {
        vertices.push(THREE.MathUtils.randFloatSpread(2500));
        vertices.push(THREE.MathUtils.randFloatSpread(2500));
        vertices.push(THREE.MathUtils.randFloatSpread(2500));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    return points;
}

function setupUI() {
    const speedControlsContainer = document.getElementById('speed-controls');
    planetData.forEach(data => {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        controlGroup.innerHTML = `
            <label for="${data.name}-speed">${data.name}</label>
            <input type="range" id="${data.name}-speed" min="0" max="${data.speed * 4}" step="${data.speed / 10}" value="${data.speed}">
        `;
        speedControlsContainer.appendChild(controlGroup);
        document.getElementById(`${data.name}-speed`).addEventListener('input', (e) => {
            data.speed = parseFloat(e.target.value);
        });
    });

    const planetSelect = document.getElementById('planetSelect');
    planetData.forEach(data => {
        const option = document.createElement('option');
        option.value = data.name;
        option.textContent = data.name;
        planetSelect.appendChild(option);
    });

    createOrbitalPaths();
    createPlanetLabels();
}

function createOrbitalPaths() {
    planetData.forEach(data => {
        const points = [];
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * data.semiMajorAxis;
            const z = Math.sin(angle) * data.semiMajorAxis * Math.sqrt(1 - 0.1 * 0.1);
            points.push(new THREE.Vector3(x, 0, z));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x555555, 
            transparent: true, 
            opacity: 0.3 
        });
        const orbit = new THREE.Line(geometry, material);
        orbits.push(orbit);
        scene.add(orbit);
    });
}

function createPlanetLabels() {
    planetData.forEach((data, index) => {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'planet-label';
        labelDiv.textContent = data.name;
        labelDiv.style.position = 'absolute';
        labelDiv.style.color = '#fff';
        labelDiv.style.fontSize = '12px';
        labelDiv.style.pointerEvents = 'none';
        labelDiv.style.background = 'rgba(0,0,0,0.5)';
        labelDiv.style.padding = '2px 6px';
        labelDiv.style.borderRadius = '4px';
        labelDiv.style.display = showLabels ? 'block' : 'none';
        document.body.appendChild(labelDiv);
        planetLabels.push(labelDiv);
    });
}

function updatePlanetInfo(planetData) {
    document.getElementById('selectedPlanetName').textContent = planetData.name;
    document.getElementById('planetDistance').textContent = `Distance: ${planetData.distance}`;
    document.getElementById('planetSize').textContent = `Radius: ${(planetData.radius * 6371).toFixed(0)} km`;
    document.getElementById('planetTemp').textContent = `Temperature: ${planetData.temperature}`;
    document.getElementById('planetMoons').textContent = `Moons: ${planetData.moons}`;
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * timeMultiplier;
    const elapsedTime = clock.getElapsedTime();
    
    const sun = planets.find(p => p.isSun);
    if (sun && sun.mesh.children[0] && sun.mesh.children[0].material.uniforms) {
        sun.mesh.children[0].material.uniforms.time.value = elapsedTime;
    }

    if (!isPaused) {
        planets.forEach((p, index) => {
            if (p.isSun) {
                p.mesh.rotation.y += 0.01 * delta;
            } else {
                p.mesh.rotation.y += 0.5 * delta;
                if(p.clouds) p.clouds.rotation.y += 0.6 * delta;

                p.angle += (p.data.speed * 0.2) * delta;
                const semiMinorAxis = p.data.semiMajorAxis * Math.sqrt(1 - 0.1 * 0.1);
                p.mesh.position.x = Math.cos(p.angle) * p.data.semiMajorAxis;
                p.mesh.position.z = Math.sin(p.angle) * semiMinorAxis;

                if (showLabels && planetLabels[index - 1]) {
                    const vector = new THREE.Vector3();
                    p.mesh.getWorldPosition(vector);
                    vector.project(camera);

                    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;

                    planetLabels[index - 1].style.left = `${x + 10}px`;
                    planetLabels[index - 1].style.top = `${y - 20}px`;
                }
            }
        });
    }

    if (followMode && followTarget) {
        const targetPosition = followTarget.mesh.position.clone();
        targetPosition.y += 20;
        targetPosition.z += 30;
        camera.position.lerp(targetPosition, 0.02);
        controls.target.copy(followTarget.mesh.position);
    }

    controls.update();
    renderer.render(scene, camera);
}

function addEventListeners() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.getElementById('pauseResume').addEventListener('click', () => {
        isPaused = !isPaused;
        document.getElementById('pauseResume').textContent = isPaused ? 'Resume' : 'Pause';
    });
    
    let isCurrentlyDark = true;
    document.getElementById('themeToggle').addEventListener('click', () => {
        isCurrentlyDark = !isCurrentlyDark;
        const themeToggleButton = document.getElementById('themeToggle');
        
        if (isCurrentlyDark) {
            body.style.backgroundColor = '#00000a';
            document.getElementById('title').style.color = '#fff';
            themeToggleButton.textContent = 'Light Mode';
            if (stars) stars.visible = true;

            const envMapLoader = new THREE.TextureLoader();
            envMapLoader.load(backgroundTextureUrl, function(texture) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.background = texture;
                scene.environment = texture;
            });
        } else {
            body.style.backgroundColor = '#d0d8e8';
            document.getElementById('title').style.color = '#000';
            themeToggleButton.textContent = 'Dark Mode';
            if (stars) stars.visible = false;
            
            scene.background = new THREE.Color(0xd0d8e8);
            scene.environment = null;
        }
    });

    document.getElementById('resetView').addEventListener('click', () => {
        camera.position.set(0, 80, 200);
        controls.target.set(0, 0, 0);
        followMode = false;
        controls.update();
    });

    document.getElementById('starsToggle').addEventListener('click', () => {
        showStars = !showStars;
        if (stars) stars.visible = showStars;
        document.getElementById('starsToggle').style.opacity = showStars ? '1' : '0.5';
    });

    document.getElementById('orbitsToggle').addEventListener('click', () => {
        showOrbits = !showOrbits;
        orbits.forEach(orbit => orbit.visible = showOrbits);
        document.getElementById('orbitsToggle').style.opacity = showOrbits ? '1' : '0.5';
    });

    document.getElementById('labelsToggle').addEventListener('click', () => {
        showLabels = !showLabels;
        planetLabels.forEach(label => {
            label.style.display = showLabels ? 'block' : 'none';
        });
        document.getElementById('labelsToggle').style.opacity = showLabels ? '1' : '0.5';
    });

    document.getElementById('timeSpeed').addEventListener('input', (e) => {
        timeMultiplier = parseFloat(e.target.value);
    });

    document.getElementById('planetScale').addEventListener('input', (e) => {
        planetScale = parseFloat(e.target.value);
        planets.forEach(p => {
            if (!p.isSun) {
                p.mesh.scale.setScalar(planetScale);
            }
        });
    });

    document.getElementById('cameraSpeed').addEventListener('input', (e) => {
        controls.dampingFactor = 0.05 / parseFloat(e.target.value);
    });

    document.getElementById('followPlanet').addEventListener('click', () => {
        followMode = !followMode;
        const button = document.getElementById('followPlanet');
        button.innerHTML = followMode ? 'Exit Follow' : 'Follow Mode';
        
        if (followMode) {
            const selectedPlanet = document.getElementById('planetSelect').value;
            if (selectedPlanet) {
                followTarget = planets.find(p => p.data && p.data.name === selectedPlanet);
            }
        } else {
            followTarget = null;
        }
    });

    document.getElementById('planetSelect').addEventListener('change', (e) => {
        if (followMode && e.target.value) {
            followTarget = planets.find(p => p.data && p.data.name === e.target.value);
        }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltipElement = document.getElementById('tooltip');

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const planetMeshes = planets.filter(p => !p.isSun).map(p => p.mesh);
        const intersects = raycaster.intersectObjects(planetMeshes);

        if (intersects.length > 0) {
            const intersectedObj = planets.find(p => p.mesh === intersects[0].object);
            if (intersectedObj && intersectedObj.data) {
                tooltipElement.style.display = 'block';
                tooltipElement.style.left = `${event.clientX + 10}px`;
                tooltipElement.style.top = `${event.clientY + 10}px`;
                tooltipElement.innerHTML = `
                    <strong>${intersectedObj.data.name}</strong><br>
                    ${intersectedObj.data.facts}
                `;
                document.body.style.cursor = 'pointer';
                updatePlanetInfo(intersectedObj.data);
            }
        } else {
            tooltipElement.style.display = 'none';
            document.body.style.cursor = 'default';
        }
    });
}

init();

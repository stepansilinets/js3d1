

// Ссылка на элемент веб страницы
var container;
// Переменные "камера", "сцена" и "отрисовщик"
var camera, scene, renderer;
// Загрузчик текстур
const loader = new THREE.TextureLoader(); // Инициализируем loader

var N = 350;
var keyboard = new THREEx.KeyboardState();
var angle;

// Объявляем переменные глобально
let sun;
let earth;
let venus;
let moon;
let sky;
let chase = -1;
const planets = [];
const clock = new THREE.Clock();
let cameraAngleHorizontal = 0; // Угол поворота камеры вокруг планеты по горизонтали
let cameraAngleVertical = 0;   // Угол поворота камеры вокруг планеты по вертикали


// Функция для загрузки текстур 
function loadTexture(url) {
    const manager = new THREE.LoadingManager(); // Создаем
    const texture = new THREE.TextureLoader(manager).load(url);
    return texture;
}

// Функция создания планеты
function createPlanet(textureUrl, radius, orbitRadius, rotationSpeed) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const texture = loadTexture(textureUrl); // Используем функцию загрузки текстур
    const material = new THREE.MeshStandardMaterial({ map: texture }); // MeshStandardMaterial для освещения

    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixWorldNeedsUpdate = true;
    scene.add(mesh);

    // Задаем начальный угол поворота (случайный угол)
    const angle = Math.random() * Math.PI * 2;

    // Вычисляем начальные координаты планеты
    const x = orbitRadius * Math.cos(angle);
    const z = orbitRadius * Math.sin(angle);

    // Устанавливаем начальное положение планеты
    mesh.position.set(x, 0, z);

    return {
        mesh: mesh,
        orbitRadius: orbitRadius,
        rotationSpeed: rotationSpeed,
        a2: angle,
        sphere: mesh,
        angle: angle
    };
}

// Функция создания солнца
function createSun(textureUrl, radius) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const texture = loadTexture(textureUrl);
    const material = new THREE.MeshBasicMaterial({ map: texture }); 
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return { mesh: mesh };
}

// Функция создания звездного неба
function createStarrySky(textureUrl, radius) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const texture = loadTexture(textureUrl);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }); // Задняя сторона для неба
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return mesh;
}

function createEarthCloud() {
    // create destination canvas
    var canvasResult = document.createElement('canvas');
    canvasResult.width = 1024;
    canvasResult.height = 512;
    var contextResult = canvasResult.getContext('2d');
    // load earthcloudmap
    var imageMap = new Image();
    imageMap.addEventListener("load", function() {
        // create dataMap ImageData for earthcloudmap
        var canvasMap = document.createElement('canvas');
        canvasMap.width = imageMap.width;
        canvasMap.height = imageMap.height;
        var contextMap = canvasMap.getContext('2d');
        contextMap.drawImage(imageMap, 0, 0);
        var dataMap = contextMap.getImageData(0, 0, canvasMap.width, canvasMap.height);
        // load earthcloudmaptrans
        var imageTrans = new Image();
        imageTrans.addEventListener("load", function() {
            // create dataTrans ImageData for earthcloudmaptrans
            var canvasTrans = document.createElement('canvas');
            canvasTrans.width = imageTrans.width;
            canvasTrans.height = imageTrans.height;
            var contextTrans = canvasTrans.getContext('2d');
            contextTrans.drawImage(imageTrans, 0, 0);
            var dataTrans = contextTrans.getImageData(0, 0, canvasTrans.width, canvasTrans.height);
            // merge dataMap + dataTrans into dataResult
            var dataResult = contextMap.createImageData(canvasMap.width, canvasMap.height);
            for (var y = 0, offset = 0; y < imageMap.height; y++)
                for (var x = 0; x < imageMap.width; x++, offset += 4) {
                    dataResult.data[offset + 0] = dataMap.data[offset + 0];
                    dataResult.data[offset + 1] = dataMap.data[offset + 1];
                    dataResult.data[offset + 2] = dataMap.data[offset + 2];
                    dataResult.data[offset + 3] = 255 - dataTrans.data[offset + 0];
                }
            // update texture with result
            contextResult.putImageData(dataResult, 0, 0)
            material.map.needsUpdate = true;
        });

        imageTrans.src = 'imgs/earthcloudmaptrans.jpg';
    }, false);

    imageMap.src = 'imgs/earthcloudmap.jpg';

    var geometry = new THREE.SphereGeometry(0.51, 32, 32);
    var material = new THREE.MeshPhongMaterial({
        map: new THREE.Texture(canvasResult),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
    });
    console.log("createEarthCloud")
    var mesh = new THREE.Mesh(geometry, material);
    return mesh;

    
}

function drawMoonOrbit(earthMesh, moonOrbitRadius) {
    const material = new THREE.LineDashedMaterial({
        color: 0xffff00, //цвет линии
        dashSize: 2, //размер сегмента
        gapSize: 2, //величина отступа между сегментами
    });
    const points = [];
    for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        const x = moonOrbitRadius * Math.cos(angle);
        const z = moonOrbitRadius * Math.sin(angle);
        points.push(new THREE.Vector3(x, 0, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();

    // Добавляем орбиту Луны как дочерний объект Земли
    earthMesh.add(line);
}

// Функция инициализации
function init() {
    container = document.getElementById('container');

    scene = new THREE.Scene();

    // Освещение
    const ambientLight = new THREE.AmbientLight(0x404040); // Увеличиваем интенсивность освещения
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 0);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    sun = createSun("imgs/sunmap.jpg", 49.634);

    // Создаем Землю с облаками, картой высот и бликов
    const earthGeometry = new THREE.SphereGeometry(16.371, 32, 32);
    const earthCloudMesh = createEarthCloud();
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: loadTexture("imgs/earthmap1k.jpg"),
        bumpMap: loadTexture("imgs/earthbump1k.jpg"),
        bumpScale: 0.5,
        specularMap: loadTexture("imgs/earthlights1k.jpg"),
        specular: new THREE.Color('grey')
    });

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.matrixWorldNeedsUpdate = true;
    earthMesh.add(earthCloudMesh);
    earthCloudMesh.scale.set(1.01, 1.01, 1.01);
    scene.add(earthMesh);


    // Создаем Луну и делаем ее дочерним объектом Земли
    const moon = createPlanet("imgs/moonmap1k.jpg", 11.737, 50, 0.5);
    earthMesh.add(moon.mesh);

    // Устанавливаем положение Луны относительно Земли
    moon.mesh.position.set(-30, 0, 0);

    // Рисуем орбиту Луны
    drawMoonOrbit(earthMesh, 40); 



    // Добавляем Землю в массив планет
    planets.push({ mesh: earthMesh, orbitRadius: 200, rotationSpeed: 1, a2: 0, sphere: earthMesh, angle: 0 });

    // Создаем планеты
    planets.push(createPlanet("imgs/mercurybump.jpg", 16.0518, 108, 1.1)); // Меркурий
    planets.push(createPlanet("imgs/venusmap.jpg", 20.371, 150, 1.3)); // Венера
    planets.push(createPlanet("imgs/marsmap1k.jpg", 22, 250, 1)); // mars

    // Увеличиваем радиусы орбит для лучшей видимости
    planets.forEach(planet => {
        planet.orbitRadius *= 2; // Увеличиваем радиус орбиты в 2 раза
        drawOrbit(planet.orbitRadius); // Перерисовываем орбиты
    });

    sky = createStarrySky("imgs/starmap.jpg", 800); // Смотрим в центр сцены

    renderer = new THREE.WebGLRenderer({ antialias: true }); // Сглаживание
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000); // Черный фон
    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false); // Обработчик изменения размера окна

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 200, 400); // Изменяем начальную позицию камеры
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    console.log("init");
}

// Функция отрисовки орбиты
function drawOrbit(radius) {
    const material = new THREE.LineDashedMaterial({
        color: 0xffff00,
        dashSize: 2,
        gapSize: 2
    });
    const points = [];
    for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        points.push(new THREE.Vector3(x, 0, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    scene.add(line);
}

// Функция анимации
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    planets.forEach(planet => {
        // Вращение вокруг солнца
        planet.angle += planet.rotationSpeed * delta;
        const x = planet.orbitRadius * Math.cos(planet.angle);
        const z = planet.orbitRadius * Math.sin(planet.angle);
        planet.mesh.position.set(x, 0, z);

        // Вращение вокруг своей оси
        planet.mesh.rotation.y += planet.rotationSpeed * delta;
    });

    keys(delta);
    console.log("keys");
    renderer.render(scene, camera);
}

// Обработчик изменения размера окна
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
function keys(delta) {
    if (keyboard.pressed("0")) chase = -1;
    if (keyboard.pressed("1")) chase = 0;
    if (keyboard.pressed("2")) chase = 1;
    if (keyboard.pressed("3")) chase = 2;
    if (keyboard.pressed("4")) chase = 3;

   
    const rotationSpeed = 0.5 * delta; 
    if (chase >= 0 && chase < planets.length) { 
        if (keyboard.pressed("left")) cameraAngleHorizontal -= rotationSpeed;
        if (keyboard.pressed("right")) cameraAngleHorizontal += rotationSpeed;
        if (keyboard.pressed("up")) cameraAngleVertical -= rotationSpeed;
        if (keyboard.pressed("down")) cameraAngleVertical += rotationSpeed;
    }

    // Проверяем chase, planets и mesh
    if (chase >= 0 && chase < planets.length) {
        var pos = planets[chase].mesh.position;

        const distance = planets[chase].orbitRadius; // Расстояние от планеты до камеры

        
        const x = pos.x + distance * Math.cos(cameraAngleHorizontal) * Math.cos(cameraAngleVertical);
        const y = pos.y + distance * Math.sin(cameraAngleVertical);
        const z = pos.z + distance * Math.sin(cameraAngleHorizontal) * Math.cos(cameraAngleVertical);

        camera.position.set(x, y, z);
        camera.lookAt(pos);
    } else {
        camera.position.set(0, 300, 700);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    }
}


init();
animate();
import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls';

// Основные параметры и переменные
let scene, camera, renderer, controls;
let field;
let players = [];
let animations = [];
let animationMixer;
let clock = new THREE.Clock();

// Размеры поля (в метрах)
const fieldLength = 105;
const fieldWidth = 68;

// Инициализация сцены
function init() {
    // Создание сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Цвет неба
    
    // Создание камеры
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight), 0.1, 1000);
    camera.position.set(0, 50, 80);
    
    // Создание рендерера
    const container = document.getElementById('visualization');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Добавление освещения
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Добавление контроля орбиты для вращения камеры
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Создание футбольного поля
    createField();
    
    // Создание начальной расстановки игроков
    setupDefaultFormation();
    
    // Обработчики событий
    window.addEventListener('resize', onWindowResize);
    
    document.getElementById('defaultFormation').addEventListener('click', () => {
        clearPlayers();
        setupDefaultFormation();
    });
    
    document.getElementById('attackFormation').addEventListener('click', () => {
        clearPlayers();
        setupAttackFormation();
    });
    
    document.getElementById('defenseFormation').addEventListener('click', () => {
        clearPlayers();
        setupDefenseFormation();
    });
    
    document.getElementById('resetPlayers').addEventListener('click', () => {
        resetPlayersPositions();
    });
    
    // Запуск анимации
    animate();
}

// Создание футбольного поля
function createField() {
    // Основной газон
    const fieldGeometry = new THREE.PlaneGeometry(fieldLength, fieldWidth);
    const fieldMaterial = new THREE.MeshStandardMaterial({
        color: 0x2E8B57,
        side: THREE.DoubleSide,
        roughness: 0.8
    });
    field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    scene.add(field);
    
    // Добавление линий разметки
    addFieldLines();
}

// Добавление линий разметки поля
function addFieldLines() {
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    
    // Внешний прямоугольник поля
    const outlineGeometry = new THREE.BufferGeometry();
    const outlineVertices = [
        -fieldLength/2, fieldWidth/2, 0.01,
        fieldLength/2, fieldWidth/2, 0.01,
        fieldLength/2, -fieldWidth/2, 0.01,
        -fieldLength/2, -fieldWidth/2, 0.01,
        -fieldLength/2, fieldWidth/2, 0.01
    ];
    outlineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(outlineVertices, 3));
    const outline = new THREE.Line(outlineGeometry, lineMaterial);
    scene.add(outline);
    
    // Средняя линия
    const midlineGeometry = new THREE.BufferGeometry();
    const midlineVertices = [
        0, fieldWidth/2, 0.01,
        0, -fieldWidth/2, 0.01
    ];
    midlineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(midlineVertices, 3));
    const midline = new THREE.Line(midlineGeometry, lineMaterial);
    scene.add(midline);
    
    // Центральный круг
    const circlePoints = [];
    const radius = 9.15;
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        circlePoints.push(new THREE.Vector3(
            Math.cos(theta) * radius,
            0.01,
            Math.sin(theta) * radius
        ));
    }
    const circleGeometry = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const circle = new THREE.LineLoop(circleGeometry, lineMaterial);
    scene.add(circle);
    
    // Штрафные площади
    // Левая штрафная
    const leftPenaltyAreaGeometry = new THREE.BufferGeometry();
    const leftPenaltyVertices = [
        -fieldLength/2, 20.16, 0.01,
        -fieldLength/2 + 16.5, 20.16, 0.01,
        -fieldLength/2 + 16.5, -20.16, 0.01,
        -fieldLength/2, -20.16, 0.01
    ];
    leftPenaltyAreaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leftPenaltyVertices, 3));
    const leftPenaltyArea = new THREE.Line(leftPenaltyAreaGeometry, lineMaterial);
    scene.add(leftPenaltyArea);
    
    // Правая штрафная
    const rightPenaltyAreaGeometry = new THREE.BufferGeometry();
    const rightPenaltyVertices = [
        fieldLength/2, 20.16, 0.01,
        fieldLength/2 - 16.5, 20.16, 0.01,
        fieldLength/2 - 16.5, -20.16, 0.01,
        fieldLength/2, -20.16, 0.01
    ];
    rightPenaltyAreaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rightPenaltyVertices, 3));
    const rightPenaltyArea = new THREE.Line(rightPenaltyAreaGeometry, lineMaterial);
    scene.add(rightPenaltyArea);
    
    // Добавление ворот
    addGoals();
}

// Добавление ворот
function addGoals() {
    // Левые ворота
    const leftGoalGeometry = new THREE.BoxGeometry(2, 2.44, 7.32);
    const goalMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.7
    });
    const leftGoal = new THREE.Mesh(leftGoalGeometry, goalMaterial);
    leftGoal.position.set(-fieldLength/2 - 1, 2.44/2, 0);
    scene.add(leftGoal);
    
    // Правые ворота
    const rightGoal = leftGoal.clone();
    rightGoal.position.set(fieldLength/2 + 1, 2.44/2, 0);
    scene.add(rightGoal);
}

// Создание игрока
function createPlayer(position, teamColor = 0xff0000, playerNumber = "") {
    const playerGroup = new THREE.Group();
    
    // Тело игрока (сфера)
    const playerGeometry = new THREE.SphereGeometry(1, 32, 32);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: teamColor });
    const playerBody = new THREE.Mesh(playerGeometry, playerMaterial);
    playerBody.castShadow = true;
    playerGroup.add(playerBody);
    
    // Номер игрока (если указан)
    if (playerNumber !== "") {
        // Создаем спрайт с номером вместо использования THREE.Font
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.font = 'Bold 40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(playerNumber.toString(), 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(1, 1, 1);
        sprite.position.set(0, 1.5, 0);
        playerGroup.add(sprite);
    }
    
    playerGroup.position.copy(position);
    playerGroup.userData = { 
        originalPosition: position.clone(),
        teamColor: teamColor
    };
    
    scene.add(playerGroup);
    players.push(playerGroup);
    
    return playerGroup;
}

// Анимация движения игрока
function animatePlayer(player, targetPosition, duration = 2) {
    const startPosition = player.position.clone();
    const endPosition = targetPosition.clone();
    
    const animation = {
        player: player,
        startPosition: startPosition,
        endPosition: endPosition,
        duration: duration,
        startTime: clock.getElapsedTime(),
        active: true
    };
    
    animations.push(animation);
}

// Обновление анимаций
function updateAnimations() {
    const currentTime = clock.getElapsedTime();
    
    for (let i = animations.length - 1; i >= 0; i--) {
        const anim = animations[i];
        
        if (!anim.active) continue;
        
        const elapsed = currentTime - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);
        
        if (progress < 1) {
            anim.player.position.lerpVectors(anim.startPosition, anim.endPosition, progress);
        } else {
            anim.player.position.copy(anim.endPosition);
            anim.active = false;
            animations.splice(i, 1);
        }
    }
}

// Изменение размера окна
function onWindowResize() {
    const container = document.getElementById('visualization');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Очистка игроков
function clearPlayers() {
    for (const player of players) {
        scene.remove(player);
    }
    players = [];
    animations = [];
}

// Сброс позиций игроков
function resetPlayersPositions() {
    for (const player of players) {
        animatePlayer(player, player.userData.originalPosition);
    }
}

// Расстановка 4-4-2 (классическая)
function setupDefaultFormation() {
    // Вратарь (красная команда)
    createPlayer(new THREE.Vector3(-fieldLength/2 + 2, 1, 0), 0xff9900, 1);
    
    // Защитники
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, -20), 0xff0000, 2);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, -7), 0xff0000, 3);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, 7), 0xff0000, 4);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, 20), 0xff0000, 5);
    
    // Полузащитники
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, -20), 0xff0000, 6);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, -7), 0xff0000, 7);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, 7), 0xff0000, 8);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, 20), 0xff0000, 9);
    
    // Нападающие
    createPlayer(new THREE.Vector3(-fieldLength/2 + 50, 1, -7), 0xff0000, 10);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 50, 1, 7), 0xff0000, 11);
    
    // Синяя команда (противник)
    createPlayer(new THREE.Vector3(fieldLength/2 - 2, 1, 0), 0x0000ff, 1);
    
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, 20), 0x0000ff, 2);
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, 7), 0x0000ff, 3);
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, -7), 0x0000ff, 4);
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, -20), 0x0000ff, 5);
    
    createPlayer(new THREE.Vector3(fieldLength/2 - 35, 1, 20), 0x0000ff, 6);
    createPlayer(new THREE.Vector3(fieldLength/2 - 35, 1, 7), 0x0000ff, 7);
    createPlayer(new THREE.Vector3(fieldLength/2 - 35, 1, -7), 0x0000ff, 8);
    createPlayer(new THREE.Vector3(fieldLength/2 - 35, 1, -20), 0x0000ff, 9);
    
    createPlayer(new THREE.Vector3(fieldLength/2 - 50, 1, 7), 0x0000ff, 10);
    createPlayer(new THREE.Vector3(fieldLength/2 - 50, 1, -7), 0x0000ff, 11);
}

// Расстановка 4-3-3 (атакующая)
function setupAttackFormation() {
    // Вратарь (красная команда)
    createPlayer(new THREE.Vector3(-fieldLength/2 + 2, 1, 0), 0xff9900, 1);
    
    // Защитники
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, -20), 0xff0000, 2);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, -7), 0xff0000, 3);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, 7), 0xff0000, 4);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, 20), 0xff0000, 5);
    
    // Полузащитники
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, -10), 0xff0000, 6);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, 0), 0xff0000, 7);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, 10), 0xff0000, 8);
    
    // Нападающие
    createPlayer(new THREE.Vector3(-fieldLength/2 + 55, 1, -18), 0xff0000, 9);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 55, 1, 0), 0xff0000, 10);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 55, 1, 18), 0xff0000, 11);
    
    // Синяя команда (противник) - в защитной формации
    createPlayer(new THREE.Vector3(fieldLength/2 - 2, 1, 0), 0x0000ff, 1);
    
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, -25), 0x0000ff, 2);
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, -8), 0x0000ff, 3);
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, 8), 0x0000ff, 4);
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, 25), 0x0000ff, 5);
    
    createPlayer(new THREE.Vector3(fieldLength/2 - 30, 1, -15), 0x0000ff, 6);
    createPlayer(new THREE.Vector3(fieldLength/2 - 30, 1, 0), 0x0000ff, 7);
    createPlayer(new THREE.Vector3(fieldLength/2 - 30, 1, 15), 0x0000ff, 8);
    
    createPlayer(new THREE.Vector3(fieldLength/2 - 45, 1, -8), 0x0000ff, 9);
    createPlayer(new THREE.Vector3(fieldLength/2 - 45, 1, 8), 0x0000ff, 10);
}

// Расстановка 5-3-2 (оборонительная)
function setupDefenseFormation() {
    // Вратарь (красная команда)
    createPlayer(new THREE.Vector3(-fieldLength/2 + 2, 1, 0), 0xff9900, 1);
    
    // Защитники
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, -25), 0xff0000, 2);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, -12), 0xff0000, 3);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, 0), 0xff0000, 4);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, 12), 0xff0000, 5);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 15, 1, 25), 0xff0000, 6);
    
    // Полузащитники
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, -15), 0xff0000, 7);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, 0), 0xff0000, 8);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 35, 1, 15), 0xff0000, 9);
    
    // Нападающие
    createPlayer(new THREE.Vector3(-fieldLength/2 + 55, 1, -8), 0xff0000, 10);
    createPlayer(new THREE.Vector3(-fieldLength/2 + 55, 1, 8), 0xff0000, 11);
    
    // Синяя команда (противник) - в атакующей формации
    createPlayer(new THREE.Vector3(fieldLength/2 - 2, 1, 0), 0x0000ff, 1);
    
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, -20), 0x0000ff, 2);
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, -7), 0x0000ff, 3);
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, 7), 0x0000ff, 4);
    createPlayer(new THREE.Vector3(fieldLength/2 - 15, 1, 20), 0x0000ff, 5);
    
    createPlayer(new THREE.Vector3(fieldLength/2 - 35, 1, -10), 0x0000ff, 6);
    createPlayer(new THREE.Vector3(fieldLength/2 - 35, 1, 0), 0x0000ff, 7);
    createPlayer(new THREE.Vector3(fieldLength/2 - 35, 1, 10), 0x0000ff, 8);
    
    createPlayer(new THREE.Vector3(fieldLength/2 - 55, 1, -18), 0x0000ff, 9);
    createPlayer(new THREE.Vector3(fieldLength/2 - 55, 1, 0), 0x0000ff, 10);
    createPlayer(new THREE.Vector3(fieldLength/2 - 55, 1, 18), 0x0000ff, 11);
}

// Функция анимации
function animate() {
    requestAnimationFrame(animate);
    
    // Обновление контролов камеры
    controls.update();
    
    // Обновление анимаций
    updateAnimations();
    
    // Рендеринг сцены
    renderer.render(scene, camera);
}

// Запуск приложения
init();
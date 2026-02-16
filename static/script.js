// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const previewCard = document.getElementById('previewCard');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const resultsSection = document.getElementById('resultsSection');

// Mode switching elements
const uploadSection = document.getElementById('uploadSection');
const streamingSection = document.getElementById('streamingSection');
const pathplanSection = document.getElementById('pathplanSection');
const missionSection = document.getElementById('missionSection');
const modeSubtitle = document.getElementById('modeSubtitle');

// Streaming elements
const startStreamBtn = document.getElementById('startStreamBtn');
const stopStreamBtn = document.getElementById('stopStreamBtn');
const viewHistoryBtn = document.getElementById('viewHistoryBtn');
const statusIndicator = document.getElementById('statusIndicator');
const streamStatus = document.getElementById('streamStatus');
const frameCounter = document.getElementById('frameCounter');
const alertsCard = document.getElementById('alertsCard');
const alertsContainer = document.getElementById('alertsContainer');
const liveMetrics = document.getElementById('liveMetrics');

let selectedFile = null;
let metricsChart = null;
let socket = null;
let currentFrame = 0;

// Path Planning Variables
let terrainCanvas, ctx;
let terrainGrid = [];
let gridSize = 40;
let cellSize = 20;
let startPoint = null;
let endPoint = null;
let currentPath = null;
let allRoutes = [];

// Mission Simulation Variables
let navigationCanvas, navCtx;
let missionActive = false;
let missionPaused = false;
let missionInterval = null;
let currentPathIndex = 0;
let missionStartTime = 0;
let missionStats = {
    distance: 0,
    hazards: 0,
    time: 0,
    totalRisk: 0
};

// Initialize Socket.IO
function initSocket() {
    if (socket && socket.connected) return;
    
    socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
        console.log('Connected to server');
        streamStatus.textContent = 'Connected - Ready to Stream';
        statusIndicator.style.color = '#00C853';
        startStreamBtn.disabled = false;
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        streamStatus.textContent = 'Disconnected';
        statusIndicator.classList.remove('active');
        startStreamBtn.disabled = true;
        stopStreamBtn.disabled = true;
    });
    
    socket.on('frame_update', (data) => {
        currentFrame = data.frame_id;
        updateLiveMetrics(data);
        frameCounter.textContent = `Frame: ${data.frame_id}`;
        
        if (data.alerts && data.alerts.length > 0) {
            showAlerts(data.alerts);
        }
    });
    
    socket.on('streaming_status', (data) => {
        console.log('Streaming status:', data.status);
        if (data.status === 'started') {
            streamStatus.textContent = 'Streaming Active';
            statusIndicator.classList.add('active');
            startStreamBtn.disabled = true;
            stopStreamBtn.disabled = false;
            liveMetrics.style.display = 'block';
        } else if (data.status === 'stopped') {
            streamStatus.textContent = 'Stream Stopped - Ready to Stream';
            statusIndicator.classList.remove('active');
            startStreamBtn.disabled = false;
            stopStreamBtn.disabled = true;
        }
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        streamStatus.textContent = 'Connection Error';
        alert('Cannot connect to server. Please ensure the backend is running.');
    });
}

// Mode Switching
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = link.dataset.mode;
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        if (mode === 'upload') {
            uploadSection.style.display = 'block';
            streamingSection.style.display = 'none';
            pathplanSection.style.display = 'none';
            missionSection.style.display = 'none';
            modeSubtitle.textContent = 'Upload terrain images for AI-powered environmental analysis';
        } else if (mode === 'stream') {
            uploadSection.style.display = 'none';
            streamingSection.style.display = 'block';
            pathplanSection.style.display = 'none';
            missionSection.style.display = 'none';
            modeSubtitle.textContent = 'Real-time terrain analysis with live streaming (0.5s updates)';
            if (!socket || !socket.connected) {
                initSocket();
            }
        } else if (mode === 'pathplan') {
            uploadSection.style.display = 'none';
            streamingSection.style.display = 'none';
            pathplanSection.style.display = 'block';
            missionSection.style.display = 'none';
            modeSubtitle.textContent = 'A* Path Planning with Risk Scoring and Multi-Route Comparison';
            initPathPlanning();
        } else if (mode === 'mission') {
            uploadSection.style.display = 'none';
            streamingSection.style.display = 'none';
            pathplanSection.style.display = 'none';
            missionSection.style.display = 'block';
            modeSubtitle.textContent = 'Live Mission Simulation with Real-Time Navigation';
            initMissionSimulation();
        }
    });
});

// Streaming Controls
startStreamBtn.addEventListener('click', () => {
    console.log('Start button clicked');
    if (socket && socket.connected) {
        console.log('Emitting start_streaming event');
        socket.emit('start_streaming');
        alertsCard.style.display = 'block';
        liveMetrics.style.display = 'block';
        startStreamBtn.disabled = true;
        stopStreamBtn.disabled = false;
        streamStatus.textContent = 'Starting Stream...';
    } else {
        alert('Not connected to server. Please wait for connection.');
        initSocket();
    }
});

stopStreamBtn.addEventListener('click', () => {
    console.log('Stop button clicked');
    if (socket && socket.connected) {
        console.log('Emitting stop_streaming event');
        socket.emit('stop_streaming');
        stopStreamBtn.disabled = true;
        startStreamBtn.disabled = false;
        liveMetrics.style.display = 'none';
        alertsCard.style.display = 'none';
    }
});

viewHistoryBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('http://localhost:5000/api/history');
        const data = await response.json();
        alert(`Frame History: ${data.frames.length} frames stored\nLast 5 frames:\n${data.frames.slice(-5).map(f => `Frame ${f.frame_id}: Hazard ${f.hazard_level}`).join('\n')}`);
    } catch (error) {
        console.error('Error fetching history:', error);
    }
});

// Update Live Metrics
function updateLiveMetrics(data) {
    document.getElementById('liveConfidence').textContent = `${data.segmentation_confidence}%`;
    
    const hazardBadge = document.getElementById('liveHazard');
    hazardBadge.textContent = data.hazard_level;
    hazardBadge.className = `metric-value hazard-badge ${data.hazard_level.toLowerCase()}`;
    
    document.getElementById('liveVegetation').textContent = `${data.vegetation_score}%`;
    document.getElementById('liveMoisture').textContent = `${data.moisture_level}%`;
    document.getElementById('liveRoughnessPercent').textContent = `${data.terrain_roughness}%`;
    document.getElementById('liveRoughnessBar').style.width = `${data.terrain_roughness}%`;
    document.getElementById('liveSpeed').textContent = `${data.recommended_speed} km/h`;
}

// Show Alerts
function showAlerts(alerts) {
    alertsContainer.innerHTML = '';
    alerts.forEach(alert => {
        const alertEl = document.createElement('div');
        alertEl.className = `alert-item ${alert.type}`;
        alertEl.innerHTML = `
            <span class="alert-icon">${alert.type === 'danger' ? '🚨' : '⚠️'}</span>
            <span class="alert-message">${alert.message}</span>
            <span class="alert-time">${new Date().toLocaleTimeString()}</span>
        `;
        alertsContainer.appendChild(alertEl);
    });
}

// File Input Handlers
browseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Drag and Drop Handlers
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

uploadZone.addEventListener('click', () => fileInput.click());

// Handle File Selection
function handleFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image file (PNG, JPG, JPEG, GIF, WEBP)');
        return;
    }
    
    if (file.size > 16 * 1024 * 1024) {
        alert('File size must be less than 16MB');
        return;
    }
    
    selectedFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        previewCard.style.display = 'block';
        resultsSection.style.display = 'none';
        previewCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    reader.readAsDataURL(file);
}

// Analyze Image
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        alert('Please select an image first');
        return;
    }
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    
    loadingOverlay.style.display = 'flex';
    
    try {
        const response = await fetch('http://localhost:5000/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Analysis failed');
        }
        
        const data = await response.json();
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        displayResults(data.analysis);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to analyze image. Please ensure the backend server is running.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

// Display Results
function displayResults(analysis) {
    const confidenceEl = document.getElementById('confidenceValue');
    animateValue(confidenceEl, 0, analysis.segmentation_confidence, 1000, '%');
    
    const hazardBadge = document.getElementById('hazardValue');
    hazardBadge.textContent = analysis.hazard_level;
    hazardBadge.className = `metric-value hazard-badge ${analysis.hazard_level.toLowerCase()}`;
    
    const vegetationEl = document.getElementById('vegetationValue');
    animateValue(vegetationEl, 0, analysis.vegetation_score, 1200, '%');
    
    const moistureEl = document.getElementById('moistureValue');
    animateValue(moistureEl, 0, analysis.moisture_level, 1400, '%');
    
    document.getElementById('roughnessPercent').textContent = `${analysis.terrain_roughness}%`;
    const roughnessBar = document.getElementById('roughnessBar');
    setTimeout(() => {
        roughnessBar.style.width = `${analysis.terrain_roughness}%`;
    }, 100);
    
    const speedEl = document.getElementById('speedValue');
    animateValue(speedEl, 0, analysis.recommended_speed, 1000, ' km/h');
    
    createMetricsChart(analysis.environmental_metrics);
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Animate Number Values
function animateValue(element, start, end, duration, suffix = '') {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = start + (end - start) * easeOutQuart;
        
        element.textContent = current.toFixed(2) + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = end.toFixed(2) + suffix;
        }
    }
    
    requestAnimationFrame(update);
}

// Create Chart.js Visualization
function createMetricsChart(metrics) {
    const ctx = document.getElementById('metricsChart').getContext('2d');
    
    if (metricsChart) {
        metricsChart.destroy();
    }
    
    metricsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Soil Quality', 'Erosion Risk', 'Biodiversity', 'Water Presence'],
            datasets: [{
                label: 'Environmental Metrics (%)',
                data: [
                    metrics.soil_quality,
                    metrics.erosion_risk,
                    metrics.biodiversity_index,
                    metrics.water_presence
                ],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.7)',
                    'rgba(255, 152, 0, 0.7)',
                    'rgba(33, 150, 243, 0.7)',
                    'rgba(3, 169, 244, 0.7)'
                ],
                borderColor: [
                    'rgba(76, 175, 80, 1)',
                    'rgba(255, 152, 0, 1)',
                    'rgba(33, 150, 243, 1)',
                    'rgba(3, 169, 244, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart',
                delay: (context) => {
                    return context.dataIndex * 150;
                }
            }
        }
    });
}

// ===== PATH PLANNING SYSTEM =====

function initPathPlanning() {
    if (!terrainCanvas) {
        terrainCanvas = document.getElementById('terrainCanvas');
        ctx = terrainCanvas.getContext('2d');
        
        document.getElementById('generateMapBtn').addEventListener('click', generateTerrain);
        document.getElementById('clearPathBtn').addEventListener('click', clearPath);
        document.getElementById('findPathBtn').addEventListener('click', findOptimalPath);
        terrainCanvas.addEventListener('click', handleCanvasClick);
    }
}

function generateTerrain() {
    terrainGrid = [];
    for (let y = 0; y < gridSize; y++) {
        terrainGrid[y] = [];
        for (let x = 0; x < gridSize; x++) {
            const rand = Math.random();
            let risk;
            if (rand < 0.5) risk = 1;
            else if (rand < 0.75) risk = 3;
            else if (rand < 0.9) risk = 5;
            else risk = 10;
            terrainGrid[y][x] = { risk, visited: false };
        }
    }
    drawTerrain();
    startPoint = null;
    endPoint = null;
    currentPath = null;
    document.getElementById('findPathBtn').disabled = true;
}

function drawTerrain() {
    ctx.clearRect(0, 0, terrainCanvas.width, terrainCanvas.height);
    
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const cell = terrainGrid[y][x];
            let color;
            if (cell.risk === 1) color = '#4CAF50';
            else if (cell.risk === 3) color = '#FFC107';
            else if (cell.risk === 5) color = '#FF5722';
            else color = '#2196F3';
            
            ctx.fillStyle = color;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
    }
    
    if (startPoint) {
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(startPoint.x * cellSize + cellSize/2, startPoint.y * cellSize + cellSize/2, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (endPoint) {
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(endPoint.x * cellSize + cellSize/2, endPoint.y * cellSize + cellSize/2, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (currentPath) {
        ctx.strokeStyle = '#9C27B0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x * cellSize + cellSize/2, currentPath[0].y * cellSize + cellSize/2);
        for (let i = 1; i < currentPath.length; i++) {
            ctx.lineTo(currentPath[i].x * cellSize + cellSize/2, currentPath[i].y * cellSize + cellSize/2);
        }
        ctx.stroke();
    }
}

function handleCanvasClick(e) {
    if (terrainGrid.length === 0) return;
    
    const rect = terrainCanvas.getBoundingClientRect();
    const scaleX = terrainCanvas.width / rect.width;
    const scaleY = terrainCanvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / cellSize);
    const y = Math.floor((e.clientY - rect.top) * scaleY / cellSize);
    
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        if (!startPoint) {
            startPoint = { x, y };
        } else if (!endPoint) {
            endPoint = { x, y };
            document.getElementById('findPathBtn').disabled = false;
        } else {
            startPoint = { x, y };
            endPoint = null;
            currentPath = null;
            document.getElementById('findPathBtn').disabled = true;
        }
        drawTerrain();
    }
}

function clearPath() {
    startPoint = null;
    endPoint = null;
    currentPath = null;
    allRoutes = [];
    document.getElementById('findPathBtn').disabled = true;
    document.getElementById('routesCard').style.display = 'none';
    document.getElementById('pathDetailsCard').style.display = 'none';
    drawTerrain();
}

function findOptimalPath() {
    if (!startPoint || !endPoint) return;
    
    allRoutes = [];
    
    const route1 = aStarPathfinding(startPoint, endPoint, 1.0);
    const route2 = aStarPathfinding(startPoint, endPoint, 1.5);
    const route3 = aStarPathfinding(startPoint, endPoint, 0.5);
    
    if (route1) allRoutes.push({ path: route1, name: 'Optimal Route', type: 'optimal' });
    if (route2 && !pathsEqual(route1, route2)) allRoutes.push({ path: route2, name: 'Fast Route', type: 'alternative' });
    if (route3 && !pathsEqual(route1, route3) && !pathsEqual(route2, route3)) allRoutes.push({ path: route3, name: 'Safe Route', type: 'alternative' });
    
    if (allRoutes.length > 0) {
        displayRoutes();
        selectRoute(0);
    } else {
        alert('No path found!');
    }
}

function aStarPathfinding(start, end, heuristicWeight) {
    const openSet = [{ ...start, g: 0, h: heuristic(start, end), f: 0, parent: null }];
    const closedSet = new Set();
    
    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        
        if (current.x === end.x && current.y === end.y) {
            return reconstructPath(current);
        }
        
        closedSet.add(`${current.x},${current.y}`);
        
        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;
            
            const risk = terrainGrid[neighbor.y][neighbor.x].risk;
            if (risk === 10) continue;
            
            const g = current.g + risk;
            const h = heuristic(neighbor, end) * heuristicWeight;
            const f = g + h;
            
            const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
            if (!existing || g < existing.g) {
                if (existing) openSet.splice(openSet.indexOf(existing), 1);
                openSet.push({ ...neighbor, g, h, f, parent: current });
            }
        }
    }
    return null;
}

function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(node) {
    const neighbors = [];
    const dirs = [[0,1], [1,0], [0,-1], [-1,0]];
    for (const [dx, dy] of dirs) {
        const x = node.x + dx;
        const y = node.y + dy;
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            neighbors.push({ x, y });
        }
    }
    return neighbors;
}

function reconstructPath(node) {
    const path = [];
    while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
    }
    return path;
}

function pathsEqual(path1, path2) {
    if (!path1 || !path2 || path1.length !== path2.length) return false;
    return path1.every((p, i) => p.x === path2[i].x && p.y === path2[i].y);
}

function calculatePathStats(path) {
    let totalRisk = 0;
    for (const point of path) {
        totalRisk += terrainGrid[point.y][point.x].risk;
    }
    return {
        distance: path.length,
        risk: totalRisk,
        time: Math.round(path.length * 0.5 + totalRisk * 0.2)
    };
}

function displayRoutes() {
    const routesGrid = document.getElementById('routesGrid');
    routesGrid.innerHTML = '';
    
    allRoutes.forEach((route, index) => {
        const stats = calculatePathStats(route.path);
        const routeEl = document.createElement('div');
        routeEl.className = 'route-option';
        routeEl.innerHTML = `
            <div class="route-header">
                <span class="route-name">${route.name}</span>
                <span class="route-badge ${route.type}">${route.type === 'optimal' ? 'BEST' : 'ALT'}</span>
            </div>
            <div class="route-info">
                <div class="route-stat">
                    <span class="route-stat-label">Distance:</span>
                    <span class="route-stat-value">${stats.distance} units</span>
                </div>
                <div class="route-stat">
                    <span class="route-stat-label">Risk Score:</span>
                    <span class="route-stat-value">${stats.risk}</span>
                </div>
                <div class="route-stat">
                    <span class="route-stat-label">Est. Time:</span>
                    <span class="route-stat-value">${stats.time} min</span>
                </div>
            </div>
        `;
        routeEl.addEventListener('click', () => selectRoute(index));
        routesGrid.appendChild(routeEl);
    });
    
    document.getElementById('routesCard').style.display = 'block';
}

function selectRoute(index) {
    currentPath = allRoutes[index].path;
    drawTerrain();
    
    document.querySelectorAll('.route-option').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
    });
    
    const stats = calculatePathStats(currentPath);
    document.getElementById('pathDistance').textContent = `${stats.distance} units`;
    document.getElementById('pathRisk').textContent = stats.risk;
    document.getElementById('pathTime').textContent = `${stats.time} minutes`;
    document.getElementById('pathDetailsCard').style.display = 'block';
}


// ===== MISSION SIMULATION SYSTEM =====

function initMissionSimulation() {
    if (!navigationCanvas) {
        navigationCanvas = document.getElementById('navigationCanvas');
        navCtx = navigationCanvas.getContext('2d');
        
        document.getElementById('startMissionBtn').addEventListener('click', startMission);
        document.getElementById('pauseMissionBtn').addEventListener('click', pauseMission);
        document.getElementById('stopMissionBtn').addEventListener('click', stopMission);
        document.getElementById('newMissionBtn').addEventListener('click', resetMission);
    }
    
    if (currentPath && currentPath.length > 0) {
        document.getElementById('startMissionBtn').disabled = false;
    }
}

function startMission() {
    if (!currentPath || currentPath.length === 0) {
        alert('Please select a path in Path Planning mode first!');
        return;
    }
    
    missionActive = true;
    missionPaused = false;
    currentPathIndex = 0;
    missionStartTime = Date.now();
    missionStats = { distance: 0, hazards: 0, time: 0, totalRisk: 0 };
    
    document.getElementById('startMissionBtn').disabled = true;
    document.getElementById('pauseMissionBtn').disabled = false;
    document.getElementById('stopMissionBtn').disabled = false;
    document.getElementById('missionStatus').textContent = 'In Progress';
    document.getElementById('navigationCard').style.display = 'block';
    document.getElementById('missionMetrics').style.display = 'block';
    document.getElementById('missionSummaryCard').style.display = 'none';
    
    missionInterval = setInterval(updateMission, 500);
}

function pauseMission() {
    if (missionPaused) {
        missionPaused = false;
        missionStartTime = Date.now() - missionStats.time * 1000;
        document.getElementById('pauseMissionBtn').textContent = '⏸ Pause';
        document.getElementById('missionStatus').textContent = 'In Progress';
        missionInterval = setInterval(updateMission, 500);
    } else {
        missionPaused = true;
        clearInterval(missionInterval);
        document.getElementById('pauseMissionBtn').textContent = '▶ Resume';
        document.getElementById('missionStatus').textContent = 'Paused';
    }
}

function stopMission() {
    missionActive = false;
    clearInterval(missionInterval);
    document.getElementById('missionStatus').textContent = 'Stopped';
    document.getElementById('startMissionBtn').disabled = false;
    document.getElementById('pauseMissionBtn').disabled = true;
    document.getElementById('stopMissionBtn').disabled = true;
    showMissionSummary(false);
}

function updateMission() {
    if (!missionActive || missionPaused) return;
    
    if (currentPathIndex >= currentPath.length) {
        completeMission();
        return;
    }
    
    const currentPos = currentPath[currentPathIndex];
    const risk = terrainGrid[currentPos.y][currentPos.x].risk;
    
    missionStats.distance++;
    missionStats.totalRisk += risk;
    if (risk >= 5) missionStats.hazards++;
    
    missionStats.time = Math.floor((Date.now() - missionStartTime) / 1000);
    
    const progress = Math.round((currentPathIndex / currentPath.length) * 100);
    document.getElementById('missionProgress').textContent = `${progress}%`;
    document.getElementById('missionProgressBar').style.width = `${progress}%`;
    document.getElementById('currentPosition').textContent = `(${currentPos.x}, ${currentPos.y})`;
    document.getElementById('distanceTraveled').textContent = missionStats.distance;
    document.getElementById('hazardsCount').textContent = missionStats.hazards;
    document.getElementById('remainingDistance').textContent = currentPath.length - currentPathIndex;
    
    const minutes = Math.floor(missionStats.time / 60);
    const seconds = missionStats.time % 60;
    document.getElementById('missionTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    drawNavigation();
    currentPathIndex++;
}

function drawNavigation() {
    navCtx.clearRect(0, 0, navigationCanvas.width, navigationCanvas.height);
    
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const cell = terrainGrid[y][x];
            let color;
            if (cell.risk === 1) color = '#4CAF50';
            else if (cell.risk === 3) color = '#FFC107';
            else if (cell.risk === 5) color = '#FF5722';
            else color = '#2196F3';
            
            navCtx.fillStyle = color;
            navCtx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
    }
    
    navCtx.strokeStyle = '#9C27B0';
    navCtx.lineWidth = 3;
    navCtx.setLineDash([5, 5]);
    navCtx.beginPath();
    navCtx.moveTo(currentPath[0].x * cellSize + cellSize/2, currentPath[0].y * cellSize + cellSize/2);
    for (let i = 1; i < currentPath.length; i++) {
        navCtx.lineTo(currentPath[i].x * cellSize + cellSize/2, currentPath[i].y * cellSize + cellSize/2);
    }
    navCtx.stroke();
    navCtx.setLineDash([]);
    
    for (let i = 0; i < currentPathIndex; i++) {
        navCtx.fillStyle = 'rgba(156, 39, 176, 0.3)';
        navCtx.fillRect(currentPath[i].x * cellSize, currentPath[i].y * cellSize, cellSize - 1, cellSize - 1);
    }
    
    if (currentPathIndex < currentPath.length) {
        const pos = currentPath[currentPathIndex];
        navCtx.fillStyle = '#FF9800';
        navCtx.beginPath();
        navCtx.arc(pos.x * cellSize + cellSize/2, pos.y * cellSize + cellSize/2, 10, 0, Math.PI * 2);
        navCtx.fill();
        navCtx.strokeStyle = '#FFFFFF';
        navCtx.lineWidth = 2;
        navCtx.stroke();
    }
}

function completeMission() {
    missionActive = false;
    clearInterval(missionInterval);
    document.getElementById('missionStatus').textContent = 'Completed';
    document.getElementById('missionProgress').textContent = '100%';
    document.getElementById('missionProgressBar').style.width = '100%';
    showMissionSummary(true);
}

function showMissionSummary(success) {
    const avgSpeed = missionStats.distance / (missionStats.time / 60);
    const rating = calculateMissionRating();
    
    document.getElementById('summaryTitle').textContent = success ? 'Mission Completed Successfully!' : 'Mission Stopped';
    document.getElementById('summaryBadge').textContent = success ? '✓ SUCCESS' : '⚠ STOPPED';
    document.getElementById('summaryBadge').style.background = success ? 
        'linear-gradient(135deg, #00C853, #00B8D4)' : 
        'linear-gradient(135deg, #FF9800, #FF5722)';
    
    document.getElementById('summaryDistance').textContent = `${missionStats.distance} units`;
    document.getElementById('summaryTime').textContent = `${Math.floor(missionStats.time / 60)}m ${missionStats.time % 60}s`;
    document.getElementById('summarySpeed').textContent = `${avgSpeed.toFixed(2)} units/min`;
    document.getElementById('summaryHazards').textContent = missionStats.hazards;
    document.getElementById('summaryRisk').textContent = missionStats.totalRisk;
    document.getElementById('summaryRating').textContent = rating;
    
    document.getElementById('missionSummaryCard').style.display = 'block';
    document.getElementById('missionSummaryCard').scrollIntoView({ behavior: 'smooth' });
}

function calculateMissionRating() {
    const efficiency = (missionStats.distance / missionStats.time) * 10;
    const safety = Math.max(0, 100 - (missionStats.hazards * 10));
    const overall = (efficiency + safety) / 2;
    
    if (overall >= 80) return '⭐⭐⭐⭐⭐ Excellent';
    if (overall >= 60) return '⭐⭐⭐⭐ Good';
    if (overall >= 40) return '⭐⭐⭐ Average';
    if (overall >= 20) return '⭐⭐ Below Average';
    return '⭐ Poor';
}

function resetMission() {
    currentPathIndex = 0;
    missionStats = { distance: 0, hazards: 0, time: 0, totalRisk: 0 };
    document.getElementById('missionProgress').textContent = '0%';
    document.getElementById('missionProgressBar').style.width = '0%';
    document.getElementById('missionStatus').textContent = 'Ready';
    document.getElementById('currentPosition').textContent = '--';
    document.getElementById('distanceTraveled').textContent = '0';
    document.getElementById('hazardsCount').textContent = '0';
    document.getElementById('missionTime').textContent = '0:00';
    document.getElementById('remainingDistance').textContent = '--';
    document.getElementById('startMissionBtn').disabled = false;
    document.getElementById('pauseMissionBtn').disabled = true;
    document.getElementById('stopMissionBtn').disabled = true;
    document.getElementById('pauseMissionBtn').textContent = '⏸ Pause';
    document.getElementById('missionSummaryCard').style.display = 'none';
    document.getElementById('navigationCard').style.display = 'none';
    document.getElementById('missionMetrics').style.display = 'none';
}

// Game canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Main menu elements
const mainMenu = document.getElementById('main-menu');
const startGameBtn = document.getElementById('start-game');
const enemyGuideBtn = document.getElementById('enemy-guide-btn');
const enemyGuide = document.getElementById('enemy-guide');
const closeGuideBtn = document.getElementById('close-guide');

// Start game when button is clicked
startGameBtn.addEventListener('click', () => {
    mainMenu.style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('ui').style.display = 'block';
    if (isMobile) {
        mobileControls.style.display = 'block';
    }
    initGame();
});

// Show enemy guide when button is clicked
enemyGuideBtn.addEventListener('click', () => {
    enemyGuide.style.display = 'flex';
});

// Close enemy guide
closeGuideBtn.addEventListener('click', () => {
    enemyGuide.style.display = 'none';
});

// Set canvas size to full window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Player properties
const player = {
    x: 100,
    y: 100,
    width: 48,
    height: 48,
    velX: 0,
    velY: 0,
    speed: 5,
    jumpForce: 12,
    isJumping: false,
    color: '#5fd27e',
    outlineColor: '#2a9d4a',
    eyeColor: '#333333',
    mouthColor: '#333333',
    cheekColor: '#ff9999',
    sprite: null
};

// Game state
let currentLevel = 1;
const maxLevel = 11;
let levelCompleted = false;
let enemies = [];
let inkAmount = 1000; // Maximum ink amount
let currentInk = inkAmount; // Current ink amount

// Goal properties
const goal = {
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    color: '#ffd700'
};

// Enemy classes
const enemyTypes = {
    SPIKES_PLACER: 'spikesplacer',
    SNAKE: 'snake',
    BIG_BOI: 'bigboi',
    GHOST: 'ghost',
    FLOWER_DRAGON: 'flowerdragon',
    HUGE_BOI: 'hugeboi'
};

class Enemy {
    constructor(type, x, y, width, height) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 2;
        this.direction = 1; // 1 for right, -1 for left
        this.timer = 0;
        this.jumpTimer = 0;
        this.spikes = [];
        this.rotation = 0; // For Big Boi spinning
        this.platformCheck = true; // Flag to ensure enemies stay on platforms
        this.projectiles = []; // For Big Boi's projectiles
        this.shootCooldown = 0; // Cooldown between shots
        this.alpha = 1; // For Ghost transparency
        this.phaseState = 'visible'; // For Ghost phasing
        this.phaseTimer = 0; // For Ghost phase timing
        this.flowerState = 'closed'; // For Flower Dragon state
        this.flowerTimer = 0; // For Flower Dragon timing
        this.projectileDelay = 0; // For Flower Dragon
        this.health = type === enemyTypes.HUGE_BOI ? 100 : 0; // Boss health
        this.attackPhase = 0; // Boss attack phase
        this.phaseTimer = 0; // Boss phase timer
        this.isDead = false; // Boss death state
        this.vulnerable = false; // Boss vulnerability state
    }

    update() {
        switch(this.type) {
            case enemyTypes.SPIKES_PLACER:
                this.updateSpikesplacer();
                break;
            case enemyTypes.SNAKE:
                this.updateSnake();
                break;
            case enemyTypes.BIG_BOI:
                this.updateBigBoi();
                break;
            case enemyTypes.GHOST:
                this.updateGhost();
                break;
            case enemyTypes.FLOWER_DRAGON:
                this.updateFlowerDragon();
                break;
            case enemyTypes.HUGE_BOI:
                this.updateHugeBoi();
                break;
        }
    }

    updateSpikesplacer() {
        // Move side to side
        this.x += this.direction * this.speed;
        this.timer++;
        
        // Change direction at edges or randomly
        if (this.x <= 0 || this.x + this.width >= canvas.width || Math.random() < 0.01) {
            this.direction *= -1;
        }
        
        // Check if still on platform and reverse direction if needed
        if (this.platformCheck) {
            this.stayOnPlatform();
        }
        
        // Place spikes occasionally
        if (this.timer % 100 === 0) {
            this.spikes.push({
                x: this.x + this.width / 2 - 15,
                y: this.y + this.height,
                width: 30,
                height: 20
            });
        }
    }

    updateBigBoi() {
        // Stay in place instead of spinning
        this.timer++;
        
        // Shoot projectiles at player when nearby (within 300px)
        const distToPlayer = Math.sqrt(
            Math.pow(player.x + player.width/2 - (this.x + this.width/2), 2) + 
            Math.pow(player.y + player.height/2 - (this.y + this.height/2), 2)
        );
        
        // Decrease cooldown timer
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
        
        // Shoot if player is close and cooldown is ready
        if (distToPlayer < 300 && this.shootCooldown <= 0) {
            // Calculate direction to player
            const dx = player.x + player.width/2 - (this.x + this.width/2);
            const dy = player.y + player.height/2 - (this.y + this.height/2);
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Create new projectile
            this.projectiles.push({
                x: this.x + this.width/2,
                y: this.y + this.height/2,
                size: 12,
                velX: (dx / dist) * 5,
                velY: (dy / dist) * 5,
                age: 0
            });
            
            // Reset cooldown (60 frames = 1 second at 60fps)
            this.shootCooldown = 60;
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Move projectile
            proj.x += proj.velX;
            proj.y += proj.velY;
            proj.age++;
            
            // Remove if offscreen or too old
            if (proj.x < 0 || proj.x > canvas.width || 
                proj.y < 0 || proj.y > canvas.height ||
                proj.age > 180) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // Animation for Big Boi without moving up and down
        this.jumpTimer++;
        if (this.jumpTimer > 120) {
            this.jumpTimer = 0;
        }
    }
    
    updateSnake() {
        // Move along platforms
        this.x += this.direction * this.speed;
        this.timer++;
        
        // Find platform the snake is on
        let onPlatform = false;
        let currentPlatform = null;
        
        // Check all platform lines
        for (const line of lines) {
            if (line.length < 2) continue;
            
            for (let i = 0; i < line.length - 1; i++) {
                const p1 = line[i];
                const p2 = line[i + 1];
                
                // Expanded check area for better platform detection
                if (this.x + this.width/2 >= Math.min(p1.x, p2.x) - 10 && 
                    this.x + this.width/2 <= Math.max(p1.x, p2.x) + 10 &&
                    Math.abs((this.y + this.height) - Math.min(p1.y, p2.y)) < 20) {
                    
                    onPlatform = true;
                    
                    // If we're near the edge, change direction
                    if ((this.direction > 0 && this.x + this.width + 20 >= Math.max(p1.x, p2.x)) ||
                        (this.direction < 0 && this.x - 20 <= Math.min(p1.x, p2.x))) {
                        this.direction *= -1;
                    }
                    break;
                }
            }
            if (onPlatform) break;
        }
        
        // Apply gravity if not on a platform to make snake fall
        if (!onPlatform) {
            this.y += 5; // Fall down
        } else if (currentPlatform) {
            // Adjust snake height to stay on platform
            this.y = Math.min(currentPlatform.p1.y, currentPlatform.p2.y) - this.height;
        }
    }

    updateGhost() {
        this.timer++;
        this.phaseTimer++;
        
        // Phase in and out every 3 seconds
        if (this.phaseTimer > 180) {
            this.phaseTimer = 0;
            this.phaseState = this.phaseState === 'visible' ? 'invisible' : 'visible';
        }
        
        // Update alpha based on phase state
        if (this.phaseState === 'visible') {
            this.alpha = Math.min(1, this.alpha + 0.05);
        } else {
            this.alpha = Math.max(0.2, this.alpha - 0.05);
        }
        
        // Ghost moves in a figure-8 pattern
        const radius = 100;
        const speed = 0.02;
        this.x = this.x + Math.sin(this.timer * speed) * 3;
        this.y = this.y + Math.cos(this.timer * speed * 2) * 2;
    }

    updateFlowerDragon() {
        this.flowerTimer++;
        
        // Cycle between closed and open states every 3 seconds
        if (this.flowerTimer > 180) {
            this.flowerTimer = 0;
            this.flowerState = this.flowerState === 'closed' ? 'open' : 'closed';
        }
        
        // Only shoot fireballs when in open state
        if (this.flowerState === 'open') {
            this.projectileDelay++;
            
            // Shoot a fireball every 60 frames (1 second) in open state
            if (this.projectileDelay >= 60) {
                this.projectileDelay = 0;
                
                // Create fireball in random direction
                const angle = Math.random() * Math.PI * 2;
                this.projectiles.push({
                    x: this.x + this.width/2,
                    y: this.y + this.height/2,
                    size: 10,
                    velX: Math.cos(angle) * 3,
                    velY: Math.sin(angle) * 3,
                    age: 0
                });
            }
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Move projectile
            proj.x += proj.velX;
            proj.y += proj.velY;
            proj.age++;
            
            // Remove if offscreen or too old
            if (proj.x < 0 || proj.x > canvas.width || 
                proj.y < 0 || proj.y > canvas.height ||
                proj.age > 180) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    updateHugeBoi() {
        if (this.isDead) return;
        
        this.timer++;
        this.phaseTimer++;
        
        // Change attack phase every 600 frames (10 seconds)
        if (this.phaseTimer > 600) {
            this.phaseTimer = 0;
            this.attackPhase = (this.attackPhase + 1) % 3; // Cycle through 3 attack phases
            this.vulnerable = false; // Start as invulnerable
        }
        
        // Boss becomes vulnerable briefly after each attack phase
        if (this.phaseTimer > 500) {
            this.vulnerable = true;
        }
        
        // PHASE 0: Projectile Barrage
        if (this.attackPhase === 0) {
            // Shoot in 8 directions every 60 frames
            if (this.phaseTimer % 60 === 0) {
                for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                    this.projectiles.push({
                        x: this.x + this.width/2,
                        y: this.y + this.height/2,
                        size: 15,
                        velX: Math.cos(angle) * 4,
                        velY: Math.sin(angle) * 4,
                        age: 0,
                        color: '#FF3366'
                    });
                }
            }
        }
        // PHASE 1: Ground Pound
        else if (this.attackPhase === 1) {
            // Jump up and down, creating shockwaves
            const jumpHeight = 150;
            const jumpDuration = 120;
            
            if (this.phaseTimer % (jumpDuration * 2) < jumpDuration) {
                // Jump up
                this.y = this.y - jumpHeight * Math.sin(Math.PI * (this.phaseTimer % jumpDuration) / jumpDuration);
            } else if (this.phaseTimer % (jumpDuration * 2) === jumpDuration) {
                // Create shockwaves on landing
                for (let i = 0; i < 2; i++) {
                    this.projectiles.push({
                        x: this.x + this.width/2,
                        y: this.y + this.height,
                        size: 30,
                        velX: (i === 0 ? -5 : 5),
                        velY: 0,
                        age: 0,
                        color: '#FF9900',
                        isShockwave: true
                    });
                }
            }
        }
        // PHASE 2: Minion Summon
        else if (this.attackPhase === 2) {
            // Summon mini versions of other enemies
            if (this.phaseTimer % 150 === 0) {
                const minionType = [
                    enemyTypes.SPIKES_PLACER, 
                    enemyTypes.SNAKE, 
                    enemyTypes.BIG_BOI
                ][Math.floor(Math.random() * 3)];
                
                // Add mini enemy (will be handled by the game loop)
                this.spawnMinion(minionType);
            }
        }
        
        // Update all projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Move projectile
            proj.x += proj.velX;
            proj.y += proj.velY;
            proj.age++;
            
            // Grow shockwaves
            if (proj.isShockwave) {
                proj.size = 30 + proj.age / 3;
            }
            
            // Remove if offscreen or too old
            if (proj.x < -50 || proj.x > canvas.width + 50 || 
                proj.y < -50 || proj.y > canvas.height + 50 ||
                proj.age > 180) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    spawnMinion(type) {
        // This creates a reference to the minion that the game will need to handle
        // Called from the boss's update method
        const minion = new Enemy(
            type,
            this.x + this.width/2 - 20,
            this.y + this.height/2,
            40, // smaller than regular enemies
            40
        );
        enemies.push(minion);
    }
    
    draw() {
        switch(this.type) {
            case enemyTypes.SPIKES_PLACER:
                this.drawSpikesplacer();
                break;
            case enemyTypes.SNAKE:
                this.drawSnake();
                break;
            case enemyTypes.BIG_BOI:
                this.drawBigBoi();
                break;
            case enemyTypes.GHOST:
                this.drawGhost();
                break;
            case enemyTypes.FLOWER_DRAGON:
                this.drawFlowerDragon();
                break;
            case enemyTypes.HUGE_BOI:
                this.drawHugeBoi();
                break;
        }
    }

    drawSpikesplacer() {
        const pixelSize = 4;
        // Draw main body
        ctx.fillStyle = '#FF5A5A';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw eyes
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x + this.width * 0.25, this.y + this.height * 0.3, pixelSize * 2, pixelSize * 2);
        ctx.fillRect(this.x + this.width * 0.65, this.y + this.height * 0.3, pixelSize * 2, pixelSize * 2);
        
        // Draw evil smile
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height*0.6, this.width/4, 0, Math.PI, false);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = pixelSize;
        ctx.stroke();
        
        // Draw spikes on head
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#FF8A5A';
            const spikeX = this.x + this.width * (0.3 + i * 0.2);
            const spikeY = this.y;
            ctx.beginPath();
            ctx.moveTo(spikeX, spikeY);
            ctx.lineTo(spikeX - 10, spikeY - 15);
            ctx.lineTo(spikeX + 10, spikeY - 15);
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw placed spikes
        for (const spike of this.spikes) {
            ctx.fillStyle = '#FF8A5A';
            ctx.beginPath();
            ctx.moveTo(spike.x + spike.width/2, spike.y);
            ctx.lineTo(spike.x, spike.y + spike.height);
            ctx.lineTo(spike.x + spike.width, spike.y + spike.height);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawSnake() {
        const pixelSize = 4;
        
        // Draw snake body segments with smoother animation
        for (let i = 0; i < 5; i++) {
            const segmentX = this.x + (this.direction > 0 ? -i * 10 : i * 10);
            const segmentY = this.y + Math.sin((this.timer/10 + i) * 0.5) * 5;
            const segmentSize = this.width - i * 2;
            
            ctx.fillStyle = i % 2 === 0 ? '#66CC66' : '#44AA44';
            ctx.fillRect(segmentX, segmentY, segmentSize, segmentSize);
        }
        
        // Draw snake head
        const headX = this.x + (this.direction > 0 ? 0 : -10);
        ctx.fillStyle = '#88EE88';
        ctx.fillRect(headX, this.y, this.width, this.height);
        
        // Draw eyes
        ctx.fillStyle = '#333333';
        if (this.direction > 0) {
            ctx.fillRect(headX + this.width * 0.7, this.y + this.height * 0.3, pixelSize * 2, pixelSize * 2);
        } else {
            ctx.fillRect(headX + this.width * 0.1, this.y + this.height * 0.3, pixelSize * 2, pixelSize * 2);
        }
        
        // Draw tongue with animation
        const tongueExtension = Math.sin(this.timer * 0.1) * 2; // tongue animation
        ctx.fillStyle = '#FF3333';
        if (this.direction > 0) {
            ctx.fillRect(headX + this.width, this.y + this.height/2, pixelSize * 3 + tongueExtension, pixelSize);
            ctx.fillRect(headX + this.width + pixelSize * 3 + tongueExtension, this.y + this.height/2 - pixelSize, pixelSize, pixelSize);
            ctx.fillRect(headX + this.width + pixelSize * 3 + tongueExtension, this.y + this.height/2 + pixelSize, pixelSize, pixelSize);
        } else {
            ctx.fillRect(headX - pixelSize * 3 - tongueExtension, this.y + this.height/2, pixelSize * 3 + tongueExtension, pixelSize);
            ctx.fillRect(headX - pixelSize * 4 - tongueExtension, this.y + this.height/2 - pixelSize, pixelSize, pixelSize);
            ctx.fillRect(headX - pixelSize * 4 - tongueExtension, this.y + this.height/2 + pixelSize, pixelSize, pixelSize);
        }
    }

    drawBigBoi() {
        const pixelSize = 4;
        
        // Draw big body (now without rotation)
        ctx.fillStyle = '#9966FF';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw outline
        ctx.strokeStyle = '#6644CC';
        ctx.lineWidth = pixelSize;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Draw angry eyes
        ctx.fillStyle = '#FF3333';
        ctx.fillRect(this.x + this.width * 0.2, this.y + this.height * 0.3, pixelSize * 3, pixelSize * 3);
        ctx.fillRect(this.x + this.width * 0.6, this.y + this.height * 0.3, pixelSize * 3, pixelSize * 3);
        
        // Draw frowning mouth
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height*0.7, this.width/4, Math.PI, 0, false);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = pixelSize;
        ctx.stroke();
        
        // Draw spikes on shoulders
        ctx.fillStyle = '#6644CC';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(this.x + i * pixelSize * 3, this.y, pixelSize * 2, pixelSize * 4);
            ctx.fillRect(this.x + this.width - (i+1) * pixelSize * 3, this.y, pixelSize * 2, pixelSize * 4);
        }
        
        // Draw projectiles
        for (const proj of this.projectiles) {
            ctx.fillStyle = '#FF3333';
            ctx.fillRect(proj.x - proj.size/2, proj.y - proj.size/2, proj.size, proj.size);
            
            // Add a glowing effect
            ctx.fillStyle = '#FFAA33';
            ctx.fillRect(proj.x - proj.size/4, proj.y - proj.size/4, proj.size/2, proj.size/2);
        }
    }

    drawGhost() {
        const pixelSize = 4;
        
        // Save context to restore alpha later
        ctx.globalAlpha = this.alpha;
        
        // Draw ghost body
        ctx.fillStyle = '#AACCFF';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw wavy bottom
        ctx.fillStyle = '#AACCFF';
        for (let i = 0; i < 5; i++) {
            const waveOffset = Math.sin(this.timer * 0.1 + i) * 5;
            ctx.fillRect(
                this.x + (i * this.width/5), 
                this.y + this.height, 
                this.width/5, 
                pixelSize * 3 + waveOffset
            );
        }
        
        // Draw eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(this.x + this.width * 0.25, this.y + this.height * 0.3, pixelSize * 2, pixelSize * 2);
        ctx.fillRect(this.x + this.width * 0.65, this.y + this.height * 0.3, pixelSize * 2, pixelSize * 2);
        
        // Draw pupils that follow player
        const dx1 = player.x - (this.x + this.width * 0.25);
        const dy1 = player.y - (this.y + this.height * 0.3);
        const dx2 = player.x - (this.x + this.width * 0.65);
        const dy2 = player.y - (this.y + this.height * 0.3);
        
        const angle1 = Math.atan2(dy1, dx1);
        const angle2 = Math.atan2(dy2, dx2);
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(
            this.x + this.width * 0.25 + Math.cos(angle1) * 2, 
            this.y + this.height * 0.3 + Math.sin(angle1) * 2, 
            pixelSize, pixelSize
        );
        ctx.fillRect(
            this.x + this.width * 0.65 + Math.cos(angle2) * 2, 
            this.y + this.height * 0.3 + Math.sin(angle2) * 2, 
            pixelSize, pixelSize
        );
        
        // Draw mouth
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(
            this.x + this.width/2, 
            this.y + this.height * 0.6, 
            this.width/5, 
            0, Math.PI, false
        );
        ctx.fill();
        
        // Restore alpha
        ctx.globalAlpha = 1;
    }

    drawFlowerDragon() {
        const pixelSize = 4;
        
        // Draw stem
        ctx.fillStyle = '#22AA55';
        ctx.fillRect(this.x + this.width/2 - pixelSize, this.y + this.height/2, pixelSize*2, this.height/2);
        
        // Draw flower/dragon head
        if (this.flowerState === 'closed') {
            // Closed flower state
            ctx.fillStyle = '#FF5599';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/3, this.width/2.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner part
            ctx.fillStyle = '#FFAACC';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/3, this.width/4, 0, Math.PI * 2);
            ctx.fill();
            
            // Closed eyes
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x + this.width/3, this.y + this.height/4, pixelSize*2, pixelSize);
            ctx.fillRect(this.x + this.width*2/3 - pixelSize*2, this.y + this.height/4, pixelSize*2, pixelSize);
        } else {
            // Open dragon state
            // Dragon head
            ctx.fillStyle = '#FF3366';
            ctx.fillRect(this.x, this.y, this.width, this.height/2);
            
            // Eyes
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(this.x + this.width/4, this.y + this.height/6, pixelSize*2, pixelSize*2);
            ctx.fillRect(this.x + this.width*3/4 - pixelSize*2, this.y + this.height/6, pixelSize*2, pixelSize*2);
            
            // Pupils
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x + this.width/4 + pixelSize/2, this.y + this.height/6 + pixelSize/2, pixelSize, pixelSize);
            ctx.fillRect(this.x + this.width*3/4 - pixelSize*3/2, this.y + this.height/6 + pixelSize/2, pixelSize, pixelSize);
            
            // Open mouth with teeth
            ctx.fillStyle = '#990033';
            ctx.fillRect(this.x + this.width/4, this.y + this.height/3, this.width/2, this.height/6);
            
            // Teeth
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 3; i++) {
                // Top teeth
                ctx.fillRect(this.x + this.width/4 + i*pixelSize*3, this.y + this.height/3, pixelSize*2, pixelSize*2);
                // Bottom teeth
                ctx.fillRect(this.x + this.width/4 + i*pixelSize*3 + pixelSize, this.y + this.height/3 + pixelSize*2, pixelSize*2, pixelSize*2);
            }
        }
        
        // Draw leaves
        ctx.fillStyle = '#33CC66';
        ctx.fillRect(this.x + this.width/2 - this.width/4, this.y + this.height*2/3, pixelSize*3, pixelSize*3);
        ctx.fillRect(this.x + this.width/2 + this.width/4 - pixelSize*3, this.y + this.height*2/3 + pixelSize*2, pixelSize*3, pixelSize*3);
        
        // Draw projectiles/fireballs
        for (const proj of this.projectiles) {
            // Fire gradient effect
            const gradient = ctx.createRadialGradient(
                proj.x, proj.y, 0,
                proj.x, proj.y, proj.size
            );
            gradient.addColorStop(0, '#FFFF00');
            gradient.addColorStop(0.6, '#FF6600');
            gradient.addColorStop(1, '#CC3300');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawHugeBoi() {
        if (this.isDead) return;
        
        const pixelSize = 8; // Larger pixels for the boss
        
        // Boss body with vulnerability state
        ctx.fillStyle = this.vulnerable ? '#FF66FF' : '#9933CC';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw outline
        ctx.strokeStyle = '#FF33CC';
        ctx.lineWidth = pixelSize;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Draw glowing red eyes
        const eyeSize = pixelSize * 6;
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x + this.width * 0.2, this.y + this.height * 0.3, eyeSize, eyeSize);
        ctx.fillRect(this.x + this.width * 0.7, this.y + this.height * 0.3, eyeSize, eyeSize);
        
        // Add glow to eyes
        const eyeGlow = ctx.createRadialGradient(
            this.x + this.width * 0.2 + eyeSize/2, this.y + this.height * 0.3 + eyeSize/2, 0,
            this.x + this.width * 0.2 + eyeSize/2, this.y + this.height * 0.3 + eyeSize/2, eyeSize
        );
        eyeGlow.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
        eyeGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = eyeGlow;
        ctx.fillRect(this.x + this.width * 0.2 - eyeSize/2, this.y + this.height * 0.3 - eyeSize/2, eyeSize*2, eyeSize*2);
        
        const eyeGlow2 = ctx.createRadialGradient(
            this.x + this.width * 0.7 + eyeSize/2, this.y + this.height * 0.3 + eyeSize/2, 0,
            this.x + this.width * 0.7 + eyeSize/2, this.y + this.height * 0.3 + eyeSize/2, eyeSize
        );
        eyeGlow2.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
        eyeGlow2.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = eyeGlow2;
        ctx.fillRect(this.x + this.width * 0.7 - eyeSize/2, this.y + this.height * 0.3 - eyeSize/2, eyeSize*2, eyeSize*2);
        
        // Draw angry mouth that changes with phases
        ctx.fillStyle = '#CC0000';
        
        if (this.attackPhase === 0) {
            // Open wide mouth for projectile attack
            ctx.fillRect(this.x + this.width * 0.3, this.y + this.height * 0.7, this.width * 0.4, this.height * 0.15);
        } else if (this.attackPhase === 1) {
            // Grimacing mouth for ground pound
            ctx.fillRect(this.x + this.width * 0.3, this.y + this.height * 0.75, this.width * 0.4, this.height * 0.05);
            // Teeth for grimace
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(this.x + this.width * (0.3 + i * 0.1), this.y + this.height * 0.75, pixelSize, pixelSize * 2);
            }
        } else {
            // Smiling mouth for summon phase
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height*0.7, this.width/6, 0, Math.PI, false);
            ctx.fill();
            // Teeth
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(this.x + this.width * (0.4 + i * 0.1), this.y + this.height * 0.65, pixelSize, pixelSize * 2);
            }
        }
        
        // Decorative spikes on head
        ctx.fillStyle = '#FF33CC';
        for (let i = 0; i < 5; i++) {
            const spikeHeight = pixelSize * (6 + Math.sin(this.timer * 0.05 + i) * 2);
            ctx.fillRect(
                this.x + this.width * (0.1 + i * 0.2), 
                this.y, 
                pixelSize * 3, 
                -spikeHeight
            );
        }
        
        // Draw projectiles
        for (const proj of this.projectiles) {
            if (proj.isShockwave) {
                // Draw shockwave
                ctx.fillStyle = proj.color;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Regular projectile
                ctx.fillStyle = proj.color;
                ctx.fillRect(proj.x - proj.size/2, proj.y - proj.size/2, proj.size, proj.size);
                
                // Add glow
                const projGlow = ctx.createRadialGradient(
                    proj.x, proj.y, 0,
                    proj.x, proj.y, proj.size
                );
                projGlow.addColorStop(0, proj.color);
                projGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = projGlow;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, proj.size*1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw health bar above boss
        this.drawHealthBar();
    }
    
    drawHealthBar() {
        const barWidth = this.width * 1.2;
        const barHeight = 15;
        const barX = this.x + (this.width - barWidth) / 2;
        const barY = this.y - 30;
        
        // Health bar background
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health bar fill
        const healthPercentage = this.health / 100;
        let healthColor = '#00FF00';
        
        if (healthPercentage < 0.6) {
            healthColor = '#FFFF00';
        }
        if (healthPercentage < 0.3) {
            healthColor = '#FF0000';
        }
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
        
        // Health bar border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    stayOnPlatform() {
        let onPlatform = false;
        let platformEdge = null;
        
        // Check all platform lines
        for (const line of lines) {
            if (line.length < 2) continue;
            
            for (let i = 0; i < line.length - 1; i++) {
                const p1 = line[i];
                const p2 = line[i + 1];
                
                // Check if enemy is on this platform
                if (this.x + this.width/2 >= Math.min(p1.x, p2.x) - 20 && 
                    this.x + this.width/2 <= Math.max(p1.x, p2.x) + 20 &&
                    Math.abs((this.y + this.height) - Math.min(p1.y, p2.y)) < 30) {
                    
                    onPlatform = true;
                    
                    // Check if about to walk off edge
                    if ((this.direction > 0 && this.x + this.width + 10 >= Math.max(p1.x, p2.x)) ||
                        (this.direction < 0 && this.x - 10 <= Math.min(p1.x, p2.x))) {
                        this.direction *= -1;
                    }
                    break;
                }
            }
            if (onPlatform) break;
        }
        
        // Apply gravity if not on a platform to make enemy fall
        if (!onPlatform) {
            this.y += 5; // Fall down
        }
    }
}

// Create enemies for a level
function createEnemies(level) {
    enemies = [];
    
    if (level.enemies) {
        level.enemies.forEach(enemyConfig => {
            enemies.push(new Enemy(
                enemyConfig.type,
                enemyConfig.x,
                enemyConfig.y,
                enemyConfig.width || 40,
                enemyConfig.height || 40
            ));
        });
    }
}

// Physics constants
const gravity = 0.5;
const friction = 0.8;

// Level designs
const levels = [
    // Level 1 - Simple introduction
    {
        playerStart: { x: 100, y: 500 },
        goalPosition: { x: 700, y: 100 },
        backgroundColor: '#5B81BD',
        platformColor: '#4A6835',
        predefinedPlatforms: [
            [{ x: 50, y: 550 }, { x: 350, y: 550 }], 
            [{ x: 500, y: 450 }, { x: 800, y: 450 }] 
        ],
        walls: [
            { x: 350, y: 300, width: 30, height: 300, color: '#854C30' }
        ],
        enemies: [
            { type: enemyTypes.SPIKES_PLACER, x: 600, y: 400, width: 40, height: 40 }
        ],
        instruction: "Draw platforms to help the character reach the star! Get over the wall and avoid enemies!"
    },
    // Level 2 - Slightly more challenging
    {
        playerStart: { x: 100, y: 500 },
        goalPosition: { x: 750, y: 150 },
        backgroundColor: '#4A6885',
        platformColor: '#4A6835',
        predefinedPlatforms: [
            [{ x: 50, y: 550 }, { x: 350, y: 550 }], 
            [{ x: 450, y: 400 }, { x: 650, y: 400 }], 
            [{ x: 700, y: 200 }, { x: 850, y: 200 }]  
        ],
        walls: [
            { x: 350, y: 250, width: 30, height: 350, color: '#854C30' }
        ],
        enemies: [
            { type: enemyTypes.SNAKE, x: 500, y: 360, width: 40, height: 30 }
        ],
        instruction: "Practice drawing slopes and platforms to get past the wall! Watch out for the snake!"
    },
    // Level 3 - Vertical challenge
    {
        playerStart: { x: 100, y: 500 },
        goalPosition: { x: 400, y: 80 },
        backgroundColor: '#3A5265',
        platformColor: '#4A6835',
        predefinedPlatforms: [
            [{ x: 50, y: 550 }, { x: 350, y: 550 }],  
            [{ x: 500, y: 350 }, { x: 700, y: 350 }], 
            [{ x: 200, y: 150 }, { x: 450, y: 150 }]  
        ],
        walls: [
            { x: 300, y: 200, width: 30, height: 400, color: '#854C30' }
        ],
        enemies: [
            { type: enemyTypes.BIG_BOI, x: 600, y: 300, width: 60, height: 50 },
            { type: enemyTypes.SPIKES_PLACER, x: 100, y: 100, width: 40, height: 40 }
        ],
        instruction: "Try to reach higher ground! Get over the tall wall and avoid the Big Boi!"
    },
    // Level 4 - Gap challenge
    {
        playerStart: { x: 80, y: 400 },
        goalPosition: { x: 750, y: 400 },
        backgroundColor: '#2C405E',
        platformColor: '#4A6835',
        predefinedPlatforms: [
            [{ x: 50, y: 450 }, { x: 300, y: 450 }],  
            [{ x: 600, y: 450 }, { x: 850, y: 450 }]  
        ],
        walls: [
            { x: 350, y: 300, width: 30, height: 200, color: '#854C30' },
            { x: 500, y: 200, width: 30, height: 300, color: '#854C30' }
        ],
        enemies: [
            { type: enemyTypes.SNAKE, x: 150, y: 410, width: 40, height: 30 },
            { type: enemyTypes.SPIKES_PLACER, x: 650, y: 400, width: 40, height: 40 }
        ],
        instruction: "Bridge the gap and get past multiple walls to reach the star! Mind the enemies!"
    },
    // Level 5 - Final challenge
    {
        playerStart: { x: 100, y: 550 },
        goalPosition: { x: 750, y: 100 },
        backgroundColor: '#152642',
        platformColor: '#4A6835',
        predefinedPlatforms: [
            [{ x: 50, y: 600 }, { x: 300, y: 600 }],  
            [{ x: 300, y: 500 }, { x: 450, y: 500 }], 
            [{ x: 600, y: 300 }, { x: 850, y: 300 }], 
            [{ x: 650, y: 150 }, { x: 800, y: 150 }]  
        ],
        walls: [
            { x: 250, y: 400, width: 30, height: 200, color: '#854C30' },
            { x: 450, y: 150, width: 30, height: 450, color: '#854C30' },
            { x: 650, y: 350, width: 30, height: 250, color: '#854C30' }
        ],
        enemies: [
            { type: enemyTypes.BIG_BOI, x: 200, y: 450, width: 60, height: 50 },
            { type: enemyTypes.SNAKE, x: 350, y: 460, width: 40, height: 30 },
            { type: enemyTypes.SPIKES_PLACER, x: 700, y: 250, width: 40, height: 40 }
        ],
        instruction: "Final challenge! Get past all walls and enemies to reach the golden star!"
    },
    // Level 6 - Cyan themed with pipes and ghosts
    {
        playerStart: { x: 80, y: 550 },
        goalPosition: { x: 800, y: 550 },
        backgroundColor: '#0FB6CC', 
        platformColor: '#097A88', 
        predefinedPlatforms: [
            [{ x: 50, y: 600 }, { x: 200, y: 600 }],
            [{ x: 750, y: 600 }, { x: 900, y: 600 }],
            [{ x: 400, y: 400 }, { x: 600, y: 400 }]
        ],
        walls: [
            { x: 300, y: 450, width: 30, height: 200, color: '#088A8A' }, 
            { x: 400, y: 300, width: 30, height: 350, color: '#088A8A' },
            { x: 500, y: 150, width: 30, height: 500, color: '#088A8A' },
            { x: 600, y: 300, width: 30, height: 350, color: '#088A8A' }
        ],
        pipes: [ 
            { x: 250, y: 520, width: 50, height: 80, rotation: 0 },
            { x: 350, y: 200, width: 50, height: 100, rotation: 90 },
            { x: 550, y: 100, width: 50, height: 150, rotation: 0 },
            { x: 700, y: 350, width: 50, height: 120, rotation: 90 }
        ],
        enemies: [
            { type: enemyTypes.GHOST, x: 150, y: 400, width: 40, height: 40 },
            { type: enemyTypes.GHOST, x: 450, y: 300, width: 40, height: 40 },
            { type: enemyTypes.GHOST, x: 650, y: 200, width: 40, height: 40 },
            { type: enemyTypes.FLOWER_DRAGON, x: 500, y: 350, width: 50, height: 50 }
        ],
        instruction: "Watch out for the ghosts and the new Flower Dragon! Navigate through the pipes to reach the star!"
    },
    // Level 7 - Vertical maze
    {
        playerStart: { x: 100, y: 550 },
        goalPosition: { x: 400, y: 50 },
        backgroundColor: '#1A2C3F',
        platformColor: '#4A6835',
        predefinedPlatforms: [
            [{ x: 50, y: 600 }, { x: 200, y: 600 }],
            [{ x: 500, y: 500 }, { x: 650, y: 500 }],
            [{ x: 200, y: 400 }, { x: 350, y: 400 }],
            [{ x: 500, y: 300 }, { x: 650, y: 300 }],
            [{ x: 200, y: 200 }, { x: 350, y: 200 }],
            [{ x: 350, y: 100 }, { x: 500, y: 100 }]
        ],
        walls: [
            { x: 250, y: 450, width: 350, height: 30, color: '#854C30' },
            { x: 200, y: 250, width: 450, height: 30, color: '#854C30' },
            { x: 400, y: 150, width: 30, height: 300, color: '#854C30' }
        ],
        enemies: [
            { type: enemyTypes.SPIKES_PLACER, x: 550, y: 250, width: 40, height: 40 },
            { type: enemyTypes.SNAKE, x: 300, y: 160, width: 40, height: 30 },
            { type: enemyTypes.BIG_BOI, x: 550, y: 450, width: 60, height: 50 }
        ],
        instruction: "Climb the vertical maze! Beware of the enemies guarding each level!"
    },
    // Level 8 - Gauntlet run
    {
        playerStart: { x: 80, y: 550 },
        goalPosition: { x: 850, y: 550 },
        backgroundColor: '#2A1C3E',
        platformColor: '#4A6835',
        predefinedPlatforms: [
            [{ x: 50, y: 600 }, { x: 900, y: 600 }]
        ],
        walls: [
            { x: 200, y: 400, width: 30, height: 200, color: '#854C30' },
            { x: 350, y: 300, width: 30, height: 300, color: '#854C30' },
            { x: 500, y: 200, width: 30, height: 400, color: '#854C30' },
            { x: 650, y: 300, width: 30, height: 300, color: '#854C30' },
            { x: 800, y: 400, width: 30, height: 200, color: '#854C30' }
        ],
        enemies: [
            { type: enemyTypes.SPIKES_PLACER, x: 150, y: 550, width: 40, height: 40 },
            { type: enemyTypes.SPIKES_PLACER, x: 400, y: 550, width: 40, height: 40 },
            { type: enemyTypes.SPIKES_PLACER, x: 650, y: 550, width: 40, height: 40 },
            { type: enemyTypes.BIG_BOI, x: 250, y: 500, width: 60, height: 50 },
            { type: enemyTypes.BIG_BOI, x: 550, y: 500, width: 60, height: 50 },
            { type: enemyTypes.SNAKE, x: 300, y: 560, width: 40, height: 30 },
            { type: enemyTypes.SNAKE, x: 700, y: 560, width: 40, height: 30 }
        ],
        instruction: "Run the gauntlet! Draw platforms to overcome a series of challenges filled with enemies!"
    },
    // Level 9 - Platforming paradise
    {
        playerStart: { x: 100, y: 550 },
        goalPosition: { x: 850, y: 150 },
        backgroundColor: '#3E1F3C',
        platformColor: '#4A6835',
        predefinedPlatforms: [
            [{ x: 50, y: 600 }, { x: 200, y: 600 }],
            [{ x: 200, y: 500 }, { x: 300, y: 450 }],
            [{ x: 400, y: 450 }, { x: 500, y: 450 }],
            [{ x: 600, y: 350 }, { x: 700, y: 350 }],
            [{ x: 800, y: 250 }, { x: 900, y: 200 }]
        ],
        walls: [
            { x: 350, y: 450, width: 50, height: 30, color: '#854C30' },
            { x: 550, y: 350, width: 50, height: 30, color: '#854C30' },
            { x: 750, y: 250, width: 50, height: 30, color: '#854C30' }
        ],
        enemies: [
            { type: enemyTypes.SNAKE, x: 450, y: 410, width: 40, height: 30 },
            { type: enemyTypes.BIG_BOI, x: 650, y: 300, width: 60, height: 50 },
            { type: enemyTypes.SPIKES_PLACER, x: 850, y: 150, width: 40, height: 40 }
        ],
        instruction: "Master precision platforming! Draw bridges to complete the ascending path to the star!"
    },
    // Level 10 - The final showdown
    {
        playerStart: { x: 100, y: 550 },
        goalPosition: { x: 850, y: 100 },
        backgroundColor: '#1E0F2C',
        platformColor: '#4A6835',
        predefinedPlatforms: [
            [{ x: 50, y: 600 }, { x: 200, y: 600 }],
            [{ x: 750, y: 150 }, { x: 900, y: 150 }]
        ],
        walls: [
            { x: 300, y: 0, width: 30, height: 400, color: '#854C30' },
            { x: 500, y: 200, width: 30, height: 450, color: '#854C30' },
            { x: 700, y: 0, width: 30, height: 400, color: '#854C30' }
        ],
        enemies: [
            { type: enemyTypes.BIG_BOI, x: 200, y: 450, width: 80, height: 70 }, 
            { type: enemyTypes.BIG_BOI, x: 600, y: 400, width: 80, height: 70 }, 
            { type: enemyTypes.SPIKES_PLACER, x: 400, y: 300, width: 40, height: 40 },
            { type: enemyTypes.SPIKES_PLACER, x: 600, y: 200, width: 40, height: 40 },
            { type: enemyTypes.SNAKE, x: 350, y: 500, width: 50, height: 40 },
            { type: enemyTypes.SNAKE, x: 650, y: 300, width: 50, height: 40 }
        ],
        instruction: "The final showdown! Overcome all the enemies and reach the star to complete your journey!"
    },
    // Level 11 - Boss Level
    {
        playerStart: { x: 100, y: 500 },
        goalPosition: { x: 800, y: 100 },
        backgroundColor: '#1A0520',
        platformColor: '#4A3568',
        predefinedPlatforms: [
            [{ x: 50, y: 550 }, { x: 950, y: 550 }],
            [{ x: 200, y: 400 }, { x: 400, y: 400 }],
            [{ x: 600, y: 400 }, { x: 800, y: 400 }],
            [{ x: 400, y: 250 }, { x: 600, y: 250 }],
            [{ x: 750, y: 150 }, { x: 950, y: 150 }]
        ],
        walls: [
            { x: 0, y: 0, width: 20, height: 600, color: '#330033' },
            { x: 980, y: 0, width: 20, height: 600, color: '#330033' }
        ],
        enemies: [
            { type: enemyTypes.HUGE_BOI, x: 400, y: 350, width: 200, height: 200 }
        ],
        instruction: "BOSS FIGHT! Defeat the HUGE BOI by attacking when he's vulnerable (pink). Avoid his attacks and reach the star!"
    }
];

// Load level
function loadLevel(levelNum) {
    // Reset level completion
    levelCompleted = false;
    
    // Reset ink amount for the new level
    currentInk = inkAmount;
    updateInkMeter();
    
    // Get level data
    const levelIndex = levelNum - 1;
    const level = levels[levelIndex];
    
    // Set player position
    player.x = level.playerStart.x;
    player.y = level.playerStart.y;
    player.velX = 0;
    player.velY = 0;
    
    // Set goal position
    goal.x = level.goalPosition.x;
    goal.y = level.goalPosition.y;
    
    // Load predefined platforms
    lines = [...level.predefinedPlatforms];
    
    // Create walls and pipes for the level
    createWalls(level.walls);
    
    // Create enemies for the level
    createEnemies(level);
    
    // Update instruction
    document.getElementById('instructions').innerHTML = `
        <p>Level ${levelNum}: ${level.instruction}</p>
        <p>Controls: WASD or Arrow Keys to move</p>
    `;
    
    // Update level indicator
    document.getElementById('level-indicator').textContent = `Level: ${levelNum}/${maxLevel}`;
}

// Create walls and pipes for the current level
function createWalls(walls) {
    // First remove any existing walls and pipes
    const existingElements = document.querySelectorAll('.wall, .pipe');
    existingElements.forEach(element => element.remove());
    
    // Create new walls
    walls.forEach(wall => {
        const wallElement = document.createElement('div');
        wallElement.className = 'wall';
        wallElement.style.left = `${wall.x}px`;
        wallElement.style.top = `${wall.y}px`;
        wallElement.style.width = `${wall.width}px`;
        wallElement.style.height = `${wall.height}px`;
        wallElement.style.backgroundColor = wall.color || '#854C30';
        document.body.appendChild(wallElement);
    });
    
    // Create pipes for level 6
    const levelIndex = currentLevel - 1;
    const level = levels[levelIndex];
    
    if (level.pipes) {
        level.pipes.forEach(pipe => {
            const pipeElement = document.createElement('div');
            pipeElement.className = 'pipe';
            pipeElement.style.left = `${pipe.x}px`;
            pipeElement.style.top = `${pipe.y}px`;
            pipeElement.style.width = `${pipe.width}px`;
            pipeElement.style.height = `${pipe.height}px`;
            
            if (pipe.rotation) {
                pipeElement.style.transform = `rotate(${pipe.rotation}deg)`;
                // Adjust position for rotated pipes
                if (pipe.rotation === 90) {
                    pipeElement.style.transformOrigin = 'top left';
                }
            }
            
            document.body.appendChild(pipeElement);
        });
    }
}

// Setup level completion message
function setupLevelCompletionMessage() {
    const completionMessage = document.createElement('div');
    completionMessage.id = 'completion-message';
    
    completionMessage.innerHTML = `
        <h2>Level Complete!</h2>
        <p>Great job reaching the star!</p>
        <button id="next-level-btn">Next Level</button>
    `;
    
    document.body.appendChild(completionMessage);
    
    document.getElementById('next-level-btn').addEventListener('click', () => {
        document.getElementById('completion-message').style.display = 'none';
        
        if (currentLevel < maxLevel) {
            currentLevel++;
            loadLevel(currentLevel);
        } else {
            // Game completed
            document.getElementById('completion-message').innerHTML = `
                <h2>Congratulations!</h2>
                <p>You've completed all levels!</p>
                <button id="restart-game-btn">Play Again</button>
            `;
            document.getElementById('completion-message').style.display = 'block';
            
            document.getElementById('restart-game-btn').addEventListener('click', () => {
                document.getElementById('completion-message').style.display = 'none';
                currentLevel = 1;
                loadLevel(currentLevel);
            });
        }
    });
}

// Create level indicator
function createLevelIndicator() {
    const levelIndicator = document.createElement('div');
    levelIndicator.id = 'level-indicator';
    levelIndicator.textContent = `Level: ${currentLevel}/${maxLevel}`;
    document.body.appendChild(levelIndicator);
}

// Create ink meter UI
function createInkMeter() {
    const inkMeterContainer = document.createElement('div');
    inkMeterContainer.id = 'ink-meter-container';
    
    const inkMeterLabel = document.createElement('div');
    inkMeterLabel.id = 'ink-meter-label';
    inkMeterLabel.textContent = 'INK:';
    
    const inkMeter = document.createElement('div');
    inkMeter.id = 'ink-meter';
    
    const inkLevel = document.createElement('div');
    inkLevel.id = 'ink-level';
    
    inkMeter.appendChild(inkLevel);
    inkMeterContainer.appendChild(inkMeterLabel);
    inkMeterContainer.appendChild(inkMeter);
    
    document.body.appendChild(inkMeterContainer);
    updateInkMeter();
}

// Update ink meter display
function updateInkMeter() {
    const inkPercentage = (currentInk / inkAmount) * 100;
    document.getElementById('ink-level').style.width = `${inkPercentage}%`;
    
    // Change color based on remaining ink
    if (inkPercentage < 30) {
        document.getElementById('ink-level').style.backgroundColor = '#FF5555';
    } else if (inkPercentage < 60) {
        document.getElementById('ink-level').style.backgroundColor = '#FFFF55';
    } else {
        document.getElementById('ink-level').style.backgroundColor = '#5EFF72';
    }
}

// Check for collision with enemies
function checkEnemyCollision() {
    for (const enemy of enemies) {
        // Skip ghost collision when it's nearly invisible
        if (enemy.type === enemyTypes.GHOST && enemy.alpha < 0.4) continue;
        
        // For HUGE_BOI, handle damage to boss
        if (enemy.type === enemyTypes.HUGE_BOI && enemy.vulnerable) {
            // If player bounces on top of vulnerable boss
            if (player.velY > 0 && 
                player.x + player.width > enemy.x + enemy.width * 0.1 && 
                player.x < enemy.x + enemy.width * 0.9 &&
                player.y + player.height > enemy.y && 
                player.y + player.height < enemy.y + enemy.height * 0.3) {
                
                // Bounce player up
                player.velY = -player.jumpForce;
                player.isJumping = true;
                
                // Damage boss
                enemy.health -= 10;
                
                // Create damage effect
                enemy.timer = 0; // Reset timer for visual effect
                
                // Check if boss is defeated
                if (enemy.health <= 0) {
                    enemy.isDead = true;
                    enemy.health = 0;
                    
                    // Make star appear
                    goal.x = enemy.x + enemy.width/2 - goal.width/2;
                    goal.y = enemy.y - goal.height - 20;
                }
                
                // Skip other collision checks for this enemy
                continue;
            }
        }
        
        // Regular enemy collision
        // Check collision with enemy body
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            // Don't reset for dead boss
            if (enemy.type === enemyTypes.HUGE_BOI && enemy.isDead) {
                continue;
            }
            
            // Reset player position
            const levelIndex = currentLevel - 1;
            player.x = levels[levelIndex].playerStart.x;
            player.y = levels[levelIndex].playerStart.y;
            player.velX = 0;
            player.velY = 0;
            break;
        }
        
        // For spikes placer, check collision with its spikes
        if (enemy.type === enemyTypes.SPIKES_PLACER) {
            for (const spike of enemy.spikes) {
                if (
                    player.x < spike.x + spike.width &&
                    player.x + player.width > spike.x &&
                    player.y < spike.y + spike.height &&
                    player.y + player.height > spike.y
                ) {
                    // Reset player position
                    const levelIndex = currentLevel - 1;
                    player.x = levels[levelIndex].playerStart.x;
                    player.y = levels[levelIndex].playerStart.y;
                    player.velX = 0;
                    player.velY = 0;
                    break;
                }
            }
        }
        
        // For big boi, check collision with projectiles
        if (enemy.type === enemyTypes.BIG_BOI) {
            for (const proj of enemy.projectiles) {
                if (
                    player.x < proj.x + proj.size &&
                    player.x + player.width > proj.x - proj.size &&
                    player.y < proj.y + proj.size &&
                    player.y + player.height > proj.y - proj.size
                ) {
                    // Reset player position
                    const levelIndex = currentLevel - 1;
                    player.x = levels[levelIndex].playerStart.x;
                    player.y = levels[levelIndex].playerStart.y;
                    player.velX = 0;
                    player.velY = 0;
                    break;
                }
            }
        }
        
        // For flower dragon, check collision with projectiles
        if (enemy.type === enemyTypes.FLOWER_DRAGON) {
            for (const proj of enemy.projectiles) {
                if (
                    player.x < proj.x + proj.size &&
                    player.x + player.width > proj.x - proj.size &&
                    player.y < proj.y + proj.size &&
                    player.y + player.height > proj.y - proj.size
                ) {
                    // Reset player position
                    const levelIndex = currentLevel - 1;
                    player.x = levels[levelIndex].playerStart.x;
                    player.y = levels[levelIndex].playerStart.y;
                    player.velX = 0;
                    player.velY = 0;
                    break;
                }
            }
        }
        
        // For HUGE_BOI, check collision with projectiles
        if (enemy.type === enemyTypes.HUGE_BOI) {
            for (const proj of enemy.projectiles) {
                // Skip shockwaves that are just starting
                if (proj.isShockwave && proj.age < 10) continue;
                
                if (
                    player.x < proj.x + proj.size &&
                    player.x + player.width > proj.x - proj.size &&
                    player.y < proj.y + proj.size &&
                    player.y + player.height > proj.y - proj.size
                ) {
                    // Reset player position
                    const levelIndex = currentLevel - 1;
                    player.x = levels[levelIndex].playerStart.x;
                    player.y = levels[levelIndex].playerStart.y;
                    player.velX = 0;
                    player.velY = 0;
                    break;
                }
            }
        }
    }
}

// Game controls
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Check controls
function handleControls() {
    // Left movement
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || leftPressed) {
        player.velX = -player.speed;
    }
    
    // Right movement
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || rightPressed) {
        player.velX = player.speed;
    }
    
    // Jump
    if ((keys['ArrowUp'] || keys['w'] || keys['W'] || jumpPressed) && !player.isJumping) {
        player.velY = -player.jumpForce;
        player.isJumping = true;
    }
    
    // Apply friction
    player.velX *= friction;
}

// Collision detection
function checkCollision() {
    player.isJumping = true;
    
    // Check collision with drawn lines
    for (const line of lines) {
        if (line.length < 2) continue;
        
        for (let i = 0; i < line.length - 1; i++) {
            const p1 = line[i];
            const p2 = line[i + 1];
            
            // Calculate line thickness offset (half the line width)
            const lineWidth = line.thickness || lineThickness; 
            const halfLineWidth = lineWidth / 2;
            
            // Create a "thick line" collision box
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);
            
            // Points for the four corners of the thick line segment
            const topLeft = {x: p1.x - halfLineWidth * sin, y: p1.y + halfLineWidth * cos};
            const topRight = {x: p2.x - halfLineWidth * sin, y: p2.y + halfLineWidth * cos};
            const bottomLeft = {x: p1.x + halfLineWidth * sin, y: p1.y - halfLineWidth * cos};
            const bottomRight = {x: p2.x + halfLineWidth * sin, y: p2.y - halfLineWidth * cos};
            
            // Check if player is colliding with this thick line segment
            if (isRectIntersectingPolygon(
                player.x, player.y, player.width, player.height,
                [topLeft, topRight, bottomRight, bottomLeft]
            )) {
                // Calculate player center and segment center
                const playerCenterX = player.x + player.width / 2;
                const playerCenterY = player.y + player.height / 2;
                const segmentCenterX = (p1.x + p2.x) / 2;
                const segmentCenterY = (p1.y + p2.y) / 2;
                
                // Calculate direction vector from segment to player
                const dirX = playerCenterX - segmentCenterX;
                const dirY = playerCenterY - segmentCenterY;
                
                // Normalize direction vector
                const length = Math.sqrt(dirX * dirX + dirY * dirY);
                const normDirX = dirX / length;
                const normDirY = dirY / length;
                
                // Calculate dot product with normal vectors
                const dotWithVertical = Math.abs(normDirY);
                const dotWithHorizontal = Math.abs(normDirX);
                
                // Bottom collision (landing on platform)
                if (player.velY > 0 && dotWithVertical > 0.7 && normDirY < 0) {
                    player.y = Math.min(topLeft.y, topRight.y) - player.height;
                    player.velY = 0;
                    player.isJumping = false;
                }
                // Top collision (hitting head on platform)
                else if (player.velY < 0 && dotWithVertical > 0.7 && normDirY > 0) {
                    player.y = Math.max(bottomLeft.y, bottomRight.y);
                    player.velY = 0;
                }
                // Left collision
                else if (player.velX > 0 && dotWithHorizontal > 0.7 && normDirX < 0) {
                    player.x = Math.min(topLeft.x, bottomLeft.x) - player.width;
                    player.velX = 0;
                }
                // Right collision
                else if (player.velX < 0 && dotWithHorizontal > 0.7 && normDirX > 0) {
                    player.x = Math.max(topRight.x, bottomRight.x);
                    player.velX = 0;
                }
                // For diagonal platforms with no clear direction, prioritize landing
                else if (player.velY > 0) {
                    player.y = Math.min(topLeft.y, topRight.y) - player.height;
                    player.velY = 0;
                    player.isJumping = false;
                }
            }
        }
    }
    
    // Check collision with walls
    const walls = document.querySelectorAll('.wall');
    walls.forEach(wallElement => {
        const wall = {
            x: parseInt(wallElement.style.left),
            y: parseInt(wallElement.style.top),
            width: parseInt(wallElement.style.width),
            height: parseInt(wallElement.style.height)
        };
        
        if (
            player.x < wall.x + wall.width &&
            player.x + player.width > wall.x &&
            player.y < wall.y + wall.height &&
            player.y + player.height > wall.y
        ) {
            // Left collision
            if (player.x + player.width - wall.x < 10 && player.velX > 0) {
                player.x = wall.x - player.width;
                player.velX = 0;
            }
            // Right collision
            else if (wall.x + wall.width - player.x < 10 && player.velX < 0) {
                player.x = wall.x + wall.width;
                player.velX = 0;
            }
            // Top collision
            else if (player.y + player.height - wall.y < 10 && player.velY > 0) {
                player.y = wall.y - player.height;
                player.velY = 0;
                player.isJumping = false;
            }
            // Bottom collision
            else if (wall.y + wall.height - player.y < 10 && player.velY < 0) {
                player.y = wall.y + wall.height;
                player.velY = 0;
            }
        }
    });
    
    // Screen boundaries
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
    if (player.y < 0) {
        player.y = 0;
        player.velY = 0;
    }
    if (player.y + player.height > canvas.height) {
        // Reset player position when touching the ground
        const levelIndex = currentLevel - 1;
        player.x = levels[levelIndex].playerStart.x;
        player.y = levels[levelIndex].playerStart.y;
        player.velX = 0;
        player.velY = 0;
    }
}

// Helper function to check if a rectangle intersects with a polygon
function isRectIntersectingPolygon(
    rx, ry, rw, rh,
    points
) {
    // Check if any point of the rectangle is inside the polygon
    const rectPoints = [
        {x: rx, y: ry},
        {x: rx + rw, y: ry},
        {x: rx + rw, y: ry + rh},
        {x: rx, y: ry + rh}
    ];
    
    // Check if any rect point is inside the polygon
    for (const point of rectPoints) {
        if (isPointInPolygon(point, points)) {
            return true;
        }
    }
    
    // Check if any polygon edge intersects with any rectangle edge
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        
        // Check against all rect edges
        if (
            lineCollision(p1.x, p1.y, p2.x, p2.y, rx, ry, rx + rw, ry) ||
            lineCollision(p1.x, p1.y, p2.x, p2.y, rx + rw, ry, rx + rw, ry + rh) ||
            lineCollision(p1.x, p1.y, p2.x, p2.y, rx + rw, ry + rh, rx, ry + rh) ||
            lineCollision(p1.x, p1.y, p2.x, p2.y, rx, ry + rh, rx, ry)
        ) {
            return true;
        }
    }
    
    return false;
}

// Helper function to check if a point is inside a polygon
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const intersect = ((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
            (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Check if a line intersects with a rectangle
function lineRectIntersect(
    x1, y1, x2, y2,
    rx, ry, rw, rh
) {
    // Check if the line intersects any of the rectangle's sides
    return (
        lineCollision(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||           // top
        lineCollision(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh) || // bottom
        lineCollision(x1, y1, x2, y2, rx, ry, rx, ry + rh) ||           // left
        lineCollision(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) || // right
        (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) ||     // point 1 inside rect
        (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh)        // point 2 inside rect
    );
}

// Line segment intersection check
function lineCollision(x1, y1, x2, y2, x3, y3, x4, y4) {
    const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    
    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
}

// Check if player has reached the goal
function checkGoalCollision() {
    if (
        player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y < goal.y + goal.height &&
        player.y + player.height > goal.y
    ) {
        if (!levelCompleted) {
            levelCompleted = true;
            document.getElementById('completion-message').style.display = 'block';
        }
    }
}

// Update game state
function update() {
    if (levelCompleted) return;
    
    handleControls();
    
    // Apply gravity
    player.velY += gravity;
    
    // Update position
    player.x += player.velX;
    player.y += player.velY;
    
    // Update enemies
    for (const enemy of enemies) {
        enemy.update();
    }
    
    checkCollision();
    checkEnemyCollision();
    checkGoalCollision();
}

// Draw everything
function render() {
    // Get current level background color
    const levelIndex = currentLevel - 1;
    const backgroundColor = levels[levelIndex].backgroundColor;
    const platformColor = levels[levelIndex].platformColor;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background with pixel pattern
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawPixelPattern(backgroundColor);
    
    // Draw lines
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    
    for (const line of lines) {
        if (line.length < 2) continue;
        
        ctx.beginPath();
        ctx.moveTo(line[0].x, line[0].y);
        
        for (let i = 1; i < line.length; i++) {
            ctx.lineTo(line[i].x, line[i].y);
        }
        
        ctx.strokeStyle = platformColor;
        ctx.lineWidth = line.thickness || lineThickness; 
        ctx.stroke();
        
        // Add pixel-style highlight to platforms
        ctx.strokeStyle = '#5EFF72';
        ctx.lineWidth = Math.max(6, (line.thickness || lineThickness) / 4); 
        ctx.stroke();
    }
    
    // Draw enemies
    for (const enemy of enemies) {
        enemy.draw();
    }
    
    // Draw goal (pixel star)
    drawPixelStar(goal.x + goal.width/2, goal.y + goal.height/2, goal.width/2);
    
    // Draw player with pixel style
    drawPixelPlayer();
}

// Draw a pixel pattern background
function drawPixelPattern(baseColor) {
    const pixelSize = 16;
    const darkerColor = adjustColorBrightness(baseColor, -20);
    
    for (let x = 0; x < canvas.width; x += pixelSize) {
        for (let y = 0; y < canvas.height; y += pixelSize) {
            if ((Math.floor(x/pixelSize) + Math.floor(y/pixelSize)) % 2 === 0) {
                ctx.fillStyle = darkerColor;
                ctx.fillRect(x, y, pixelSize, pixelSize);
            }
        }
    }
}

// Function to adjust color brightness
function adjustColorBrightness(hex, percent) {
    let r = parseInt(hex.substr(1, 2), 16);
    let g = parseInt(hex.substr(3, 2), 16);
    let b = parseInt(hex.substr(5, 2), 16);

    r = Math.max(0, Math.min(255, r + percent));
    g = Math.max(0, Math.min(255, g + percent));
    b = Math.max(0, Math.min(255, b + percent));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Draw pixel star
function drawPixelStar(cx, cy, size) {
    const pixelSize = 4;
    ctx.fillStyle = '#FFD700';
    
    // Center pixel
    ctx.fillRect(cx - pixelSize/2, cy - pixelSize/2, pixelSize, pixelSize);
    
    // Top point
    for (let i = 1; i <= size/pixelSize; i++) {
        const width = pixelSize * (i % 2 === 0 ? 1 : 3);
        ctx.fillRect(cx - width/2, cy - (i * pixelSize), width, pixelSize);
    }
    
    // Bottom point
    for (let i = 1; i <= size/pixelSize; i++) {
        const width = pixelSize * (i % 2 === 0 ? 1 : 3);
        ctx.fillRect(cx - width/2, cy + ((i-1) * pixelSize), width, pixelSize);
    }
    
    // Left point
    for (let i = 1; i <= size/pixelSize; i++) {
        const height = pixelSize * (i % 2 === 0 ? 1 : 3);
        ctx.fillRect(
            cx - (i * pixelSize), 
            cy - height/2, 
            pixelSize, 
            height
        );
    }
    
    // Right point
    for (let i = 1; i <= size/pixelSize; i++) {
        const height = pixelSize * (i % 2 === 0 ? 1 : 3);
        ctx.fillRect(
            cx + ((i-1) * pixelSize), 
            cy - height/2, 
            pixelSize, 
            height
        );
    }
    
    // Highlight
    ctx.fillStyle = '#FFEC80';
    ctx.fillRect(cx - pixelSize, cy - pixelSize, pixelSize, pixelSize);
}

// Draw cute pixel player
function drawPixelPlayer() {
    const pixelSize = 4;
    
    // Body (main square)
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Pixel-style outline
    ctx.fillStyle = player.outlineColor;
    // Top outline
    ctx.fillRect(player.x, player.y, player.width, pixelSize);
    // Left outline
    ctx.fillRect(player.x, player.y, pixelSize, player.height);
    // Right outline
    ctx.fillRect(player.x + player.width - pixelSize, player.y, pixelSize, player.height);
    // Bottom outline
    ctx.fillRect(player.x, player.y + player.height - pixelSize, player.width, pixelSize);
    
    // Eyes (pixel squares)
    ctx.fillStyle = player.eyeColor;
    ctx.fillRect(player.x + player.width * 0.25, player.y + player.height * 0.3, pixelSize * 2, pixelSize * 2);
    ctx.fillRect(player.x + player.width * 0.65, player.y + player.height * 0.3, pixelSize * 2, pixelSize * 2);
    
    // Mouth (pixel line)
    ctx.fillRect(player.x + player.width * 0.3, player.y + player.height * 0.6, player.width * 0.4, pixelSize * 1.5);
    
    // Cheeks
    ctx.fillStyle = player.cheekColor;
    ctx.fillRect(player.x + player.width * 0.15, player.y + player.height * 0.5, pixelSize * 2, pixelSize * 2);
    ctx.fillRect(player.x + player.width * 0.75, player.y + player.height * 0.5, pixelSize * 2, pixelSize * 2);
    
    // Legs (pixel rectangles)
    ctx.fillStyle = player.outlineColor;
    ctx.fillRect(player.x + player.width * 0.2, player.y + player.height, pixelSize * 2, pixelSize * 3);
    ctx.fillRect(player.x + player.width * 0.7, player.y + player.height, pixelSize * 2, pixelSize * 3);
}

// Set up thickness slider
const thicknessSlider = document.getElementById('thickness-slider');
const thicknessValue = document.getElementById('thickness-value');
let lineThickness = 24;

thicknessSlider.addEventListener('input', () => {
    lineThickness = parseInt(thicknessSlider.value);
    thicknessValue.textContent = `${lineThickness}px`;
});

// Initialize game
function initGame() {
    createLevelIndicator();
    createInkMeter();
    setupLevelCompletionMessage();
    loadLevel(currentLevel);
    initMobileControls();
    gameLoop();
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Hide canvas and UI until game starts
canvas.style.display = 'none';
document.getElementById('ui').style.display = 'none';

let isDrawing = false;
let lines = [];
let currentLine = [];
let activeTool = 'pencil';

// Tool selection
document.getElementById('pencilTool').addEventListener('click', () => {
    activeTool = 'pencil';
    updateToolButtons();
});

document.getElementById('eraserTool').addEventListener('click', () => {
    activeTool = 'eraser';
    updateToolButtons();
});

document.getElementById('clearAll').addEventListener('click', () => {
    clearUserDrawings();
});

function updateToolButtons() {
    document.getElementById('pencilTool').classList.toggle('active', activeTool === 'pencil');
    document.getElementById('eraserTool').classList.toggle('active', activeTool === 'eraser');
}

// Clear only user-drawn lines
function clearUserDrawings() {
    // Keep predefined platforms, remove user drawings
    const currentLevelIndex = currentLevel - 1;
    const predefinedPlatforms = levels[currentLevelIndex].predefinedPlatforms || [];
    lines = [...predefinedPlatforms];
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function handleTouchEnd(e) {
    e.preventDefault();
    stopDrawing();
}

function startDrawing(e) {
    if (levelCompleted) return;
    isDrawing = true;
    currentLine = [];
    currentLine.thickness = lineThickness; 
    
    const x = e.clientX;
    const y = e.clientY;
    
    if (activeTool === 'pencil') {
        currentLine.push({ x, y });
        lines.push(currentLine);
    } else if (activeTool === 'eraser') {
        eraseLine(x, y);
    }
}

function draw(e) {
    if (!isDrawing) return;
    
    const x = e.clientX;
    const y = e.clientY;
    
    if (activeTool === 'pencil') {
        // Check if we have enough ink left
        if (currentInk <= 0) {
            stopDrawing();
            return;
        }
        
        const lastPoint = currentLine[currentLine.length - 1];
        // Calculate distance from last point to reduce ink based on distance drawn
        const distance = lastPoint ? Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2) : 0;
        
        // Reduce ink based on distance and line thickness
        const inkReduction = distance * (lineThickness / 24);
        currentInk = Math.max(0, currentInk - inkReduction);
        
        currentLine.push({ x, y });
        updateInkMeter();
    } else if (activeTool === 'eraser') {
        eraseLine(x, y);
    }
}

function stopDrawing() {
    isDrawing = false;
}

function eraseLine(x, y) {
    const eraseRadius = 20;
    
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        let shouldRemoveLine = false;
        
        for (let j = 0; j < line.length; j++) {
            const point = line[j];
            const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            
            if (distance < eraseRadius) {
                shouldRemoveLine = true;
                break;
            }
        }
        
        if (shouldRemoveLine) {
            // Calculate ink to refund based on line length and thickness
            if (line.length > 1) {
                let lineLength = 0;
                for (let j = 1; j < line.length; j++) {
                    lineLength += Math.sqrt(
                        Math.pow(line[j].x - line[j-1].x, 2) + 
                        Math.pow(line[j].y - line[j-1].y, 2)
                    );
                }
                
                const lineThickness = line.thickness || lineThickness;
                const inkRefund = lineLength * (lineThickness / 24) * 0.7; // Refund 70% of the ink used
                currentInk = Math.min(inkAmount, currentInk + inkRefund);
                updateInkMeter();
            }
            
            lines.splice(i, 1);
        }
    }
}

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Mobile controls elements
let mobileControls, mobileDpad, mobileJumpBtn, toolToggle;
let leftPressed = false, rightPressed = false, jumpPressed = false;
let touchDrawing = false;

// Initialize mobile controls
function initMobileControls() {
    if (!isMobile) return;
    
    // Create mobile controls
    mobileControls = document.createElement('div');
    mobileControls.id = 'mobile-controls';
    
    // Create directional pad
    mobileDpad = document.createElement('div');
    mobileDpad.id = 'mobile-dpad';
    
    const dpadRow = document.createElement('div');
    dpadRow.id = 'mobile-dpad-row';
    
    const leftBtn = createMobileButton('←', 'mobile-left-btn');
    const rightBtn = createMobileButton('→', 'mobile-right-btn');
    
    dpadRow.appendChild(leftBtn);
    dpadRow.appendChild(rightBtn);
    mobileDpad.appendChild(dpadRow);
    
    // Create jump button
    mobileJumpBtn = createMobileButton('JUMP', 'mobile-jump-btn');
    
    // Tool toggle for mobile
    toolToggle = document.createElement('div');
    toolToggle.className = 'tool-toggle-mobile';
    toolToggle.innerHTML = '✏️';
    toolToggle.dataset.tool = 'pencil';
    
    // Add to document
    mobileControls.appendChild(mobileDpad);
    document.body.appendChild(mobileControls);
    document.body.appendChild(mobileJumpBtn);
    document.body.appendChild(toolToggle);
    
    // Add event listeners for mobile controls
    addMobileControlEvents();
}

function createMobileButton(text, id) {
    const button = document.createElement('div');
    button.className = 'mobile-button';
    button.id = id;
    button.innerHTML = text;
    button.addEventListener('touchstart', (e) => e.preventDefault());
    return button;
}

function addMobileControlEvents() {
    // Left button events
    const leftBtn = document.getElementById('mobile-left-btn');
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        leftPressed = true;
    });
    leftBtn.addEventListener('touchend', () => {
        leftPressed = false;
    });
    
    // Right button events
    const rightBtn = document.getElementById('mobile-right-btn');
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        rightPressed = true;
    });
    rightBtn.addEventListener('touchend', () => {
        rightPressed = false;
    });
    
    // Jump button events
    mobileJumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        jumpPressed = true;
    });
    mobileJumpBtn.addEventListener('touchend', () => {
        jumpPressed = false;
    });
    
    // Tool toggle events
    toolToggle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (toolToggle.dataset.tool === 'pencil') {
            activeTool = 'eraser';
            toolToggle.innerHTML = '🧽';
            toolToggle.dataset.tool = 'eraser';
        } else {
            activeTool = 'pencil';
            toolToggle.innerHTML = '✏️';
            toolToggle.dataset.tool = 'pencil';
        }
    });
}
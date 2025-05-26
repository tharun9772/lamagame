import kaboom from "kaboom";

// Initialize Kaboom
const k = kaboom({
    width: 800,
    height: 600,
    background: [194, 178, 128], // Sand color
    crisp: true
});

// Load assets
k.loadSprite("player", "player.png");
k.loadSprite("zombie", "zombie.png");
k.loadSprite("bullet", "bullet.png");
k.loadSprite("sand", "sand.png");
k.loadSprite("chest", "chest.png");
k.loadSprite("chestOpen", "chest_open.png");

k.loadSound("shoot", "shoot.mp3");
k.loadSound("zombieHit", "zombie_hit.mp3");
k.loadSound("playerHit", "player_hit.mp3");
k.loadSound("pickup", "pickup.mp3");

// Game state
let gameState = {
    score: 0,
    health: 100,
    ammo: 30,
    waveNumber: 1,
    zombiesKilled: 0,
    zombiesInWave: 5,
    gunDamage: 1,
    gunType: "pistol",
    gunLevel: 0,
    isInIntermission: false
};

// Gun types with stats
const gunTypes = {
    pistol: { damage: 1, cooldown: 0.2, spread: 0, bullets: 1, color: "WHITE", ammoUse: 1 },
    shotgun: { damage: 1, cooldown: 0.5, spread: 30, bullets: 5, color: "YELLOW", ammoUse: 2 },
    sniper: { damage: 3, cooldown: 1.0, spread: 0, bullets: 1, color: "GREEN", ammoUse: 1 },
    minigun: { damage: 1, cooldown: 0.05, spread: 15, bullets: 1, color: "RED", ammoUse: 1 },
    laser: { damage: 2, cooldown: 0.1, spread: 0, bullets: 1, color: "CYAN", ammoUse: 1 },
    rocket: { damage: 5, cooldown: 2.0, spread: 0, bullets: 1, color: "MAGENTA", ammoUse: 3 }
};

// Scenes
k.scene("mainMenu", () => {
    k.add([
        k.text("ZOMBIE SURVIVAL", { size: 64 }),
        k.pos(k.width() / 2, k.height() / 2 - 100),
        k.anchor("center"),
        k.color(k.RED)
    ]);
    
    k.add([
        k.text("Press SPACE to Start", { size: 32 }),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor("center"),
        k.color(k.WHITE)
    ]);
    
    k.add([
        k.text("Press I for Instructions", { size: 24 }),
        k.pos(k.width() / 2, k.height() / 2 + 50),
        k.anchor("center"),
        k.color(k.GRAY)
    ]);
    
    k.onKeyPress("space", () => {
        k.go("game");
    });
    
    k.onKeyPress("i", () => {
        k.go("instructions");
    });
});

k.scene("instructions", () => {
    k.add([
        k.text("INSTRUCTIONS", { size: 48 }),
        k.pos(k.width() / 2, 100),
        k.anchor("center"),
        k.color(k.YELLOW)
    ]);
    
    const instructions = [
        "WASD - Move",
        "Mouse - Aim and shoot",
        "Collect chests for ammo, health, and weapons",
        "Survive waves of zombies!",
        "",
        "Zombie Types:",
        "White - Normal zombie",
        "Blue - Fast zombie (Wave 2+)",
        "Red - Big zombie (Wave 4+)",
        "Dark Red - Exploding zombie (Wave 5+)"
    ];
    
    instructions.forEach((text, i) => {
        k.add([
            k.text(text, { size: 20 }),
            k.pos(k.width() / 2, 180 + i * 30),
            k.anchor("center"),
            k.color(k.WHITE)
        ]);
    });
    
    k.add([
        k.text("Press SPACE to return to menu", { size: 18 }),
        k.pos(k.width() / 2, k.height() - 50),
        k.anchor("center"),
        k.color(k.GRAY)
    ]);
    
    k.onKeyPress("space", () => {
        k.go("mainMenu");
    });
});

k.scene("intermission", () => {
    let countdown = 10;
    
    k.add([
        k.text("WAVE COMPLETED!", { size: 48 }),
        k.pos(k.width() / 2, k.height() / 2 - 100),
        k.anchor("center"),
        k.color(k.GREEN)
    ]);
    
    k.add([
        k.text(`Preparing Wave ${gameState.waveNumber}...`, { size: 32 }),
        k.pos(k.width() / 2, k.height() / 2 - 50),
        k.anchor("center"),
        k.color(k.WHITE)
    ]);
    
    const countdownText = k.add([
        k.text(`${countdown}`, { size: 64 }),
        k.pos(k.width() / 2, k.height() / 2 + 20),
        k.anchor("center"),
        k.color(k.YELLOW)
    ]);
    
    k.add([
        k.text(`Health: ${gameState.health} | Ammo: ${gameState.ammo} | Score: ${gameState.score}`, { size: 20 }),
        k.pos(k.width() / 2, k.height() / 2 + 100),
        k.anchor("center"),
        k.color(k.CYAN)
    ]);
    
    const timer = k.loop(1, () => {
        countdown--;
        countdownText.text = `${countdown}`;
        
        if (countdown <= 0) {
            timer.cancel();
            k.go("game");
        }
    });
});

k.scene("game", () => {
    // Create sand ground tiles
    const TILE_SIZE = 64;
    const WORLD_SIZE = 2000; // Large world
    
    for (let x = -WORLD_SIZE; x < WORLD_SIZE; x += TILE_SIZE) {
        for (let y = -WORLD_SIZE; y < WORLD_SIZE; y += TILE_SIZE) {
            k.add([
                k.sprite("sand"),
                k.pos(x, y),
                k.z(-1),
                "ground"
            ]);
        }
    }

    // Player
    const player = k.add([
        k.sprite("player"),
        k.pos(0, 0), // Center of world
        k.area(),
        k.body(),
        k.anchor("center"),
        k.scale(0.1), // Make player even smaller
        "player",
        {
            speed: 200,
            lastShot: 0,
            shotCooldown: gunTypes[gameState.gunType].cooldown
        }
    ]);

    // Spawn loot chests
    function spawnChest() {
        const angle = k.rand(0, 360);
        const distance = k.rand(200, 800);
        const spawnPos = player.pos.add(k.Vec2.fromAngle(angle).scale(distance));
        
        const lootType = k.choose(["ammo", "health", "weapon"]);
        
        k.add([
            k.sprite("chest"),
            k.pos(spawnPos.x, spawnPos.y),
            k.area(),
            k.anchor("center"),
            k.scale(0.08),
            "chest",
            {
                lootType: lootType,
                collected: false,
                weaponType: k.choose(Object.keys(gunTypes))
            }
        ]);
    }

    // Spawn initial chests
    for (let i = 0; i < 3; i++) {
        spawnChest();
    }

    // Player movement
    k.onKeyDown("w", () => {
        player.move(0, -player.speed);
    });
    k.onKeyDown("s", () => {
        player.move(0, player.speed);
    });
    k.onKeyDown("a", () => {
        player.move(-player.speed, 0);
    });
    k.onKeyDown("d", () => {
        player.move(player.speed, 0);
    });

    // Camera follows player
    k.onUpdate(() => {
        k.camPos(player.pos);
    });

    // Shooting
    k.onMouseDown(() => {
        const currentGun = gunTypes[gameState.gunType];
        if (k.time() - player.lastShot > player.shotCooldown && gameState.ammo >= currentGun.ammoUse) {
            shoot();
            player.lastShot = k.time();
            gameState.ammo -= currentGun.ammoUse;
        }
    });

    function shoot() {
        const mouseWorldPos = k.mousePos().add(k.camPos().sub(k.vec2(k.width()/2, k.height()/2)));
        const direction = mouseWorldPos.sub(player.pos).unit();
        const currentGun = gunTypes[gameState.gunType];
        
        k.play("shoot", { volume: 0.3 });
        
        // Shoot multiple bullets for shotgun
        for (let i = 0; i < currentGun.bullets; i++) {
            let bulletDirection = direction;
            
            // Add spread for multi-bullet weapons
            if (currentGun.spread > 0) {
                const spreadAngle = k.rand(-currentGun.spread/2, currentGun.spread/2);
                bulletDirection = k.Vec2.fromAngle(direction.angle() + spreadAngle);
            }
            
            const bullet = k.add([
                k.sprite("bullet"),
                k.pos(player.pos),
                k.area(),
                k.anchor("center"),
                k.scale(0.05),
                k.rotate(bulletDirection.angle()),
                k.move(bulletDirection.angle(), gameState.gunType === "rocket" ? 200 : 400),
                k.lifespan(gameState.gunType === "sniper" ? 5 : 2),
                k.color(k[currentGun.color]),
                "bullet",
                {
                    damage: currentGun.damage,
                    isRocket: gameState.gunType === "rocket"
                }
            ]);
        }
    }

    // Spawn zombies
    function spawnZombie() {
        const angle = k.rand(0, 360);
        const distance = k.rand(300, 500);
        const spawnPos = player.pos.add(k.Vec2.fromAngle(angle).scale(distance));
        
        // Add fast zombies starting from wave 2
        const isFastZombie = gameState.waveNumber >= 2 && k.rand(0, 1) < 0.3; // 30% chance for fast zombie
        
        // Add big zombies starting from wave 4
        const isBigZombie = gameState.waveNumber >= 4 && k.rand(0, 1) < 0.2; // 20% chance for big zombie
        
        // Add exploding zombies starting from wave 5
        const isExplodingZombie = gameState.waveNumber >= 5 && k.rand(0, 1) < 0.25; // 25% chance for exploding zombie
        
        let zombieColor = k.WHITE;
        let zombieScale = 0.1;
        let zombieSpeed = k.rand(50, 100);
        let zombieHealth = 2;
        
        if (isBigZombie && !isExplodingZombie) {
            zombieColor = k.RED;
            zombieScale = 0.15; // Bigger
            zombieSpeed = k.rand(30, 50); // Slower
            zombieHealth = 5; // Stronger
        } else if (isFastZombie && !isExplodingZombie && !isBigZombie) {
            zombieColor = k.BLUE;
            zombieSpeed = k.rand(150, 200);
        } else if (isExplodingZombie) {
            zombieColor = k.rgb(80, 0, 0); // Dark dark red
            zombieSpeed = k.rand(50, 100);
            zombieHealth = 2;
        }
        
        k.add([
            k.sprite("zombie"),
            k.pos(spawnPos.x, spawnPos.y),
            k.area(),
            k.body(),
            k.anchor("center"),
            k.scale(zombieScale),
            k.color(zombieColor),
            "zombie",
            {
                speed: zombieSpeed,
                health: zombieHealth,
                isFast: isFastZombie,
                isBig: isBigZombie,
                isExploding: isExplodingZombie
            }
        ]);
    }

    // Zombie AI
    k.onUpdate("zombie", (zombie) => {
        const direction = player.pos.sub(zombie.pos).unit();
        zombie.move(direction.scale(zombie.speed));
    });

    // Bullet collision with zombies
    k.onCollide("bullet", "zombie", (bullet, zombie) => {
        // Handle rocket explosion
        if (bullet.isRocket) {
            explodeRocket(bullet.pos);
        }
        
        k.destroy(bullet);
        zombie.health -= bullet.damage || 1;
        k.play("zombieHit", { volume: 0.4 });
        
        if (zombie.health <= 0) {
            // Handle exploding zombie death
            if (zombie.isExploding) {
                explodeZombie(zombie);
            }
            k.destroy(zombie);
            // Big zombies give more points
            gameState.score += zombie.isBig ? 25 : 10;
            gameState.zombiesKilled++;
        }
    });

    // Player collision with zombies
    k.onCollide("player", "zombie", (player, zombie) => {
        // Handle exploding zombie collision
        if (zombie.isExploding) {
            explodeZombie(zombie);
        }
        k.destroy(zombie);
        gameState.health -= 20;
        k.play("playerHit", { volume: 0.5 });
        
        if (gameState.health <= 0) {
            k.go("gameOver");
        }
    });

    // Player collision with chests
    k.onCollide("player", "chest", (player, chest) => {
        if (!chest.collected) {
            chest.collected = true;
            chest.use(k.sprite("chestOpen"));
            k.play("pickup", { volume: 0.6 });
            
            switch (chest.lootType) {
                case "ammo":
                    gameState.ammo += k.rand(15, 30);
                    break;
                case "health":
                    gameState.health = Math.min(100, gameState.health + k.rand(20, 40));
                    break;
                case "weapon":
                    gameState.gunType = chest.weaponType;
                    gameState.gunLevel++;
                    player.shotCooldown = gunTypes[gameState.gunType].cooldown;
                    break;
            }
            
            k.wait(0.5, () => {
                k.destroy(chest);
            });
        }
    });

    // Wave management
    let zombiesSpawned = 0;
    let currentWaveZombies = gameState.zombiesInWave;
    let spawnTimer = k.loop(2, () => {
        if (zombiesSpawned < currentWaveZombies) {
            spawnZombie();
            zombiesSpawned++;
        }
    });

    k.onUpdate(() => {
        if (zombiesSpawned >= currentWaveZombies && k.get("zombie").length === 0 && !gameState.isInIntermission) {
            // Stop current spawn timer
            spawnTimer.cancel();
            
            gameState.isInIntermission = true;
            gameState.waveNumber++;
            gameState.zombiesInWave += 3;
            currentWaveZombies = gameState.zombiesInWave;
            gameState.zombiesKilled = 0;
            zombiesSpawned = 0;
            gameState.ammo += 20;
            gameState.health = Math.min(100, gameState.health + 10);
            
            // Spawn new chests each wave
            spawnChest();
            spawnChest();
            
            // Go to intermission
            k.go("intermission");
        }
    });

    // Exploding zombie function
    function explodeZombie(zombie) {
        // Create explosion effect
        k.add([
            k.circle(80),
            k.pos(zombie.pos),
            k.color(k.rgb(255, 100, 0)),
            k.opacity(0.7),
            k.anchor("center"),
            k.lifespan(0.3),
            "explosion"
        ]);
        
        // Deal damage to player if in range
        const distanceToPlayer = zombie.pos.dist(player.pos);
        if (distanceToPlayer < 80) {
            gameState.health -= 30; // Extra damage from explosion
            k.play("playerHit", { volume: 0.7 });
            
            if (gameState.health <= 0) {
                k.go("gameOver");
            }
        }
        
        // Damage other zombies in explosion radius
        k.get("zombie").forEach(otherZombie => {
            if (otherZombie !== zombie && zombie.pos.dist(otherZombie.pos) < 80) {
                otherZombie.health -= 1;
                if (otherZombie.health <= 0) {
                    k.destroy(otherZombie);
                    gameState.score += 5; // Bonus points for chain kills
                    gameState.zombiesKilled++;
                }
            }
        });
    }

    // Rocket explosion function
    function explodeRocket(pos) {
        // Create larger explosion effect
        k.add([
            k.circle(120),
            k.pos(pos),
            k.color(k.rgb(255, 50, 0)),
            k.opacity(0.8),
            k.anchor("center"),
            k.lifespan(0.5),
            "explosion"
        ]);
        
        // Damage all zombies in explosion radius
        k.get("zombie").forEach(zombie => {
            if (pos.dist(zombie.pos) < 120) {
                zombie.health -= 3;
                if (zombie.health <= 0) {
                    if (zombie.isExploding) {
                        explodeZombie(zombie);
                    }
                    k.destroy(zombie);
                    gameState.score += zombie.isBig ? 25 : 10;
                    gameState.zombiesKilled++;
                }
            }
        });
        
        // Damage player if in range
        const distanceToPlayer = pos.dist(player.pos);
        if (distanceToPlayer < 120) {
            gameState.health -= 20;
            k.play("playerHit", { volume: 0.7 });
            
            if (gameState.health <= 0) {
                k.go("gameOver");
            }
        }
    }

    // UI - Fixed to screen position
    k.onDraw(() => {
        const screenPos = k.camPos().sub(k.vec2(k.width()/2 - 20, k.height()/2 - 20));
        
        k.drawText({
            text: `Health: ${gameState.health}`,
            pos: screenPos,
            color: gameState.health > 50 ? k.GREEN : k.RED,
            size: 20
        });
        
        k.drawText({
            text: `Ammo: ${gameState.ammo}`,
            pos: screenPos.add(k.vec2(0, 30)),
            color: gameState.ammo > 0 ? k.WHITE : k.RED,
            size: 20
        });
        
        k.drawText({
            text: `Score: ${gameState.score}`,
            pos: screenPos.add(k.vec2(0, 60)),
            color: k.YELLOW,
            size: 20
        });
        
        k.drawText({
            text: `Wave: ${gameState.waveNumber}`,
            pos: screenPos.add(k.vec2(0, 90)),
            color: k.CYAN,
            size: 20
        });
        
        k.drawText({
            text: `Gun: ${gameState.gunType}`,
            pos: screenPos.add(k.vec2(0, 120)),
            color: gunTypes[gameState.gunType] ? k[gunTypes[gameState.gunType].color] : k.WHITE,
            size: 20
        });
    });
});

k.scene("gameOver", () => {
    k.add([
        k.text("GAME OVER", { size: 48 }),
        k.pos(k.width() / 2, k.height() / 2 - 50),
        k.anchor("center"),
        k.color(k.RED)
    ]);
    
    k.add([
        k.text(`Final Score: ${gameState.score}`, { size: 24 }),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor("center"),
        k.color(k.WHITE)
    ]);
    
    k.add([
        k.text("Press SPACE to restart", { size: 18 }),
        k.pos(k.width() / 2, k.height() / 2 + 50),
        k.anchor("center"),
        k.color(k.GRAY)
    ]);
    
    k.onKeyPress("space", () => {
        // Reset game state
        gameState = {
            score: 0,
            health: 100,
            ammo: 30,
            waveNumber: 1,
            zombiesKilled: 0,
            zombiesInWave: 5,
            gunDamage: 1,
            gunType: "pistol",
            gunLevel: 0,
            isInIntermission: false
        };
        k.go("mainMenu");
    });
});

// Start the game
k.go("mainMenu");
let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth - 18;
canvas.height = window.innerHeight - 20;

let gameContinueAlive = true  
let gameContinueEmpty = true
let context = canvas.getContext("2d");
let bullets = [];
let enemyBullets = [];
let canShoot = true;
let keys = {};
let count = 0;
let points = 0;
let hp = 5;
let magazine = 10;
let magazineDisplay = document.getElementById("magazine");
let hpDisplay = document.getElementById("hp");
let pointDisplay = document.getElementById("points");

//skapar spelaren
let spaceship = {            
    posY: 300,
    posX: 585,
    speedX: 15,
    speedY: 10,
    scale: 0.7,
    state: "idle",
    alive: true
};

//array för motståndarskepp som finns på spelplanen
let enemies = [];

//array för motståndarskepp som skjuter som finns på spelplanen
let shootingEnemies = [];

//Objekt för olika "states". Alltså olika tillstånd som en "entitet" kan befinna sig i
const State = {
    states: {},
    getState: function(name) {
        return this.states[name];
    }
};

let lastTimestamp = 0;
let maxFPS = 60;
let timestep = 1000 / maxFPS;

//Lägger till spritesheets
const idleImage = new Image();
idleImage.src = "rymdskepp/Fighter/Move.png";

const bulletImage = new Image();
bulletImage.src = "rymdskepp/Fighter/Charge_1.png";

const turnLeftImage = new Image();
turnLeftImage.src = "rymdskepp/Fighter/Turn_1.png";

const turnRightImage = new Image();
turnRightImage.src = "rymdskepp/Fighter/Turn_2.png";

const idleEnemyImage = new Image();
idleEnemyImage.src = "rymdskepp/Corvette/Move.png";

const shootSound = new Audio("shoot.mp3");

//Startar inte spelet förrän spelet har kollat att alla spritesheets och animationer/objekt har laddat in
let imagesLoaded = 0;
function tryStartGame() {
    imagesLoaded++;
    if (imagesLoaded === 5) {
        requestAnimationFrame(update);
        setInterval(spawnEnemy, 2000);
        setInterval(spawnShootingEnemy, 5000);
    }
}

//Spelarskeppets tillstånd fram, bak, och stillastående
idleImage.onload = () => {
    State.states["idle"] = {
        frameIndex: 0,
        startIndex: 0,
        endIndex: 5,
        spritesheet: idleImage,
        frameWidth: 125,
        frameHeight: 192
    };
    tryStartGame();
};

//Spelarsleppets tillstånd svänger vänster
turnLeftImage.onload = () => {
    State.states["turnLeft"] = {
        frameIndex: 0,
        startIndex: 0,
        endIndex: 3,
        spritesheet: turnLeftImage,
        frameWidth: 125,
        frameHeight: 192
    };
    tryStartGame();
};

//Spelarsleppets tillstånd svänger höger
turnRightImage.onload = () => {
    State.states["turnRight"] = {
        frameIndex: 0,
        startIndex: 0,
        endIndex: 3,
        spritesheet: turnRightImage,
        frameWidth: 125,
        frameHeight: 192
    };
    tryStartGame();
};

//Motståndarskeppens konstanta tillstånd
idleEnemyImage.onload = () => {
    State.states["enemy"] = {
        frameIndex: 0,
        startIndex: 0,
        endIndex: 5,
        spritesheet: idleEnemyImage,
        frameWidth: 150,
        frameHeight: 192,
        flipVertically: true
    };
    tryStartGame();
};

bulletImage.onload = () => {
    tryStartGame();
};

//Laddar in motståndare som inte skuter på planen
function spawnEnemy() {
    const posX = Math.random() * (canvas.width - 150);
    enemies.push({
        posX,
        posY: -200,
        speed: 2 + Math.random() * 2,
        scale: 0.4,
        state: "enemy",
        alive: true,
        height: 192,
        width: 150,
    });
}

//Laddar in motståndare som skjuter på planen
function spawnShootingEnemy() {
    const posX = Math.random() * (canvas.width - 150);
    shootingEnemies.push({
        posX,
        posY: -200,
        speed: 1 + Math.random() * 2,
        scale: 0.4,
        state: "enemy",
        alive: true,
        height: 192,
        width: 150,
    });
}

//Kollar om spelaren fortfarande lever
function checkPlayerAlive() {
    if(hp < 1) {
        gameContinueAlive = false
    }
}

//Kollar om spelaren fortfarande har skott kvar
function checkBulletsLeft() {
    if(magazine < 1) {
        gameContinueEmpty = false
    }
}

//Funktion för att animera "entiteter"
function animate(state, entity) {
    if (!state || !state.spritesheet.complete || !entity.alive) return;

    const frameWidth = state.frameWidth;
    const frameHeight = state.frameHeight;
    const spriteWidth = frameWidth * entity.scale;
    const spriteHeight = frameHeight * entity.scale;
    const offsetX = spriteWidth / 4;
    const frameY = state.frameIndex * frameHeight;

    //Vänder på en bild. Används för motståndarskeppen. Spritesheeten är riktade uppåt men bilden vänds så motsåndarskeppen är riktade nedåt
    context.save();
    if (state.flipVertically) {
        context.translate(entity.posX + spriteWidth / 2, entity.posY + spriteHeight / 2);
        context.rotate(Math.PI);
        context.translate(-spriteWidth / 2, -spriteHeight / 2);
        context.drawImage(
            state.spritesheet,
            0, frameY, frameWidth, frameHeight,
            0, 0, spriteWidth, spriteHeight
        );
    } else {
        context.drawImage(
            state.spritesheet,
            0, frameY, frameWidth, frameHeight,
            entity.posX -offsetX, entity.posY,
            spriteWidth, spriteHeight
        );
    }
    context.restore();

    count++;
    if (count > maxFPS / 10) {
        state.frameIndex++;
        count = 0;
    }
    if (state.frameIndex > state.endIndex) {
        state.frameIndex = state.startIndex;
    }
}

//Funktion för att skjuta skott från spelaren
function shootBullet() {
    bullets.push({
        x: spaceship.posX + 36,
        y: spaceship.posY + 65,
        speed: 15,
        width: 20,
        height: 13
    });
    shootSound.currentTime = 0;
    shootSound.play();
}

//Funktion för att skjuta skott från motståndarspelare
function shootEnemyBullet(enemy) {
    enemyBullets.push({
        x: enemy.posX + 13,
        y: enemy.posY + 65,
        speed: 7    ,
        width: 20,
        height: 13
    });
    shootSound.currentTime = 0;
    shootSound.play();
}

//Funktion för att uppdatera spelarens skottposition
function updateBullets() {
    for (let i = 0; i < bullets.length; i++) {
        bullets[i].y -= bullets[i].speed;
    }
    bullets = bullets.filter(bullet => bullet.y > 0);
}

//Funktion för att uppdatera motståndarskeppens skottposition
function updateEnemyBullets() {
    for (let i = 0; i < enemyBullets.length; i++) {
        enemyBullets[i].y += enemyBullets[i].speed;
    }
    enemyBullets = enemyBullets.filter(bullet => bullet.y < canvas.height);
}

//Funktion för att rita spelarens skott på plan
function drawBullets() {
    for (let bullet of bullets) {
        context.drawImage(bulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

//Funktion för att rita motståndasskotten på plan
function drawEnemyBullets() {
    for (let bullet of enemyBullets) {
        context.drawImage(bulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

//Function som rensar canvasen så en ny frame kan skapas
function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

//Kollar om skotten har träffat motståndarskeppen. Ger poäng. Ger extraskott
function checkBulletCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        for (let enemy of enemies) {
            if (
                enemy.alive &&
                bullet.x < enemy.posX + 150 * enemy.scale &&
                bullet.x + bullet.width > enemy.posX &&
                bullet.y < enemy.posY + 192 * enemy.scale &&
                bullet.y + bullet.height > enemy.posY
            ) {
                enemy.alive = false;
                bullets.splice(i, 1);
                points += 50;
                magazine = magazine + 1
                magazineDisplay.innerHTML = `Bullets: ${magazine}`;
                pointDisplay.innerHTML = `Points: ${points}`;
                break;
            }
        }
        for (let enemy of shootingEnemies) {
            if (
                enemy.alive &&
                bullet.x < enemy.posX + 150 * enemy.scale &&
                bullet.x + bullet.width > enemy.posX &&
                bullet.y < enemy.posY + 192 * enemy.scale &&
                bullet.y + bullet.height > enemy.posY
            ) {
                enemy.alive = false;
                bullets.splice(i, 1);
                points += 100;
                magazine = magazine + 2
                magazineDisplay.innerHTML = `Bullets: ${magazine}`;
                pointDisplay.innerHTML = `Points: ${points}`;
                break;
            }
        }
    }
}

//Funktion för att kolla om spelaren kolliderar med ett motståndarskepp
function checkPlayerEnemyCollisions() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i]
        if(
            spaceship.alive &&
            enemy.posX < spaceship.posX + (State.states["idle"].frameWidth - 10) * spaceship.scale &&
            enemy.posX > spaceship.posX &&
            enemy.posY < spaceship.posY + State.states["idle"].frameHeight * spaceship.scale &&
            enemy.posY + enemy.height * enemy.scale * 0.6> spaceship.posY
        ) {
            hp = hp - 1;
            hpDisplay.innerHTML = `HP: ${hp}`;
            enemies.splice(i,1)
            break;
        }
    }
}

//Funktion för att kolla om spelaren kolliderar med ett skepp som skjuter
function checkPlayerShootingEnemyCollisions() {
    for (let i = shootingEnemies.length - 1; i >= 0; i--) {
        const enemy = shootingEnemies[i]
        if(
            spaceship.alive &&
            enemy.posX < spaceship.posX + (State.states["idle"].frameWidth - 10) * spaceship.scale &&
            enemy.posX > spaceship.posX &&
            enemy.posY < spaceship.posY + State.states["idle"].frameHeight * spaceship.scale &&
            enemy.posY + enemy.height * enemy.scale * 0.6> spaceship.posY
        ) {
            hp = hp - 1;
            hpDisplay.innerHTML = `HP: ${hp}`;
            shootingEnemies.splice(i,1)
            break;
        }
    }
}

//Kollar om spelaren blir träffat av ett skott från motståndarskeppen
function checkPlayerBulletCollisions() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i]
        if(
            spaceship.alive &&
            bullet.x < spaceship.posX + State.states["idle"].frameWidth * spaceship.scale &&
            bullet.x + bullet.width > spaceship.posX &&
            bullet.y < spaceship.posY + State.states["idle"].frameHeight * 0.6 * spaceship.scale &&
            bullet.y + bullet.height > spaceship.posY
        ) {
            hp = hp - 1;
            hpDisplay.innerHTML = `HP: ${hp}`;
            enemyBullets.splice(i,1)
            break;
        }
    }
}

//Uppdaterar motståndarskeppens position, tar bort dem om utanför skärm och isf tar bort hp. 
function updateEnemies() {
    for (let enemy of enemies) {
        if (enemy.alive) {
            enemy.posY += enemy.speed;
            if (enemy.posY > canvas.height) {
                hp = hp - 1
                hpDisplay.innerHTML = `HP: ${hp}`;
                enemy.alive = false;
            }
        }
    }
    for (let enemy of shootingEnemies) {
        if (enemy.alive) {
            enemy.posY += enemy.speed;
            if (enemy.posY > canvas.height) {
                hp = hp - 1
                hpDisplay.innerHTML = `HP: ${hp}`;
                enemy.alive = false;
            }
        }
    }
}

//Om space trycks så skjuts ett skott och magasinet blir av med ett skott.
document.addEventListener("keydown", function(event) {
    if (!keys[event.key]) {
        keys[event.key] = true;
        if (event.key === " " && canShoot) {
            shootBullet();
            magazine--
            magazineDisplay.innerHTML = `Bullets: ${magazine}`
            canShoot = false;
        }
    }
});

//Låter spelaren skjuta en gång per space press
document.addEventListener("keyup", function(event) {
    if (event.key === " ") canShoot = true;
    keys[event.key] = false;
});

//Denna funktion "kör" spelet
function update(timestamp) {
    //Lever spelaren? Om inte avslutas spelet.
    if(!gameContinueAlive) {
        alert(`                                    Game Over! You died.\n                                        You got ${points} points!`);
        return;
    };

    //Har spelaren kvar skott? Om inte avslutas spelet.
    if(!gameContinueEmpty) {
        alert(`                            Game Over! You ran out of bullets.\n                                           You got ${points} points!`);
        return;       
    }

    //Frame-limiter funktion
    if (timestamp - lastTimestamp < timestep) {
        requestAnimationFrame(update);
        return;
    }

    //Får motståndarskeppen att ha en chans av 1 av 100 varje frame att skjuta. Alltså begränsar hur ofta motståndarskeppen skjuter.
    for (let enemy of shootingEnemies) {
        if (enemy.alive) {
            if(Math.random() < 0.01) {
                shootEnemyBullet(enemy);
            }
        }
    }

    //Rörelsekontroll
    const isMovingLeft = keys["a"];
    const isMovingRight = keys["d"];
    const isMovingUp = keys["w"];
    const isMovingDown = keys["s"];

    if (isMovingRight && spaceship.posX + spaceship.speedX <= canvas.width - 50)
        spaceship.posX += spaceship.speedX;
    if (isMovingLeft && spaceship.posX - spaceship.speedX >= -48)
        spaceship.posX -= spaceship.speedX;
    if (isMovingDown && spaceship.posY + spaceship.speedY <= canvas.height - 93)
        spaceship.posY += spaceship.speedY;
    if (isMovingUp && spaceship.posY - spaceship.speedY >= -30)
        spaceship.posY -= spaceship.speedY;

    spaceship.state = isMovingLeft && !isMovingRight
        ? "turnLeft"
        : isMovingRight && !isMovingLeft
        ? "turnRight"
        : "idle";

    //funktioner som körs varje frame
    checkPlayerShootingEnemyCollisions();
    checkPlayerEnemyCollisions();
    checkBulletCollisions();
    checkPlayerBulletCollisions();
    updateEnemies();
    clearCanvas();
    animate(State.getState(spaceship.state), spaceship);
    for (let enemy of enemies) {
        animate(State.getState(enemy.state), enemy);
    }
    for (let enemy of shootingEnemies) {
        animate(State.getState(enemy.state), enemy);
    }
    updateBullets();
    updateEnemyBullets();
    drawBullets();
    drawEnemyBullets();
    checkPlayerAlive();
    checkBulletsLeft();

    lastTimestamp = timestamp;
    
    //Kör nästa frame
    requestAnimationFrame(update);
}
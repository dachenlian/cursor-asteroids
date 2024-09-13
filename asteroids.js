class GameObject {
  constructor(x, y, radius, lifespan = Infinity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.dx = 0;
    this.dy = 0;
    this.lifespan = lifespan;
  }

  move(canvas) {
    this.x = (this.x + this.dx + canvas.width) % canvas.width;
    this.y = (this.y + this.dy + canvas.height) % canvas.height;
    if (this.lifespan !== Infinity) {
      this.lifespan--;
    }
  }

  isExpired() {
    return this.lifespan <= 0;
  }
}

class Ship extends GameObject {
  constructor(x, y) {
    super(x, y, 10);
    this.rotation = 0;
    this.thrusting = false;
  }

  rotate(dir) {
    this.rotation += dir * 0.1;
  }

  thrust() {
    const thrust = 0.1;
    this.dx += thrust * Math.cos(this.rotation);
    this.dy += thrust * Math.sin(this.rotation);
  }
}

class Asteroid extends GameObject {
  constructor(x, y, radius) {
    super(x, y, radius);
    const speed = 1 + (20 - radius) / 10;
    const angle = Math.random() * Math.PI * 2;
    this.dx = speed * Math.cos(angle);
    this.dy = speed * Math.sin(angle);
    this.vertices = this.createVertices();
  }

  createVertices() {
    const vertices = [];
    const numVertices = Math.floor(Math.random() * 7) + 7;
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const distance = this.radius * (0.75 + Math.random() * 0.5);
      vertices.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    }
    return vertices;
  }

  split() {
    if (this.radius < 10) return [];
    const newRadius = this.radius / 2;
    return [
      new Asteroid(this.x, this.y, newRadius),
      new Asteroid(this.x, this.y, newRadius)
    ];
  }
}

class PowerUp extends GameObject {
  constructor(x, y, type) {
    super(x, y, 15);
    this.type = type;
    this.color = this.getColor();
  }

  getColor() {
    switch (this.type) {
      case 'shield': return 'blue';
      case 'scatter': return 'green';
      case 'rapid': return 'yellow';
    }
  }
}

class Game {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 800;
    this.canvas.height = 600;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2);
    this.asteroids = [];
    this.bullets = [];
    this.score = 0;
    this.gameOver = false;
    this.powerUps = [];
    this.activePowerUps = new Set();
    this.lastPowerUpSpawn = 0;
    this.initGame();

    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("keyup", this.handleKeyUp.bind(this));

    this.gameLoop();
  }

  initGame() {
    this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2);
    this.asteroids = [];
    this.bullets = [];
    this.score = 0;
    this.gameOver = false;
    this.powerUps = [];
    this.activePowerUps = new Set();
    this.lastPowerUpSpawn = 0;

    for (let i = 0; i < 5; i++) {
      this.asteroids.push(
        new Asteroid(
          Math.random() * this.canvas.width,
          Math.random() * this.canvas.height,
          20
        )
      );
    }
  }

  handleKeyDown(e) {
    if (e.key === "ArrowLeft") this.ship.rotate(-1);
    if (e.key === "ArrowRight") this.ship.rotate(1);
    if (e.key === "ArrowUp") this.ship.thrusting = true;
    if (e.key === " ") this.shoot();
  }

  handleKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") this.ship.rotate(0);
    if (e.key === "ArrowUp") this.ship.thrusting = false;
  }

  shoot() {
    if (this.activePowerUps.has('rapid') && this.bullets.length < 10) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.createBullet();
        }, i * 100);
      }
    }
    if (this.activePowerUps.has('scatter')) {
      for (let i = -1; i <= 1; i++) {
        this.createBullet(i * 0.2);
      }
    }
    if (!this.activePowerUps.has('rapid') && !this.activePowerUps.has('scatter')) {
      this.createBullet();
    }
  }

  createBullet(angleOffset = 0) {
    const bulletLifespan = 60;
    const bullet = new GameObject(this.ship.x, this.ship.y, 2, bulletLifespan);
    bullet.dx = 5 * Math.cos(this.ship.rotation + angleOffset);
    bullet.dy = 5 * Math.sin(this.ship.rotation + angleOffset);
    this.bullets.push(bullet);
    console.log("Bullet fired:", bullet);
  }

  update() {
    if (this.gameOver) {
      this.restart();
      return;
    }

    if (this.ship.thrusting) this.ship.thrust();
    this.ship.move(this.canvas);
    this.asteroids.forEach((a) => a.move(this.canvas));
    this.bullets.forEach((b) => b.move(this.canvas));
    this.powerUps.forEach((p) => p.move(this.canvas));

    this.bullets = this.bullets.filter(b => {
      b.move(this.canvas);
      return !b.isExpired();
    });

    this.bullets = this.bullets.filter((b) => {
      if (b.isExpired()) return false;
      let bulletHit = false;
      let newAsteroids = [];
      this.asteroids = this.asteroids.filter((a) => {
        if (this.checkCollision(b, a)) {
          bulletHit = true;
          this.score += 100 * Math.floor(20 / a.radius);
          newAsteroids.push(...a.split());
          return false;
        }
        return true;
      });
      this.asteroids.push(...newAsteroids);
      return !bulletHit;
    });

    if (this.asteroids.some((a) => this.checkCollision(this.ship, a))) {
      this.gameOver = true;
      console.log("Game Over!");
      this.restart();
    }

    if (this.asteroids.length === 0) {
      for (let i = 0; i < 5; i++) {
        this.asteroids.push(
          new Asteroid(
            Math.random() * this.canvas.width,
            Math.random() * this.canvas.height,
            20
          )
        );
      }
    }

    if (Date.now() - this.lastPowerUpSpawn > 10000) {
      this.spawnPowerUp();
      this.lastPowerUpSpawn = Date.now();
    }

    this.powerUps = this.powerUps.filter(p => {
      if (this.checkCollision(this.ship, p)) {
        this.collectPowerUp(p);
        return false;
      }
      return true;
    });
  }

  spawnPowerUp() {
    const types = ['shield', 'scatter', 'rapid'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * this.canvas.width;
    const y = Math.random() * this.canvas.height;
    this.powerUps.push(new PowerUp(x, y, type));
  }

  collectPowerUp(powerUp) {
    this.activePowerUps.add(powerUp.type);
    if (powerUp.type === 'shield') {
      this.ship.radius *= 1.5;
    }
  }

  checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < obj1.radius + obj2.radius;
  }

  draw() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = "white";
    this.ctx.beginPath();
    this.ctx.moveTo(
      this.ship.x + 10 * Math.cos(this.ship.rotation),
      this.ship.y + 10 * Math.sin(this.ship.rotation)
    );
    this.ctx.lineTo(
      this.ship.x + 10 * Math.cos(this.ship.rotation + 2.5),
      this.ship.y + 10 * Math.sin(this.ship.rotation + 2.5)
    );
    this.ctx.lineTo(
      this.ship.x + 10 * Math.cos(this.ship.rotation - 2.5),
      this.ship.y + 10 * Math.sin(this.ship.rotation - 2.5)
    );
    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.strokeStyle = "white";
    this.asteroids.forEach((a) => {
      this.ctx.beginPath();
      a.vertices.forEach((v, i) => {
        if (i === 0) {
          this.ctx.moveTo(a.x + v.x, a.y + v.y);
        } else {
          this.ctx.lineTo(a.x + v.x, a.y + v.y);
        }
      });
      this.ctx.closePath();
      this.ctx.stroke();
    });

    this.ctx.fillStyle = "red";
    this.bullets.forEach((b) => {
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.powerUps.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px Arial';
    let yOffset = 90;
    this.activePowerUps.forEach(powerUp => {
      this.ctx.fillText(`Power-up: ${powerUp}`, 10, yOffset);
      yOffset += 25;
    });

    this.ctx.fillStyle = "white";
    this.ctx.font = "20px Arial";
    this.ctx.fillText(`Bullets: ${this.bullets.length}`, 10, 30);
    this.ctx.fillText(`Score: ${this.score}`, 10, 60);

    if (this.gameOver) {
      this.ctx.fillStyle = "white";
      this.ctx.font = "40px Arial";
      this.ctx.fillText("GAME OVER", this.canvas.width / 2 - 100, this.canvas.height / 2);
    }
  }

  restart() {
    this.initGame();
  }

  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

new Game();

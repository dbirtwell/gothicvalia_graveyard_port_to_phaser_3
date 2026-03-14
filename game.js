/*
 * Gothicvania Cemetery Demo Code
 * Original prototype by Ansimuz
 * Phaser 3 port
 */

const gameWidth = 384;
const gameHeight = 224;

let phaserGame;
let player;
let enemiesGroup;
let map;
let hitbox;
let hurtFlag = false;
let jumpingFlag = false;
let attackingFlag = false;
let audioHurt;
let music;

class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    this.load.image("loading", "assets/sprites/loading.png");
  }

  create() {
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;
    this.cameras.main.roundPixels = true;
    this.scene.start("Preload");
  }
}

class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload() {
    const loadingBar = this.add.image(gameWidth / 2, gameHeight / 2, "loading").setOrigin(0.5);

    this.load.on("progress", (value) => {
      loadingBar.setScale(Math.max(value, 0.01), 1);
    });

    this.load.image("title", "assets/sprites/title-screen.png");
    this.load.image("game-over", "assets/sprites/game-over.png");
    this.load.image("enter", "assets/sprites/press-enter-text.png");
    this.load.image("credits", "assets/sprites/credits-text.png");
    this.load.image("instructions", "assets/sprites/instructions.png");

    this.load.image("bg-moon", "assets/environment/bg-moon.png");
    this.load.image("bg-mountains", "assets/environment/bg-mountains.png");
    this.load.image("bg-graveyard", "assets/environment/bg-graveyard.png");

    this.load.image("tileset", "assets/environment/tileset.png");
    this.load.image("objects", "assets/environment/objects.png");
    this.load.tilemapTiledJSON("map", "assets/maps/map.json");

    this.load.atlas("atlas", "assets/atlas/atlas.png", "assets/atlas/atlas.json");
    this.load.atlas("atlas-props", "assets/atlas/atlas-props.png", "assets/atlas/atlas-props.json");

    this.load.audio("music", ["assets/sounds/sci_fi_platformer04_main_loop.ogg"]);
    this.load.audio("attack", ["assets/sounds/attack.ogg"]);
    this.load.audio("kill", ["assets/sounds/kill.ogg"]);
    this.load.audio("rise", ["assets/sounds/rise.ogg"]);
    this.load.audio("hurt", ["assets/sounds/hurt.ogg"]);
    this.load.audio("jump", ["assets/sounds/jump.ogg"]);
  }

  create() {
    this.scene.start("TitleScreen");
  }
}

class TitleScreenScene extends Phaser.Scene {
  constructor() {
    super("TitleScreen");
    this.state = 1;
  }

  create() {
    this.bgMoon = this.add.tileSprite(0, 0, gameWidth, gameHeight, "bg-moon").setOrigin(0, 0).setScrollFactor(0);
    this.bgMountains = this.add.tileSprite(0, 0, gameWidth, gameHeight, "bg-mountains").setOrigin(0, 0).setScrollFactor(0);

    this.title = this.add.image(gameWidth / 2, 100, "title").setOrigin(0.5);
    this.add.image(gameWidth / 2, gameHeight - 12, "credits").setOrigin(0.5);
    this.pressEnter = this.add.image(gameWidth / 2, gameHeight - 60, "enter").setOrigin(0.5);

    this.time.addEvent({
      delay: 700,
      callback: this.blinkText,
      callbackScope: this,
      loop: true
    });

    this.startKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.startKey.on("down", this.startGame, this);
    this.state = 1;
  }

  blinkText() {
    this.pressEnter.alpha = this.pressEnter.alpha ? 0 : 1;
  }

  update() {
    this.bgMountains.tilePositionX -= 0.2;
  }

  startGame() {
    if (this.state === 1) {
      this.state = 2;
      this.add.image(gameWidth / 2, 40, "instructions").setOrigin(0.5, 0);
      this.title.destroy();
      return;
    }
    this.scene.start("PlayGame");
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  create() {
    if (music && music.isPlaying) {
      music.stop();
    }

    this.bgMoon = this.add.tileSprite(0, 0, gameWidth, gameHeight, "bg-moon").setOrigin(0, 0).setScrollFactor(0);
    this.bgMountains = this.add.tileSprite(0, 0, gameWidth, gameHeight, "bg-mountains").setOrigin(0, 0).setScrollFactor(0);

    this.add.image(gameWidth / 2, 100, "game-over").setOrigin(0.5);
    this.add.image(gameWidth / 2, gameHeight - 12, "credits").setOrigin(0.5);
    this.pressEnter = this.add.image(gameWidth / 2, gameHeight - 40, "enter").setOrigin(0.5);

    this.time.addEvent({
      delay: 700,
      callback: this.blinkText,
      callbackScope: this,
      loop: true
    });

    this.startKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.startKey.on("down", () => this.scene.start("PlayGame"));
  }

  blinkText() {
    this.pressEnter.alpha = this.pressEnter.alpha ? 0 : 1;
  }

  update() {
    this.bgMountains.tilePositionX -= 0.2;
  }
}

class PlayGameScene extends Phaser.Scene {
  constructor() {
    super("PlayGame");
    this.spawners = [];
  }

  create() {
    hurtFlag = false;
    jumpingFlag = false;
    attackingFlag = false;

    this.createBackgrounds();
    this.createTileMap();
    this.createAnimations();
    this.populate();
    this.bindKeys();
    this.createPlayer(6, 9);
    this.createHitbox();
    this.startAudios();

    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(player, true, 1, 1);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.physics.add.collider(enemiesGroup, this.layerCollisions);
    this.physics.add.collider(player, this.layerCollisions);
    this.physics.add.overlap(hitbox, enemiesGroup, this.triggerAttack, null, this);
    this.physics.add.overlap(player, enemiesGroup, this.hurtPlayer, null, this);
  }

  startAudios() {
    this.audioKill = this.sound.add("kill");
    this.audioAttack = this.sound.add("attack");
    this.audioRise = this.sound.add("rise");
    audioHurt = this.sound.add("hurt");
    this.audioJump = this.sound.add("jump");

    music = this.sound.add("music", { loop: true });
    music.play();
  }

  createHitbox() {
    hitbox = this.add.zone(player.x + 39, player.y + 16, 30, 16);
    this.physics.add.existing(hitbox);
    hitbox.body.setAllowGravity(false);
    hitbox.body.setImmovable(true);
  }

  updateHitboxPosition() {
    const offset = player.flipX ? -39 : 39;
    hitbox.setPosition(player.x + offset, player.y + 16);
  }

  populate() {
    enemiesGroup = this.physics.add.group({ runChildUpdate: true });

    this.addSkeletonSpawner(17, 12, true);
    this.addSkeletonSpawner(10, 12, false);
    this.addSkeletonSpawner(80, 12, false);
    this.addSkeletonSpawner(147, 12, false);
    this.addSkeletonSpawner(162, 12, true);
    this.addSkeletonSpawner(200, 12, false);
    this.addSkeletonSpawner(210, 12, true);
    this.addSkeletonSpawner(244, 12, false);
    this.addSkeletonSpawner(254, 12, true);
    this.addSkeletonSpawner(270, 12, false);

    this.addHellGato(53, 11);
    this.addHellGato(86, 11);
    this.addHellGato(147, 11);
    this.addHellGato(201, 11);

    this.addHellGhost(111, 7);
    this.addHellGhost(173, 6);
    this.addHellGhost(220, 7);
    this.addHellGhost(263, 7);
    this.addHellGhost(284, 7);
  }

  addHellGato(x, y) {
    enemiesGroup.add(new HellGato(this, x, y));
  }

  addHellGhost(x, y) {
    enemiesGroup.add(new Ghost(this, x, y));
  }

  addSkeletonSpawner(x, y, spawnInFront) {
    this.spawners.push(new SkeletonSpawner(this, x, y, spawnInFront));
  }

  addSkeleton(x, y) {
    enemiesGroup.add(new Skeleton(this, x, y));
  }

  bindKeys() {
    this.keys = this.input.keyboard.addKeys({
      jump: Phaser.Input.Keyboard.KeyCodes.C,
      jump2: Phaser.Input.Keyboard.KeyCodes.K,
      attack: Phaser.Input.Keyboard.KeyCodes.X,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      crouch: Phaser.Input.Keyboard.KeyCodes.DOWN
    });
  }

  createPlayer(x, y) {
    player = new Player(this, x, y);
  }

  createBackgrounds() {
    this.bgMoon = this.add.tileSprite(0, 0, gameWidth, gameHeight, "bg-moon").setOrigin(0, 0).setScrollFactor(0);
    this.bgMountains = this.add.tileSprite(0, 0, gameWidth, gameHeight, "bg-mountains").setOrigin(0, 0).setScrollFactor(0);
    this.bgGraveyard = this.add.tileSprite(0, 0, gameWidth, gameHeight, "bg-graveyard").setOrigin(0, 0).setScrollFactor(0);
  }

  createTileMap() {
    map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("tileset", "tileset");
    const objects = map.addTilesetImage("objects", "objects");

    this.layerBack = map.createLayer("Back Layer", [tileset, objects], 0, 0);
    this.layerMain = map.createLayer("Main Layer", [tileset, objects], 0, 0);
    this.layerCollisions = map.createLayer("Collisions Layer", [tileset, objects], 0, 0);

    this.layerCollisions.setCollision([1]);
    this.layerCollisions.setVisible(false);
    this.setTopCollisionTiles(2);
  }

  setTopCollisionTiles(tileIndex) {
    const tiles = this.layerCollisions.getTilesWithin();
    tiles.forEach((tile) => {
      if (tile && tile.index === tileIndex) {
        tile.setCollision(false, false, true, false);
      }
    });
  }

  createAnimations() {
    if (this.anims.exists("idle")) {
      return;
    }

    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNames("atlas", { prefix: "hero-idle-", start: 1, end: 4 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "run",
      frames: this.anims.generateFrameNames("atlas", { prefix: "hero-run-", start: 1, end: 6 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "jump",
      frames: this.anims.generateFrameNames("atlas", { prefix: "hero-jump-", start: 1, end: 2 }),
      frameRate: 4,
      repeat: 0
    });

    this.anims.create({
      key: "fall",
      frames: this.anims.generateFrameNames("atlas", { prefix: "hero-jump-", start: 3, end: 4 }),
      frameRate: 12,
      repeat: -1
    });

    this.anims.create({
      key: "attack",
      frames: this.anims.generateFrameNames("atlas", { prefix: "hero-attack-", start: 1, end: 5 }),
      frameRate: 12,
      repeat: 0
    });

    this.anims.create({
      key: "crouch",
      frames: [{ key: "atlas", frame: "hero-crouch" }],
      frameRate: 4,
      repeat: 0
    });

    this.anims.create({
      key: "hurt",
      frames: [{ key: "atlas", frame: "hero-hurt" }],
      frameRate: 4,
      repeat: 0
    });

    this.anims.create({
      key: "hell-gato-run",
      frames: this.anims.generateFrameNames("atlas", { prefix: "hell-gato-", start: 1, end: 4 }),
      frameRate: 9,
      repeat: -1
    });

    this.anims.create({
      key: "ghost-float",
      frames: this.anims.generateFrameNames("atlas", { prefix: "ghost-halo-", start: 1, end: 4 }),
      frameRate: 9,
      repeat: -1
    });

    this.anims.create({
      key: "skeleton-rise",
      frames: this.anims.generateFrameNames("atlas", { prefix: "skeleton-rise-clothed-", start: 1, end: 6 }),
      frameRate: 7,
      repeat: 0
    });

    this.anims.create({
      key: "skeleton-walk",
      frames: this.anims.generateFrameNames("atlas", { prefix: "skeleton-clothed-", start: 1, end: 8 }),
      frameRate: 7,
      repeat: -1
    });

    this.anims.create({
      key: "enemy-death",
      frames: this.anims.generateFrameNames("atlas", { prefix: "enemy-death-", start: 1, end: 5 }),
      frameRate: 16,
      repeat: 0
    });
  }

  triggerAttack(_hitbox, enemy) {
    if (!player || !enemy.active) {
      return;
    }

    if (this.keys.attack.isDown && !jumpingFlag) {
      enemy.destroy();
      new EnemyDeath(this, enemy.x, enemy.y - 16);
      this.audioKill.play();
    }
  }

  hurtPlayer() {
    if (!player || hurtFlag) {
      return;
    }

    hurtFlag = true;
    player.anims.play("hurt", true);
    player.setVelocityY(-150);
    player.setVelocityX(player.flipX ? 100 : -100);
    audioHurt.play();
  }

  hurtFlagManager() {
    if (hurtFlag && player.body.blocked.down) {
      hurtFlag = false;
    }
  }

  parallaxBackground() {
    const camX = this.cameras.main.scrollX;
    this.bgMountains.tilePositionX = camX * 0.07;
    this.bgGraveyard.tilePositionX = camX * 0.25;
  }

  movePlayer() {
    if (!player || hurtFlag || attackingFlag) {
      return;
    }

    const vel = 150;
    const onFloor = player.body.blocked.down;

    if (onFloor) {
      jumpingFlag = false;
    }

    if (jumpingFlag) {
      if (player.body.velocity.y > 10) {
        player.anims.play("fall", true);
      }
    } else if (this.keys.left.isDown) {
      player.setVelocityX(-vel);
      player.setFlipX(true);
      player.anims.play("run", true);
    } else if (this.keys.right.isDown) {
      player.setVelocityX(vel);
      player.setFlipX(false);
      player.anims.play("run", true);
    } else {
      player.setVelocityX(0);
      if (this.keys.crouch.isDown) {
        player.anims.play("crouch", true);
      } else {
        player.anims.play("idle", true);
      }
    }

    if ((this.keys.jump.isDown || this.keys.jump2.isDown) && onFloor) {
      player.setVelocityY(-170);
      player.anims.play("jump", true);
      this.audioJump.play();
      jumpingFlag = true;
    }

    if (this.keys.attack.isDown && onFloor) {
      player.setVelocityX(0);
      player.anims.play("attack", true);
      attackingFlag = true;
      this.audioAttack.play();
    }
  }

  update() {
    this.parallaxBackground();
    this.updateHitboxPosition();

    for (let i = this.spawners.length - 1; i >= 0; i -= 1) {
      const spawner = this.spawners[i];
      if (!spawner.active) {
        this.spawners.splice(i, 1);
        continue;
      }
      spawner.step();
    }

    this.movePlayer();
    this.hurtFlagManager();

    if (player && player.x > 295 * 16) {
      this.scene.start("GameOver");
    }
  }
}

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x * 16, y * 16, "atlas", "hero-idle-1");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.initX = this.x;
    this.initY = this.y;
    this.setOrigin(0.5);
    this.body.setSize(22, 39);
    this.body.setOffset(41, 19);
    this.body.setGravityY(300);

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim) => {
      if (anim.key === "attack") {
        attackingFlag = false;
      }
    });

    this.anims.play("idle");
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    if (this.y > 172) {
      if (audioHurt) {
        audioHurt.play();
      }
      this.setPosition(this.initX, this.initY);
      this.setVelocity(0, 0);
    }
  }
}

class HellGato extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x * 16, y * 16, "atlas", "hell-gato-1");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.xDir = -1;
    this.speed = 90;
    this.turnTimerTrigger = 200;
    this.turnTimer = this.turnTimerTrigger;
    this.setOrigin(0.5);
    this.body.setSize(45, 25);
    this.body.setOffset(23, 28);
    this.body.setGravityY(500);
    this.anims.play("hell-gato-run");
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    this.setVelocityX(this.speed * this.xDir);
    this.setFlipX(this.body.velocity.x > 0);

    if (this.turnTimer <= 0) {
      this.turnTimer = this.turnTimerTrigger;
      this.xDir *= -1;
    } else {
      this.turnTimer -= 1;
    }
  }
}

class Ghost extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x * 16, y * 16, "atlas", "ghost-halo-1");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.startY = this.y;
    this.setOrigin(0.5);
    this.body.setAllowGravity(false);
    this.body.setSize(14, 33);
    this.body.setOffset(10, 14);
    this.anims.play("ghost-float");

    scene.tweens.add({
      targets: this,
      y: this.startY + 50,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Linear"
    });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!player) {
      return;
    }
    this.setFlipX(this.x > player.x);
  }
}

class SkeletonSpawner extends Phaser.GameObjects.Zone {
  constructor(scene, x, y, spawnInFront) {
    super(scene, x * 16, y * 16, 8, 8);
    scene.add.existing(this);
    this.spawnInFront = spawnInFront;
  }

  step() {
    if (!player || !this.active) {
      return;
    }

    if (this.spawnInFront) {
      if (player.x > this.x - (9 * 16)) {
        enemiesGroup.add(new Skeleton(this.scene, this.x / 16, (this.y / 16) - (30 / 16)));
        this.destroy();
      }
      return;
    }

    if (player.x > this.x + (6 * 16)) {
      enemiesGroup.add(new Skeleton(this.scene, this.x / 16, (this.y / 16) - (30 / 16)));
      this.destroy();
    }
  }
}

class Skeleton extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x * 16, y * 16, "atlas", "skeleton-clothed-1");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.xDir = -1;
    this.speed = 0;
    this.setOrigin(0.5);
    this.body.setSize(18, 34);
    this.body.setOffset(15, 10);
    this.body.setGravityY(500);

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim) => {
      if (anim.key === "skeleton-rise") {
        this.speed = 20;
        this.anims.play("skeleton-walk");
      }
    });

    this.anims.play("skeleton-rise");
    scene.sound.play("rise");
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    this.setVelocityX(this.speed * this.xDir);
    if (!player) {
      return;
    }

    if (this.x > player.x) {
      this.xDir = -1;
      this.setFlipX(false);
    } else {
      this.xDir = 1;
      this.setFlipX(true);
    }
  }
}

class EnemyDeath extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "atlas", "enemy-death-1");
    scene.add.existing(this);

    this.setOrigin(0.5);
    this.play("enemy-death");
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.destroy();
    });
  }
}

window.addEventListener("load", () => {
  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    width: gameWidth,
    height: gameHeight,
    pixelArt: true,
    parent: "gameDiv",
    backgroundColor: "#000000",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: gameWidth,
      height: gameHeight
    },
    scene: [BootScene, PreloadScene, TitleScreenScene, PlayGameScene, GameOverScene]
  });
});
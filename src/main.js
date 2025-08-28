class MainScene extends Phaser.Scene {
  constructor() { super('main'); }

  preload() {
    // TODO: charger sprites (temporaire : on fera des rectangles)
  }

  create() {
    // Monde 2D simple
    this.physics.world.setBounds(0, 0, 2000, 600);

    // Sol
    const ground = this.add.rectangle(1000, 580, 2000, 40, 0x444444);
    this.physics.add.existing(ground, true); // static

    // Joueur (placeholder)
    this.player = this.add.rectangle(200, 520, 24, 32, 0x2cf6b3);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);

    // Contrôles clavier
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyAttack = this.input.keyboard.addKey('J');

    // Caméra
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Stats de base
    this.playerStats = {
      class: 'WARRIOR', // ARCHER | WARRIOR | SORCERER
      speed: 200,
      jump: -360,
      xp: 0, level: 1, xpToLevel: 100,
      coins: 0, inventory: {}
    };

    // UI classe (3 boutons)
    this.addClassUI();
  }

  addClassUI() {
    const makeBtn = (txt, x) => {
      const b = this.add.text(x, 40, txt, { font: '16px Arial', color: '#F8E16C', backgroundColor: '#156064' })
        .setPadding(6).setInteractive().setScrollFactor(0);
      b.on('pointerdown', () => { this.playerStats.class = txt.toUpperCase(); this.hideClassUI(); });
      return b;
    };
    this.btnArcher = makeBtn('Archer', 40);
    this.btnWarrior = makeBtn('Warrior', 140);
    this.btnMage = makeBtn('Sorcerer', 260);
  }

  hideClassUI() {
    [this.btnArcher, this.btnWarrior, this.btnMage].forEach(b => b.destroy());
  }

  update(_, dtMs) {
    const dt = dtMs / 1000;
    const body = this.player.body;
    if (!body) return;

    // Déplacements
    let vx = 0;
    if (this.cursors.left.isDown)  vx = -this.playerStats.speed;
    if (this.cursors.right.isDown) vx =  this.playerStats.speed;
    body.setVelocityX(vx);

    // Saut
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && body.blocked.down) {
      body.setVelocityY(this.playerStats.jump);
    }

    // Attaque (placeholder)
    if (Phaser.Input.Keyboard.JustDown(this.keyAttack)) {
      // TODO: proj/Slash selon la classe
      // this.spawnProjectile(); ou this.spawnSlash();
    }

    // TODO: spawner monstres aléatoires + collisions + loot + XP
  }
}

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game',
  backgroundColor: '#19323C',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 900 }, debug: false }
  },
  scene: [MainScene]
};

new Phaser.Game(config);

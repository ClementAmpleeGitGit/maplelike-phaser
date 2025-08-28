(function(){
  const COLORS = {
    bg: 0x19323C, player: 0x2CF6B3, enemy: 0x982649, ground: 0x444444,
    coin: 0xF8E16C, item: 0x65B891, projectile: 0xF8E16C, slash: 0xF8E16C
  };

  class MainScene extends Phaser.Scene {
    constructor(){ super('main'); }
    preload(){}

    create() {
      this.physics.world.setBounds(0, 0, 2400, 640);
      const ground = this.add.rectangle(1200, 610, 2400, 60, COLORS.ground);
      this.physics.add.existing(ground, true);

      this.player = this.add.rectangle(200, 520, 24, 32, COLORS.player);
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);
      this.physics.add.collider(this.player, ground);

      this.cameras.main.setBackgroundColor(COLORS.bg);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 150);
      this.cameras.main.setBounds(0, 0, 2400, 640);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyAttack = this.input.keyboard.addKey('J');
      this.keyForceEnemy = this.input.keyboard.addKey('K'); // debug

      this.enemies = this.physics.add.group();
      this.projectiles = this.physics.add.group();
      this.slashes = this.physics.add.group();
      this.coins = this.physics.add.group({ allowGravity: false });
      this.items = this.physics.add.group({ allowGravity: false });

      this.physics.add.collider(this.enemies, ground);
      this.physics.add.collider(this.projectiles, ground, (p)=>p.destroy());
      this.physics.add.collider(this.slashes, ground, (s)=>s.destroy());

      this.physics.add.overlap(this.projectiles, this.enemies, (proj, enemy)=>{ this.damageEnemy(enemy, proj.damage ?? 20); proj.destroy(); });
      this.physics.add.overlap(this.slashes, this.enemies, (slash, enemy)=>{
        if (!enemy.__slashedOnce) {
          enemy.__slashedOnce = true;
          this.damageEnemy(enemy, slash.damage ?? 30);
          this.time.delayedCall(100, ()=> enemy.__slashedOnce = false);
        }
      });
      this.physics.add.overlap(this.player, this.coins, (_p, coin)=>{ this.playerStats.coins += coin.amount ?? 1; coin.destroy(); });
      this.physics.add.overlap(this.player, this.items, (_p, it)=>{
        const id = it.itemId ?? 'potion';
        const qty = it.qty ?? 1;
        this.playerStats.inventory[id] = (this.playerStats.inventory[id]||0) + qty;
        it.destroy();
      });

      this.playerStats = {
        class: 'WARRIOR', facing: 1, speed: 210, jump: -360,
        xp: 0, level: 1, xpToLevel: 100, coins: 0, inventory: {}
      };

      this.ui = {
        stats: this.add.text(12, 70, '', { font: '14px Arial', color: '#FFFFFF' }).setScrollFactor(0),
        dbg: this.add.text(12, 130, '', { font: '12px Arial', color: '#F8E16C' }).setScrollFactor(0)
      };
      this.updateUI();

      this.installClassButtons();

      // Spawn immédiat de 2 ennemis VISIBLES + timer régulier
      this.spawnEnemy(true);
      this.spawnEnemy(true);
      this.time.addEvent({ delay: 1500, loop: true, callback: ()=> this.spawnEnemy(false) });

      // Plateformes
      this.platforms = this.physics.add.staticGroup();
      const p1 = this.platforms.create(600, 470, null).setDisplaySize(220, 20).refreshBody();
      const p2 = this.platforms.create(1100, 380, null).setDisplaySize(220, 20).refreshBody();
      const p3 = this.platforms.create(1700, 480, null).setDisplaySize(260, 20).refreshBody();
      [p1,p2,p3].forEach(p=> this.add.rectangle(p.x, p.y, p.displayWidth, p.displayHeight, COLORS.ground).setDepth(-1));
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.collider(this.enemies, this.platforms);
    }

    installClassButtons(){
      const $ = (id)=>document.getElementById(id);
      const hide = ()=>['btn-archer','btn-warrior','btn-sorcerer'].forEach(id=>{ const el=$(id); if (el) el.style.display='none'; });
      const set = (cls)=>{ this.playerStats.class = cls; console.log('Class set to', cls); hide(); };

      const bA = $('btn-archer'), bW = $('btn-warrior'), bS = $('btn-sorcerer');
      if (bA) bA.onclick = ()=> set('ARCHER');
      if (bW) bW.onclick = ()=> set('WARRIOR');
      if (bS) bS.onclick = ()=> set('SORCERER');

      // aide visuelle si les boutons existent
      if (!bA || !bW || !bS) {
        this.add.text(12, 12, 'Boutons classe introuvables (overlay). Vérifie index.html.', { font:'14px Arial', color:'#ff6666' }).setScrollFactor(0);
      }
    }

    update(_, dtMs){
      const body = this.player.body;
      if (!body) return;

      let vx = 0;
      if (this.cursors.left.isDown)  vx = -this.playerStats.speed;
      if (this.cursors.right.isDown) vx =  this.playerStats.speed;
      body.setVelocityX(vx);
      if (vx !== 0) this.playerStats.facing = (vx>0)?1:-1;

      if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && body.blocked.down) {
        body.setVelocityY(this.playerStats.jump);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keyAttack)) {
        (this.playerStats.class === 'ARCHER' || this.playerStats.class === 'SORCERER') ? this.spawnProjectile() : this.spawnSlash();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyForceEnemy)) {
        this.spawnEnemy(true);
      }

      if (!this.__uiTick || this.time.now - this.__uiTick > 150) {
        this.__uiTick = this.time.now;
        this.updateUI();
      }
    }

    spawnProjectile() {
      const speed = (this.playerStats.class === 'ARCHER') ? 420 : 360;
      const dmg = (this.playerStats.class === 'ARCHER') ? 18 : 24;
      const x = this.player.x + (this.playerStats.facing>0 ? 18 : -18);
      const y = this.player.y - 2;
      const proj = this.add.circle(x, y, 4, COLORS.projectile);
      this.physics.add.existing(proj);
      proj.body.allowGravity = false;
      proj.body.setVelocityX(speed * this.playerStats.facing);
      proj.damage = dmg;
      this.projectiles.add(proj);
      this.time.delayedCall(1800, ()=> proj.destroy());
    }

    spawnSlash() {
      const slash = this.add.rectangle(
        this.player.x + (this.playerStats.facing>0 ? 24 : -24),
        this.player.y - 4, 26, 16, COLORS.slash, 1
      );
      this.physics.add.existing(slash);
      slash.body.allowGravity = false;
      slash.damage = 30;
      this.slashes.add(slash);
      this.time.delayedCall(150, ()=> slash.destroy());
    }

    // spawnNear = true => toujours dans la vue caméra
    spawnEnemy(spawnNear){
      if (this.enemies.getChildren().length >= 12) return;

      let ex, ey = 560;
      if (spawnNear) {
        const cam = this.cameras.main;
        const left = cam.worldView.x + 40;
        const right = cam.worldView.x + cam.worldView.width - 40;
        ex = Phaser.Math.Between(left, right);
      } else {
        const px = this.player.x;
        ex = Phaser.Math.Clamp(Phaser.Math.Between(px - 300, px + 300), 60, 2340);
      }

      const enemy = this.add.rectangle(ex, ey, 26, 26, COLORS.enemy);
      this.physics.add.existing(enemy);
      enemy.body.setCollideWorldBounds(true);
      enemy.hp = Phaser.Math.Between(40, 70);
      enemy.speed = Phaser.Math.Between(60, 90);
      enemy.dir = Math.random()<0.5 ? -1 : 1;
      this.enemies.add(enemy);

      enemy.__aiTimer = this.time.addEvent({
        delay: Phaser.Math.Between(800, 1400), loop: true, callback: ()=> {
          const dist = Math.abs(this.player.x - enemy.x);
          if (dist < 220) enemy.dir = (this.player.x > enemy.x) ? 1 : -1;
          else if (Math.random() < 0.3) enemy.dir *= -1;
        }
      });

      enemy.update = ()=> {
        const b = enemy.body; if (!b) return;
        b.setVelocityX(enemy.dir * enemy.speed);
        if (b.blocked.left) enemy.dir = 1;
        if (b.blocked.right) enemy.dir = -1;
      };
    }

    damageEnemy(enemy, dmg){
      if (!enemy || !enemy.body) return;
      enemy.hp -= dmg;
      enemy.body.velocity.x += 20 * (this.playerStats.facing);
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }

    killEnemy(enemy){
      if (enemy.__aiTimer) enemy.__aiTimer.remove(false);
      const coins = Phaser.Math.Between(1, 4);
      for (let i=0;i<coins;i++){
        const c = this.add.circle(enemy.x + Phaser.Math.Between(-8,8), enemy.y - 8, 4, COLORS.coin);
        this.physics.add.existing(c);
        c.amount = 1;
        c.body.setVelocity(Phaser.Math.Between(-60,60), Phaser.Math.Between(-140,-80));
        c.body.setBounce(0.4);
        c.body.setCollideWorldBounds(true);
        this.coins.add(c);
      }
      if (Math.random() < 0.25) {
        const it = this.add.rectangle(enemy.x, enemy.y-14, 10, 10, COLORS.item);
        this.physics.add.existing(it);
        it.body.setCollideWorldBounds(true);
        it.body.setBounce(0.3);
        it.itemId = 'potion';
        it.qty = 1;
        this.items.add(it);
      }
      this.addXP(Phaser.Math.Between(16, 26));
      enemy.destroy();
    }

    addXP(amount){
      this.playerStats.xp += amount;
      while (this.playerStats.xp >= this.playerStats.xpToLevel){
        this.playerStats.xp -= this.playerStats.xpToLevel;
        this.playerStats.level += 1;
        this.playerStats.xpToLevel = Math.round(this.playerStats.xpToLevel * 1.5);
        this.playerStats.speed += 6;
      }
    }

    updateUI(){
      const inv = Object.entries(this.playerStats.inventory).map(([k,v])=>`${k}:${v}`).join('  ');
      this.ui.stats.setText(
        `Class: ${this.playerStats.class}   Coins: ${this.playerStats.coins}\n` +
        `Level: ${this.playerStats.level}   XP: ${this.playerStats.xp}/${this.playerStats.xpToLevel}\n` +
        (inv ? `Inventory: ${inv}` : `Inventory: (vide)`) +
        `\nControls: ←/→ move, ↑ jump, J attack, K spawn ennemi`
      );
      this.ui.dbg.setText(`#Enemies: ${this.enemies.getChildren().length}`);
      this.enemies.getChildren().forEach(e=> e.update && e.update());
    }
  }

  const config = {
    type: Phaser.AUTO, width: 960, height: 540, parent: 'game',
    backgroundColor: '#19323C',
    physics: { default: 'arcade', arcade: { gravity: { y: 900 }, debug: false } },
    scene: [MainScene]
  };
  new Phaser.Game(config);
})();

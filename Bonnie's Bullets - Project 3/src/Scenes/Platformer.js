class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.BULLET_SPEED = 600;
        this.MAX_BULLETS = 10; // Initialize the maximum number of bullets
        this.RELOAD_TIME = 2000; // Reload time in milliseconds
        this.isReloading = false; // Track if reloading is in progress
        this.BEE_SPEED = 200;
        this.BEE_MOVEMENT_RANGE = 20; // Range in pixels above and below the spawn point
        this.MAX_PUMPKINS = 3;
        this.pumpkinsCollected = 0;
        this.playerHeatlh = 3;


        // Define bee spawn positions
        this.BEE_SPAWN_POSITIONS = [
            { x: 500, y: 200 },
            { x: 540, y: 190 },
            { x: 900, y: 150 },
            { x: 800, y: 150 },

            // Add more positions as needed
        ];
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("Bonnie's-Bullets", 18, 18, 90, 20);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset_farm = this.map.addTilesetImage("farm-n-stuff", "tilemap_tiles");
        this.tileset_other = this.map.addTilesetImage("Bonnie-Assets", "other_tilemap_tiles");

        // Create a layer
        this.skyLayer = this.map.createLayer("Sky", this.tileset_other, 0, 0);
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset_farm, 0, 0);
        this.secondLayer = this.map.createLayer("Tile Layer 2", this.tileset_farm, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        

        // TODO: Add createFromObjects here
        this.pumpkins = this.map.createFromObjects("Objects", {
            name: "pumpkin",
            key: "tilemap_sheet",
            frame: 5
        });

        this.bees = this.physics.add.group();

        // TODO: Add turn into Arcade Physics here
        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.pumpkins, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.pumpkinGroup = this.add.group(this.pumpkins);

        // Bullet group
        this.bullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: this.MAX_BULLETS,
            createCallback: (bullet) => {
                bullet.body.allowGravity = false;
            }
        });

        // Set the initial bullets left value
        this.bulletsLeft = this.MAX_BULLETS;

        // Create the text object for bullets left
        this.bulletText = this.add.text(0, 0, `BULLETS X ${this.bulletsLeft}`, {
            font: '18px Arial',
            fill: '#ffffff'
        });

        this.pumpkinText = this.add.text(200, 0, `PUMPKINS X ${this.pumpkinsCollected} / ${this.MAX_PUMPKINS}`, {
            font: '18px Arial',
            fill: '#ffffff'
        });

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(20, 250, "tile_0040.png");
        my.sprite.player.setCollideWorldBounds(true);

        my.sprite.player.setSize(my.sprite.player.width / 2, my.sprite.player.height / 2);
        my.sprite.player.setOffset(my.sprite.player.width - 31.5, my.sprite.player.height - 33);

        // Spawn multiple bees
        this.BEE_SPAWN_POSITIONS.forEach(pos => {
            this.spawnBEE(pos.x, pos.y);
        });

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // TODO: Add coin collision handler
        // Handle collision detection with coins
        this.physics.add.overlap(my.sprite.player, this.pumpkinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove pumpkin on overlap
            this.pumpkinsCollected++;
            if (this.pumpkinsCollected >= this.MAX_PUMPKINS) {
                this.handleVictory();
            }
            this.updatePumpkinText();
        });

        //handle collisions between players and bees
        this.physics.add.overlap(my.sprite.player, this.bees, this.playerHitByBee, null, this);

        //handle collisions between bullets and bees
        this.physics.add.overlap(this.bullets, this.bees, this.beeHitByBullet, null, this);

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.rKey = this.input.keyboard.addKey('R');
        this.reloadKey = this.input.keyboard.addKey('F'); // Add reload key

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true;
            this.physics.world.debugGraphic.clear();
        }, this);

        // TODO: Add movement vfx here
        // movement vfx
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_01.png', 'smoke_08.png'],
            scale: {start: 0.03, end: 0.1},
            lifespan: 350,
            alpha: {start: 1, end: 0.1},
        });
        my.vfx.walking.stop();

        // Initial shot sprite
        this.initialShot = this.add.sprite(0, 0, 'initial_shot');
        this.initialShot.setVisible(false);

        // TODO: add camera code here
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.1, 0.1); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        // Disable gravity for bullets
        this.bullets.children.iterate(function (bullet) {
            bullet.body.allowGravity = false;
        });
    }

    update() {
        if (cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth / 2 - 10, my.sprite.player.displayHeight / 2 - 5, false);
            my.vfx.walking.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else if (cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth / 2 - 10, my.sprite.player.displayHeight / 2 - 5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if (!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if (my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.sound.play("jump", {
                volume: 1
            });
        }


        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }

        // Reload mechanic
        if (Phaser.Input.Keyboard.JustDown(this.reloadKey) && !this.isReloading) {
            this.reloadBullets();
        }

        // Shooting mechanic
        if (Phaser.Input.Keyboard.JustDown(this.spacebar) && !this.isReloading && this.bulletsLeft > 0) {
            this.shootBullet();
            
        }

        // Update bullets
        this.bullets.children.each(function (bullet) {
            if (bullet.active && (bullet.x > this.physics.world.bounds.width || bullet.x < 0)) {
                bullet.setActive(false);
                bullet.setVisible(false);
            }
        }, this);

        this.bees.children.iterate(function (bee) {
            if (bee && bee.active) {
                bee.setVelocityY(this.BEE_SPEED * bee.direction.y);

                if (bee.y < bee.minY) {
                    bee.y = bee.minY;
                    bee.direction.y = 1;
                } else if (bee.y > bee.maxY) {
                    bee.y = bee.maxY;
                    bee.direction.y = -1;
                }
            }
        }, this);

        if (this.playerHealth <= 0) {
            this.gameOver();
        }

        // Update bullet text position with camera
        const camera = this.cameras.main;
        const textPositionX = camera.worldView.x; // 10 pixels from the left edge of the camera's visible area
        const textPositionY = camera.worldView.y; // 10 pixels from the top edge of the camera's visible area
        this.bulletText.setPosition(textPositionX, textPositionY);
        this.pumpkinText.setPosition(textPositionX + 200, textPositionY);
    }

    updatePumpkinText() {
        this.pumpkinText.setText(`PUMPKINS X ${this.pumpkinsCollected} / ${this.MAX_PUMPKINS}`);
    }

    handleVictory() {
        my.sprite.player.setVelocity(0);
        my.sprite.player.anims.stop();

        const victoryText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Victory!', {
            font: '48px Arial',
            fill: '#ffffff'
        });

        this.input.keyboard.enabled = false;
    }

    spawnBEE(x, y) {
        let bee = this.bees.create(x, y, 'initial_bee');
        bee.play('bee_fly');
        bee.body.allowGravity = false;
        bee.direction = new Phaser.Math.Vector2(0, 1);
        bee.minY = y - this.BEE_MOVEMENT_RANGE;
        bee.maxY = y + this.BEE_MOVEMENT_RANGE;
    }

    playerHitByBee(player, bee) {
        console.log('Player hit by bee!');
    }

    beeHitByBullet(bullet, bee) {
        bullet.setActive(false);
        bullet.setVisible(false);
        bee.destroy();
        console.log('Bee hit by bullet!');
    }

    playerHitByBee(player, bee) {
        this.playerHeatlh--;
    }

    shootBullet() {
        if (this.bulletsLeft > 0) { // Check if bullets are available
            // Flash the initial shot
            const xOffset = my.sprite.player.flipX ? -10 : 14;
            this.initialShot.setPosition(my.sprite.player.x + xOffset, my.sprite.player.y);
            this.initialShot.setVisible(true);
            this.time.delayedCall(100, () => {
                this.initialShot.setVisible(false);
            });

            // Get a bullet from the bullets group
            let bullet = this.bullets.get(my.sprite.player.x, my.sprite.player.y);
            if (bullet) {
                bullet.setActive(true);
                bullet.setVisible(true);

                // Reset bullet properties
                bullet.body.allowGravity = false;

                if (my.sprite.player.flipX){
                    bullet.body.velocity.x = -this.BULLET_SPEED;
                } else {
                    bullet.body.velocity.x = this.BULLET_SPEED;
                }
                this.bulletsLeft--;
                this.updateBulletText();
            }
        }
    }

    reloadBullets() {
        this.isReloading = true;
        this.bulletText.setText(`RELOADING...`);

        this.time.delayedCall(this.RELOAD_TIME, () => {
            this.bulletsLeft = this.MAX_BULLETS;
            this.updateBulletText();
            this.isReloading = false;
            this.bulletText.setText(`BULLETS X ${this.bulletsLeft}`);
        }, null, this);
    }

    updateBulletText() {
        this.bulletText.setText(`BULLETS X ${this.bulletsLeft}`);
    }

    gameOver() {
        this.scene.start("gameOverScene")
    }
}

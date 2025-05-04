import * as me from "melonjs";
import game from "./../game.js";

class PlayerUnit extends me.Entity {
    constructor(x, y, settings) {
        // Appeler le constructeur parent
        super(x, y, settings);

        // set a "player object" type
        this.body.collisionType = me.collision.types.PLAYER_OBJECT;

        // Défini le joueur comme une entité qui peut être déplacée
        this.body.setMaxVelocity(3, 3); // Vitesse maximale de 3 pixels par frame
        this.body.gravity = 0;
        this.body.gravityScale = 0; // Set gravity scale to 0.5 for a slower fall
        this.body.setFriction(0.2, 0.2);


        this.pixelTimer = 0; // Temps écoulé
        this.pixelInterval = 1000; // Générer 1 pixel toutes les 500 ms (0.5 seconde)

        // set a renderable
        this.renderable = new me.Sprite(0, 0, {
            image: me.loader.getImage("character"),
            framewidth: 20, // Set the frame width of the sprite
            frameheight: 20, // Set the frame height of the sprite
        });

        this.renderable.addAnimation("stand", [0], 100);

        // set as default
        this.renderable.setCurrentAnimation("stand");

        // this.anchorPoint.set(0.5, 1.0); // Ancre le joueur au bas de l'image

        // Variable pour suivre si le joueur est sélectionné
        this.isSelected = false;

        // Écouteur de clic
        me.input.registerPointerEvent(
            "pointerdown",
            me.game.viewport,
            (event) => {
                this.targetPos = {
                    x: event.gameWorldX,
                    y: event.gameWorldY
                };
            }
        );

        // Position cible initiale
        this.targetPosition = null;
    }

    update(dt) {
        // Ajoute la logique pour le mouvement ou autres interactions
        if (me.input.isKeyPressed("left")) {
            this.body.vel.x -= (this.body.accel.x * dt) / 1000;
        }
        if (me.input.isKeyPressed("right")) {
            this.body.vel.x += (this.body.accel.x * dt) / 1000;
        }
        if (me.input.isKeyPressed("up")) {
            this.body.vel.y -= (this.body.accel.y * dt) / 1000;
        }
        if (me.input.isKeyPressed("down")) {
            this.body.vel.y += (this.body.accel.y * dt) / 1000;
        }

        if (this.targetPos) {
            const dx = this.targetPos.x - this.pos.x;
            const dy = this.targetPos.y - this.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 4) {
                const angle = Math.atan2(dy, dx);
                this.body.vel.x = Math.cos(angle) * this.body.maxVel.x;
                this.body.vel.y = Math.sin(angle) * this.body.maxVel.y;
            } else {
                this.body.vel.set(0, 0);
                this.targetPos = null;
            }
        }

        this.pixelTimer += dt;

        if (this.pixelTimer >= this.pixelInterval) {
            this.pixelTimer = 0;
        
            // Générer plusieurs pixels (par exemple, 5 à la fois)
            for (let i = 0; i < 5; i++) {
                // Placer les pixels autour du joueur (dans une petite zone)
                const offsetX = Math.floor(Math.random() * 40) - 20; // horizontalement autour du joueur
                const offsetY = Math.floor(Math.random() * 50) - 100; // position verticale décalée un peu au-dessus du joueur
        
                const pixelX = this.pos.x + offsetX;
                const pixelY = this.pos.y + offsetY; // S'assure que les pixels sont au-dessus du joueur (ajusté pour ne pas être exactement à la même hauteur)
        
                // Générer le pixel et l'ajouter au monde
                const pixel = me.pool.pull("pixel", pixelX, pixelY);
                me.game.world.addChild(pixel, 1);
            }
        }
        
        // Appelle la méthode update du parent pour gérer les collisions et autres
        super.update(dt);
        return true;
    }
}

export default PlayerUnit;

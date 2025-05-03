import * as me from "melonjs";
import game from "./../game.js";

class PlayerUnit extends me.Entity {
    constructor(x, y, settings) {
        // Appeler le constructeur parent
        super(x, y, settings);

        // set a "player object" type
        this.body.collisionType = me.collision.types.PLAYER_OBJECT;

        // Défini le joueur comme une entité qui peut être déplacée
        this.body.setMaxVelocity(3, 15);
        this.body.gravity = 0;
        this.body.gravityScale = 0; // Set gravity scale to 0.5 for a slower fall

        // set a renderable
        this.renderable = new me.Sprite(0, 0, {
            image: me.loader.getImage("character"),
            framewidth: 20, // Set the frame width of the sprite
            frameheight: 20, // Set the frame height of the sprite
        });

        this.renderable.addAnimation("stand", [0], 100);

        // set as default
        this.renderable.setCurrentAnimation("stand");
        // set the viewport to follow this renderable on both axis, and enable damping
        // me.game.viewport.follow(this, me.game.viewport.AXIS.BOTH, 0.1);
        // set the viewport fix position
        me.game.viewport.centerOn(0, 800);

        this.anchorPoint.set(0.5, 1.0); // Ancre le joueur au bas de l'image

        // Variable pour suivre si le joueur est sélectionné
        this.isSelected = false;

        // Écouteur d'événements pour la sélection du joueur
        // me.input.bindPointer(me.input.pointer.LEFT, "leftClick", true);

        // Écouteur de clic
        me.input.registerPointerEvent(
            "pointerdown",
            me.game.viewport,
            (event) => {
                console.log("Clic détecté !");
                const worldX = event.gameLocalX - this.width / 2; // Ajuster la position pour centrer le joueur
                const worldY = event.gameLocalY - this.height; // Ajuster la position pour centrer le joueur
                console.log("clic", event);

                this.targetPos = { x: worldX, y: worldY };
            }
        );

        // Écouteur d'événements pour le clic gauche de la souris

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

            // console.log("Distance to target:", distance);
            console.log("actual position:", this.pos.x, this.pos.y);

            const speed = 5; // pixels/frame

            if (distance > 5) {
                this.pos.x += (speed * dx) / distance;
                this.pos.y += (speed * dy) / distance;
            } else {
                this.targetPos = null; // Arrivé
            }
        }

        // Appelle la méthode update du parent pour gérer les collisions et autres
        super.update(dt);
        return true;
    }
}

export default PlayerUnit;

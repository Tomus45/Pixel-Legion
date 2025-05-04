import * as me from "melonjs";
import game from "./../game.js";
import PixelGroup from "./pixel-group";

class PlayerUnit extends me.Entity {
    constructor(x, y, settings) {
        // Appeler le constructeur parent
        super(x, y, settings);

        this.selectable = true;

        // set a "player object" type
        this.body.collisionType = me.collision.types.PLAYER_OBJECT;

        // Défini le joueur comme une entité qui peut être déplacée
        this.body.setMaxVelocity(3, 3); // Vitesse maximale de 3 pixels par frame
        this.body.gravityScale = 0; // Set gravity scale to 0.5 for a slower fall
        this.body.setFriction(0.2, 0.2);

        this.pixelTimer = 0; // Temps écoulé
        this.pixelInterval = 2000; // Générer un group de pixels toutes les 5000 ms (5 seconde)

        // set a renderable
        this.renderable = new me.Sprite(0, 0, {
            image: me.loader.getImage("character"),
            framewidth: 32, // Set the frame width of the sprite
            frameheight: 32, // Set the frame height of the sprite
        });

        this.renderable.addAnimation("stand", [0], 100);

        // set as default
        this.renderable.setCurrentAnimation("stand");

        this.anchorPoint.set(1, 1);

        // Variable pour suivre si le joueur est sélectionné
        this.selectedEntity = null; // Aucune entité sélectionnée par défaut

        // calculer la bounding box world de l’entité
        const halfW = this.renderable.width * this.anchorPoint.x;
        const halfH = this.renderable.height * this.anchorPoint.y;

        this.getWorldBounds = function () {
            return {
                minX: this.pos.x,
                minY: this.pos.y,
                maxX: this.pos.x + halfW + 4,
                maxY: this.pos.y + halfH + 4,
            };
        };

        // trace la bounding box de l’entité
        this.debug = new me.Rect(
            0,
            0,
            this.renderable.width,
            this.renderable.height
        );
        this.debug.pos.x = this.pos.x - halfW;
        this.debug.pos.y = this.pos.y - halfH;

        // Écouteur de clic
        me.input.registerPointerEvent(
            "pointerdown",
            me.game.viewport,
            (event) => {
                if (event.button === 0) {
                    // Vérifie si une entité est cliquée
                    const x = event.gameWorldX;
                    const y = event.gameWorldY;

                    // on récupère tous les 'selectable'…
                    const candidates = me.game.world.getChildByProp(
                        "selectable",
                        true
                    );
                    // on cherche celui dont la box contient le clic
                    const clicked = candidates.find((entity) => {
                        const b = entity.getWorldBounds();
                        return (
                            x >= b.minX &&
                            x <= b.maxX &&
                            y >= b.minY &&
                            y <= b.maxY
                        );
                    });

                    if (clicked) {
                        this.selectedEntity = clicked;
                        console.log("Selected entity:", clicked);
                    } else if (this.selectedEntity) {
                        // Déplacer l'entité sélectionnée vers la position cible
                        this.selectedEntity.targetPos = {
                            x: event.gameWorldX,
                            y: event.gameWorldY,
                        };
                    }
                } else if (event.button === 2) {
                    this.selectedEntity = null;
                }
            }
        );

        // Position cible initiale
        this.targetPosition = null;
    }

    update(dt) {
        // Ajoute la logique pour le mouvement ou autres interactions
        if (this.selectedEntity && this.selectedEntity.targetPos) {
            const dx =
                this.selectedEntity.targetPos.x - this.selectedEntity.pos.x;
            const dy =
                this.selectedEntity.targetPos.y - this.selectedEntity.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 4) {
                const angle = Math.atan2(dy, dx);
                this.selectedEntity.body.vel.x =
                    Math.cos(angle) * this.selectedEntity.body.maxVel.x;
                this.selectedEntity.body.vel.y =
                    Math.sin(angle) * this.selectedEntity.body.maxVel.y;
            } else {
                this.selectedEntity.body.vel.set(0, 0);
                this.selectedEntity.targetPos = null;
            }
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

            // Générer un groupe de pixels
            const pixelGroup = me.pool.pull(
                "pixelGroup",
                this.pos.x - 24,
                this.pos.y,
                5
            ); // 5 pixels dans le groupe
            // Randomize the spawn direction
            // pixelGroup.body.vel.x = (Math.random() - 0.5) * 4; // Random horizontal velocity
            pixelGroup.body.vel.x = Math.random() < 0.5 ? -2 : 2; // Randomize horizontal velocity slightly
            pixelGroup.body.vel.y = Math.random() < 0.5 ? -2 : 2;

            me.game.world.addChild(pixelGroup, 1);
        }

        // Appelle la méthode update du parent pour gérer les collisions et autres
        super.update(dt);
        return true;
    }

}

export default PlayerUnit;

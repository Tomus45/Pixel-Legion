import * as me from "melonjs";
import { handleEnemyBehavior } from "./enemy_behavior.js";

class EnemyUnit extends me.Entity {
    constructor(x, y, settings) {
        super(x, y, settings);

        this.type = "enemy";
        this.selectable = false; // Les ennemis ne sont pas sélectionnables

        this.team = "blue"; // Équipe de l'ennemi
        this.color = settings.color || "#0000ff"; // Couleur par défaut de l'ennemi

        // set a "player object" type
        this.body.collisionType = me.collision.types.PLAYER_OBJECT;

        this.body.setMaxVelocity(2, 2); // Vitesse maximale de 3 pixels par frame
        this.body.gravityScale = 0; // Set gravity scale to 0.5 for a slower fall

        this.startX = this.pos.x; // Position initiale en X
        this.startY = this.pos.y; // Position initiale en Y

        this.isBouncing = false; // Indique si le joueur est en train de rebondir
        this.bounceRadius = 1; // Rayon du rebond
        this.bounceSpeed = 4; // Vitesse du rebond
        this.bounceAngle = 0; // Angle pour le mouvement oscillatoire
        this.bounceDecay = 0.98; // Facteur de réduction du rayon à chaque mise à jour (entre 0 et 1)

        this.pixelTimer = 0; // Temps écoulé
        this.pixelInterval = 5000; // Générer un group de pixels toutes les 2000 ms

        this.ownerId = settings && settings.ownerId !== undefined ? settings.ownerId : 1; // 1 par défaut pour les ennemis

        // Créer la barre de vie (auraPixelGroup) et la lier au joueur
        this.auraPixelGroup = me.pool.pull(
            "pixelGroupJoueur",
            this.pos.x,
            this.pos.y,
            10,
            32,
            [],
            this.ownerId // Passe l'ownerId au groupe d'aura
        );
        this.auraPixelGroup.setOwner(this); // On lie le groupe de pixels au joueur
        me.game.world.addChild(this.auraPixelGroup, this.z);

        // Change color by applying a tint to the sprite
        this.renderable = new me.Sprite(0, 0, {
            image: me.loader.getImage("character"),
            framewidth: 32,
            frameheight: 32,
        });
        // Apply a red tint (change the color as needed)
        this.renderable.tint.setColor(255, 0, 0);

        this.renderable.addAnimation("stand", [0], 100);
        this.renderable.setCurrentAnimation("stand");

        this.anchorPoint.set(0.5, 0.5);

        this.selectedEntity = null; // Aucune entité sélectionnée par défaut

        // Bounding box pour la sélection
        const halfW = this.renderable.width * this.anchorPoint.x;
        const halfH = this.renderable.height * this.anchorPoint.y;

        this.getBoundsPixel = function () {
            return {
                minX: this.pos.x,
                minY: this.pos.x,
                maxX: this.pos.x + halfW + 4,
                maxY: this.pos.y + halfH + 4,
            };
        };

        this.debug = new me.Rect(
            0,
            0,
            this.renderable.width,
            this.renderable.height
        );
        this.debug.pos.x = this.pos.x - halfW;
        this.debug.pos.y = this.pos.y - halfH;

        this.isDragging = false;

        // Détection de l'input pour le mouvement de l'entité
        me.input.registerPointerEvent(
            "pointermove",
            me.game.viewport,
            (event) => {
                if (this.isDragging) {
                    if (
                        this.selectedEntity.type !== "player" &&
                        this.selectedEntity.type !== "auraPixelGroup"
                    ) {
                        this.selectedEntity.targetPos = {
                            x: event.gameWorldX,
                            y: event.gameWorldY,
                        };
                    } else {
                        this.targetPos = {
                            x: event.gameWorldX,
                            y: event.gameWorldY,
                        };
                    }
                }
            }
        );

        me.input.registerPointerEvent(
            "pointerup",
            me.game.viewport,
            (event) => {
                if (event.button === 0) {
                    this.isDragging = false;
                }
            }
        );
    }

    update(dt) {
        // apply AI behavior: set this.targetPos based on player chase or patrol
        handleEnemyBehavior(this, dt);
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

        // Appliquer le rebond uniquement si isBouncing est activé
        if (this.isBouncing) {
            // Mise à jour de l'angle pour le mouvement oscillatoire
            this.bounceAngle += (this.bounceSpeed * dt) / 1000; // Ajuster la vitesse avec le temps
            if (this.bounceAngle > Math.PI * 2) {
                this.bounceAngle -= Math.PI * 2; // Réinitialiser l'angle après un tour complet
            }

            // Calculer le décalage en fonction de l'angle
            const offsetX = Math.cos(this.bounceAngle) * this.bounceRadius;
            const offsetY = Math.sin(this.bounceAngle) * this.bounceRadius;

            // Appliquer le décalage oscillatoire à la position actuelle
            this.pos.x += offsetX;
            this.pos.y += offsetY;

            // Réduire progressivement le rayon du rebond
            this.bounceRadius *= this.bounceDecay;

            // Arrêter le rebond lorsque le rayon devient très petit
            if (this.bounceRadius < 0.1) {
                this.bounceRadius = 0;
                this.isBouncing = false; // Désactiver le rebond
            }
        }

        // Synchroniser auraPixelGroup avec la position du joueur
        this.auraPixelGroup.pos.set(this.pos.x, this.pos.y);

        this.pixelTimer += dt;
        // Génération des pixels volants
        if (this.pixelTimer >= this.pixelInterval) {
            this.pixelTimer = 0;
            this.isBouncing = true;
            this.bounceRadius = 1;
            const pixelGroup = me.pool.pull(
                "pixelGroup",
                this.pos.x,
                this.pos.y,
                10,
                undefined,
                [],
                this.ownerId,
                this.color
            );
            pixelGroup.body.vel.x = Math.random() < 0.5 ? -2 : 2;
            pixelGroup.body.vel.y = Math.random() < 0.5 ? -2 : 2;
            pixelGroup.team = this.team;
            me.game.world.addChild(pixelGroup, 1);
        }

        super.update(dt);
        return true;
    }

    select() {
        this.selected = true;
    }

    unselect() {
        this.selected = false;
    }
}

export default EnemyUnit;

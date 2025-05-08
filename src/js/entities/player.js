import * as me from "melonjs";
import PixelGroup from "./pixel-group.js";
import PixelGroupJoueur from "./pixel-group-joueur.js";
import game from "./../game.js";

class PlayerUnit extends me.Entity {
    constructor(x, y, settings) {
        super(x, y, settings);

        this.type = "player";
        this.selectable = true;
        this.selected = false;

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
        this.pixelInterval = 2000; // Générer un group de pixels toutes les 2000 ms

        // Créer la barre de vie (auraPixelGroup) et la lier au joueur
        this.auraPixelGroup = me.pool.pull(
            "pixelGroupJoueur",
            this.pos.x,
            this.pos.y,
            10,
            32
        );
        this.auraPixelGroup.setOwner(this); // On lie le groupe de pixels au joueur
        me.game.world.addChild(this.auraPixelGroup, this.z);

        this.renderable = new me.Sprite(0, 0, {
            image: me.loader.getImage("character"),
            framewidth: 32,
            frameheight: 32,
        });

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
                minY: this.pos.y,
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

        me.input.registerPointerEvent(
            "pointerdown",
            me.game.viewport,
            (event) => {
                if (event.button === 0) {
                    // Si le bouton gauche de la souris est pressé
                    const x = event.gameWorldX;
                    const y = event.gameWorldY;

                    // Vérifier si un PixelGroup a été sélectionné
                    const candidates = me.game.world.getChildByProp(
                        "selectable",
                        true
                    );
                    // on cherche celui dont la box contient le clic
                    const clicked = candidates.find((entity) => {
                        const b = entity.getBoundsPixel();
                        return (
                            x >= b.minX &&
                            x <= b.maxX &&
                            y >= b.minY &&
                            y <= b.maxY
                        );
                    });

                    if (clicked) {
                        // Si un PixelGroup est sélectionné
                        candidates.forEach((entity) => {
                            entity.unselect(); // Désélectionner les autres entités
                        });
                        clicked.select(); // Sélectionner l'entité
                        this.selectedEntity = clicked; // Définir la sélection

                        this.isDragging = true; // Activer le déplacement
                    } else {
                        // Si aucun PixelGroup n'est sélectionné, désélectionner le joueur et arrêter le déplacement
                        if (this.selectedEntity) {
                            console.log("selectedEntity", this.selectedEntity);
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
                } else if (event.button === 2) {
                    // Si le bouton droit de la souris est pressé
                    const candidates = me.game.world.getChildByProp(
                        "selectable",
                        true
                    );
                    candidates.forEach((entity) => {
                        entity.unselect(); // Désélectionner toutes les entités
                    });
                    this.selectedEntity = null; // Réinitialiser la sélection
                }
            }
        );
    }

    update(dt) {
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

            // Activer le rebond
            this.isBouncing = true;
            this.bounceRadius = 1; // Rayon initial du rebond

            const pixelGroup = me.pool.pull(
                "pixelGroup",
                this.pos.x,
                this.pos.y,
                10
            );

            // Définir une vitesse aléatoire pour les pixels générés
            pixelGroup.body.vel.x = Math.random() < 0.5 ? -2 : 2;
            pixelGroup.body.vel.y = Math.random() < 0.5 ? -2 : 2;

            // Ajout des pixels à la scène sans interagir avec la barre de vie
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

export default PlayerUnit;

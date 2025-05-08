// entities/pixel.js
import * as me from "melonjs";

class Pixel extends me.Entity {
    constructor(x, y, moveRadius = 10) {
        super(x, y, {
            width: 10,
            height: 10,
            image: me.loader.getImage("pixel")
        });

        // Position de référence pour le rayon
        this.startX = this.pos.x;
        this.startY = this.pos.y;

        // Rayon dans lequel le pixel va se balader
        this.moveRadius = moveRadius;

        // Vitesse maximale en px/frame
        this.moveSpeed = 0.2;
        this.body.setMaxVelocity(this.moveSpeed, this.moveSpeed);

        // Pas de gravité, pas de collision
        this.body.gravityScale = 0;
        this.body.collisionType = me.collision.types.NO_OBJECT;

        // Pas de target au début
        this.targetPos = null;
    }

    update(dt) {
        // 1) Si on n'a pas de cible, on en génère une
        if (!this.targetPos) {
            const angle  = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.moveRadius;
            this.targetPos = {
                x: this.startX + Math.cos(angle) * radius,
                y: this.startY + Math.sin(angle) * radius
            };
        }

        // 2) Calcul du vecteur vers la cible
        const dx = this.targetPos.x - this.pos.x;
        const dy = this.targetPos.y - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 3) Tant qu'on n'est pas arrivé, on met la vélocité
        if (dist > 2) {
            const nx = dx / dist;
            const ny = dy / dist;
            this.body.vel.x = nx * this.body.maxVel.x;
            this.body.vel.y = ny * this.body.maxVel.y;
        }
        else {
            // Arrivé : arrêt et suppression de la cible
            this.body.vel.x = 0;
            this.body.vel.y = 0;
            this.targetPos = null;
        }

        // 4) Laisser MelonJS appliquer la physique et redraw
        return super.update(dt);
    }
}

export default Pixel;

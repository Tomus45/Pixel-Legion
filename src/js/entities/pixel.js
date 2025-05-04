// entities/pixel.js
import * as me from "melonjs";

class Pixel extends me.Entity {
    constructor(x, y) {
        super(x, y, {
            width: 10,
            height: 10,
            image: me.loader.getImage("pixel") // une petite image (ou une couleur unie)
        });

        // Définir une vitesse de déplacement vers le haut
        this.body.setMaxVelocity(0, +1); // Vitesse vers le haut

        // Gravité désactivée
        this.body.gravity = 0;

        // Limite de déplacement du pixel
        this.maxYDistance = 20; // Distance maximale au-dessus du joueur

        // Enregistrer la position de départ pour calculer la distance parcourue
        this.startY = this.pos.y;

        this.body.collisionType = me.collision.types.NO_OBJECT;

    }

    update(dt) {
        // Déplacer le pixel vers le haut
        this.body.vel.y = -2; // Vitesse de déplacement vers le haut

        // Si le pixel atteint la limite de distance, il s'arrête
        if (this.pos.y <= this.startY - this.maxYDistance) {
            this.body.vel.y = 0; // Arrêter le pixel
        }

        // Mise à jour du parent pour gérer collisions et autres
        return super.update(dt);
    }
}

export default Pixel;

import * as me from 'melonjs';
import game from './../game.js';

class PlayerUnit extends me.Entity {
    constructor(x, y, settings) {
        settings.width = 32;  // Définir la largeur du joueur
        settings.height = 32; // Définir la hauteur du joueur

        // Charger l'image du joueur
        settings.image = "character";

        // Appeler le constructeur parent
        super(x, y, settings);

        // set a "player object" type
        this.body.collisionType = me.collision.types.PLAYER_OBJECT;
        
        // Défini le joueur comme une entité qui peut être déplacée
        this.body.setMaxVelocity(3, 15);
        this.body.gravity = 0;

        // enable keyboard
        me.input.bindKey(me.input.KEY.LEFT,  "left");
        me.input.bindKey(me.input.KEY.RIGHT, "right");
        me.input.bindKey(me.input.KEY.X,     "jump", true);
        me.input.bindKey(me.input.KEY.UP,    "jump", true);
        me.input.bindKey(me.input.KEY.SPACE, "jump", true);
        me.input.bindKey(me.input.KEY.DOWN,  "down");

        me.input.bindKey(me.input.KEY.A,     "left");
        me.input.bindKey(me.input.KEY.D,     "right");
        me.input.bindKey(me.input.KEY.W,     "jump", true);
        me.input.bindKey(me.input.KEY.S,     "down");

        // set the viewport to follow this renderable on both axis, and enable damping
        me.game.viewport.follow(this, me.game.viewport.AXIS.BOTH, 0.1);

        this.anchorPoint.set(0.5, 1.0); // Ancre le joueur au bas de l'image

    }

    update(dt) {
        // Ajoute la logique pour le mouvement ou autres interactions
        if (me.input.isKeyPressed("left")) {
            this.body.vel.x -= this.body.accel.x * dt / 1000;
        }
        if (me.input.isKeyPressed("right")) {
        this.body.vel.x += this.body.accel.x * dt / 1000;
        }
        if (me.input.isKeyPressed("up")) {
        this.body.vel.y -= this.body.accel.y * dt / 1000;
        }
        if (me.input.isKeyPressed("down")) {
        this.body.vel.y += this.body.accel.y * dt / 1000;
        }

        // Appelle la méthode update du parent pour gérer les collisions et autres
        super.update(dt);
        return true;
    }
}

export default PlayerUnit;

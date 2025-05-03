import * as me from 'melonjs';
import PlayerUnit from './../entities/player.js';


class PlayScreen extends me.Stage {
    /**
     *  action to perform on state change
     */
    onResetEvent() {
        // load a level
        me.level.load("map1");


        // Recherche l'objet "player" dans la carte
        const playerObj = me.game.world.getChildByName("mainPlayer")[0]; // Récupère l'objet par son nom
        console.log(playerObj); // pour voir l'objet trouvé

        if (playerObj) {
            // Crée l'entité du joueur à la position de l'objet dans la carte
            let playerUnit = new PlayerUnit(playerObj.pos.x, playerObj.pos.y, { image: "character", width: 32, height: 32 });
            me.game.world.addChild(playerUnit);
        }
    }
};

export default PlayScreen;

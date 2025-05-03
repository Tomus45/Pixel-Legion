import * as me from 'melonjs';
import PlayerUnit from './../entities/player.js';


class PlayScreen extends me.Stage {
    /**
     *  action to perform on state change
     */
    onResetEvent() {
        // load a level
        me.level.load("map1");
    }
};

export default PlayScreen;

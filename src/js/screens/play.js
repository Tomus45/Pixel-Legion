import * as me from 'melonjs';

class PlayScreen extends me.Stage {
    /**
     * Action à effectuer lors du changement d'état
     */
    onResetEvent() {
        // load a level
        me.level.load("map1");
    }
};

export default PlayScreen;

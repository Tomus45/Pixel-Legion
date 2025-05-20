import * as me from "melonjs";
import game from "../../index.js";
import UIContainer from "../../entities/UIContainer.js";
import { CheckBoxUI } from "../../entities/CheckBoxUI.js";
import { ButtonUI } from "../../entities/ButtonUI.js";
import TitleMenu from "./title-menu.js";

class TitleScreen extends me.Stage {
    onResetEvent() {
        // clear the background
        me.game.world.addChild(new me.ColorLayer("background", "rgba(0, 0, 0, 1.0)"), 0);
        this.menu = new TitleMenu();

        me.game.world.addChild(this.menu, 1);
    }
}

export default TitleScreen;

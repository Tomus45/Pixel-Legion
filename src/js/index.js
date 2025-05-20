import * as me from "melonjs";
import game from "./game.js";

import {
    audio,
    loader,
    state,
    device,
    video,
    utils,
    plugin,
    pool,
} from "melonjs";

import "../index.css";

import PlayScreen from "./screens/play.js";
import PlayerUnit from "./entities/player.js";
import Pixel from "./entities/pixel.js";
import PixelGroup from "./entities/pixel-group";
import PixelGroupJoueur from "./entities/pixel-group-joueur.js";
import resources from "./resources.js";
import MenuScreen from "./screens/menu/title-screen.js";

export default function onload() {
    // initialize the display canvas once the device/browser is ready
    if (
        !me.video.init(1920, 1080, {
            parent: "screen",
            scaleMethod: "flex-width",
            renderer: me.video.CANVAS,
            antialias: false,           // ← désactive l’anticrénelage
            subPixel: false,
        })
    ) {
        alert("Your browser does not support HTML5 canvas.");
        return;
    }

    const ctx = me.video.renderer.getCanvas();

    // Disable right-click context menu on the game canvas
    document
        .getElementById("screen")
        .addEventListener("contextmenu", (event) => {
            event.preventDefault();
        });

    // initialize the debug plugin in development mode.
    if (process.env.NODE_ENV === "development") {
        import("@melonjs/debug-plugin").then((debugPlugin) => {
            // automatically register the debug panel
            utils.function.defer(
                me.plugin.register,
                this,
                debugPlugin.DebugPanelPlugin,
                "debugPanel"
            );
        });
    }

    // Initialize the audio.
    me.audio.init("mp3,ogg");

    // allow cross-origin for image/texture loading
    me.loader.setOptions({ crossOrigin: "anonymous" });

    // set and load all resources.
    me.loader.preload(resources, function () {
        game.texture = new me.TextureAtlas([
            me.loader.getJSON("UI_Assets-0"),
            me.loader.getJSON("UI_Assets-1"),
            me.loader.getJSON("UI_Assets-2")
        ]);

        // set the user defined game stages
        me.state.set(me.state.MENU, new MenuScreen());
        me.state.set(me.state.PLAY, new PlayScreen());

        // add our player entity in the entity pool
        me.pool.register("mainPlayer", PlayerUnit);
        me.pool.register("pixel", Pixel);
        me.pool.register("pixelGroup", PixelGroup);
        me.pool.register("pixelGroupJoueur", PixelGroupJoueur); // Register the pixel group entity

        // me.state.change(me.state.MENU);
        // Start the game.
        me.state.change(me.state.PLAY);
        // me.state.change(me.state.MENU);
    });
}

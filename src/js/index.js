import * as me from 'melonjs';
import game from './game.js';

import {
    audio,
    loader,
    state,
    device,
    video,
    utils,
    plugin,
    pool
} from "melonjs";

import "../index.css";

import TitleScreen from "./screens/title.js";
import PlayScreen from "./screens/play.js";
import PlayerUnit from './entities/player.js';
import resources from "./resources.js";


export default function onload() {

    // initialize the display canvas once the device/browser is ready
    if (!me.video.init(800, 600, {parent : "screen", scaleMethod : "flex-width",  renderer : me.video.WEBGL, preferWebGL1 : false, depthTest: "z-buffer", subPixel : false})) {
        alert("Your browser does not support HTML5 canvas.");
        return;
    }

    // initialize the debug plugin in development mode.
    if (process.env.NODE_ENV === 'development') {
        import("@melonjs/debug-plugin").then((debugPlugin) => {
            // automatically register the debug panel
            utils.function.defer(me.plugin.register, this, debugPlugin.DebugPanelPlugin, "debugPanel");
        });
    }

    // Initialize the audio.
    me.audio.init("mp3,ogg");

    // allow cross-origin for image/texture loading
    me.loader.setOptions({crossOrigin: "anonymous"});

    // set and load all resources.
    me.loader.preload(resources, function () {
        // set the user defined game stages
        me.state.set(me.state.MENU, new TitleScreen());
        me.state.set(me.state.PLAY, new PlayScreen());

        // add our player entity in the entity pool
        me.pool.register("mainPlayer", PlayerUnit);

        // Start the game.
        me.state.change(me.state.PLAY);
    });
}

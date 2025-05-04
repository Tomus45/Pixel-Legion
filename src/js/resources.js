// a melonJS data manifest
const resources = [

    /* Maps.*/
    {
        name: "map1",
        type: "tmx",
        src:  "./data/map/map1.json"
    },

    {
        name: "character",
        type: "image",
        src: "./data/img/character.png"
    },

    {
        name: "pixel",
        type: "image",
        src: "./data/img/pixel.png"
    },

    // UI Texture
    { name: "UI_Assets-0", type: "image", src: "./data/img/UI_Assets-0.png" },
    { name: "UI_Assets-1", type: "image", src: "./data/img/UI_Assets-1.png" },
    { name: "UI_Assets-2", type: "image", src: "./data/img/UI_Assets-2.png" },

    // JSON texturePacker Atlas
    { name: "UI_Assets-0", type: "json", src: "./data/img/UI_Assets-0.json" },
    { name: "UI_Assets-1", type: "json", src: "./data/img/UI_Assets-1.json" },
    { name: "UI_Assets-2", type: "json", src: "./data/img/UI_Assets-2.json" },
    
    /* Bitmap Text */
    {
        name: "PressStart2P",
        type: "image",
        src:  "./data/fnt/PressStart2P.png"
    },
    {
        name: "PressStart2P",
        type: "binary",
        src: "./data/fnt/PressStart2P.fnt"
    }
];

export default resources;

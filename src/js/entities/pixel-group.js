import * as me from "melonjs";
import Pixel from "./pixel";

class PixelGroup extends me.Container {
    constructor(x, y, pixelCount = 10) {
        super(x, y, {
            width: 50, // Adjust as needed
            height: 50 // Adjust as needed
        });

        this.pixelCount = pixelCount;

        // Store the spawn position
        this.spawnX = x;
        this.spawnY = y;

        this.selectable = true;

        // Add multiple Pixel instances to the group
        for (let i = 0; i < this.pixelCount; i++) {
            const offsetX = Math.random() * this.width.width;
            const offsetY = Math.random() * this.width.height;
            const pixel = me.pool.pull("pixel", offsetX, offsetY);
            this.addChild(pixel);
        }

        // Disable gravity for the group
        this.body = new me.Body(this);
        this.body.gravityScale = 0;

        this.body.collisionType = me.collision.types.NO_OBJECT;
    }

    update(dt) {
        // Constrain the group within a 50px radius from its spawn position
        const dx = this.pos.x - this.spawnX;
        const dy = this.pos.y - this.spawnY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 50) {
            // Stop movement if the group exceeds the 50px radius
            this.body.vel.x = 0;
            this.body.vel.y = 0;
        }

        // Update all child pixels
        this.children.forEach((child) => {
            if (child.update) {
                child.update(dt);
            }
        });

        return super.update(dt);
    }

    getWorldBounds() {
        const halfW = this.renderable.width * this.anchorPoint.x;
        const halfH = this.renderable.height * this.anchorPoint.y;

        return {
            minX: this.pos.x,
            minY: this.pos.y,
            maxX: this.pos.x + halfW + 4,
            maxY: this.pos.y + halfH + 4,
        };
    }
}

export default PixelGroup;

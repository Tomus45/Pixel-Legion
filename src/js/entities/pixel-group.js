// entities/pixel-group.js
import * as me from "melonjs";

class PixelGroup extends me.Container {
    constructor(x, y, pixelCount = 10) {
        super(x, y, {
            width: 0,
            height: 0,
        });
        this.pixelCount = pixelCount;
        this.spawnX = x;
        this.spawnY = y;
        this.selectable = true;

        // Génère les pixels (positions LOCALES dans le container)
        for (let i = 0; i < this.pixelCount; i++) {
            const offsetX = Math.random() * 50 - 25;
            const offsetY = Math.random() * 50 - 25;
            const pixel = me.pool.pull("pixel", offsetX, offsetY);
            this.addChild(pixel);
        }

        // Pas de physique pour le container
        this.body = new me.Body(this);
        this.body.gravityScale = 0;
        this.body.collisionType = me.collision.types.NO_OBJECT;
    }

    /**
     * Monotone chain convex hull
     */
    _convexHull(pts) {
        if (pts.length <= 1) return pts.slice();
        const pts2 = pts.slice().sort((a, b) =>
            a.x === b.x ? a.y - b.y : a.x - b.x
        );
        const cross = (o, a, b) =>
            (a.x - o.x) * (b.y - o.y) -
            (a.y - o.y) * (b.x - o.x);
        const lower = [];
        for (const p of pts2) {
            while (
                lower.length >= 2 &&
                cross(
                    lower[lower.length - 2],
                    lower[lower.length - 1],
                    p
                ) <= 0
            ) {
                lower.pop();
            }
            lower.push(p);
        }
        const upper = [];
        for (let i = pts2.length - 1; i >= 0; i--) {
            const p = pts2[i];
            while (
                upper.length >= 2 &&
                cross(
                    upper[upper.length - 2],
                    upper[upper.length - 1],
                    p
                ) <= 0
            ) {
                upper.pop();
            }
            upper.push(p);
        }
        lower.pop();
        upper.pop();
        return lower.concat(upper);
    }

    draw(renderer) {
        // 1) on récupère directement le contexte Canvas 2D
        const ctx = me.video.renderer.getContext();

        // 2) on construit la liste des positions MONDIALES de chaque pixel
        const worldPoints = this.children.map((child) => ({
            x: this.pos.x + child.pos.x,
            y: this.pos.y + child.pos.y,
        }));

        if (worldPoints.length > 2) {
            // 3) calcul du convex hull
            const hull = this._convexHull(worldPoints);

            // 4) dessin du fond semi-transparent
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.moveTo(hull[0].x, hull[0].y);
            for (let i = 1; i < hull.length; i++) {
                ctx.lineTo(hull[i].x, hull[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // 5) on dessine enfin les pixels par-dessus
        super.draw(renderer);
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
        const halfW = this.width.width;
        const halfH = this.height;

        console.log(this.pos.x, this.pos.y, halfW, halfH);

        return {
            minX: this.pos.x,
            minY: this.pos.y,
            maxX: this.pos.x + halfW + 4,
            maxY: this.pos.y + halfH + 4,
        };
    }
}

export default PixelGroup;

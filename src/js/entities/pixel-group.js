import * as me from "melonjs";

class PixelGroup extends me.Container {
    constructor(x, y, pixelCount = 10, padding = 32, pixelInstance = []) {
        super(x, y, {
            width: 0,
            height: 0,
        });
        this.pixelCount = pixelCount;
        this.spawnX = x;
        this.spawnY = y;
        this.selectable = true;
        this.selected = false;

        // Padding autour du hull
        this.padding = padding;

        this.body = new me.Body(this);

        for (let i = 0; i < pixelInstance.length; i++) {
            const pixel = me.pool.pull("pixel", pixelInstance[i].localX, pixelInstance[i].localY);
            this.addChild(pixel);
        }

        // Génère les pixels (positions LOCALES dans le container)
        for (let i = 0; i < this.pixelCount; i++) {
            const offsetX = Math.random() * 50 - 25;
            const offsetY = Math.random() * 50 - 25;
            const pixel = me.pool.pull("pixel", offsetX, offsetY);
            this.addChild(pixel);
        }

        

        // Pas de physique pour le container
        this.body.gravityScale = 0;
        this.body.collisionType = me.collision.types.NO_OBJECT;

        // Cacher le canvas et le contexte 2D une seule fois
        this._canvas = me.video.renderer.getCanvas();
        this._ctx = this._canvas.getContext("2d");

        // Initialiser le hull
        this._expandedHull = null;
    }

    /**
     * Monotone chain convex hull
     */
    _convexHull(pts) {
        if (pts.length <= 1) return pts.slice();
        const pts2 = pts
            .slice()
            .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
        const cross = (o, a, b) =>
            (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        const lower = [];
        for (const p of pts2) {
            while (
                lower.length >= 2 &&
                cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
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
                cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
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
        const ctx = this._ctx;
        if (this._expandedHull) {
            // remplissage semi-transparent
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = "#FFF";
            ctx.beginPath();
            ctx.moveTo(this._expandedHull[0].x, this._expandedHull[0].y);
            for (let p of this._expandedHull) {
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.fill();

            // outline
            ctx.translate(0.5, 0.5);

            // coins et extrémités « ronds » pour limiter l’effet d’aliasing
            ctx.lineJoin = "round";
            ctx.lineCap = "round";

            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(this._expandedHull[0].x, this._expandedHull[0].y);
            for (let p of this._expandedHull) {
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

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

        if (this.selected) {
            // 1) calculer les positions MONDIALES des pixels
            const pts = this.children.map((c) => ({
                x: this.pos.x + c.pos.x,
                y: this.pos.y + c.pos.y,
            }));

            // 2) enveloppe convexe
            const hull = this._convexHull(pts);

            // 3) expansion du hull pour le padding
            const centroid = hull.reduce(
                (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
                { x: 0, y: 0 }
            );
            centroid.x /= hull.length;
            centroid.y /= hull.length;
            this._expandedHull = hull.map((p) => {
                const dxp = p.x - centroid.x;
                const dyp = p.y - centroid.y;
                const dist = Math.hypot(dxp, dyp) || 1;
                return {
                    x: Math.round(p.x + (dxp / dist) * this.padding),
                    y: Math.round(p.y + (dyp / dist) * this.padding),
                };
            });
        }

        // détection de fusion
        const seuilFusion = 100; // en pixels, à ajuster
        me.game.world.children
            .filter((obj) => obj instanceof PixelGroup && obj !== this)
            .forEach((other) => {
                if (
                    Math.hypot(
                        this.pos.x - other.pos.x,
                        this.pos.y - other.pos.y
                    ) < seuilFusion
                ) {
                    // on fusionne en créant un nouveau groupe
                    this.mergeIntoNewGroup(this, other);
                }
            });

        return super.update(dt);
    }

    mergeIntoNewGroup(groupA, groupB) {
        // 1) Récupérer tous les pixels (instances) et leur position MONDIALE
        const allPixels = [];
        [groupA, groupB].forEach((grp) => {
            grp.children.forEach((child) => {
                allPixels.push({
                    instance: child,
                    worldX: grp.pos.x + child.pos.x,
                    worldY: grp.pos.y + child.pos.y,
                    localX: child.pos.x,
                    localY: child.pos.y,
                });
            });
        });

        // 2) Calculer le nouveau point de spawn (par exemple centre de gravité des pixels)
        const centroid = allPixels.reduce(
            (acc, p) => {
                acc.x += p.worldX;
                acc.y += p.worldY;
                return acc;
            },
            { x: 0, y: 0 }
        );
        centroid.x /= allPixels.length;
        centroid.y /= allPixels.length;

        const padding = Math.max(groupA.padding, groupB.padding);
        const newGroup = new PixelGroup(centroid.x, centroid.y, 0, padding, allPixels);

        // 5) Ajouter le nouveau groupe et supprimer les deux anciens
        const world = me.game.world;
        world.addChild(newGroup);
        world.removeChild(groupA);
        world.removeChild(groupB);

        return newGroup;
    }

    getBoundsPixel() {
        // 1) calculer les positions MONDIALES des pixels
        const pts = this.children.map((c) => ({
            x: this.pos.x + c.pos.x,
            y: this.pos.y + c.pos.y,
        }));

        // 2) enveloppe convexe
        const hull = this._convexHull(pts);

        // 3) expansion du hull pour le padding
        const centroid = hull.reduce(
            (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
            { x: 0, y: 0 }
        );
        centroid.x /= hull.length;
        centroid.y /= hull.length;
        return hull.map((p) => {
            const dxp = p.x - centroid.x;
            const dyp = p.y - centroid.y;
            const dist = Math.hypot(dxp, dyp) || 1;
            return {
                x: Math.round(p.x + (dxp / dist) * this.padding),
                y: Math.round(p.y + (dyp / dist) * this.padding),
            };
        });
    }

    select() {
        this.selected = true;
    }

    unselect() {
        this.selected = false;
    }
}

export default PixelGroup;

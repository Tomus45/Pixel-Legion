import * as me from "melonjs";

class PixelGroupJoueur extends me.Container {
    constructor(x, y, pixelCount = 10, padding = 32, pixelInstance = []) {
        super(x, y, {
            width: 8,
            height: 8,
        });
        this.pixelCount = pixelCount;
        this.selectable = true;
        this.selected = false;
        this.hovered = false;
        this.padding = padding;
        this.type = "auraPixelGroup";

        this.body = new me.Body(this);

        this.pixelMoveRadius = 10 * Math.sqrt(this.pixelCount || pixelInstance.length);

        for (let i = 0; i < pixelInstance.length; i++) {
            const pixel = me.pool.pull(
                "pixel",
                pixelInstance[i].localX,
                pixelInstance[i].localY,
                this.pixelMoveRadius
            );
            this.addChild(pixel);
        }

        for (let i = 0; i < this.pixelCount; i++) {
            const offsetX = Math.random() * 50 - 25;
            const offsetY = Math.random() * 50 - 25;
            const pixel = me.pool.pull("pixel", offsetX, offsetY);
            this.addChild(pixel);
        }

        this.body.collisionType = me.collision.types.NO_OBJECT;

        // this._expandedHull = null;
        this.initialMovementConstrained = true;

        me.input.registerPointerEvent(
            "pointermove",
            me.game.viewport,
            (event) => {
                const bounds = this.getBoundsPixel();
                const x = event.gameWorldX;
                const y = event.gameWorldY;
        
                // Vérifiez si la souris est dans les limites du pixel group
                if (
                    x >= bounds.minX &&
                    x <= bounds.maxX &&
                    y >= bounds.minY &&
                    y <= bounds.maxY
                ) {
                    this.hovered = true;
                } else {
                    this.hovered = false;
                }
            }
        );
    }

    // Function to calculate convex hull
    _convexHull(pts) {
        if (pts.length <= 1) return pts.slice();
        const pts2 = pts.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
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

    // Draw the pixel group with optional expanded hull visualization
    draw(renderer) {

        if (this.hovered === true && this.selected === false) {
            renderer.setGlobalAlpha(0.5);
            renderer.setColor("#ffffff");

            // Dessiner le hull
            renderer.beginPath();
            renderer.moveTo(this._expandedHull[0].x, this._expandedHull[0].y);
            for (let p of this._expandedHull) {
                renderer.lineTo(p.x, p.y);
            }
            renderer.closePath();
            renderer.fill();
    
        } else if (this.selected === true) {
            renderer.save();
    
            renderer.setGlobalAlpha(0.5);
            renderer.setColor("#FFF");

            // Dessiner le hull
            renderer.beginPath();
            renderer.moveTo(this._expandedHull[0].x, this._expandedHull[0].y);
            for (let p of this._expandedHull) {
                renderer.lineTo(p.x, p.y);
            }
            renderer.closePath();
            renderer.fill();

            // Dessiner les contours du hull
            renderer.setGlobalAlpha(1.0);
            renderer.setColor(this.selected ? "#ffffff" : defaultHullColor);
            renderer.lineWidth = 5;
            renderer.beginPath();
            renderer.moveTo(this._expandedHull[0].x, this._expandedHull[0].y);
            for (let p of this._expandedHull) {
                renderer.lineTo(p.x, p.y);
            }
            renderer.closePath();
            renderer.stroke();
            renderer.restore();
        }
    
        super.draw(renderer);
    }

    setOwner(owner) {
        this.owner = owner;
    }

    update(dt) {

        // Si un propriétaire est défini, synchroniser la position avec lui
        if (this.owner) {
            this.pos.x = this.owner.pos.x;
            this.pos.y = this.owner.pos.y;
        }

        // Update each pixel in the group
        this.children.forEach((child) => {
            if (child.update) {
                child.update(dt);
            }
        });

        // Handle selection of pixels
            const pts = this.children.map((c) => ({
                x: this.pos.x + c.pos.x,
                y: this.pos.y + c.pos.y,
            }));

            const hull = this._convexHull(pts);
            const centroid = hull.reduce(
                (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
                { x: 0, y: 0 }
            );
            centroid.x /= hull.length;
            centroid.y /= hull.length;

            // Expand the convex hull for visual effect
            this._expandedHull = hull.map((p) => {
                const dxp = p.x - centroid.x;
                const dyp = p.y - centroid.y;
                const dist = Math.hypot(dxp, dyp) || 1;
                return {
                    x: Math.round(p.x + (dxp / dist) * this.padding),
                    y: Math.round(p.y + (dyp / dist) * this.padding),
                };
            });

        // Désactiver la logique de déplacement indépendante
        this.body.vel.set(0, 0);
        this.targetPos = null;

        super.update(dt);
    }

    getBoundsPixel() {
        // 1) on récupère les points mondiaux de tous les pixels
        const pts = this.children.map((c) => ({
            x: this.pos.x + c.pos.x,
            y: this.pos.y + c.pos.y,
        }));
        if (pts.length === 0) {
            // fallback : rien à dessiner
            return {
                minX: this.pos.x,
                minY: this.pos.y,
                maxX: this.pos.x,
                maxY: this.pos.y,
            };
        }

        // 2) on calcule le hull (monotone chain)
        const hull = this._convexHull(pts);

        // 3) on calcule le centroïde pour l’expansion
        const centroid = hull.reduce(
            (acc, p) => {
                acc.x += p.x;
                acc.y += p.y;
                return acc;
            },
            { x: 0, y: 0 }
        );
        centroid.x /= hull.length;
        centroid.y /= hull.length;

        // 4) on étend chaque sommet du hull selon padding et on round pour éviter
        const expanded = hull.map((p) => {
            const dx = p.x - centroid.x;
            const dy = p.y - centroid.y;
            const d = Math.hypot(dx, dy) || 1;
            return {
                x: Math.round(p.x + (dx / d) * this.padding),
                y: Math.round(p.y + (dy / d) * this.padding),
            };
        });

        // 5) on en déduit l’AABB sur l’expandedHull
        const xs = expanded.map((p) => p.x);
        const ys = expanded.map((p) => p.y);
        return {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
        };
    }

    select() {
        this.selected = true;
    }

    unselect() {
        this.selected = false;
    }
}

export default PixelGroupJoueur;
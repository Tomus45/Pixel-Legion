import * as me from "melonjs";

class PixelGroup extends me.Container {
    constructor(x, y, pixelCount = 10, padding = 32, pixelInstance = []) {
        super(x, y, {
            width: 10,
            height: 10,
        });
        this.pixelCount = pixelCount;
        this.spawnX = x;
        this.spawnY = y;
        this.selectable = true;
        this.selected = false;

        // Padding autour du hull
        this.padding = padding;

        this.body = new me.Body(this);

        this.body.setMaxVelocity(3, 3);

        this.pixelMoveRadius = 10 * Math.sqrt(this.pixelCount || pixelInstance.length) ;
        console.log("Pixel move radius:", this.pixelMoveRadius);

        for (let i = 0; i < pixelInstance.length; i++) {
            const pixel = me.pool.pull(
                "pixel",
                pixelInstance[i].localX,
                pixelInstance[i].localY,
                this.pixelMoveRadius
            );
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

        this.initialMovementConstrained = true; // Limiter le mouvement initial
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

        // Draw debug box for the PixelGroup position
        ctx.strokeStyle = "#00ff00"; // Green color for the debug box
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.pos.x,
            this.pos.y,
            this.width.width,
            this.width.height
        );

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
        if (this.initialMovementConstrained) {
            const dx = this.pos.x - this.spawnX;
            const dy = this.pos.y - this.spawnY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 50) {
                // Stop movement if the group exceeds the 50px radius
                this.body.vel.x = 0;
                this.body.vel.y = 0;
                this.initialMovementConstrained = false; // Désactiver la contrainte après le dépassement
            }
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
        } else {
            // Si pas sélectionné, on efface le hull
            this._expandedHull = null;
        }

        // détection de fusion
        const seuilFusion = 50; // en pixels, à ajuster
        if (!this._alreadyMerged) {
            me.game.world.children
            .filter((obj) => obj instanceof PixelGroup && obj !== this)
            .forEach((other) => {
                if (
                !other._alreadyMerged &&
                Math.hypot(
                    this.pos.x - other.pos.x,
                    this.pos.y - other.pos.y
                ) < seuilFusion &&
                this.body.vel.x === 0 &&
                this.body.vel.y === 0 &&
                other.body.vel.x === 0 &&
                other.body.vel.y === 0 &&
                this.children.length === other.children.length
                ) {
                // on fusionne en créant un nouveau groupe
                this.mergeIntoNewGroup(this, other);
                this._alreadyMerged = true;
                other._alreadyMerged = true;
                }
            });
        }

        if (this.targetPos) {
            const dx = this.targetPos.x - this.pos.x;
            const dy = this.targetPos.y - this.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 4) {
                const angle = Math.atan2(dy, dx);
                this.body.vel.x = Math.cos(angle) * this.body.maxVel.x;
                this.body.vel.y = Math.sin(angle) * this.body.maxVel.y;
            } else {
                this.body.vel.set(0, 0);
                this.targetPos = null;
            }
        }

        return super.update(dt);
    }

    mergeIntoNewGroup(groupA, groupB) {
        if (!groupA || !groupB) {
            console.warn("Invalid groups provided for merging:", groupA, groupB);
            return null;
        }

        // 1) Récupérer tous les pixels (instances) et leur position MONDIALE
        const allPixels = [];
        [groupA, groupB].forEach((grp) => {
            grp.children.slice().forEach((child) => {
                if (child && child.pos) {
                    allPixels.push({
                        instance: child,
                        worldX: grp.pos.x + child.pos.x,
                        worldY: grp.pos.y + child.pos.y,
                        localX: child.pos.x,
                        localY: child.pos.y,
                    });
                } else {
                    console.warn("Invalid child encountered during merge:", child);
                }
            });
        });

        if (allPixels.length === 0) {
            console.warn("No valid pixels found for merging.");
            return null;
        }

        // 2) Calculer le nouveau point de spawn (centre de gravité des pixels)
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

        // 3) Créer un nouveau groupe avec les pixels fusionnés
        const padding = Math.max(groupA.padding, groupB.padding);
        const newGroup = new PixelGroup(
            centroid.x,
            centroid.y,
            0,
            padding,
            allPixels
        );

        // 4) Ajouter le nouveau groupe et supprimer les anciens
        const world = me.game.world;
        try {
            world.removeChild(groupA);
            world.removeChild(groupB);
            // Assurez-vous que le groupe est bien retiré avant d'ajouter le nouveau
            
        } catch (error) {
            console.error("Error during group removal or addition:", error);
        }
        // Ensure the groups are removed before adding the new group
        world.sort(); // Sort the world to ensure proper removal
        world.addChild(newGroup);

        return newGroup;
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

export default PixelGroup;

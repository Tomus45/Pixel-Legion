import * as me from "melonjs";

class PixelGroup extends me.Container {
    constructor(x, y, pixelCount = 10, padding = 32, pixelInstance = []) {
        super(x, y, {
            width: 8,
            height: 8,
        });
        this.pixelCount = pixelCount;
        this.spawnX = x;
        this.spawnY = y;
        this.selectable = true;
        this.selected = false;
        this.hovered = false;
        this.padding = padding; // Padding for the convex hull
        this.type = "pixelGroup"; 
        this.maxCount = 100; // Maximum number of pixels in the group

        this.body = new me.Body(this);
        this.body.setMaxVelocity(3, 3);

        this.pixelMoveRadius = 10 * Math.sqrt(this.pixelCount || pixelInstance.length); 

        // Créer les pixels lors de la fusion de deux groupes
        if (pixelInstance.length > 0) {
            // Ajouter les pixels depuis pixelInstance
            for (let i = 0; i < pixelInstance.length; i++) {
                const pixel = me.pool.pull(
                    "pixel",
                    pixelInstance[i].localX,
                    pixelInstance[i].localY,
                    this.pixelMoveRadius
                );
                this.addChild(pixel);
            }
        } else {
            // Générer des pixels aléatoires si pixelInstance est vide
            for (let i = 0; i < this.pixelCount; i++) {
                const offsetX = Math.random() * 50 - 25;
                const offsetY = Math.random() * 50 - 25;
                const pixel = me.pool.pull("pixel", offsetX, offsetY);
                this.addChild(pixel);
            }
        }

        this.body.gravityScale = 0;
        this.body.collisionType = me.collision.types.NO_OBJECT;

        this._expandedHull = null;
        this.initialMovementConstrained = true;

        me.input.registerPointerEvent(
            "pointermove",
            me.game.viewport,
            (event) => {
                // Vérifiez si `this` est une instance valide de PixelGroup
                if (!(this instanceof PixelGroup)) {
                    console.warn("Pointer event triggered on an invalid object.");
                    return;
                }
        
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
            renderer.setColor("#ff0000");

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
            renderer.setColor(this.selected ? "#ff0000" : defaultHullColor);
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

    update(dt) {
        // Constrain movement of pixel group initially
        if (this.initialMovementConstrained) {
            const dx = this.pos.x - this.spawnX;
            const dy = this.pos.y - this.spawnY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 100) {
                this.body.vel.x = 0;
                this.body.vel.y = 0;
                this.initialMovementConstrained = false;
            }
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
                 this.pixelCount + other.pixelCount <= this.maxCount
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

        super.update(dt);
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
                if (child && child.pos && typeof child.pos.x === "number" && typeof child.pos.y === "number") {
                    allPixels.push({
                        instance: child,
                        worldX: grp.pos.x + child.pos.x,
                        worldY: grp.pos.y + child.pos.y,
                        localX: child.pos.x,
                        localY: child.pos.y,
                    });
                    grp.removeChild(child); // Supprimer l'enfant de l'ancien groupe
                } else {
                    console.warn("Invalid child encountered during merge:", child);
                }
            });
        });
        if (allPixels.length === 0) {
            console.log("No valid pixels found for merging.");
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
            allPixels.length,
            padding,
            allPixels.map((p) => ({
                localX: p.localX,
                localY: p.localY,
            }))
        );
        console.log("New group created:", newGroup);
    
        // 4) Ajouter le nouveau groupe et supprimer les anciens
        const world = me.game.world;
        try {
            world.removeChild(groupA);
            world.removeChild(groupB);
            world.addChild(newGroup);
        } catch (error) {
            console.error("Error during group removal or addition:", error);
        }
    
        return newGroup;
    }

    getBoundsPixel() {
        // 1) on récupère les points mondiaux de tous les pixels
        const pts = this.children
        .filter((c) => c && c.pos && typeof c.pos.x === "number" && typeof c.pos.y === "number") // Filtrer les enfants valides
        .map((c) => ({
            x: this.pos.x + c.pos.x,
            y: this.pos.y + c.pos.y,
        }));

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

    setTarget(pos) {
        this.targetPos = { x: pos.x, y: pos.y };
    }

    select() {
        this.selected = true;
    }

    unselect() {
        this.selected = false;
    }
}

export default PixelGroup;

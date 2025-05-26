import * as me from "melonjs";

// Simple pixel data object (plus d'entité MelonJS)
class SimplePixel {
    constructor(x, y, moveRadius, color = "#fff") {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.moveRadius = moveRadius;
        this.moveSpeed = 0.2;
        this.color = color;
        this.targetPos = null;
    }
}

// Simple pooling system for pixels
const pixelPool = [];
function getPooledPixel(x, y, moveRadius, color) {
    if (pixelPool.length > 0) {
        const px = pixelPool.pop();
        px.x = x;
        px.y = y;
        px.startX = x;
        px.startY = y;
        px.moveRadius = moveRadius;
        px.color = color || "#fff";
        px.targetPos = null;
        return px;
    }
    return new SimplePixel(x, y, moveRadius, color);
}
function releasePixel(px) {
    pixelPool.push(px);
}

class PixelGroup extends me.Container {
    constructor(x, y, pixelCount = 10, padding = 20, pixelInstance = [], ownerId = null) {
        super(x, y, { width: 8, height: 8 });
        this.pixelCount = pixelCount;
        this.spawnX = x;
        this.spawnY = y;
        this.selectable = true;
        this.selected = false;
        this.hovered = false;
        this.padding = padding;
        this.type = "pixelGroup";
        this.maxCount = 100;
        this.body = new me.Body(this);
        this.body.setMaxVelocity(3, 3);
        this.pixelMoveRadius = 3 * Math.sqrt(this.pixelCount || pixelInstance.length);
        this.maxPixelMoveRadius = 30;
        this.pixelMoveRadius = Math.min(this.pixelMoveRadius, this.maxPixelMoveRadius);
        this.body.gravityScale = 0;
        this.body.collisionType = me.collision.types.NO_OBJECT;
        this._expandedHull = null;
        this.initialMovementConstrained = true;
        // Ajout de la propriété ownerId
        this.ownerId = ownerId;
        // Pool-based pixel storage
        this.pixels = [];
        if (pixelInstance.length > 0) {
            for (let i = 0; i < pixelInstance.length; i++) {
                const px = getPooledPixel(
                    pixelInstance[i].localX,
                    pixelInstance[i].localY,
                    this.pixelMoveRadius
                );
                this.pixels.push(px);
            }
        } else {
            for (let i = 0; i < this.pixelCount; i++) {
                const offsetX = Math.random() * 50 - 25;
                const offsetY = Math.random() * 50 - 25;
                const px = getPooledPixel(offsetX, offsetY, this.pixelMoveRadius);
                this.pixels.push(px);
            }
        }
        // Pour réduire la fréquence d'update
        this._updateCounter = 0;
        me.input.registerPointerEvent(
            "pointermove",
            me.game.viewport,
            (event) => {
                if (!(this instanceof PixelGroup)) return;
                const bounds = this.getBoundsPixel();
                const x = event.gameWorldX;
                const y = event.gameWorldY;
                this.hovered = (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY);
            }
        );
    }

    // Function to calculate convex hull
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

    // Update all pixels in one loop, less often
    update(dt) {
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
        this._updateCounter = (this._updateCounter + 1) % 3; // update 1 frame sur 3
        if (this._updateCounter === 0) {
            for (let px of this.pixels) {
                if (!px.targetPos) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * px.moveRadius;
                    px.targetPos = {
                        x: px.startX + Math.cos(angle) * radius,
                        y: px.startY + Math.sin(angle) * radius,
                    };
                }
                const dx = px.targetPos.x - px.x;
                const dy = px.targetPos.y - px.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 2) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    px.x += nx * px.moveSpeed;
                    px.y += ny * px.moveSpeed;
                } else {
                    px.targetPos = null;
                }
            }
        }

        // Remplacer les children par pixels pour le hull
        const pts = this.pixels.map((c) => ({ x: this.pos.x + c.x, y: this.pos.y + c.y }));
        const hull = this._convexHull(pts);
        const centroid = hull.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
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

        return super.update(dt);
    }

    // Draw all pixels in one pass
    draw(renderer) {
        renderer.save();
        for (let px of this.pixels) {
            renderer.setColor(px.color);
            renderer.fillRect(this.pos.x + px.x, this.pos.y + px.y, 8, 8);
        }
        renderer.restore();

        // Sécurité : ne pas dessiner le hull si _expandedHull est vide ou invalide
        if (this._expandedHull && this._expandedHull.length > 0) {
            if (this.hovered === true && this.selected === false) {
                renderer.setGlobalAlpha(0.5);
                renderer.setColor("#ffffff");
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
                renderer.beginPath();
                renderer.moveTo(this._expandedHull[0].x, this._expandedHull[0].y);
                for (let p of this._expandedHull) {
                    renderer.lineTo(p.x, p.y);
                }
                renderer.closePath();
                renderer.fill();
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
        }
        super.draw(renderer);
    }

    mergeIntoNewGroup(groupA, groupB) {
        if (!groupA || !groupB) {
            console.warn("Invalid groups provided for merging:", groupA, groupB);
            return null;
        }
        // Vérification : seuls les groupes du même joueur peuvent fusionner
        if (groupA.ownerId !== groupB.ownerId) {
            return null;
        }
        // 1) Récupérer tous les pixels (SimplePixel) et leur position MONDIALE
        const allPixels = [];
        [groupA, groupB].forEach((grp) => {
            grp.pixels.forEach((px) => {
                allPixels.push({
                    instance: px,
                    worldX: grp.pos.x + px.x,
                    worldY: grp.pos.y + px.y,
                    color: px.color,
                    moveRadius: px.moveRadius
                });
            });
            // Libérer les pixels dans le pool
            grp.pixels.forEach(releasePixel);
            grp.pixels = [];
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
        // 3) Créer un nouveau groupe avec les pixels fusionnés (relocalisés)
        const padding = Math.max(groupA.padding, groupB.padding);
        const newPixelInstances = allPixels.map((p) => ({
            localX: p.worldX - centroid.x,
            localY: p.worldY - centroid.y,
            color: p.color,
            moveRadius: p.moveRadius
        }));
        const newGroup = new PixelGroup(
            centroid.x,
            centroid.y,
            allPixels.length,
            padding,
            newPixelInstances,
            groupA.ownerId // ownerId transmis au nouveau groupe
        );
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
        // 1) on récupère les points mondiaux de tous les pixels (plus d'enfants, on utilise this.pixels)
        const pts = this.pixels.map((px) => ({
            x: this.pos.x + px.x,
            y: this.pos.y + px.y,
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

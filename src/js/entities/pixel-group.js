import * as me from "melonjs";
import BasePixelGroup from "./base-pixel-group.js";
import { getPooledPixel, releasePixels } from "../util/pixel-pool.js";

class PixelGroup extends BasePixelGroup {    constructor(x, y, pixelCount = 10, padding = 20, pixelInstance = [], ownerId = null, color = "#000000") {
        super(x, y, {
            pixelCount,
            padding,
            ownerId,
            type: "pixelGroup",
            color
        });
        
        // Configuration spécifique à PixelGroup
        this.spawnX = x;
        this.spawnY = y;
        this.maxCount = 100;
        this.initialMovementConstrained = true;
        this._alreadyMerged = false;
        this.color = color;
        
        // Configuration du corps physique
        this.body.setMaxVelocity(3, 3);
        
        // Calcul du rayon de mouvement des pixels
        this.pixelMoveRadius = this._calculatePixelMoveRadius(pixelCount, pixelInstance.length);
        
        // Initialisation des pixels
        this.pixels = this._initializePixels(pixelInstance);
    }

    /**
     * Calcule le rayon de mouvement des pixels
     */
    _calculatePixelMoveRadius(pixelCount, instanceLength) {
        const radius = 3 * Math.sqrt(pixelCount || instanceLength);
        const maxRadius = 30;
        return Math.min(radius, maxRadius);
    }

    /**
     * Initialise les pixels du groupe
     */
    _initializePixels(pixelInstance) {
        const pixels = [];
        
        if (pixelInstance.length > 0) {
            // Utiliser les instances existantes
            for (let i = 0; i < pixelInstance.length; i++) {
                const instance = pixelInstance[i];
                const px = getPooledPixel(
                    instance.localX,
                    instance.localY,
                    this.pixelMoveRadius,
                    instance.color
                );
                pixels.push(px);
            }
        } else {
            // Créer de nouveaux pixels aléatoires
            for (let i = 0; i < this.pixelCount; i++) {
                const offsetX = Math.random() * 50 - 25;
                const offsetY = Math.random() * 50 - 25;
                const px = getPooledPixel(offsetX, offsetY, this.pixelMoveRadius, this.color);
                pixels.push(px);
            }
        }
        
        return pixels;
    }    /**
     * Retourne les points des pixels pour le calcul du hull
     */
    getPixelPoints() {
        return this.pixels.map((px) => ({
            x: this.pos.x + px.x,
            y: this.pos.y + px.y,
        }));
    }

    /**
     * Met à jour le groupe de pixels
     */    update(dt) {
        this._handleInitialMovementConstraint();
        this._updatePixelsMovement();
        this._updateHull();
        this._handleMerging();
        this._handleTargetMovement();
        
        return super.update(dt);
    }

    /**
     * Gère la contrainte de mouvement initial
     */
    _handleInitialMovementConstraint() {
        if (!this.initialMovementConstrained) return;
        
        const dx = this.pos.x - this.spawnX;
        const dy = this.pos.y - this.spawnY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 100) {
            this.body.vel.set(0, 0);
            this.initialMovementConstrained = false;
        }
    }

    /**
     * Met à jour le mouvement des pixels
     */
    _updatePixelsMovement() {
        this._updateCounter = (this._updateCounter + 1) % 3;
        if (this._updateCounter !== 0) return;

        for (let px of this.pixels) {
            px.updatePosition();
        }
    }

    /**
     * Met à jour le hull du groupe
     */
    _updateHull() {
        const pts = this.getPixelPoints();
        const hull = this._convexHull(pts);
        const centroid = this._calculateCentroid(hull);
        this._expandedHull = this._expandHull(hull, centroid, this.padding);
    }

    /**
     * Gère la fusion des groupes
     */
    _handleMerging() {
        if (this._alreadyMerged) return;

        const fusionThreshold = 50;
        const otherGroups = me.game.world.children
            .filter(obj => obj instanceof PixelGroup && obj !== this);

        for (let other of otherGroups) {
            if (this._canMergeWith(other, fusionThreshold)) {
                this.mergeIntoNewGroup(this, other);
                this._alreadyMerged = true;
                other._alreadyMerged = true;
                break;
            }
        }
    }

    /**
     * Vérifie si le groupe peut fusionner avec un autre
     */
    _canMergeWith(other, threshold) {
        return !other._alreadyMerged &&
               Math.hypot(this.pos.x - other.pos.x, this.pos.y - other.pos.y) < threshold &&
               this.body.vel.x === 0 && this.body.vel.y === 0 &&
               other.body.vel.x === 0 && other.body.vel.y === 0 &&
               this.pixelCount + other.pixelCount <= this.maxCount &&
               this.ownerId === other.ownerId;
    }

    /**
     * Gère le mouvement vers la cible
     */
    _handleTargetMovement() {
        if (!this.targetPos) return;

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
    }    /**
     * Dessine le groupe de pixels
     */
    draw(renderer) {
        this._drawPixels(renderer);
        this._drawHull(renderer);
        super.draw(renderer);
    }

    /**
     * Dessine tous les pixels du groupe
     */
    _drawPixels(renderer) {
        renderer.save();
        for (let px of this.pixels) {
            renderer.setColor(px.color);
            renderer.fillRect(this.pos.x + px.x, this.pos.y + px.y, 8, 8);
        }
        renderer.restore();
    }    /**
     * Fusionne deux groupes en un nouveau groupe
     */
    mergeIntoNewGroup(groupA, groupB) {
        if (!this._validateMerge(groupA, groupB)) return null;

        const allPixels = this._collectPixelsFromGroups([groupA, groupB]);
        if (allPixels.length === 0) {
            console.log("No valid pixels found for merging.");
            return null;
        }

        const centroid = this._calculatePixelsCentroid(allPixels);
        const newPixelInstances = this._createPixelInstances(allPixels, centroid);
        const newGroup = this._createMergedGroup(groupA, groupB, allPixels, centroid, newPixelInstances);

        this._replaceMergedGroups(groupA, groupB, newGroup);
        return newGroup;
    }

    /**
     * Valide si la fusion est possible
     */
    _validateMerge(groupA, groupB) {
        if (!groupA || !groupB) {
            console.warn("Invalid groups provided for merging:", groupA, groupB);
            return false;
        }
        return groupA.ownerId === groupB.ownerId;
    }

    /**
     * Collecte tous les pixels des groupes à fusionner
     */
    _collectPixelsFromGroups(groups) {
        const allPixels = [];
        groups.forEach((group) => {
            group.pixels.forEach((px) => {
                allPixels.push({
                    instance: px,
                    worldX: group.pos.x + px.x,
                    worldY: group.pos.y + px.y,
                    color: px.color,
                    moveRadius: px.moveRadius
                });
            });
            // Libérer les pixels dans le pool
            releasePixels(group.pixels);
            group.pixels = [];
        });
        return allPixels;
    }

    /**
     * Calcule le centroïde des pixels
     */
    _calculatePixelsCentroid(allPixels) {
        const centroid = allPixels.reduce(
            (acc, p) => ({ x: acc.x + p.worldX, y: acc.y + p.worldY }),
            { x: 0, y: 0 }
        );
        centroid.x /= allPixels.length;
        centroid.y /= allPixels.length;
        return centroid;
    }

    /**
     * Crée les instances de pixels pour le nouveau groupe
     */
    _createPixelInstances(allPixels, centroid) {
        return allPixels.map((p) => ({
            localX: p.worldX - centroid.x,
            localY: p.worldY - centroid.y,
            color: p.color,
            moveRadius: p.moveRadius
        }));
    }

    /**
     * Crée le nouveau groupe fusionné
     */
    _createMergedGroup(groupA, groupB, allPixels, centroid, newPixelInstances) {
        const padding = Math.max(groupA.padding, groupB.padding);
        return new PixelGroup(
            centroid.x,
            centroid.y,
            allPixels.length,
            padding,
            newPixelInstances,
            groupA.ownerId
        );
    }

    /**
     * Remplace les anciens groupes par le nouveau
     */
    _replaceMergedGroups(groupA, groupB, newGroup) {
        const world = me.game.world;
        try {
            world.removeChild(groupA);
            world.removeChild(groupB);
            world.addChild(newGroup);
        } catch (error) {
            console.error("Error during group removal or addition:", error);
        }
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

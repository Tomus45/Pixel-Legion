import * as me from "melonjs";
import BasePixelGroup from "./base-pixel-group.js";
import { getPooledPixel, releasePixels } from "../util/pixel-pool.js";

class PixelGroupJoueur extends BasePixelGroup {
    constructor(x, y, pixelCount = 10, padding = 32, pixelInstance = [], ownerId = null) {
        super(x, y, {
            pixelCount,
            padding,
            ownerId,
            type: "auraPixelGroup"
        });

        // Configuration spécifique à PixelGroupJoueur
        this.owner = null;
        
        // Calcul du rayon de mouvement des pixels
        this.pixelMoveRadius = this._calculatePixelMoveRadius(pixelCount, pixelInstance.length);
        
        // Initialisation des pixels
        this.pixels = this._initializePixels(pixelInstance);
    }

    /**
     * Calcule le rayon de mouvement des pixels
     */
    _calculatePixelMoveRadius(pixelCount, instanceLength) {
        const radius = 10 * Math.sqrt(pixelCount || instanceLength);
        const maxRadius = 50;
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
                    instance.color || "#ffffff"
                );
                pixels.push(px);
            }
        } else {
            // Créer de nouveaux pixels aléatoires
            for (let i = 0; i < this.pixelCount; i++) {
                const offsetX = Math.random() * 50 - 25;
                const offsetY = Math.random() * 50 - 25;
                const px = getPooledPixel(offsetX, offsetY, this.pixelMoveRadius, "#ffffff");
                pixels.push(px);
            }
        }
        
        return pixels;
    }

    /**
     * Retourne les points des pixels pour le calcul du hull
     */
    getPixelPoints() {
        return this.pixels.map((px) => ({
            x: this.pos.x + px.x,
            y: this.pos.y + px.y,
        }));
    }

    /**
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
    }

    /**
     * Définit le propriétaire du groupe
     */
    setOwner(owner) {
        this.owner = owner;
    }

    /**
     * Met à jour le groupe
     */
    update(dt) {
        // Synchroniser la position avec le propriétaire
        if (this.owner) {
            this.pos.x = this.owner.pos.x;
            this.pos.y = this.owner.pos.y;
        }

        // Mettre à jour le mouvement des pixels
        this._updatePixelsMovement();
        
        // Mettre à jour le hull
        this._updateHull();

        // Désactiver la logique de déplacement indépendante
        this.body.vel.set(0, 0);
        this.targetPos = null;

        super.update(dt);
    }

    /**
     * Met à jour le mouvement des pixels
     */
    _updatePixelsMovement() {
        this._updateCounter = (this._updateCounter || 0) + 1;
        this._updateCounter %= 3;
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
     * Calcule les bounds du groupe basé sur les pixels
     */
    getBoundsPixel() {
        // Récupérer les points mondiaux de tous les pixels
        const pts = this.getPixelPoints();
        
        if (pts.length === 0) {
            // Fallback : rien à dessiner
            return {
                minX: this.pos.x,
                minY: this.pos.y,
                maxX: this.pos.x,
                maxY: this.pos.y,
            };
        }

        // Calculer le hull
        const hull = this._convexHull(pts);
        
        // Calculer le centroïde pour l'expansion
        const centroid = this._calculateCentroid(hull);

        // Étendre chaque sommet du hull selon le padding
        const expanded = this._expandHull(hull, centroid, this.padding);

        // Calculer l'AABB sur l'expandedHull
        const xs = expanded.map((p) => p.x);
        const ys = expanded.map((p) => p.y);
        
        return {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
        };
    }
}

export default PixelGroupJoueur;

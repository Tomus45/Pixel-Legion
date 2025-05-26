import * as me from "melonjs";

/**
 * Classe de base pour tous les groupes de pixels
 * Contient la logique commune pour le convex hull et les bounds
 */
class BasePixelGroup extends me.Container {
    constructor(x, y, settings = {}) {
        super(x, y, { width: 8, height: 8 });
        
        // Propriétés communes
        this.pixelCount = settings.pixelCount || 10;
        this.padding = settings.padding || 20;
        this.selectable = settings.selectable !== false;
        this.selected = false;
        this.hovered = false;
        this.type = settings.type || "pixelGroup";
        this.ownerId = settings.ownerId || null;
        this.color = settings.color || "#ffffff";
        
        // Corps physique commun
        this.body = new me.Body(this);
        this.body.gravityScale = 0;
        this.body.collisionType = me.collision.types.NO_OBJECT;
        
        // État interne
        this._expandedHull = null;
        this._updateCounter = 0;
        
        this.setupInput();
    }

    /**
     * Configuration des événements d'entrée
     */
    setupInput() {
        me.input.registerPointerEvent("pointermove", me.game.viewport, (event) => {
            if (!(this instanceof BasePixelGroup)) return;
            const bounds = this.getBoundsPixel();
            const x = event.gameWorldX;
            const y = event.gameWorldY;
            this.hovered = this.isPointInBounds(x, y, bounds);
        });
    }

    /**
     * Vérifie si un point est dans les limites du groupe
     */
    isPointInBounds(x, y, bounds) {
        return x >= bounds.minX && x <= bounds.maxX && 
               y >= bounds.minY && y <= bounds.maxY;
    }

    /**
     * Calcul du convex hull (algorithme de Graham)
     */
    _convexHull(pts) {
        if (pts.length <= 1) return pts.slice();
        
        const sorted = pts.slice().sort((a, b) => 
            a.x === b.x ? a.y - b.y : a.x - b.x
        );
        
        const cross = (o, a, b) =>
            (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        
        // Construction de la partie inférieure
        const lower = this._buildHullPart(sorted, cross);
        
        // Construction de la partie supérieure
        const upper = this._buildHullPart(sorted.reverse(), cross);
        
        // Suppression des points dupliqués
        lower.pop();
        upper.pop();
        
        return lower.concat(upper);
    }

    /**
     * Construction d'une partie du hull
     */
    _buildHullPart(points, crossProduct) {
        const hull = [];
        for (const p of points) {
            while (hull.length >= 2 && 
                   crossProduct(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
                hull.pop();
            }
            hull.push(p);
        }
        return hull;
    }

    /**
     * Calcul du centroïde d'un ensemble de points
     */
    _calculateCentroid(points) {
        const centroid = points.reduce(
            (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
            { x: 0, y: 0 }
        );
        centroid.x /= points.length;
        centroid.y /= points.length;
        return centroid;
    }

    /**
     * Expansion du hull avec padding
     */
    _expandHull(hull, centroid, padding) {
        return hull.map((p) => {
            const dx = p.x - centroid.x;
            const dy = p.y - centroid.y;
            const dist = Math.hypot(dx, dy) || 1;
            return {
                x: Math.round(p.x + (dx / dist) * padding),
                y: Math.round(p.y + (dy / dist) * padding),
            };
        });
    }

    /**
     * Calcul des bounds basé sur le hull étendu
     */
    _calculateBounds(expandedHull) {
        const xs = expandedHull.map(p => p.x);
        const ys = expandedHull.map(p => p.y);
        return {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
        };
    }

    /**
     * Dessin du hull avec état (hover/selected)
     */
    _drawHull(renderer) {
        if (!this._expandedHull || this._expandedHull.length === 0) return;

        const colors = {
            hover: "#ffffff",
            selected: this.color,
            selectedFill: this.color
        };

        if (this.hovered && !this.selected) {
            this._drawHullState(renderer, colors.hover, 0.5);
        } else if (this.selected) {
            this._drawSelectedHull(renderer, colors);
        }
    }

    /**
     * Dessin du hull dans un état donné
     */
    _drawHullState(renderer, color, alpha) {
        renderer.setGlobalAlpha(alpha);
        renderer.setColor(color);
        this._drawHullPath(renderer);
        renderer.fill();
    }

    /**
     * Dessin du hull sélectionné avec contour
     */
    _drawSelectedHull(renderer, colors) {
        renderer.save();
        
        // Remplissage
        this._drawHullState(renderer, colors.selectedFill, 0.5);
        
        // Contour
        renderer.setGlobalAlpha(1.0);
        renderer.setColor(colors.selected);
        renderer.lineWidth = 5;
        this._drawHullPath(renderer);
        renderer.stroke();
        
        renderer.restore();
    }

    /**
     * Dessin du chemin du hull
     */
    _drawHullPath(renderer) {
        renderer.beginPath();
        renderer.moveTo(this._expandedHull[0].x, this._expandedHull[0].y);
        for (let p of this._expandedHull) {
            renderer.lineTo(p.x, p.y);
        }
        renderer.closePath();
    }

    // Méthodes abstraites à implémenter dans les classes dérivées
    getPixelPoints() {
        throw new Error("getPixelPoints must be implemented by subclass");
    }

    getBoundsPixel() {
        throw new Error("getBoundsPixel must be implemented by subclass");
    }

    // Méthodes de sélection communes
    select() {
        this.selected = true;
    }

    unselect() {
        this.selected = false;
    }
}

export default BasePixelGroup;

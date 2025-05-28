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
        
        // Propriétés de combat (héritées de PixelGroup)
        this.team = this._determineTeam(ownerId);
        this.attackRange = 60; // Portée d'attaque plus courte pour l'aura
        this.attackCooldown = 1500; // Cooldown plus long
        this.lastAttackTime = 0;
        this.attackDamage = 1;
        this.isInCombat = false;
        this.combatTargets = [];
        this.projectiles = [];
        
        // Calcul du rayon de mouvement des pixels
        this.pixelMoveRadius = this._calculatePixelMoveRadius(pixelCount, pixelInstance.length);
        
        // Initialisation des pixels
        this.pixels = this._initializePixels(pixelInstance);
    }

    /**
     * Détermine l'équipe basée sur l'ownerId
     */
    _determineTeam(ownerId) {
        if (ownerId === null || ownerId === 0) return "green";
        if (ownerId === 1) return "red";
        return "neutral";
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
    }    /**
     * Dessine le groupe de pixels
     */
    draw(renderer) {
        this._drawPixels(renderer);
        this._drawHull(renderer);
        this._drawProjectiles(renderer);
        this._drawCombatIndicator(renderer);
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
     * Dessine les projectiles de combat
     */
    _drawProjectiles(renderer) {
        if (this.projectiles.length === 0) return;
        
        renderer.save();
        renderer.lineWidth = 2;
        
        for (let proj of this.projectiles) {
            if (proj.active) {
                // Calculer la position actuelle du projectile
                const currentX = proj.startX + (proj.endX - proj.startX) * proj.progress;
                const currentY = proj.startY + (proj.endY - proj.startY) * proj.progress;
                
                // Dessiner une ligne de tir avec un effet de fade
                const alpha = 1.0 - proj.progress; // Fade out au fil du temps
                renderer.setGlobalAlpha(alpha);
                renderer.setColor(proj.color);
                
                // Ligne de tir avec effet spécial pour l'aura
                renderer.beginPath();
                renderer.moveTo(proj.startX, proj.startY);
                renderer.lineTo(currentX, currentY);
                renderer.stroke();
                
                // Point de projectile plus grand pour l'aura
                renderer.fillRect(currentX - 3, currentY - 3, 6, 6);
            }
        }
          renderer.restore();
    }

    /**
     * Dessine l'indicateur de combat (copié de PixelGroup)
     */
    _drawCombatIndicator(renderer) {
        if (!this.isInCombat) return;
        
        renderer.save();
        
        // Cercle rouge clignotant autour du groupe en combat
        const time = Date.now();
        const pulseAlpha = 0.3 + 0.4 * Math.sin((time % 1000) / 1000 * Math.PI * 2);
        
        renderer.setGlobalAlpha(pulseAlpha);
        renderer.setColor("#ff0000");
        renderer.lineWidth = 3;
        
        // Calculer le rayon basé sur la taille du groupe (plus grand pour l'aura)
        const radius = Math.max(40, this.pixels.length * 2.5);
        
        renderer.beginPath();
        renderer.stroke();
        
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
        
        // Gestion du combat
        this._handleCombat(dt);
        this._updateProjectiles(dt);

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
     * Gère le système de combat (copié de PixelGroup)
     */
    _handleCombat(dt) {
        // Trouver les ennemis à portée
        this._findEnemiesInRange();
        
        // Attaquer si possible
        if (this.combatTargets.length > 0) {
            this.isInCombat = true;
            this._performAttacks(dt);
        } else {
            this.isInCombat = false;
        }
    }

    /**
     * Trouve les ennemis dans la portée d'attaque
     */
    _findEnemiesInRange() {
        this.combatTargets = [];
        
        // Inclure les PixelGroup et les PixelGroupJoueur ennemis
        const allTargets = me.game.world.children
            .filter(obj => (obj.constructor.name === "PixelGroup" || obj.constructor.name === "PixelGroupJoueur") && obj !== this);

        for (let other of allTargets) {
            // Vérifier si c'est un ennemi
            if (other.team !== this.team && other.team !== "neutral") {
                const distance = Math.hypot(
                    this.pos.x - other.pos.x,
                    this.pos.y - other.pos.y
                );
                
                if (distance <= this.attackRange) {
                    this.combatTargets.push(other);
                }
            }
        }
    }

    /**
     * Effectue les attaques sur les cibles
     */
    _performAttacks(dt) {
        const currentTime = Date.now();
        
        if (currentTime - this.lastAttackTime >= this.attackCooldown) {
            // Attaquer toutes les cibles à portée
            for (let target of this.combatTargets) {
                this._attackTarget(target);
                this._createProjectile(target);
            }
            
            this.lastAttackTime = currentTime;
        }
    }

    /**
     * Attaque une cible spécifique
     */
    _attackTarget(target) {
        if (target.pixels.length > 0) {
            // Réduire le nombre de pixels de la cible
            for (let i = 0; i < this.attackDamage && target.pixels.length > 0; i++) {
                const removedPixel = target.pixels.pop();
                releasePixels([removedPixel]);
            }
            
            // Mettre à jour le pixelCount
            target.pixelCount = target.pixels.length;
            
            // Détruire le groupe si plus de pixels
            if (target.pixels.length === 0) {
                me.game.world.removeChild(target);
            }
        }
    }

    /**
     * Crée un projectile visuel vers la cible
     */
    _createProjectile(target) {
        const projectile = {
            startX: this.pos.x,
            startY: this.pos.y,
            endX: target.pos.x,
            endY: target.pos.y,
            progress: 0,
            speed: 2.5, // Vitesse légèrement plus lente pour l'aura
            color: this.color || "#ffffff",
            active: true
        };
        
        this.projectiles.push(projectile);
    }

    /**
     * Met à jour les projectiles visuels
     */
    _updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            if (proj.active) {
                proj.progress += (proj.speed * dt) / 1000;
                
                if (proj.progress >= 1.0) {
                    proj.active = false;
                    this.projectiles.splice(i, 1);
                }
            }
        }
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

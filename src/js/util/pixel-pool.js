
/**
 * Système de pooling pour les pixels
 * Optimise la gestion mémoire en réutilisant les objets SimplePixel
 */

// Simple pixel data object
class SimplePixel {
    constructor(x = 0, y = 0, moveRadius = 5, color = "#fff") {
        this.reset(x, y, moveRadius, color);
    }

    reset(x, y, moveRadius, color = "#fff") {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.moveRadius = moveRadius;
        this.moveSpeed = 0.2;
        this.color = color;
        this.targetPos = null;
    }

    /**
     * Génère une nouvelle position cible aléatoire
     */
    generateTarget() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.moveRadius;
        this.targetPos = {
            x: this.startX + Math.cos(angle) * radius,
            y: this.startY + Math.sin(angle) * radius,
        };
    }

    /**
     * Met à jour la position vers la cible
     */
    updatePosition() {
        if (!this.targetPos) {
            this.generateTarget();
            return;
        }

        const dx = this.targetPos.x - this.x;
        const dy = this.targetPos.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 2) {
            const nx = dx / dist;
            const ny = dy / dist;
            this.x += nx * this.moveSpeed;
            this.y += ny * this.moveSpeed;
        } else {
            this.targetPos = null;
        }
    }
}

/**
 * Pool manager pour les pixels
 */
class PixelPool {
    constructor() {
        this.pool = [];
        this.maxSize = 1000; // Limite pour éviter une croissance excessive
    }

    /**
     * Récupère un pixel du pool ou en crée un nouveau
     */
    get(x, y, moveRadius, color) {
        let pixel;
        if (this.pool.length > 0) {
            pixel = this.pool.pop();
            pixel.reset(x, y, moveRadius, color);
        } else {
            pixel = new SimplePixel(x, y, moveRadius, color);
        }
        return pixel;
    }

    /**
     * Remet un pixel dans le pool
     */
    release(pixel) {
        if (this.pool.length < this.maxSize) {
            this.pool.push(pixel);
        }
    }

    /**
     * Libère un tableau de pixels
     */
    releaseAll(pixels) {
        pixels.forEach(pixel => this.release(pixel));
    }

    /**
     * Vide le pool
     */
    clear() {
        this.pool.length = 0;
    }

    /**
     * Retourne la taille actuelle du pool
     */
    size() {
        return this.pool.length;
    }
}

// Instance singleton
const pixelPool = new PixelPool();

// Export des fonctions d'interface
export function getPooledPixel(x, y, moveRadius, color) {
    return pixelPool.get(x, y, moveRadius, color);
}

export function releasePixel(pixel) {
    pixelPool.release(pixel);
}

export function releasePixels(pixels) {
    pixelPool.releaseAll(pixels);
}

export function clearPixelPool() {
    pixelPool.clear();
}

export function getPoolSize() {
    return pixelPool.size();
}

export { SimplePixel };

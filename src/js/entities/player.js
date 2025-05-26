import * as me from "melonjs";
import PixelGroup from "./pixel-group.js";
import PixelGroupJoueur from "./pixel-group-joueur.js";
import game from "./../game.js";

class PlayerUnit extends me.Entity {
    constructor(x, y, settings) {
        super(x, y, settings);
        
        this.initializeProperties(settings);
        this.setupPhysics();
        this.setupBounceSystem();
        this.setupPixelGeneration();
        this.createAuraPixelGroup();
        this.setupRenderable();
        this.setupBoundingBox();
        this.setupInputHandlers();
    }

    initializeProperties(settings) {
        // Basic properties
        this.type = "player";
        this.selectable = true;
        this.selected = false;
        this.team = "green";
        this.ownerId = settings?.ownerId ?? crypto.randomUUID();
        this.color = settings?.color || "#00ff00";

        // Selection and dragging
        this.selectedEntity = null;
        this.isDragging = false;
    }

    setupPhysics() {
        this.body.collisionType = me.collision.types.PLAYER_OBJECT;
        this.body.setMaxVelocity(2, 2);
        this.body.gravityScale = 0;
    }

    setupBounceSystem() {
        this.startX = this.pos.x;
        this.startY = this.pos.y;
        this.isBouncing = false;
        this.bounceRadius = 1;
        this.bounceSpeed = 4;
        this.bounceAngle = 0;
        this.bounceDecay = 0.98;
    }

    setupPixelGeneration() {
        this.pixelTimer = 0;
        this.pixelInterval = 2000; // Generate pixel group every 2 seconds
    }

    createAuraPixelGroup() {
        this.auraPixelGroup = me.pool.pull(
            "pixelGroupJoueur",
            this.pos.x,
            this.pos.y,
            10,
            32,
            [],
            this.ownerId,
            this.color
        );
        this.auraPixelGroup.setOwner(this);
        me.game.world.addChild(this.auraPixelGroup, this.z);
    }

    setupRenderable() {
        this.renderable = new me.Sprite(0, 0, {
            image: me.loader.getImage("character"),
            framewidth: 32,
            frameheight: 32,
        });
        this.renderable.addAnimation("stand", [0], 100);
        this.renderable.setCurrentAnimation("stand");
        this.anchorPoint.set(0.5, 0.5);
    }

    setupBoundingBox() {
        const halfW = this.renderable.width * this.anchorPoint.x;
        const halfH = this.renderable.height * this.anchorPoint.y;

        this.getBoundsPixel = () => ({
            minX: this.pos.x,
            minY: this.pos.y, // Fixed: was this.pos.x
            maxX: this.pos.x + halfW + 4,
            maxY: this.pos.y + halfH + 4,
        });

        this.debug = new me.Rect(0, 0, this.renderable.width, this.renderable.height);
        this.debug.pos.x = this.pos.x - halfW;
        this.debug.pos.y = this.pos.y - halfH;
    }

    setupInputHandlers() {
        this.registerPointerMove();
        this.registerPointerUp();
        this.registerPointerDown();
    }

    registerPointerMove() {
        me.input.registerPointerEvent("pointermove", me.game.viewport, (event) => {
            if (this.isDragging) {
                this.setTargetPosition(event.gameWorldX, event.gameWorldY);
            }
        });
    }

    registerPointerUp() {
        me.input.registerPointerEvent("pointerup", me.game.viewport, (event) => {
            if (event.button === 0) {
                this.isDragging = false;
            }
        });
    }

    registerPointerDown() {
        me.input.registerPointerEvent("pointerdown", me.game.viewport, (event) => {
            if (event.button === 0) {
                this.handleLeftClick(event.gameWorldX, event.gameWorldY);
            } else if (event.button === 2) {
                this.handleRightClick();
            }
        });
    }

    handleLeftClick(x, y) {
        const clicked = this.findClickedEntity(x, y);
        
        if (clicked) {
            this.selectEntity(clicked);
        } else if (this.selectedEntity) {
            this.setTargetPosition(x, y);
        }
    }

    handleRightClick() {
        this.deselectAllEntities();
        this.selectedEntity = null;
    }

    findClickedEntity(x, y) {
        const candidates = me.game.world.getChildByProp("selectable", true);
        return candidates.find((entity) => {
            const bounds = entity.getBoundsPixel();
            return x >= bounds.minX && x <= bounds.maxX && 
                   y >= bounds.minY && y <= bounds.maxY;
        });
    }

    selectEntity(entity) {
        this.deselectAllEntities();
        entity.select();
        this.selectedEntity = entity;
        this.isDragging = true;
    }

    deselectAllEntities() {
        const candidates = me.game.world.getChildByProp("selectable", true);
        candidates.forEach(entity => entity.unselect());
    }

    setTargetPosition(x, y) {
        const targetPos = { x, y };
        
        if (this.isPlayerOrAura(this.selectedEntity)) {
            this.targetPos = targetPos;
        } else {
            this.selectedEntity.targetPos = targetPos;
        }
    }

    isPlayerOrAura(entity) {
        return entity?.type === "player" || entity?.type === "auraPixelGroup";
    }    update(dt) {
        this.updateMovement();
        this.updateBounceEffect(dt);
        this.syncAuraPosition();
        this.updatePixelGeneration(dt);
        
        super.update(dt);
        return true;
    }

    updateMovement() {
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
    }

    updateBounceEffect(dt) {
        if (!this.isBouncing) return;

        // Update angle for oscillatory movement
        this.bounceAngle += (this.bounceSpeed * dt) / 1000;
        if (this.bounceAngle > Math.PI * 2) {
            this.bounceAngle -= Math.PI * 2;
        }

        // Calculate offset based on angle
        const offsetX = Math.cos(this.bounceAngle) * this.bounceRadius;
        const offsetY = Math.sin(this.bounceAngle) * this.bounceRadius;

        // Apply oscillatory offset to current position
        this.pos.x += offsetX;
        this.pos.y += offsetY;

        // Progressively reduce bounce radius
        this.bounceRadius *= this.bounceDecay;

        // Stop bouncing when radius becomes very small
        if (this.bounceRadius < 0.1) {
            this.bounceRadius = 0;
            this.isBouncing = false;
        }
    }

    syncAuraPosition() {
        this.auraPixelGroup.pos.set(this.pos.x, this.pos.y);
    }

    updatePixelGeneration(dt) {
        this.pixelTimer += dt;
        
        if (this.pixelTimer >= this.pixelInterval) {
            this.pixelTimer = 0;
            this.generatePixelGroup();
        }
    }

    generatePixelGroup() {
        // Start bounce effect
        this.isBouncing = true;
        this.bounceRadius = 1;
        
        // Create new pixel group
        const pixelGroup = me.pool.pull(
            "pixelGroup",
            this.pos.x,
            this.pos.y,
            10,
            undefined,
            [],
            this.ownerId,
            this.color
        );
        
        // Set random velocity
        pixelGroup.body.vel.x = Math.random() < 0.5 ? -2 : 2;
        pixelGroup.body.vel.y = Math.random() < 0.5 ? -2 : 2;
        
        me.game.world.addChild(pixelGroup, 1);
    }

    select() {
        this.selected = true;
    }

    unselect() {
        this.selected = false;
    }
}

export default PlayerUnit;

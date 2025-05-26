// filepath: c:\Users\firef\Desktop\git\Pixel-Legion\src\js\entities\enemy_behavior.js
import * as me from "melonjs";

/**
 * Simple AI for enemy units: chase player if within radius, else patrol around spawn point.
 * @param {me.Entity} enemy - The enemy instance to control.
 * @param {number} dt - Time delta in ms.
 */
export function handleEnemyBehavior(enemy, dt) {
    // Find the player entity
    const players = me.game.world.getChildByProp("type", "player");
    if (players.length === 0) {
        return;
    }
    const player = players[0];


    // Patrol around initial spawn
    if (!enemy.patrolTarget) {
        const range = enemy.patrolRange || 100;
        enemy.patrolTarget = {
            x: enemy.startX + (Math.random() * 2 - 1) * range,
            y: enemy.startY + (Math.random() * 2 - 1) * range,
        };
    }
    const pdx = enemy.patrolTarget.x - enemy.pos.x;
    const pdy = enemy.patrolTarget.y - enemy.pos.y;
    const pdist = Math.hypot(pdx, pdy);
    if (pdist < 4) {
        // Reached patrol point, reset target
        enemy.patrolTarget = null;
        enemy.targetPos = null;
    } else {
        enemy.targetPos = { x: enemy.patrolTarget.x, y: enemy.patrolTarget.y };
    }
}
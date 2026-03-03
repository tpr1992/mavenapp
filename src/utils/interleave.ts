import type { Maker } from "../types"

/**
 * Reorder a pre-sorted maker array so no more than `maxConsecutive` items
 * of the same category appear in a row. Uses a greedy approach: when a
 * violation would occur, finds the nearest different-category maker and
 * moves it forward via splice (preserving relative order).
 *
 * O(n²) worst case — instant with ~40 makers and 3 categories.
 */
export function interleavedByCategory(makers: Maker[], maxConsecutive = 2): Maker[] {
    const result = [...makers]
    const len = result.length

    for (let i = 0; i < len; i++) {
        let streak = 1
        while (streak <= maxConsecutive && i - streak >= 0 && result[i - streak].category === result[i].category) {
            streak++
        }

        if (streak > maxConsecutive) {
            let swapIdx = -1
            for (let j = i + 1; j < len; j++) {
                if (result[j].category !== result[i].category) {
                    swapIdx = j
                    break
                }
            }
            if (swapIdx !== -1) {
                const item = result.splice(swapIdx, 1)[0]
                result.splice(i, 0, item)
            }
        }
    }

    return result
}

/* Follow-ups: a block that continues the one above it.
 *
 * A subsection can introduce several ideas, and one of them can need more
 * than a block — the rule that makes it usable, the reason it is true. Laid
 * out flat, those read as equal and separate, and a `depth` block explaining
 * why the definition holds ended up five blocks away from the definition.
 *
 * `follows: true` declares the attachment without nesting: the YAML stays a
 * flat list, and the block attaches to the nearest block above it that is not
 * itself a follow-up. Several follow-ups in a row therefore share one parent.
 * A `depth` follow-up is that parent's "why".
 */

/** is this block attached to the block above it? */
export const isFollow = b => !!(b && b.follows);

/** index of the block `blocks[i]` attaches to, or -1 when it attaches to nothing */
export function parentIndex(blocks, i) {
  if (!isFollow(blocks[i])) return -1;
  for (let j = i - 1; j >= 0; j--) if (!isFollow(blocks[j])) return j;
  return -1;
}

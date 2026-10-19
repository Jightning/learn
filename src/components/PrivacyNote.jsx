import { configured } from "../lib/cloud.js";

/* The one place the site says what leaves the device.
 *
 * It belongs here, next to the reader's own numbers, rather than beside the
 * backup settings — the question "what happens to my data" is asked while
 * looking at the data, not while configuring anything. It states the truth for
 * *this* device, and for a reader who has set nothing up that truth is the
 * short one: nothing leaves at all, ever, because there is nothing to leave to.
 *
 * The connected case has to be exact rather than reassuring. Something does
 * leave — that is the point of a backup — and what protects it is that it is
 * sealed before it goes, not that it is trusted after it arrives.
 */
export default function PrivacyNote() {
  if (!configured()) return (
    <p class="lede cal-priv">
      No sync, nothing will get uploaded.
    </p>
  );
  return (
    <p class="lede cal-priv">
      This device backs up your saved learning data and courses, encrypted in
      this browser. The backup server receives the shared secret, so it can
      decrypt that data. Device IDs, record names, timestamps and sizes are
      visible to it. Schedules are recomputed from the answer log.
    </p>
  );
}

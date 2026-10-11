import { save } from '../save';

/**
 * Kill feed lines: `{k}` is the stickman who did it, `{v}` the one who went down.
 * 'kill' = knocked out by someone. The others are the map's fault (nobody hit them first).
 * 'water'/'void'/'lava' with a killer = someone knocked them in.
 */
export type FeedKind = 'kill' | 'water' | 'void' | 'lava' | 'burn';

const EN: Record<FeedKind, { solo: string[]; by: string[] }> = {
  kill: {
    solo: ['{v} tripped over their own feet and died of embarrassment'],
    by: [
      '{k} turned {v} into modern art',
      '{v} got sent back to the lobby by {k}',
      '{k} just deleted {v}’s existence',
      '{v} got folded like laundry by {k}',
      '{k} yeeted {v} into next Tuesday',
      '{k} unsubscribed {v} from life',
      '{v} got bonked into a different dimension by {k}',
      '{k} turned {v} into a sad little noodle',
      '{v} rage quit (in spirit) thanks to {k}',
      '{k} sent {v} to the shadow realm. No refunds',
      '{v} has left the chat. {k} helped',
      '{k} uninstalled {v}',
      '{v} got absolutely clowned by {k} 🤡',
      '{k} gave {v} a free trip to the respawn screen',
    ],
  },
  water: {
    solo: ['{v} forgot water isn’t solid', '{v} went for a swim. Forever', '{v} thought they were a fish. They were not', '{v} is sleeping with the fishes now'],
    by: ['{k} gave {v} a one-way ticket to the ocean', '{k} fed {v} to the fish 🐟', '{k} baptized {v}. Permanently'],
  },
  void: {
    solo: [
      '{v} tried flying… gravity said no',
      '{v} walked off the map like it was a lifestyle choice',
      '{v} found the edge of the world. The hard way',
      '{v} took the stairs. There were no stairs',
    ],
    by: ['{k} showed {v} the exit', '{k} punted {v} off the map', '{v} got launched into orbit by {k}', '{k} told {v} to touch grass. There was no grass'],
  },
  lava: {
    solo: ['{v} thought the lava was a hot tub', '{v} became a crispy nugget', '{v} took a lava bath. 0/10 would not recommend'],
    by: ['{k} roasted {v} like a marshmallow', '{k} dunked {v} in the lava. Extra crispy'],
  },
  burn: {
    solo: ['{v} spontaneously combusted. Classic {v}'],
    by: ['{k} turned {v} into toast 🍞', '{k} set {v} on fire and {v} just… let it happen'],
  },
};

const TH: Record<FeedKind, { solo: string[]; by: string[] }> = {
  kill: {
    solo: ['{v} สะดุดเท้าตัวเองแล้วตายเพราะอาย'],
    by: [
      '{k} เปลี่ยน {v} ให้เป็นงานศิลปะ',
      '{v} โดน {k} ส่งกลับล็อบบี้',
      '{k} ลบ {v} ออกจากโลกนี้แล้ว',
      '{v} โดน {k} พับเหมือนผ้า',
      '{k} เขวี้ยง {v} ไปถึงวันอังคารหน้า',
      '{k} กดเลิกติดตามชีวิตของ {v}',
      '{v} โดน {k} บอนก์ไปอีกมิติ',
      '{k} ทำให้ {v} กลายเป็นเส้นหมี่',
      '{v} เลิกเล่นในใจ เพราะ {k}',
      '{k} ส่ง {v} ไปโลกเงา ไม่รับคืน',
      '{v} ออกจากแชทแล้ว {k} ช่วยกด',
      '{k} ถอนการติดตั้ง {v}',
      '{v} โดน {k} แกงยับ 🤡',
      '{k} แจกตั๋วฟรีไปหน้ารอเกิดให้ {v}',
    ],
  },
  water: {
    solo: ['{v} ลืมไปว่าน้ำไม่ใช่พื้น', '{v} ไปว่ายน้ำ ตลอดกาล', '{v} คิดว่าตัวเองเป็นปลา ไม่ใช่นะ', '{v} ไปนอนกับปลาแล้ว'],
    by: ['{k} ให้ตั๋วเที่ยวเดียวไปทะเลกับ {v}', '{k} เอา {v} ไปให้ปลากิน 🐟', '{k} จับ {v} ล้างบาปแบบถาวร'],
  },
  void: {
    solo: ['{v} พยายามบิน… แรงโน้มถ่วงบอกว่าไม่', '{v} เดินตกแมพเหมือนเป็นไลฟ์สไตล์', '{v} เจอขอบโลกแล้ว แบบเจ็บ ๆ', '{v} ลงบันได แต่ไม่มีบันได'],
    by: ['{k} ชี้ทางออกให้ {v}', '{k} เตะ {v} ตกแมพ', '{v} โดน {k} ยิงขึ้นอวกาศ', '{k} บอก {v} ให้ไปสัมผัสหญ้า แต่ไม่มีหญ้า'],
  },
  lava: {
    solo: ['{v} คิดว่าลาวาคืออ่างน้ำร้อน', '{v} กลายเป็นนักเก็ตกรอบ', '{v} แช่ลาวา ไม่แนะนำ 0/10'],
    by: ['{k} ย่าง {v} เหมือนมาร์ชเมลโล', '{k} จุ่ม {v} ลงลาวา กรอบพิเศษ'],
  },
  burn: {
    solo: ['{v} ติดไฟเองซะงั้น'],
    by: ['{k} ทำให้ {v} กลายเป็นขนมปังปิ้ง 🍞', '{k} จุดไฟใส่ {v} แล้ว {v} ก็ปล่อยให้มันไหม้'],
  },
};

/** How many lines each kind has (the same in every language). */
export function feedCount(kind: FeedKind, byKiller: boolean): number {
  return EN[kind][byKiller ? 'by' : 'solo'].length;
}

/** The kill feed line split into parts, so names can be drawn in their own colours. */
export function feedParts(kind: FeedKind, byKiller: boolean, n: number, killer: string, victim: string): { text: string; who: 'k' | 'v' | null }[] {
  const dict = save.data.settings.lang === 'th' ? TH : EN;
  const list = dict[kind][byKiller ? 'by' : 'solo'];
  const line = list[n % list.length];
  return line
    .split(/(\{k\}|\{v\})/)
    .filter(Boolean)
    .map((s) => (s === '{k}' ? { text: killer, who: 'k' as const } : s === '{v}' ? { text: victim, who: 'v' as const } : { text: s, who: null }));
}

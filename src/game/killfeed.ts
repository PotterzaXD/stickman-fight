import { save } from '../save';

/**
 * Kill feed lines: `{k}` is the stickman who did it, `{v}` the one who went down.
 * 'kill' = knocked out by someone. The others are the map's fault (nobody hit them first).
 * 'water'/'void'/'lava' with a killer = someone knocked them in.
 */
export type FeedKind = 'kill' | 'water' | 'void' | 'lava' | 'burn' | 'peck' | 'meow' | 'chick' | 'chicken' | 'fish' | 'memory' | 'dog' | 'skeleton' | 'lilpigeon' | 'retro' | 'zombie' | 'bee' | 'spikes';

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
  peck: {
    solo: ['{v} got pecked. Just one peck'],
    by: ['{k} pecked {v} into next week', '{k} mistook {v} for a breadcrumb 🍞', '{v} got one-pecked by {k}. Embarrassing', '{k} took {v} back to the nest 🪺', '{k} said COO and {v} was gone'],
  },
  // A cat went down: cute lines (drawn pink with paws).
  meow: {
    solo: ['🐾 {v} ran out of all nine lives 😿', '🐾 {v} curled up for a very long nap 💤'],
    by: ['🐾 {k} booped {v} too hard 😿', '😺 {v} got scooped up by {k}. Bye bye kitty 🐾', '🐾 {k} sent {v} to the big cat bed in the sky ☁️', '😿 {k} petted {v} the wrong way 🐾'],
  },
  // Helpers with their own lines and colours (see FEED_STYLE).
  chick: {
    solo: ['{v} got turned into chicken nuggets', '{v} went back into its egg 🥚', '{v} peeped its last peep 🐥', '{v} tried to cross the road. It did not make it'],
    by: ['{v} got bop by {k}', '{k} turned {v} into chicken nuggets', '{k} scrambled {v} like an egg 🍳', '{v} got flattened by {k}. Peep…', '{k} sent {v} back to the farm 🐣'],
  },
  chicken: {
    solo: ['{v} is now a bucket of fried chicken 🍗', '{v} flew the coop. Forever', '{v} laid its very last egg 🥚'],
    by: ['{k} turned {v} into a drumstick 🍗', '{v} got plucked by {k}', '{k} made {v} into chicken soup 🍲', '{v} protected the chicks to the end. {k} was meaner'],
  },
  fish: {
    solo: ['{v} got turned into someone’s favorite dish', '{v} flopped one too many times', '{v} is sushi now 🍣', '{v} forgot how to swim'],
    by: ['{k} turned {v} into someone’s favorite dish', '{k} grilled {v} 🐟🔥', '{v} got served with lemon by {k} 🍋', '{k} put {v} on the menu'],
  },
  // The Recall Memory boss: just the words, no names.
  memory: {
    solo: ['Who were you fighting? I think that’s just your imaginations.', 'Was it ever really there? 💭', 'It was all just a memory…', 'You blinked and it was gone. Were you dreaming?', 'Nobody remembers the Recall Memory boss. Not even you.'],
    by: ['Who were you fighting? I think that’s just your imaginations.', 'Was it ever really there? 💭', 'It was all just a memory…', 'You blinked and it was gone. Were you dreaming?', 'Nobody remembers the Recall Memory boss. Not even you.'],
  },
  // The dog always gets this line.
  dog: {
    solo: ['{v}’s resting he’ll comeback later don’t worry.'],
    by: ['{v}’s resting he’ll comeback later don’t worry.'],
  },
  skeleton: {
    solo: ['{v} fell apart. Bad to the bone 💀', '{v} is just a pile of bones now 🦴', '{v} rattled its last rattle'],
    by: ['{k} broke every bone in {v} 🦴', '{v} got turned into a dog toy by {k} 🐕', '{k} sent {v} back to the graveyard 🪦', '{k} rattled {v}’s bones apart 💀'],
  },
  lilpigeon: {
    solo: ['{v} flew away. Coo…', '{v} got distracted by bread 🍞', '{v} went home to the park'],
    by: ['{k} plucked all of {v}’s feathers 🪶', '{k} somehow beat all 250,000 HP of {v}', '{v} got shooed away by {k}', '{k} turned {v} into a pigeon pie 🥧'],
  },
  retro: {
    solo: ['{v} went back to 8-bit heaven 👾', '{v} ran out of pixels', '{v} got a GAME OVER screen'],
    by: ['{k} pressed the reset button on {v} 👾', '{k} blew the dust out of {v}’s cartridge', '{v} got downgraded to 1 pixel by {k}', '{k} sent {v} back to the arcade'],
  },
  zombie: {
    solo: ['{v} went back to sleep in the ground 🪦', '{v} finally rests in peace 🧟', '{v} fell apart. Again'],
    by: ['{k} made {v} un-undead 🧟', '{k} sent {v} back to the graveyard 🪦', '{v} wanted brains. {k} said no 🧠', '{k} told {v} it was time for bed again'],
  },
  bee: {
    solo: ['{v} buzzed its last buzz 🐝', '{v} went back to the hive', '{v} flew into a window'],
    by: ['{k} swatted {v} 🐝', '{k} turned {v} into honey 🍯', '{v} got un-bee-lievably beaten by {k}', '{k} said "no thank you" to {v} 🐝'],
  },
  spikes: {
    solo: ['{v} sat on the spikes. Ouch 🌵', '{v} found out spikes are pointy', '{v} became a pincushion 📌'],
    by: ['{k} pushed {v} onto the spikes 🌵', '{k} turned {v} into a pincushion 📌', '{v} got kebabbed thanks to {k} 🍢'],
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
  peck: {
    solo: ['{v} โดนจิกทีเดียวจบ'],
    by: ['{k} จิก {v} ไปถึงอาทิตย์หน้า', '{k} นึกว่า {v} เป็นเศษขนมปัง 🍞', '{v} โดน {k} จิกทีเดียวจอด น่าอาย', '{k} คาบ {v} กลับรัง 🪺', '{k} ร้องกุ๊กกรู แล้ว {v} ก็หายไป'],
  },
  meow: {
    solo: ['🐾 {v} หมดเก้าชีวิตแล้ว 😿', '🐾 {v} ขดตัวนอนยาว ๆ ไปเลย 💤'],
    by: ['🐾 {k} จิ้มจมูก {v} แรงไปหน่อย 😿', '😺 {v} โดน {k} อุ้มไปแล้ว บ๊ายบายเหมียว 🐾', '🐾 {k} ส่ง {v} ไปนอนเตียงแมวบนฟ้า ☁️', '😿 {k} ลูบขน {v} ผิดทาง 🐾'],
  },
  chick: {
    solo: ['{v} กลายเป็นนักเก็ตไก่ไปแล้ว', '{v} กลับเข้าไปในไข่ 🥚', '{v} ร้องเจี๊ยบครั้งสุดท้าย 🐥', '{v} พยายามข้ามถนน แต่ไม่รอด'],
    by: ['{v} โดน {k} บ๊อป', '{k} ทำให้ {v} กลายเป็นนักเก็ตไก่', '{k} ตี {v} เหมือนไข่คน 🍳', '{v} โดน {k} ทับแบน เจี๊ยบ…', '{k} ส่ง {v} กลับฟาร์ม 🐣'],
  },
  chicken: {
    solo: ['{v} กลายเป็นไก่ทอดหนึ่งถังแล้ว 🍗', '{v} บินหนีออกจากเล้า ตลอดกาล', '{v} ออกไข่ฟองสุดท้าย 🥚'],
    by: ['{k} ทำให้ {v} กลายเป็นน่องไก่ 🍗', '{v} โดน {k} ถอนขน', '{k} เอา {v} ไปทำซุปไก่ 🍲', '{v} ปกป้องลูกเจี๊ยบจนวินาทีสุดท้าย แต่ {k} โหดกว่า'],
  },
  fish: {
    solo: ['{v} กลายเป็นเมนูโปรดของใครบางคน', '{v} ดิ้นเยอะไปหน่อย', '{v} กลายเป็นซูชิแล้ว 🍣', '{v} ลืมวิธีว่ายน้ำ'],
    by: ['{k} ทำให้ {v} กลายเป็นเมนูโปรดของใครบางคน', '{k} ย่าง {v} 🐟🔥', '{v} โดน {k} เสิร์ฟพร้อมมะนาว 🍋', '{k} ใส่ {v} ลงในเมนู'],
  },
  memory: {
    solo: ['คุณสู้กับใครอยู่เหรอ? ฉันว่ามันก็แค่จินตนาการของคุณนะ', 'มันเคยอยู่ตรงนั้นจริง ๆ เหรอ? 💭', 'ทั้งหมดเป็นแค่ความทรงจำ…', 'กะพริบตาทีเดียวก็หายไปแล้ว ฝันไปหรือเปล่า?', 'ไม่มีใครจำบอส Recall Memory ได้ แม้แต่คุณ'],
    by: ['คุณสู้กับใครอยู่เหรอ? ฉันว่ามันก็แค่จินตนาการของคุณนะ', 'มันเคยอยู่ตรงนั้นจริง ๆ เหรอ? 💭', 'ทั้งหมดเป็นแค่ความทรงจำ…', 'กะพริบตาทีเดียวก็หายไปแล้ว ฝันไปหรือเปล่า?', 'ไม่มีใครจำบอส Recall Memory ได้ แม้แต่คุณ'],
  },
  dog: {
    solo: ['{v} กำลังพักอยู่ เดี๋ยวก็กลับมา ไม่ต้องห่วงนะ'],
    by: ['{v} กำลังพักอยู่ เดี๋ยวก็กลับมา ไม่ต้องห่วงนะ'],
  },
  skeleton: {
    solo: ['{v} กระดูกหลุดเป็นชิ้น ๆ 💀', '{v} เหลือแค่กองกระดูกแล้ว 🦴', '{v} สั่นกระดูกครั้งสุดท้าย'],
    by: ['{k} หักกระดูก {v} ทุกชิ้น 🦴', '{v} โดน {k} ทำเป็นของเล่นหมา 🐕', '{k} ส่ง {v} กลับสุสาน 🪦', '{k} เขย่ากระดูก {v} จนหลุด 💀'],
  },
  lilpigeon: {
    solo: ['{v} บินหนีไปแล้ว กุ๊กกรู…', '{v} มัวแต่สนใจขนมปัง 🍞', '{v} กลับบ้านที่สวนสาธารณะ'],
    by: ['{k} ถอนขน {v} หมดตัว 🪶', '{k} เอาชนะ {v} ทั้ง 250,000 HP ได้ยังไงเนี่ย', '{v} โดน {k} ไล่ไปแล้ว', '{k} เอา {v} ไปทำพายนกพิราบ 🥧'],
  },
  retro: {
    solo: ['{v} กลับไปสวรรค์ 8 บิตแล้ว 👾', '{v} พิกเซลหมดแล้ว', '{v} เจอหน้าจอ GAME OVER'],
    by: ['{k} กดปุ่มรีเซ็ต {v} 👾', '{k} เป่าฝุ่นตลับเกม {v}', '{v} โดน {k} ลดเหลือ 1 พิกเซล', '{k} ส่ง {v} กลับร้านเกม'],
  },
  zombie: {
    solo: ['{v} กลับไปนอนในดินแล้ว 🪦', '{v} ได้พักผ่อนสักที 🧟', '{v} หลุดเป็นชิ้น ๆ อีกแล้ว'],
    by: ['{k} ทำให้ {v} หายเป็นซอมบี้ 🧟', '{k} ส่ง {v} กลับสุสาน 🪦', '{v} อยากกินสมอง แต่ {k} ไม่ให้ 🧠', '{k} บอก {v} ว่าถึงเวลานอนอีกรอบแล้ว'],
  },
  bee: {
    solo: ['{v} หึ่งครั้งสุดท้าย 🐝', '{v} บินกลับรังแล้ว', '{v} บินชนกระจก'],
    by: ['{k} ตบ {v} ร่วง 🐝', '{k} ทำให้ {v} กลายเป็นน้ำผึ้ง 🍯', '{v} โดน {k} ไล่ตบ', '{k} บอก {v} ว่าไม่เอาผึ้งนะ 🐝'],
  },
  spikes: {
    solo: ['{v} นั่งทับหนาม โอ๊ย 🌵', '{v} เพิ่งรู้ว่าหนามมันแหลม', '{v} กลายเป็นหมอนปักเข็ม 📌'],
    by: ['{k} ผลัก {v} ลงหนาม 🌵', '{k} ทำให้ {v} กลายเป็นหมอนปักเข็ม 📌', '{v} กลายเป็นไม้เสียบเพราะ {k} 🍢'],
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

/** A helper's name in the kill feed: "Potter's Snowman". `kind` is 'snowman' or a helper variant. */
export function helperName(kind: string, owner: string): string {
  const th = save.data.settings.lang === 'th';
  const name = (th ? HELPER_TH : HELPER_EN)[kind] ?? kind;
  if (!owner) return name;
  return th ? `${name}ของ ${owner}` : `${owner}’s ${name}`;
}

const HELPER_EN: Record<string, string> = { snowman: 'Snowman', cat: 'Cat', fish: 'Fish', memory: 'Recall Memory', soldier: 'Soldier', sbsnow: 'Snowman', fireally: 'Fire Ally', redguy: 'Red Guy', chick: 'Chick', chicken: 'Chicken', lilpigeon: 'Little Pigeon', skeleton: 'Skeleton', dog: 'Dog', retro: 'Retro Stickguy', zombie: 'Zombie Ally', bee: 'Bee', ninja: 'Ninja', znormal: 'Zombie', zshooter: 'Shooter Zombie', zmini: 'Mini Zombie', zbig: 'Big Zombie', zrunner: 'Runner Zombie', zexploder: 'Exploder Zombie', zboss: 'Zombie Boss' };
const HELPER_TH: Record<string, string> = { snowman: 'สโนว์แมน', cat: 'แมว', fish: 'ปลา', memory: 'Recall Memory', soldier: 'ทหาร', sbsnow: 'สโนว์แมน', fireally: 'สหายไฟ', redguy: 'เจ้าตัวแดง', chick: 'ลูกเจี๊ยบ', chicken: 'แม่ไก่', lilpigeon: 'นกพิราบน้อย', skeleton: 'โครงกระดูก', dog: 'หมา', retro: 'Retro Stickguy', zombie: 'ซอมบี้พวกเรา', bee: 'ผึ้ง', ninja: 'นินจา', znormal: 'ซอมบี้', zshooter: 'ซอมบี้นักยิง', zmini: 'ซอมบี้จิ๋ว', zbig: 'ซอมบี้ยักษ์', zrunner: 'ซอมบี้วิ่งไว', zexploder: 'ซอมบี้ระเบิด', zboss: 'บอสซอมบี้' };

/**
 * Kill feed line colours for helpers with their own lines: background, text, and border.
 * Chicks yellow, the Chicken red, fish blue, the Recall Memory boss purple, the dog cyan, skeletons white,
 * and the little pigeon gray (solid, with a white border, so it doesn't look like a player's dark line).
 */
export const FEED_STYLE: Partial<Record<FeedKind, { bg: string; text: string; border?: string }>> = {
  meow: { bg: 'rgba(255,128,171,0.9)', text: '#ffffff', border: 'rgba(255,255,255,0.9)' },
  chick: { bg: 'rgba(255,214,0,0.92)', text: '#3e2723' },
  chicken: { bg: 'rgba(229,57,53,0.92)', text: '#ffffff' },
  fish: { bg: 'rgba(30,136,229,0.92)', text: '#ffffff' },
  memory: { bg: 'rgba(142,36,170,0.92)', text: '#ffffff' },
  dog: { bg: 'rgba(0,188,212,0.92)', text: '#ffffff' },
  skeleton: { bg: 'rgba(250,250,250,0.95)', text: '#212121' },
  lilpigeon: { bg: 'rgba(144,164,174,0.95)', text: '#ffffff', border: 'rgba(255,255,255,0.95)' },
  retro: { bg: 'rgba(17,17,17,0.95)', text: '#ffffff', border: 'rgba(255,255,255,0.95)' },
  zombie: { bg: 'rgba(104,159,56,0.92)', text: '#ffffff' },
  bee: { bg: 'rgba(253,216,53,0.95)', text: '#212121', border: 'rgba(33,33,33,0.9)' },
};

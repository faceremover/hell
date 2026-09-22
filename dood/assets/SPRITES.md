# dood sprite prompts (placeholder_gen.py — SINGLE SPRITES ONLY)

Generator is only suitable for single sprites, NOT environment art.
Walls/floor/blood particles/splats are procedural canvas in index.html.

Run from repo root, ComfyUI must be up:

  python dood/placeholder_gen.py --prompt "menacing red horned demon warrior with fangs, front view" --out dood/assets/sprites/demon1.png --size 64
  python dood/placeholder_gen.py --prompt "red horned demon lying face down flat on ground, intact body, top-down view" --out dood/assets/sprites/demon1_dead.png --size 64
  python dood/placeholder_gen.py --prompt "hulking pink demon brute monster with huge jaws, front view" --out dood/assets/sprites/demon2.png --size 64
  python dood/placeholder_gen.py --prompt "slain pink demon brute corpse lying on ground, dead monster" --out dood/assets/sprites/demon2_dead.png --size 64
  python dood/placeholder_gen.py --prompt "floating red one-eyed demon head with small horns, front view" --out dood/assets/sprites/demon3.png --size 64
  python dood/placeholder_gen.py --prompt "red one-eyed demon head squashed flat on ground, deflated intact, top-down view" --out dood/assets/sprites/demon3_dead.png --size 64
  python dood/placeholder_gen.py --prompt "small red blood blotch" --negative "face, eyes, character, skull" --out dood/assets/sprites/gib16.png --size 16 --seed 777
  python dood/placeholder_gen.py --prompt "red bloody meat chunk" --negative "face, eyes, character, skull" --out dood/assets/sprites/gib32.png --size 32 --seed 4242
  python dood/placeholder_gen.py --prompt "giant black spider monster with red eyes and fangs, front view" --out dood/assets/sprites/spider.png --size 64

  wave 2 (new roster, all 64):
  python dood/placeholder_gen.py --prompt "pale cyan translucent wraith demon with tattered shroud and glowing eyes, front view" --out dood/assets/sprites/wraith.png --size 64
  python dood/placeholder_gen.py --prompt "pale cyan wraith demon collapsed flat on ground, deflated shroud, top-down view" --out dood/assets/sprites/wraith_dead.png --size 64
  python dood/placeholder_gen.py --prompt "lean green imp demon with drooling fanged mouth, front view" --out dood/assets/sprites/spitter.png --size 64
  python dood/placeholder_gen.py --prompt "slain green imp demon lying flat on ground, intact body, top-down view" --out dood/assets/sprites/spitter_dead.png --size 64
  python dood/placeholder_gen.py --prompt "hulking orange demon brute with massive fists and tusks, front view" --out dood/assets/sprites/mauler.png --size 64
  python dood/placeholder_gen.py --prompt "slain orange demon brute corpse lying on ground, dead monster" --out dood/assets/sprites/mauler_dead.png --size 64
  python dood/placeholder_gen.py --prompt "bloated purple plague demon with boils and horns, front view" --out dood/assets/sprites/rotfiend.png --size 64
  python dood/placeholder_gen.py --prompt "slain purple plague demon corpse sprawled on ground, top-down view" --out dood/assets/sprites/rotfiend_dead.png --size 64
  python dood/placeholder_gen.py --prompt "towering dark red demon crusher with huge claws and fangs, front view" --out dood/assets/sprites/gouger.png --size 64
  python dood/placeholder_gen.py --prompt "slain dark red demon crusher corpse lying flat on ground" --out dood/assets/sprites/gouger_dead.png --size 64
  python dood/placeholder_gen.py --prompt "colossal dark crimson horned warlord demon with molten cracks, front view" --out dood/assets/sprites/gorgut.png --size 64
  python dood/placeholder_gen.py --prompt "slain colossal dark crimson warlord demon corpse sprawled on ground" --out dood/assets/sprites/gorgut_dead.png --size 64
  python dood/placeholder_gen.py --prompt "gigantic violet floating horror with many eyes and tendrils, front view" --out dood/assets/sprites/morgla.png --size 64
  python dood/placeholder_gen.py --prompt "slain gigantic violet floating horror collapsed deflated on ground" --out dood/assets/sprites/morgla_dead.png --size 64
  python dood/placeholder_gen.py --prompt "titanic golden horned demon emperor with blazing crown, front view" --out dood/assets/sprites/baalzevur.png --size 64
  python dood/placeholder_gen.py --prompt "slain titanic golden demon emperor corpse lying on ground" --out dood/assets/sprites/baalzevur_dead.png --size 64

Note: 96px gens stall in practice (768px diffusion too slow) — 64px is the reliable size. Max --size is capped at 96 in placeholder_gen.py (all 3 copies).
Status: GENERATED via ComfyUI (demons at 64, gibs at 16+32, game picks randomly per gib).

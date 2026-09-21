# anti-glorp sprite prompts (placeholder_gen.py — SINGLE SPRITES ONLY)

Generator is only suitable for single sprites, NOT environment art.
Mars sky/dunes/blood/gibs are procedural canvas in index.html — do not generate them.

Run from repo root, ComfyUI must be up (`python main.py --listen 127.0.0.1 --port 8188`):

  python anti-glorp/placeholder_gen.py --prompt "top-down retro spaceship, orange and blue" --out anti-glorp/assets/sprites/player.png --size 64
  python anti-glorp/placeholder_gen.py --prompt "terrifying grey classic alien with big black eyes and fangs, horror creature, isolated single creature centered" --out anti-glorp/assets/sprites/glorp.png --size 64
  python anti-glorp/placeholder_gen.py --prompt "hulking xenomorph horror brute alien with claws, dark scary monster" --out anti-glorp/assets/sprites/brute.png --size 64
  python anti-glorp/placeholder_gen.py --prompt "small scary alien imp creature with horns and fangs, horror monster" --out anti-glorp/assets/sprites/dart.png --size 64

Status: GENERATED via ComfyUI — classic scary aliens (grey abductor / xenomorph brute / horned imp). Blood stains decay in-game (~12s fade).

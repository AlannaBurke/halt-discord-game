#!/usr/bin/env python3
"""
Compose emoji images: take transparent animal PNGs and place them on
identically-sized colored circles, then output at 128x128 for Discord.
"""

from PIL import Image, ImageDraw
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE, 'assets', 'emojis_new')
OUT_DIR = os.path.join(BASE, 'assets', 'emojis_final')
os.makedirs(OUT_DIR, exist_ok=True)

# Canvas size for compositing (high-res, then downscale)
CANVAS = 2048
# Circle diameter as percentage of canvas
CIRCLE_PCT = 0.82
CIRCLE_DIAMETER = int(CANVAS * CIRCLE_PCT)
CIRCLE_RADIUS = CIRCLE_DIAMETER // 2

# Each card's color and source file
# Using the already-generated transparent PNGs
# For rat, gerbil, hamster, guinea pig, rabbit — they already have circles from generation
# We need the raw transparent versions. Some were generated with circles baked in.
# We'll use the ones that came out well and composite new circles for all.

CARDS = [
    # (discord_name, source_file, circle_color_hex)
    ('halt_rat',       'raw_rat.png',        '#FF69B4'),  # Hot pink
    ('halt_gerbil',    'raw_gerbil.png',     '#5BC0EB'),  # Sky blue
    ('halt_hamster',   'raw_hamster.png',    '#5CDB95'),  # Mint green
    ('halt_hay',       'raw_hay2.png',       '#FFD166'),  # Sunny yellow
    ('halt_guineapig', 'raw_guineapig.png',  '#FF8C61'),  # Coral orange
    ('halt_rabbit',    'raw_rabbit.png',     '#B388EB'),  # Lavender purple
    ('halt_chinchilla','raw_chinchilla.png', '#20B2AA'),  # Teal
    ('halt_degu',      'raw_degu.png',       '#E63946'),  # Crimson red
    ('halt_cat',       'raw_cat.png',        '#77DD77'),  # Lime green
]

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def make_circle(color_hex):
    """Create a canvas-sized RGBA image with a centered colored circle."""
    img = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r, g, b = hex_to_rgb(color_hex)
    
    # Center the circle
    cx, cy = CANVAS // 2, CANVAS // 2
    left = cx - CIRCLE_RADIUS
    top = cy - CIRCLE_RADIUS
    right = cx + CIRCLE_RADIUS
    bottom = cy + CIRCLE_RADIUS
    
    draw.ellipse([left, top, right, bottom], fill=(r, g, b, 255))
    return img

def fit_animal_on_circle(animal_img, circle_img):
    """Scale the animal to fit nicely within the circle and composite."""
    # Get the bounding box of non-transparent pixels
    bbox = animal_img.getbbox()
    if bbox is None:
        return circle_img
    
    # Crop to content
    cropped = animal_img.crop(bbox)
    cw, ch = cropped.size
    
    # Target size: animal should fill about 85% of the circle diameter
    target_size = int(CIRCLE_DIAMETER * 0.85)
    
    # Scale proportionally
    scale = min(target_size / cw, target_size / ch)
    new_w = int(cw * scale)
    new_h = int(ch * scale)
    
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)
    
    # Center on canvas
    result = circle_img.copy()
    paste_x = (CANVAS - new_w) // 2
    paste_y = (CANVAS - new_h) // 2
    
    result.paste(resized, (paste_x, paste_y), resized)
    return result

for name, src_file, color in CARDS:
    print(f'Processing {name}...')
    
    src_path = os.path.join(RAW_DIR, src_file)
    if not os.path.exists(src_path):
        print(f'  WARNING: {src_path} not found, skipping')
        continue
    
    # Load animal (should be RGBA with transparency)
    animal = Image.open(src_path).convert('RGBA')
    
    # Create the circle background
    circle = make_circle(color)
    
    # Composite animal on circle
    composed = fit_animal_on_circle(animal, circle)
    
    # Save high-res version
    hires_path = os.path.join(OUT_DIR, f'{name}_hires.png')
    composed.save(hires_path)
    
    # Downscale to 128x128 for Discord
    discord_size = composed.resize((128, 128), Image.LANCZOS)
    out_path = os.path.join(OUT_DIR, f'{name}.png')
    discord_size.save(out_path)
    
    print(f'  Saved {out_path} (128x128)')

print(f'\nDone! All emojis saved to {OUT_DIR}')

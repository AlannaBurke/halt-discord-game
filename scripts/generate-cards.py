"""
Generate Discord-sized card images from the raw kawaii art.
Each card gets:
- A colored rounded-rectangle frame/border
- The animal art centered inside
- Card name at the top
- Scoring rule at the bottom
- Small HALT Go branding

Renders at 2x resolution (480x680) for crisp text, then downscales to 240x340.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Paths
ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'cards')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'cards', 'discord')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Render at 2x for crisp text, final output at 1x
SCALE = 2
CARD_W = 240 * SCALE   # 480
CARD_H = 340 * SCALE   # 680
CORNER_RADIUS = 16 * SCALE
BORDER_WIDTH = 4 * SCALE
ART_PADDING = 20 * SCALE
ART_TOP = 54 * SCALE       # Space for name at top
ART_BOTTOM = 88 * SCALE    # Space for scoring text at bottom

# Final output dimensions
FINAL_W = 240
FINAL_H = 340

# Font paths (Noto Sans for crisp rendering)
FONT_BOLD = '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf'
FONT_SEMIBOLD = '/usr/share/fonts/truetype/noto/NotoSans-SemiBold.ttf'
FONT_MEDIUM = '/usr/share/fonts/truetype/noto/NotoSans-Medium.ttf'
FONT_REGULAR = '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf'

# Card definitions
CARDS = [
    {
        'id': 'rat',
        'name': 'Rat',
        'scoring': '1=1  2=3  3=6\n4=10  5+=15',
        'color': '#E8A0BF',
        'border': '#C47A9A',
    },
    {
        'id': 'gerbil',
        'name': 'Gerbil',
        'scoring': 'Most: +6 pts\n2nd most: +3 pts',
        'color': '#F5D5A0',
        'border': '#D4B070',
    },
    {
        'id': 'pregnant_hamster',
        'name': 'Pregnant Hamster',
        'scoring': 'Swap for\n2 random cards!',
        'color': '#B8E8D0',
        'border': '#8CC8A8',
    },
    {
        'id': 'hay',
        'name': 'Hay',
        'scoring': 'Triples next\nGP / Rabbit / Chin',
        'color': '#E8E0A0',
        'border': '#C8C070',
    },
    {
        'id': 'guinea_pig',
        'name': 'Guinea Pig',
        'scoring': '3 points each',
        'color': '#D4A574',
        'border': '#B08050',
    },
    {
        'id': 'rabbit',
        'name': 'Rabbit',
        'scoring': '2 points each',
        'color': '#D4B8E8',
        'border': '#A888C8',
    },
    {
        'id': 'chinchilla',
        'name': 'Chinchilla',
        'scoring': '1 point each',
        'color': '#C8B8D8',
        'border': '#9888B8',
    },
    {
        'id': 'degus',
        'name': 'Degu',
        'scoring': 'Set of 3 = 10 pts\nOtherwise 0',
        'color': '#C8B090',
        'border': '#A89070',
    },
    {
        'id': 'sanctuary_cat',
        'name': 'Sanctuary Cat',
        'scoring': 'End: Most +6\nLeast -6',
        'color': '#F0D8A0',
        'border': '#D0B870',
    },
]


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def load_font(size, weight='regular'):
    """Load Noto Sans at the given size and weight."""
    font_map = {
        'bold': FONT_BOLD,
        'semibold': FONT_SEMIBOLD,
        'medium': FONT_MEDIUM,
        'regular': FONT_REGULAR,
    }
    fp = font_map.get(weight, FONT_REGULAR)
    try:
        return ImageFont.truetype(fp, size)
    except Exception:
        return ImageFont.load_default()


def generate_card(card_def):
    """Generate a single card image at 2x, then downscale."""
    bg_color = hex_to_rgb(card_def['color'])
    border_color = hex_to_rgb(card_def['border'])

    # Create card canvas at 2x
    card = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)

    # Draw border (outer rounded rect)
    draw.rounded_rectangle(
        [(0, 0), (CARD_W - 1, CARD_H - 1)],
        radius=CORNER_RADIUS,
        fill=border_color,
    )

    # Draw inner card background
    m = BORDER_WIDTH
    draw.rounded_rectangle(
        [(m, m), (CARD_W - 1 - m, CARD_H - 1 - m)],
        radius=CORNER_RADIUS - 2,
        fill=(255, 255, 255),
    )

    # Draw colored header bar
    header_h = ART_TOP
    draw.rounded_rectangle(
        [(m, m), (CARD_W - 1 - m, header_h)],
        radius=CORNER_RADIUS - 2,
        fill=bg_color,
    )
    # Square off the bottom of the header
    draw.rectangle(
        [(m, header_h - CORNER_RADIUS), (CARD_W - 1 - m, header_h)],
        fill=bg_color,
    )

    # Draw colored footer bar
    footer_top = CARD_H - ART_BOTTOM
    draw.rounded_rectangle(
        [(m, footer_top), (CARD_W - 1 - m, CARD_H - 1 - m)],
        radius=CORNER_RADIUS - 2,
        fill=bg_color,
    )
    # Square off the top of the footer
    draw.rectangle(
        [(m, footer_top), (CARD_W - 1 - m, footer_top + CORNER_RADIUS)],
        fill=bg_color,
    )

    # Load and place the animal art
    art_path = os.path.join(ASSETS_DIR, f"{card_def['id']}.png")
    if os.path.exists(art_path):
        art = Image.open(art_path).convert('RGBA')

        # Calculate art area
        art_area_w = CARD_W - (ART_PADDING * 2)
        art_area_h = CARD_H - ART_TOP - ART_BOTTOM - (10 * SCALE)

        # Resize art to fit, maintaining aspect ratio
        art_ratio = art.width / art.height
        area_ratio = art_area_w / art_area_h

        if art_ratio > area_ratio:
            new_w = art_area_w
            new_h = int(art_area_w / art_ratio)
        else:
            new_h = art_area_h
            new_w = int(art_area_h * art_ratio)

        art = art.resize((new_w, new_h), Image.LANCZOS)

        # Center the art
        art_x = (CARD_W - new_w) // 2
        art_y = ART_TOP + (art_area_h - new_h) // 2 + (5 * SCALE)

        card.paste(art, (art_x, art_y), art)

    # --- Draw card name (header) ---
    name_font = load_font(28 * SCALE, 'bold')
    if card_def['id'] == 'pregnant_hamster':
        # Smaller font for long name
        name_font = load_font(20 * SCALE, 'bold')

    name_text = card_def['name']
    name_bbox = draw.textbbox((0, 0), name_text, font=name_font)
    name_w = name_bbox[2] - name_bbox[0]
    name_h = name_bbox[3] - name_bbox[1]
    name_x = (CARD_W - name_w) // 2
    name_y = m + (header_h - m - name_h) // 2

    # Dark text on colored header
    draw.text((name_x, name_y), name_text, fill=(55, 55, 55), font=name_font)

    # --- Draw scoring text (footer) ---
    score_font = load_font(18 * SCALE, 'medium')
    score_lines = card_def['scoring'].split('\n')

    line_height = 24 * SCALE
    total_text_h = len(score_lines) * line_height
    score_start_y = footer_top + (ART_BOTTOM - m - total_text_h) // 2 - (4 * SCALE)

    for i, line in enumerate(score_lines):
        line_bbox = draw.textbbox((0, 0), line, font=score_font)
        line_w = line_bbox[2] - line_bbox[0]
        line_x = (CARD_W - line_w) // 2
        line_y = score_start_y + i * line_height
        draw.text((line_x, line_y), line, fill=(60, 60, 60), font=score_font)

    # --- Draw subtle HALT Go branding ---
    brand_font = load_font(12 * SCALE, 'regular')
    brand_text = "HALT Go"
    brand_bbox = draw.textbbox((0, 0), brand_text, font=brand_font)
    brand_w = brand_bbox[2] - brand_bbox[0]
    draw.text(
        ((CARD_W - brand_w) // 2, CARD_H - m - (18 * SCALE)),
        brand_text,
        fill=(*border_color, 140),
        font=brand_font,
    )

    # Apply rounded corners mask
    mask = Image.new('L', (CARD_W, CARD_H), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([(0, 0), (CARD_W - 1, CARD_H - 1)], radius=CORNER_RADIUS, fill=255)
    card.putalpha(mask)

    # Downscale to final size using LANCZOS for crisp result
    card = card.resize((FINAL_W, FINAL_H), Image.LANCZOS)

    return card


# Generate all individual cards
print("Generating high-res Discord card images (2x render, 1x output)...")
for card_def in CARDS:
    card_img = generate_card(card_def)
    output_path = os.path.join(OUTPUT_DIR, f"{card_def['id']}.png")
    card_img.save(output_path, 'PNG')
    print(f"  \u2705 {card_def['name']} \u2192 {output_path}")

print("\n\u2705 All cards generated with crisp text!")

"""
Generate Discord-sized card images from the raw kawaii art.
Each card gets:
- A colored rounded-rectangle frame/border
- The animal art centered inside
- Card name at the top
- Scoring rule at the bottom
- Small HALT Go branding

Output: 240x340 px cards (good for Discord embeds and compositing)
"""

from PIL import Image, ImageDraw, ImageFont
import os
import textwrap

# Paths
ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'cards')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'cards', 'discord')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Card dimensions (Discord-friendly)
CARD_W = 240
CARD_H = 340
CORNER_RADIUS = 16
BORDER_WIDTH = 4
ART_PADDING = 20
ART_TOP = 50  # Space for name at top
ART_BOTTOM = 85  # Space for scoring text at bottom

# Card definitions
CARDS = [
    {
        'id': 'rat',
        'name': 'Rat',
        'scoring': '1→1  2→3  3→6\n4→10  5+→15',
        'color': '#E8A0BF',
        'border': '#C47A9A',
    },
    {
        'id': 'gerbil',
        'name': 'Gerbil',
        'scoring': 'Most → +6 pts\n2nd most → +3 pts',
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
        'name': 'Degus',
        'scoring': 'Set of 3 = 10 pts\nOtherwise 0',
        'color': '#C8B090',
        'border': '#A89070',
    },
    {
        'id': 'sanctuary_cat',
        'name': 'Sanctuary Cat',
        'scoring': 'End: Most → +6\nLeast → -6',
        'color': '#F0D8A0',
        'border': '#D0B870',
    },
]


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_rounded_rect_mask(size, radius):
    """Create a mask for rounded rectangle."""
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size[0]-1, size[1]-1)], radius=radius, fill=255)
    return mask


def load_font(size, bold=False):
    """Try to load a nice font, fall back to default."""
    font_paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def generate_card(card_def):
    """Generate a single card image."""
    bg_color = hex_to_rgb(card_def['color'])
    border_color = hex_to_rgb(card_def['border'])
    
    # Create card canvas
    card = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)
    
    # Draw border (slightly larger rounded rect)
    draw.rounded_rectangle(
        [(0, 0), (CARD_W - 1, CARD_H - 1)],
        radius=CORNER_RADIUS,
        fill=border_color,
    )
    
    # Draw inner card background
    inner_margin = BORDER_WIDTH
    draw.rounded_rectangle(
        [(inner_margin, inner_margin), (CARD_W - 1 - inner_margin, CARD_H - 1 - inner_margin)],
        radius=CORNER_RADIUS - 2,
        fill=(255, 255, 255),
    )
    
    # Draw colored header bar
    header_h = ART_TOP
    draw.rounded_rectangle(
        [(inner_margin, inner_margin), (CARD_W - 1 - inner_margin, header_h)],
        radius=CORNER_RADIUS - 2,
        fill=bg_color,
    )
    # Square off the bottom of the header
    draw.rectangle(
        [(inner_margin, header_h - CORNER_RADIUS), (CARD_W - 1 - inner_margin, header_h)],
        fill=bg_color,
    )
    
    # Draw colored footer bar
    footer_top = CARD_H - ART_BOTTOM
    draw.rounded_rectangle(
        [(inner_margin, footer_top), (CARD_W - 1 - inner_margin, CARD_H - 1 - inner_margin)],
        radius=CORNER_RADIUS - 2,
        fill=bg_color,
    )
    # Square off the top of the footer
    draw.rectangle(
        [(inner_margin, footer_top), (CARD_W - 1 - inner_margin, footer_top + CORNER_RADIUS)],
        fill=bg_color,
    )
    
    # Load and place the animal art
    art_path = os.path.join(ASSETS_DIR, f"{card_def['id']}.png")
    if os.path.exists(art_path):
        art = Image.open(art_path).convert('RGBA')
        
        # Calculate art area
        art_area_w = CARD_W - (ART_PADDING * 2)
        art_area_h = CARD_H - ART_TOP - ART_BOTTOM - 10
        
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
        art_y = ART_TOP + (art_area_h - new_h) // 2 + 5
        
        card.paste(art, (art_x, art_y), art)
    
    # Draw card name
    name_font = load_font(16, bold=True)
    name_text = card_def['name']
    name_bbox = draw.textbbox((0, 0), name_text, font=name_font)
    name_w = name_bbox[2] - name_bbox[0]
    name_x = (CARD_W - name_w) // 2
    name_y = inner_margin + (header_h - inner_margin - 16) // 2 - 2
    
    # Text shadow for readability
    draw.text((name_x + 1, name_y + 1), name_text, fill=(0, 0, 0, 80), font=name_font)
    draw.text((name_x, name_y), name_text, fill=(50, 50, 50), font=name_font)
    
    # Draw scoring text
    score_font = load_font(11, bold=False)
    score_lines = card_def['scoring'].split('\n')
    
    line_height = 15
    total_text_h = len(score_lines) * line_height
    score_start_y = footer_top + (ART_BOTTOM - inner_margin - total_text_h) // 2
    
    for i, line in enumerate(score_lines):
        line_bbox = draw.textbbox((0, 0), line, font=score_font)
        line_w = line_bbox[2] - line_bbox[0]
        line_x = (CARD_W - line_w) // 2
        line_y = score_start_y + i * line_height
        draw.text((line_x, line_y), line, fill=(60, 60, 60), font=score_font)
    
    # Draw subtle HALT Go branding at very bottom
    brand_font = load_font(8, bold=False)
    brand_text = "HALT Go"
    brand_bbox = draw.textbbox((0, 0), brand_text, font=brand_font)
    brand_w = brand_bbox[2] - brand_bbox[0]
    draw.text(
        ((CARD_W - brand_w) // 2, CARD_H - inner_margin - 12),
        brand_text,
        fill=(*border_color, 150),
        font=brand_font,
    )
    
    # Apply rounded corners mask to the whole card
    mask = create_rounded_rect_mask((CARD_W, CARD_H), CORNER_RADIUS)
    card.putalpha(mask)
    
    return card


def generate_hand_composite(card_types):
    """
    Generate a composite image showing multiple cards side by side.
    Used for showing a player's hand or collection.
    
    card_types: list of card type strings, e.g. ['rat', 'rat', 'gerbil', 'hay']
    Returns: PIL Image
    """
    if not card_types:
        return None
    
    # Load card images
    cards = []
    for ct in card_types:
        card_path = os.path.join(OUTPUT_DIR, f"{ct}.png")
        if os.path.exists(card_path):
            cards.append(Image.open(card_path).convert('RGBA'))
    
    if not cards:
        return None
    
    # Layout: cards with slight overlap for a hand-like feel
    overlap = 30 if len(cards) > 4 else 10
    total_w = CARD_W + (len(cards) - 1) * (CARD_W - overlap) + 20
    total_h = CARD_H + 20
    
    composite = Image.new('RGBA', (total_w, total_h), (0, 0, 0, 0))
    
    for i, card_img in enumerate(cards):
        x = 10 + i * (CARD_W - overlap)
        y = 10
        composite.paste(card_img, (x, y), card_img)
    
    return composite


# Generate all individual cards
print("Generating Discord card images...")
for card_def in CARDS:
    card_img = generate_card(card_def)
    output_path = os.path.join(OUTPUT_DIR, f"{card_def['id']}.png")
    card_img.save(output_path, 'PNG')
    print(f"  ✅ {card_def['name']} → {output_path}")

# Generate a sample hand composite
print("\nGenerating sample hand composite...")
sample_hand = ['rat', 'rat', 'gerbil', 'hay', 'guinea_pig', 'rabbit', 'sanctuary_cat']
composite = generate_hand_composite(sample_hand)
if composite:
    sample_path = os.path.join(OUTPUT_DIR, '_sample_hand.png')
    composite.save(sample_path, 'PNG')
    print(f"  ✅ Sample hand → {sample_path}")

print("\n✅ All cards generated!")

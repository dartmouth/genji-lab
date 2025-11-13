import docx
import re
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT


def extract_links(paragraph_text):
    """
    Process paragraphs with links using string operations instead of regex.
    """

    number_pattern = re.compile(r"(\d+\.\d+)")

    links = []

    # Look for the characteristic beginning of the link
    link_marker = "[link to original paragraph"
    if link_marker in paragraph_text:
        # Find the position of the link
        start_idx = paragraph_text.rfind(link_marker)

        # Extract the link part
        link = paragraph_text[start_idx:]

        # Clean the text by removing the link
        clean_text = paragraph_text[:start_idx].strip()

        # Extract section and paragraph numbers
        try:
            # Extract the numbers part (e.g., "1.1")
            numbers_part = re.search(number_pattern, link).group(0)
            section_str, paragraph_str = numbers_part.split(".")

            link_info = {
                "textCollectionId": "original",
                "hierarchy": {
                    "section": int(section_str),
                    "chapter": int(section_str),
                    "paragraph": int(paragraph_str),
                },
            }

            links.append(link_info)
        except Exception as e:
            print(f"Error parsing link: {e}")

        return clean_text, links

    return paragraph_text, links


def get_text_format(paragraph):
    # Initialize formatting details
    formatting = []

    # Check if paragraph has any runs
    if not paragraph.runs:
        return {
            "is_bold": False,
            "is_italic": False,
            "is_underlined": False,
            "formatting": [],
        }

    # Initialize flags to check if all runs have the same formatting
    all_bold = True
    all_italic = True
    all_underlined = True

    # Check each run's formatting
    for run in paragraph.runs:
        # Update flags based on each run's formatting
        if not run.bold:
            all_bold = False
        if not run.italic:
            all_italic = False
        if not run.underline:
            all_underlined = False

        # Add specific formatting information for this run if it has italic or underline
        if run.italic or run.underline:
            start = paragraph.text.find(run.text)
            end = start + len(run.text)
            fmt = {"start": start, "end": end, "type": []}
            if run.italic:
                fmt["type"].append("italic")
            if run.underline:
                fmt["type"].append("underlined")
            formatting.append(fmt)

    # Return the complete formatting information
    return {
        "is_bold": all_bold,
        "is_italic": all_italic,
        "is_underlined": all_underlined,
        "formatting": formatting,
    }


def process_indent(value):
    if value is None:
        return 0
    return value / 914400


alignment_map = {
    WD_PARAGRAPH_ALIGNMENT.LEFT: "left",
    WD_PARAGRAPH_ALIGNMENT.CENTER: "center",
    WD_PARAGRAPH_ALIGNMENT.RIGHT: "right",
    WD_PARAGRAPH_ALIGNMENT.JUSTIFY: "justify",
}


def get_paragraph_format(paragraph):
    left_indent = paragraph.paragraph_format.left_indent
    right_indent = paragraph.paragraph_format.right_indent
    first_line_indent = paragraph.paragraph_format.first_line_indent
    alignment = paragraph.paragraph_format.alignment

    text_styles = get_text_format(paragraph)

    return {
        "left_indent": process_indent(left_indent),
        "right_indent": process_indent(right_indent),
        "first_line_indent": process_indent(first_line_indent),
        "alignment": "left" if alignment is None else alignment_map[alignment],
        "text_styles": text_styles,
    }


def extract_paragraphs(doc, text_collection_id, document_number):
    json_results = []
    element_counter = 1

    for idx, paragraph in enumerate(doc.paragraphs):
        if paragraph.text.strip():
            clean_text, links = extract_links(paragraph.text)
            paragraph_json = {
                "document_collection_id": text_collection_id,
                "hierarchy": {
                    "document": document_number,
                    "element_order": element_counter,
                },
                "content": {
                    "text": clean_text,
                    "formatting": get_paragraph_format(paragraph),
                },
            }
            json_results.append(paragraph_json)
            element_counter += 1

    return json_results

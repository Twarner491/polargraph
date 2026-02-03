# Sheet music renderer - converts MIDI to polylines
# Simplified version focused on plotter output

import math
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict

from .midi_parser import MidiFile, MidiNote, MidiTrack, crop_midi, quantize_notes
from .symbols import SYMBOLS, LINE_HEIGHT, STAFF_LINES, NOTE_WIDTH

Polyline = List[Tuple[float, float]]


@dataclass
class RenderConfig:
    """Configuration for sheet music rendering."""
    # Staff layout
    staff_height: float = LINE_HEIGHT * (STAFF_LINES - 1)  # Height of one staff
    staff_margin: float = 60  # Space between staves
    page_margin_x: float = 40  # Left/right margins
    page_margin_y: float = 40  # Top/bottom margins

    # Measures and timing
    beats_per_measure: int = 4
    note_spacing: float = NOTE_WIDTH * 2  # Horizontal space per beat

    # Note sizing
    note_scale: float = 1.0
    stem_length: float = 30  # Length of note stems

    # What to draw
    draw_clef: bool = True
    draw_time_signature: bool = True
    draw_bar_lines: bool = True

    # Page size (for fitting)
    page_width: float = 800
    page_height: float = 600


@dataclass
class Measure:
    """Represents one measure of music."""
    number: int
    start_beat: float
    end_beat: float
    notes: List[MidiNote] = field(default_factory=list)


def get_note_duration_type(duration: float) -> Tuple[str, int]:
    """
    Determine note type from duration in beats.

    Returns:
        Tuple of (note_type, dot_count)
        note_type: 'whole', 'half', 'quarter', 'eighth', 'sixteenth'
    """
    # Check for dotted notes
    if abs(duration - 3.0) < 0.1:  # Dotted half
        return ('half', 1)
    if abs(duration - 1.5) < 0.1:  # Dotted quarter
        return ('quarter', 1)
    if abs(duration - 0.75) < 0.1:  # Dotted eighth
        return ('eighth', 1)

    # Standard durations
    if duration >= 3.5:
        return ('whole', 0)
    elif duration >= 1.5:
        return ('half', 0)
    elif duration >= 0.75:
        return ('quarter', 0)
    elif duration >= 0.375:
        return ('eighth', 0)
    else:
        return ('sixteenth', 0)


def get_stem_direction(staff_position: int) -> int:
    """
    Determine stem direction based on staff position.

    Returns:
        1 for stems up, -1 for stems down
    """
    # Notes on or above the middle line (B4) have stems down
    # Middle line of treble staff is position 6 (B above middle C)
    return -1 if staff_position >= 6 else 1


def render_score(midi: MidiFile, config: Optional[RenderConfig] = None) -> List[Polyline]:
    """
    Render a MIDI file as sheet music polylines.

    Args:
        midi: Parsed MidiFile object
        config: Rendering configuration

    Returns:
        List of polylines representing the sheet music
    """
    if config is None:
        config = RenderConfig()

    polylines = []

    # Calculate layout
    beats_per_measure = config.beats_per_measure
    measure_width = beats_per_measure * config.note_spacing
    usable_width = config.page_width - 2 * config.page_margin_x
    measures_per_row = max(1, int(usable_width / measure_width))

    # Get all notes from all tracks
    all_notes = midi.get_all_notes()

    if not all_notes:
        return polylines

    # Quantize notes
    all_notes = quantize_notes(all_notes)

    # Group notes into measures
    total_beats = max(n.end_time for n in all_notes)
    num_measures = int(math.ceil(total_beats / beats_per_measure))

    measures = []
    for i in range(num_measures):
        start_beat = i * beats_per_measure
        end_beat = (i + 1) * beats_per_measure
        measure_notes = [n for n in all_notes
                         if n.start_time >= start_beat and n.start_time < end_beat]
        measures.append(Measure(
            number=i + 1,
            start_beat=start_beat,
            end_beat=end_beat,
            notes=measure_notes
        ))

    # Render each row of measures
    row_count = int(math.ceil(num_measures / measures_per_row))

    for row in range(row_count):
        row_y = config.page_margin_y + row * (config.staff_height + config.staff_margin)

        # Staff center Y
        staff_center_y = row_y + config.staff_height / 2

        # Calculate row extents
        row_start_x = config.page_margin_x
        row_end_x = row_start_x + measures_per_row * measure_width

        # Draw staff lines
        staff_polys = SYMBOLS.staff_lines(
            row_start_x, row_end_x, staff_center_y, LINE_HEIGHT
        )
        polylines.extend(staff_polys)

        # Draw clef at start of row
        if config.draw_clef:
            clef_x = row_start_x + 15
            clef_y = staff_center_y
            clef_polys = SYMBOLS.treble_clef(clef_x, clef_y)
            polylines.extend(clef_polys)

        # Draw time signature at start of first row
        if config.draw_time_signature and row == 0:
            ts_x = row_start_x + 45
            ts_y = staff_center_y
            ts_polys = SYMBOLS.time_signature(
                ts_x, ts_y,
                midi.time_signature[0],
                midi.time_signature[1]
            )
            polylines.extend(ts_polys)

        # Starting X for notes (after clef and time sig)
        note_start_x = row_start_x + (70 if row == 0 else 40)

        # Render measures in this row
        start_measure = row * measures_per_row
        end_measure = min(start_measure + measures_per_row, num_measures)

        for m_idx in range(start_measure, end_measure):
            measure = measures[m_idx]
            measure_offset = (m_idx - start_measure) * measure_width
            measure_x = note_start_x + measure_offset

            # Draw bar line at start of measure (except first)
            if config.draw_bar_lines and m_idx > start_measure:
                bar_x = measure_x - 5
                bar_polys = SYMBOLS.bar_line(
                    bar_x,
                    staff_center_y - config.staff_height / 2,
                    staff_center_y + config.staff_height / 2
                )
                polylines.extend(bar_polys)

            # Render notes in this measure
            for note in measure.notes:
                # Calculate X position within measure
                beat_in_measure = note.start_time - measure.start_beat
                note_x = measure_x + beat_in_measure * config.note_spacing

                # Calculate Y position on staff
                # Staff position: 0 = middle C, positive = higher
                position = note.staff_position

                # Convert to Y coordinate
                # Staff line positions: bottom line = -2, top line = +2
                # Treble clef: bottom line (E4) = position 2
                staff_line_offset = position - 2  # Relative to bottom staff line
                note_y = staff_center_y + config.staff_height / 2 - \
                         staff_line_offset * LINE_HEIGHT / 2

                # Determine note type
                note_type, dots = get_note_duration_type(note.duration)
                stem_dir = get_stem_direction(position)

                # Draw note head
                if note_type == 'whole':
                    head_polys = SYMBOLS.note_head_whole(note_x, note_y, config.note_scale)
                elif note_type == 'half':
                    head_polys = SYMBOLS.note_head_half(note_x, note_y, config.note_scale)
                else:
                    head_polys = SYMBOLS.note_head_filled(note_x, note_y, config.note_scale)
                polylines.extend(head_polys)

                # Draw stem (for half, quarter, eighth, sixteenth)
                if note_type not in ['whole']:
                    stem_x = note_x + (4 if stem_dir > 0 else -4) * config.note_scale
                    stem_y_start = note_y
                    stem_y_end = note_y - stem_dir * config.stem_length
                    stem_polys = SYMBOLS.stem(stem_x, stem_y_start, stem_y_end)
                    polylines.extend(stem_polys)

                    # Draw flags for eighth and sixteenth notes
                    if note_type == 'eighth':
                        flag_count = 1
                    elif note_type == 'sixteenth':
                        flag_count = 2
                    else:
                        flag_count = 0

                    if flag_count > 0:
                        if stem_dir > 0:
                            flag_polys = SYMBOLS.flag_up(stem_x, stem_y_end, flag_count)
                        else:
                            flag_polys = SYMBOLS.flag_down(stem_x, stem_y_end, flag_count)
                        polylines.extend(flag_polys)

                # Draw accidental if needed
                if note.accidental == 'sharp':
                    acc_x = note_x - 12 * config.note_scale
                    acc_polys = SYMBOLS.sharp(acc_x, note_y, config.note_scale * 0.8)
                    polylines.extend(acc_polys)

                # Draw dots
                if dots > 0:
                    dot_x = note_x + 8 * config.note_scale
                    for d in range(dots):
                        dot_polys = SYMBOLS.dot(
                            dot_x + d * 5 * config.note_scale,
                            note_y,
                            config.note_scale
                        )
                        polylines.extend(dot_polys)

                # Draw ledger lines if note is above/below staff
                if position < 0:  # Below staff
                    for ledger_pos in range(-2, position - 1, -2):
                        ledger_y = staff_center_y + config.staff_height / 2 - \
                                   ledger_pos * LINE_HEIGHT / 2
                        ledger_polys = SYMBOLS.ledger_line(note_x, ledger_y)
                        polylines.extend(ledger_polys)
                elif position > 10:  # Above staff (treble clef)
                    for ledger_pos in range(12, position + 2, 2):
                        ledger_y = staff_center_y + config.staff_height / 2 - \
                                   ledger_pos * LINE_HEIGHT / 2
                        ledger_polys = SYMBOLS.ledger_line(note_x, ledger_y)
                        polylines.extend(ledger_polys)

        # Draw final bar line at end of row
        if config.draw_bar_lines:
            final_bar_x = note_start_x + (end_measure - start_measure) * measure_width
            if row == row_count - 1:
                # Double bar at end
                bar_polys = SYMBOLS.double_bar_line(
                    final_bar_x,
                    staff_center_y - config.staff_height / 2,
                    staff_center_y + config.staff_height / 2
                )
            else:
                bar_polys = SYMBOLS.bar_line(
                    final_bar_x,
                    staff_center_y - config.staff_height / 2,
                    staff_center_y + config.staff_height / 2
                )
            polylines.extend(bar_polys)

    return polylines


def render_midi_to_polylines(midi_data: bytes,
                             start_time: float = 0,
                             end_time: float = 0,
                             page_width: float = 800,
                             page_height: float = 600) -> List[Polyline]:
    """
    High-level function to render MIDI data to polylines.

    Args:
        midi_data: Raw MIDI file bytes
        start_time: Start time in seconds (0 for beginning)
        end_time: End time in seconds (0 for auto-fit)
        page_width: Page width for layout
        page_height: Page height for layout

    Returns:
        List of polylines representing sheet music
    """
    from .midi_parser import parse_midi

    # Parse MIDI
    midi = parse_midi(midi_data)

    # If no end_time specified, calculate based on page size
    if end_time <= 0:
        # Estimate: how many beats fit on the page
        config = RenderConfig(page_width=page_width, page_height=page_height)
        beats_per_measure = 4
        measure_width = beats_per_measure * config.note_spacing
        usable_width = page_width - 2 * config.page_margin_x
        measures_per_row = max(1, int(usable_width / measure_width))

        usable_height = page_height - 2 * config.page_margin_y
        rows = max(1, int(usable_height / (config.staff_height + config.staff_margin)))

        total_measures = measures_per_row * rows
        total_beats = total_measures * beats_per_measure

        # Convert beats to seconds
        end_time = (total_beats / midi.tempo) * 60

    # Crop MIDI to time range
    if start_time > 0 or end_time > 0:
        midi = crop_midi(midi, start_time, end_time)

    # Render
    config = RenderConfig(page_width=page_width, page_height=page_height)
    return render_score(midi, config)

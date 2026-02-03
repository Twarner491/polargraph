# MIDI file parser for sheet music generation
# Uses mido library for MIDI file handling

import io
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple


@dataclass
class MidiNote:
    """Represents a single MIDI note."""
    pitch: int  # MIDI pitch (0-127, middle C = 60)
    start_time: float  # Start time in beats
    duration: float  # Duration in beats
    velocity: int = 64  # Note velocity (0-127)
    channel: int = 0  # MIDI channel

    @property
    def end_time(self) -> float:
        return self.start_time + self.duration

    @property
    def staff_position(self) -> int:
        """
        Convert MIDI pitch to staff position.
        Position 0 = middle C (ledger line below treble staff)
        Each position is a half-step on the staff.
        """
        # Middle C (60) is position 0
        # Each white key is one staff position
        # C D E F G A B -> positions 0 1 2 3 4 5 6
        note_in_octave = self.pitch % 12
        octave = self.pitch // 12 - 5  # Octave relative to middle C

        # Map semitones to staff positions (C=0, D=1, E=2, F=3, G=4, A=5, B=6)
        semitone_to_position = {
            0: 0,   # C
            1: 0,   # C#
            2: 1,   # D
            3: 1,   # D#
            4: 2,   # E
            5: 3,   # F
            6: 3,   # F#
            7: 4,   # G
            8: 4,   # G#
            9: 5,   # A
            10: 5,  # A#
            11: 6   # B
        }

        position = semitone_to_position[note_in_octave] + octave * 7
        return position

    @property
    def accidental(self) -> Optional[str]:
        """Return accidental type if note is sharp/flat."""
        note_in_octave = self.pitch % 12
        # Sharps: C#(1), D#(3), F#(6), G#(8), A#(10)
        if note_in_octave in [1, 3, 6, 8, 10]:
            return 'sharp'
        return None

    @property
    def note_name(self) -> str:
        """Get the note name (C, D, E, etc.)."""
        names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        return names[self.pitch % 12]


@dataclass
class MidiTrack:
    """Represents a MIDI track with notes."""
    name: str = ""
    notes: List[MidiNote] = field(default_factory=list)
    instrument: int = 0  # General MIDI instrument number
    channel: int = 0

    def get_notes_in_range(self, start: float, end: float) -> List[MidiNote]:
        """Get all notes that start within the given time range."""
        return [n for n in self.notes if start <= n.start_time < end]

    @property
    def duration(self) -> float:
        """Total duration of the track in beats."""
        if not self.notes:
            return 0
        return max(n.end_time for n in self.notes)


@dataclass
class MidiFile:
    """Parsed MIDI file data."""
    tracks: List[MidiTrack] = field(default_factory=list)
    tempo: int = 120  # BPM
    time_signature: Tuple[int, int] = (4, 4)  # numerator, denominator
    ticks_per_beat: int = 480
    title: str = ""
    composer: str = ""

    @property
    def duration(self) -> float:
        """Total duration in beats."""
        if not self.tracks:
            return 0
        return max(t.duration for t in self.tracks)

    @property
    def duration_seconds(self) -> float:
        """Total duration in seconds."""
        return (self.duration / self.tempo) * 60

    def get_all_notes(self) -> List[MidiNote]:
        """Get all notes from all tracks, sorted by start time."""
        all_notes = []
        for track in self.tracks:
            all_notes.extend(track.notes)
        return sorted(all_notes, key=lambda n: (n.start_time, n.pitch))


def parse_midi(data: bytes) -> MidiFile:
    """
    Parse a MIDI file from bytes.

    Args:
        data: Raw MIDI file bytes

    Returns:
        Parsed MidiFile object
    """
    try:
        import mido
    except ImportError:
        raise ImportError(
            "mido library is required for MIDI parsing. "
            "Install with: pip install mido"
        )

    # Parse MIDI file
    midi = mido.MidiFile(file=io.BytesIO(data))

    result = MidiFile(
        ticks_per_beat=midi.ticks_per_beat,
        tempo=120,  # Default, will be updated if tempo message found
        time_signature=(4, 4)
    )

    # Process each track
    for track_idx, track in enumerate(midi.tracks):
        midi_track = MidiTrack(name=track.name or f"Track {track_idx + 1}")

        # Track state
        current_time = 0  # In ticks
        active_notes: Dict[Tuple[int, int], float] = {}  # (pitch, channel) -> start_time

        for msg in track:
            current_time += msg.time

            if msg.type == 'set_tempo':
                # Convert microseconds per beat to BPM
                result.tempo = int(60_000_000 / msg.tempo)

            elif msg.type == 'time_signature':
                result.time_signature = (msg.numerator, msg.denominator)

            elif msg.type == 'track_name':
                midi_track.name = msg.name
                # Check if it looks like a title or composer
                if track_idx == 0:
                    if not result.title:
                        result.title = msg.name

            elif msg.type == 'program_change':
                midi_track.instrument = msg.program
                midi_track.channel = msg.channel

            elif msg.type == 'note_on' and msg.velocity > 0:
                # Note start
                key = (msg.note, msg.channel)
                # Convert ticks to beats
                time_beats = current_time / result.ticks_per_beat
                active_notes[key] = time_beats

            elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                # Note end
                key = (msg.note, msg.channel)
                if key in active_notes:
                    start_beats = active_notes.pop(key)
                    end_beats = current_time / result.ticks_per_beat
                    duration = end_beats - start_beats

                    note = MidiNote(
                        pitch=msg.note,
                        start_time=start_beats,
                        duration=max(duration, 0.25),  # Minimum 16th note
                        velocity=msg.velocity if msg.type == 'note_off' else 64,
                        channel=msg.channel
                    )
                    midi_track.notes.append(note)

        # Close any remaining active notes
        end_time = current_time / result.ticks_per_beat
        for (pitch, channel), start_beats in active_notes.items():
            note = MidiNote(
                pitch=pitch,
                start_time=start_beats,
                duration=end_time - start_beats,
                channel=channel
            )
            midi_track.notes.append(note)

        # Only add tracks with notes
        if midi_track.notes:
            result.tracks.append(midi_track)

    return result


def parse_midi_file(filepath: str) -> MidiFile:
    """Parse a MIDI file from a file path."""
    with open(filepath, 'rb') as f:
        return parse_midi(f.read())


def crop_midi(midi: MidiFile, start_time: float, end_time: float) -> MidiFile:
    """
    Crop a MIDI file to a specific time range.

    Args:
        midi: The original MidiFile
        start_time: Start time in seconds
        end_time: End time in seconds

    Returns:
        New MidiFile with only notes in the range
    """
    # Convert seconds to beats
    beats_per_second = midi.tempo / 60
    start_beats = start_time * beats_per_second
    end_beats = end_time * beats_per_second

    result = MidiFile(
        tempo=midi.tempo,
        time_signature=midi.time_signature,
        ticks_per_beat=midi.ticks_per_beat,
        title=midi.title,
        composer=midi.composer
    )

    for track in midi.tracks:
        new_track = MidiTrack(
            name=track.name,
            instrument=track.instrument,
            channel=track.channel
        )

        for note in track.notes:
            # Check if note overlaps with time range
            if note.end_time >= start_beats and note.start_time < end_beats:
                # Adjust note timing
                new_start = max(0, note.start_time - start_beats)
                new_end = min(end_beats - start_beats, note.end_time - start_beats)
                new_duration = new_end - new_start

                if new_duration > 0:
                    new_note = MidiNote(
                        pitch=note.pitch,
                        start_time=new_start,
                        duration=new_duration,
                        velocity=note.velocity,
                        channel=note.channel
                    )
                    new_track.notes.append(new_note)

        if new_track.notes:
            result.tracks.append(new_track)

    return result


def quantize_notes(notes: List[MidiNote], grid: float = 0.25) -> List[MidiNote]:
    """
    Quantize note start times and durations to a grid.

    Args:
        notes: List of notes to quantize
        grid: Grid size in beats (0.25 = 16th notes)

    Returns:
        New list of quantized notes
    """
    result = []
    for note in notes:
        # Quantize start time
        new_start = round(note.start_time / grid) * grid

        # Quantize duration to common note values
        duration_grids = round(note.duration / grid)
        new_duration = max(1, duration_grids) * grid

        result.append(MidiNote(
            pitch=note.pitch,
            start_time=new_start,
            duration=new_duration,
            velocity=note.velocity,
            channel=note.channel
        ))

    return result

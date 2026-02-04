/**
 * Sheet Music Generator - Cloudflare Worker
 * Converts MIDI files to sheet music polylines for plotter output
 * Port of the Python legumes module
 */

// =============================================================================
// MIDI Parser
// =============================================================================

class MidiNote {
    constructor(pitch, startTime, duration, velocity = 64, channel = 0) {
        this.pitch = pitch;
        this.startTime = startTime;
        this.duration = duration;
        this.velocity = velocity;
        this.channel = channel;
    }

    get endTime() {
        return this.startTime + this.duration;
    }

    get staffPosition() {
        // Convert MIDI pitch to staff position
        // Position 0 = middle C (ledger line below treble staff)
        const noteInOctave = this.pitch % 12;
        const octave = Math.floor(this.pitch / 12) - 5;

        // Map semitones to staff positions
        const semitoneToPosition = {
            0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3,
            6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6
        };

        return semitoneToPosition[noteInOctave] + octave * 7;
    }

    get accidental() {
        const noteInOctave = this.pitch % 12;
        if ([1, 3, 6, 8, 10].includes(noteInOctave)) {
            return 'sharp';
        }
        return null;
    }
}

class MidiTrack {
    constructor(name = '', notes = [], instrument = 0, channel = 0) {
        this.name = name;
        this.notes = notes;
        this.instrument = instrument;
        this.channel = channel;
    }

    get duration() {
        if (this.notes.length === 0) return 0;
        return Math.max(...this.notes.map(n => n.endTime));
    }
}

class MidiFile {
    constructor() {
        this.tracks = [];
        this.tempo = 120;
        this.timeSignature = [4, 4];
        this.ticksPerBeat = 480;
        this.title = '';
    }

    get duration() {
        if (this.tracks.length === 0) return 0;
        return Math.max(...this.tracks.map(t => t.duration));
    }

    getAllNotes() {
        const allNotes = [];
        for (const track of this.tracks) {
            allNotes.push(...track.notes);
        }
        return allNotes.sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);
    }
}

function parseMidi(data) {
    const bytes = new Uint8Array(data);
    let pos = 0;

    function readBytes(n) {
        const result = bytes.slice(pos, pos + n);
        pos += n;
        return result;
    }

    function readUint32() {
        const b = readBytes(4);
        return (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3];
    }

    function readUint16() {
        const b = readBytes(2);
        return (b[0] << 8) | b[1];
    }

    function readVariableLength() {
        let result = 0;
        let byte;
        do {
            byte = bytes[pos++];
            result = (result << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        return result;
    }

    // Read header
    const headerChunk = String.fromCharCode(...readBytes(4));
    if (headerChunk !== 'MThd') {
        throw new Error('Invalid MIDI file: missing MThd header');
    }

    const headerLength = readUint32();
    const format = readUint16();
    const numTracks = readUint16();
    const ticksPerBeat = readUint16();

    const midi = new MidiFile();
    midi.ticksPerBeat = ticksPerBeat;

    // Read tracks
    for (let trackIdx = 0; trackIdx < numTracks; trackIdx++) {
        const trackChunk = String.fromCharCode(...readBytes(4));
        if (trackChunk !== 'MTrk') {
            throw new Error('Invalid MIDI file: missing MTrk header');
        }

        const trackLength = readUint32();
        const trackEnd = pos + trackLength;

        const track = new MidiTrack(`Track ${trackIdx + 1}`);
        const activeNotes = new Map(); // (pitch, channel) -> startTime
        let currentTime = 0;
        let runningStatus = 0;

        while (pos < trackEnd) {
            const deltaTime = readVariableLength();
            currentTime += deltaTime;

            let statusByte = bytes[pos];

            // Handle running status
            if (statusByte < 0x80) {
                statusByte = runningStatus;
            } else {
                pos++;
                if (statusByte < 0xF0) {
                    runningStatus = statusByte;
                }
            }

            const messageType = statusByte & 0xF0;
            const channel = statusByte & 0x0F;

            if (messageType === 0x90) {
                // Note On
                const pitch = bytes[pos++];
                const velocity = bytes[pos++];
                const timeBeats = currentTime / midi.ticksPerBeat;

                if (velocity > 0) {
                    activeNotes.set(`${pitch}-${channel}`, timeBeats);
                } else {
                    // Note On with velocity 0 = Note Off
                    const key = `${pitch}-${channel}`;
                    if (activeNotes.has(key)) {
                        const startBeats = activeNotes.get(key);
                        activeNotes.delete(key);
                        const duration = Math.max(timeBeats - startBeats, 0.25);
                        track.notes.push(new MidiNote(pitch, startBeats, duration, velocity, channel));
                    }
                }
            } else if (messageType === 0x80) {
                // Note Off
                const pitch = bytes[pos++];
                const velocity = bytes[pos++];
                const key = `${pitch}-${channel}`;
                const timeBeats = currentTime / midi.ticksPerBeat;

                if (activeNotes.has(key)) {
                    const startBeats = activeNotes.get(key);
                    activeNotes.delete(key);
                    const duration = Math.max(timeBeats - startBeats, 0.25);
                    track.notes.push(new MidiNote(pitch, startBeats, duration, velocity, channel));
                }
            } else if (messageType === 0xA0) {
                // Polyphonic Key Pressure
                pos += 2;
            } else if (messageType === 0xB0) {
                // Control Change
                pos += 2;
            } else if (messageType === 0xC0) {
                // Program Change
                track.instrument = bytes[pos++];
                track.channel = channel;
            } else if (messageType === 0xD0) {
                // Channel Pressure
                pos += 1;
            } else if (messageType === 0xE0) {
                // Pitch Bend
                pos += 2;
            } else if (statusByte === 0xFF) {
                // Meta Event
                const metaType = bytes[pos++];
                const metaLength = readVariableLength();
                const metaData = readBytes(metaLength);

                if (metaType === 0x51) {
                    // Tempo
                    const microsPerBeat = (metaData[0] << 16) | (metaData[1] << 8) | metaData[2];
                    midi.tempo = Math.round(60000000 / microsPerBeat);
                } else if (metaType === 0x58) {
                    // Time Signature
                    midi.timeSignature = [metaData[0], Math.pow(2, metaData[1])];
                } else if (metaType === 0x03) {
                    // Track Name
                    track.name = String.fromCharCode(...metaData);
                    if (trackIdx === 0 && !midi.title) {
                        midi.title = track.name;
                    }
                }
            } else if (statusByte === 0xF0 || statusByte === 0xF7) {
                // SysEx
                const sysexLength = readVariableLength();
                pos += sysexLength;
            }
        }

        // Close any remaining active notes
        const endTime = currentTime / midi.ticksPerBeat;
        for (const [key, startBeats] of activeNotes) {
            const [pitch, channel] = key.split('-').map(Number);
            track.notes.push(new MidiNote(pitch, startBeats, endTime - startBeats, 64, channel));
        }

        if (track.notes.length > 0) {
            midi.tracks.push(track);
        }
    }

    return midi;
}

function quantizeNotes(notes, grid = 0.25) {
    return notes.map(note => {
        const newStart = Math.round(note.startTime / grid) * grid;
        const durationGrids = Math.round(note.duration / grid);
        const newDuration = Math.max(1, durationGrids) * grid;
        return new MidiNote(note.pitch, newStart, newDuration, note.velocity, note.channel);
    });
}

function cropMidi(midi, startTime, endTime) {
    const beatsPerSecond = midi.tempo / 60;
    const startBeats = startTime * beatsPerSecond;
    const endBeats = endTime * beatsPerSecond;

    const result = new MidiFile();
    result.tempo = midi.tempo;
    result.timeSignature = midi.timeSignature;
    result.ticksPerBeat = midi.ticksPerBeat;
    result.title = midi.title;

    for (const track of midi.tracks) {
        const newTrack = new MidiTrack(track.name, [], track.instrument, track.channel);

        for (const note of track.notes) {
            if (note.endTime >= startBeats && note.startTime < endBeats) {
                const newStart = Math.max(0, note.startTime - startBeats);
                const newEnd = Math.min(endBeats - startBeats, note.endTime - startBeats);
                const newDuration = newEnd - newStart;

                if (newDuration > 0) {
                    newTrack.notes.push(new MidiNote(
                        note.pitch, newStart, newDuration, note.velocity, note.channel
                    ));
                }
            }
        }

        if (newTrack.notes.length > 0) {
            result.tracks.push(newTrack);
        }
    }

    return result;
}

// =============================================================================
// Symbol Rendering (Constants from legumes)
// =============================================================================

const EM = 6;                    // Base unit - half the space between staff lines
const LINE_HEIGHT = EM * 2;      // Space between staff lines (12)
const STAFF_LINES = 5;
const STAFF_HEIGHT = LINE_HEIGHT * (STAFF_LINES - 1);  // 48
const NOTE_WIDTH = 10;           // Width of a note head
const BEAT_WIDTH = 30;           // Base horizontal space per beat
const CLEF_WIDTH = 40;           // Space for clef
const TIME_SIG_WIDTH = 25;       // Space for time signature
const MEASURE_PADDING = 10;      // Padding at start/end of measure

function ellipse(cx, cy, rx, ry, rotation = 0, segments = 24) {
    const points = [];
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    for (let i = 0; i <= segments; i++) {
        const angle = (2 * Math.PI * i) / segments;
        const x = rx * Math.cos(angle);
        const y = ry * Math.sin(angle);
        const px = cx + x * cosR - y * sinR;
        const py = cy + x * sinR + y * cosR;
        points.push({ x: px, y: py });
    }
    return points;
}

const SYMBOLS = {
    noteHeadWhole(x, y, size = 1.0) {
        const rx = 4.5 * size;
        const ry = 3.2 * size;
        return [
            ellipse(x, y, rx, ry, -0.2),
            ellipse(x, y, rx * 0.5, ry * 0.6, 0.3)
        ];
    },

    noteHeadHalf(x, y, size = 1.0) {
        const rx = 4.2 * size;
        const ry = 3.0 * size;
        return [
            ellipse(x, y, rx, ry, -0.25),
            ellipse(x, y, rx * 0.55, ry * 0.5, 0.2)
        ];
    },

    noteHeadFilled(x, y, size = 1.0) {
        const rx = 4.0 * size;
        const ry = 2.8 * size;
        const polys = [];
        for (let i = 0; i < 4; i++) {
            const r = 1 - i * 0.25;
            polys.push(ellipse(x, y, rx * r, ry * r, -0.25));
        }
        return polys;
    },

    stem(x, yStart, yEnd) {
        return [[{ x, y: yStart }, { x, y: yEnd }]];
    },

    flagDown(x, y, count = 1, size = 1.0) {
        const polys = [];
        const spacing = 6 * size;
        for (let i = 0; i < count; i++) {
            const flagY = y + i * spacing;
            polys.push([
                { x, y: flagY },
                { x: x + 3 * size, y: flagY + 3 * size },
                { x: x + 6 * size, y: flagY + 8 * size },
                { x: x + 8 * size, y: flagY + 12 * size }
            ]);
        }
        return polys;
    },

    flagUp(x, y, count = 1, size = 1.0) {
        const polys = [];
        const spacing = 6 * size;
        for (let i = 0; i < count; i++) {
            const flagY = y - i * spacing;
            polys.push([
                { x, y: flagY },
                { x: x + 3 * size, y: flagY - 3 * size },
                { x: x + 6 * size, y: flagY - 8 * size },
                { x: x + 8 * size, y: flagY - 12 * size }
            ]);
        }
        return polys;
    },

    trebleClef(x, y, size = 1.0) {
        const s = size;
        const clef = [
            { x: x + 2*s, y: y - 25*s }, { x: x + 0*s, y: y - 22*s },
            { x: x - 2*s, y: y - 15*s }, { x: x - 3*s, y: y - 8*s },
            { x: x - 2*s, y: y - 2*s }, { x: x + 1*s, y: y + 3*s },
            { x: x + 5*s, y: y + 5*s }, { x: x + 8*s, y: y + 3*s },
            { x: x + 9*s, y: y - 2*s }, { x: x + 8*s, y: y - 8*s },
            { x: x + 5*s, y: y - 12*s }, { x: x + 0*s, y: y - 12*s },
            { x: x - 4*s, y: y - 8*s }, { x: x - 5*s, y: y - 2*s },
            { x: x - 4*s, y: y + 5*s }, { x: x - 1*s, y: y + 12*s },
            { x: x + 3*s, y: y + 16*s }, { x: x + 6*s, y: y + 14*s },
            { x: x + 7*s, y: y + 10*s }, { x: x + 5*s, y: y + 6*s },
            { x: x + 2*s, y: y + 4*s }, { x: x + 0*s, y: y + 6*s },
            { x: x + 0*s, y: y + 10*s }, { x: x + 2*s, y: y + 13*s }
        ];
        const tail = [
            { x: x + 2*s, y: y - 25*s }, { x: x + 3*s, y: y - 30*s },
            { x: x + 2*s, y: y - 34*s }, { x: x + 0*s, y: y - 36*s }
        ];
        return [clef, tail];
    },

    sharp(x, y, size = 1.0) {
        const s = size;
        return [
            [{ x: x - 2*s, y: y - 8*s }, { x: x - 2*s, y: y + 8*s }],
            [{ x: x + 2*s, y: y - 8*s }, { x: x + 2*s, y: y + 8*s }],
            [{ x: x - 5*s, y: y - 3*s }, { x: x + 5*s, y: y - 1*s }],
            [{ x: x - 5*s, y: y + 1*s }, { x: x + 5*s, y: y + 3*s }]
        ];
    },

    dot(x, y, size = 1.0) {
        return [ellipse(x, y, 1.5 * size, 1.5 * size, 0, 12)];
    },

    staffLines(xStart, xEnd, yCenter, lineHeight = LINE_HEIGHT) {
        const lines = [];
        const halfHeight = (STAFF_LINES - 1) * lineHeight / 2;
        for (let i = 0; i < STAFF_LINES; i++) {
            const y = yCenter - halfHeight + i * lineHeight;
            lines.push([{ x: xStart, y }, { x: xEnd, y }]);
        }
        return lines;
    },

    ledgerLine(x, y, size = 1.0) {
        const w = 8 * size;
        return [[{ x: x - w, y }, { x: x + w, y }]];
    },

    barLine(x, yTop, yBottom) {
        return [[{ x, y: yTop }, { x, y: yBottom }]];
    },

    doubleBarLine(x, yTop, yBottom, spacing = 4) {
        return [
            [{ x, y: yTop }, { x, y: yBottom }],
            [
                { x: x + spacing, y: yTop },
                { x: x + spacing + 2, y: yTop },
                { x: x + spacing + 2, y: yBottom },
                { x: x + spacing, y: yBottom },
                { x: x + spacing, y: yTop }
            ]
        ];
    },

    timeSignature(x, y, top, bottom, size = 1.0) {
        const topPolys = numberPolylines(top, x, y + 9 * size, size);
        const bottomPolys = numberPolylines(bottom, x, y - 9 * size, size);
        return [...topPolys, ...bottomPolys];
    }
};

// Number stroke definitions for time signatures
const NUMBER_STROKES = {
    '0': [[[0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.2], [0.8, 0], [0.2, 0]]],
    '1': [[[0.3, 0.8], [0.5, 1], [0.5, 0]], [[0.2, 0], [0.8, 0]]],
    '2': [[[0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.6], [0, 0], [1, 0]]],
    '3': [[[0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [0.8, 0.5], [0.5, 0.5]], [[0.8, 0.5], [1, 0.3], [1, 0.2], [0.8, 0], [0.2, 0], [0, 0.2]]],
    '4': [[[0.8, 0], [0.8, 1], [0, 0.3], [1, 0.3]]],
    '5': [[[1, 1], [0, 1], [0, 0.5], [0.8, 0.5], [1, 0.3], [1, 0.2], [0.8, 0], [0.2, 0], [0, 0.2]]],
    '6': [[[0.8, 1], [0.2, 1], [0, 0.8], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 0.4], [0.8, 0.5], [0, 0.5]]],
    '7': [[[0, 1], [1, 1], [0.4, 0]]],
    '8': [[[0.5, 0.5], [0.2, 0.5], [0, 0.7], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.7], [0.8, 0.5], [0.5, 0.5]], [[0.5, 0.5], [0.2, 0.5], [0, 0.3], [0, 0.2], [0.2, 0], [0.8, 0], [1, 0.2], [1, 0.3], [0.8, 0.5], [0.5, 0.5]]],
    '9': [[[1, 0.5], [0.2, 0.5], [0, 0.6], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.2], [0.8, 0], [0.2, 0]]]
};

function numberPolylines(num, x, y, size = 1.0) {
    const digits = String(num);
    const charWidth = 10 * size;
    const charHeight = 14 * size;
    const charSpacing = 2 * size;
    const totalWidth = digits.length * charWidth + (digits.length - 1) * charSpacing;
    let startX = x - totalWidth / 2;

    const result = [];
    for (let i = 0; i < digits.length; i++) {
        const charX = startX + i * (charWidth + charSpacing);
        const charY = y - charHeight / 2;
        const strokes = NUMBER_STROKES[digits[i]] || [];

        for (const stroke of strokes) {
            const poly = stroke.map(([px, py]) => ({
                x: charX + px * charWidth,
                y: charY + py * charHeight
            }));
            result.push(poly);
        }
    }
    return result;
}

// =============================================================================
// Renderer
// =============================================================================

function getNoteDurationType(duration) {
    // Check for dotted notes
    if (Math.abs(duration - 3.0) < 0.1) return ['half', 1];
    if (Math.abs(duration - 1.5) < 0.1) return ['quarter', 1];
    if (Math.abs(duration - 0.75) < 0.1) return ['eighth', 1];

    // Standard durations
    if (duration >= 3.5) return ['whole', 0];
    if (duration >= 1.5) return ['half', 0];
    if (duration >= 0.75) return ['quarter', 0];
    if (duration >= 0.375) return ['eighth', 0];
    return ['sixteenth', 0];
}

function getStemDirection(staffPosition) {
    return staffPosition >= 6 ? -1 : 1;
}

function renderScore(midi, config = {}) {
    const cfg = {
        pageMarginX: 40,
        pageMarginY: 40,
        staffSpacing: 80,           // Vertical space between staff rows
        beatsPerMeasure: midi.timeSignature[0] || 4,
        measuresPerRow: 4,          // Target measures per row
        noteScale: 1.0,
        stemLength: EM * 7,
        drawClef: true,
        drawTimeSignature: true,
        drawBarLines: true,
        pageWidth: 800,
        pageHeight: 600,
        ...config
    };

    const polylines = [];

    let allNotes = midi.getAllNotes();
    if (allNotes.length === 0) return polylines;

    // Quantize notes to 16th note grid
    allNotes = quantizeNotes(allNotes, 0.25);

    const totalBeats = Math.max(...allNotes.map(n => n.endTime), cfg.beatsPerMeasure);
    const numMeasures = Math.ceil(totalBeats / cfg.beatsPerMeasure);

    // Calculate layout dimensions
    const usableWidth = cfg.pageWidth - 2 * cfg.pageMarginX;
    const firstRowClefSpace = cfg.drawClef ? CLEF_WIDTH : 0;
    const firstRowTimeSigSpace = cfg.drawTimeSignature ? TIME_SIG_WIDTH : 0;

    // Calculate measure width to fit measuresPerRow
    const measureContentWidth = (usableWidth - firstRowClefSpace - firstRowTimeSigSpace) / cfg.measuresPerRow;
    const beatWidth = (measureContentWidth - 2 * MEASURE_PADDING) / cfg.beatsPerMeasure;

    // Build measure data
    const measures = [];
    for (let i = 0; i < numMeasures; i++) {
        const startBeat = i * cfg.beatsPerMeasure;
        const endBeat = (i + 1) * cfg.beatsPerMeasure;
        const measureNotes = allNotes.filter(n => n.startTime >= startBeat && n.startTime < endBeat);
        measures.push({ number: i + 1, startBeat, endBeat, notes: measureNotes });
    }

    // Calculate actual measures per row (may be fewer on last row)
    const rowCount = Math.ceil(numMeasures / cfg.measuresPerRow);

    for (let row = 0; row < rowCount; row++) {
        const rowY = cfg.pageMarginY + row * (STAFF_HEIGHT + cfg.staffSpacing);
        const staffCenterY = rowY + STAFF_HEIGHT / 2;
        const rowStartX = cfg.pageMarginX;

        const startMeasure = row * cfg.measuresPerRow;
        const endMeasure = Math.min(startMeasure + cfg.measuresPerRow, numMeasures);
        const measuresThisRow = endMeasure - startMeasure;

        // Calculate row width
        const clefSpace = cfg.drawClef ? CLEF_WIDTH : 0;
        const timeSigSpace = (cfg.drawTimeSignature && row === 0) ? TIME_SIG_WIDTH : 0;
        const rowContentWidth = usableWidth - clefSpace - timeSigSpace;
        const actualMeasureWidth = rowContentWidth / measuresThisRow;
        const actualBeatWidth = (actualMeasureWidth - 2 * MEASURE_PADDING) / cfg.beatsPerMeasure;

        const rowEndX = rowStartX + usableWidth;

        // Draw staff lines
        polylines.push(...SYMBOLS.staffLines(rowStartX, rowEndX, staffCenterY, LINE_HEIGHT));

        // Draw clef
        if (cfg.drawClef) {
            polylines.push(...SYMBOLS.trebleClef(rowStartX + 15, staffCenterY, 0.8));
        }

        // Draw time signature (first row only)
        if (cfg.drawTimeSignature && row === 0) {
            polylines.push(...SYMBOLS.timeSignature(
                rowStartX + clefSpace + 10, staffCenterY,
                midi.timeSignature[0], midi.timeSignature[1], 0.8
            ));
        }

        const measureStartX = rowStartX + clefSpace + timeSigSpace;

        for (let mIdx = startMeasure; mIdx < endMeasure; mIdx++) {
            const measure = measures[mIdx];
            const measureIdx = mIdx - startMeasure;
            const measureX = measureStartX + measureIdx * actualMeasureWidth + MEASURE_PADDING;

            // Draw bar line at start of measure (except first)
            if (cfg.drawBarLines && measureIdx > 0) {
                const barX = measureStartX + measureIdx * actualMeasureWidth;
                polylines.push(...SYMBOLS.barLine(
                    barX,
                    staffCenterY - STAFF_HEIGHT / 2,
                    staffCenterY + STAFF_HEIGHT / 2
                ));
            }

            // Render notes
            for (const note of measure.notes) {
                const beatInMeasure = note.startTime - measure.startBeat;
                const noteX = measureX + beatInMeasure * actualBeatWidth;

                // Convert staff position to Y coordinate
                // staffPosition: 0 = middle C, 2 = E4 (bottom line), 6 = B4 (middle line), 10 = F5 (top line)
                const position = note.staffPosition;
                // Y increases downward, staff center is at B4 (position 6)
                // Each position is half a line height
                const noteY = staffCenterY + (6 - position) * EM;

                const [noteType, dots] = getNoteDurationType(note.duration);
                const stemDir = getStemDirection(position);

                // Draw note head
                if (noteType === 'whole') {
                    polylines.push(...SYMBOLS.noteHeadWhole(noteX, noteY, cfg.noteScale));
                } else if (noteType === 'half') {
                    polylines.push(...SYMBOLS.noteHeadHalf(noteX, noteY, cfg.noteScale));
                } else {
                    polylines.push(...SYMBOLS.noteHeadFilled(noteX, noteY, cfg.noteScale));
                }

                // Draw stem
                if (noteType !== 'whole') {
                    const stemX = noteX + (stemDir > 0 ? 4 : -4) * cfg.noteScale;
                    const stemYEnd = noteY - stemDir * cfg.stemLength;
                    polylines.push(...SYMBOLS.stem(stemX, noteY, stemYEnd));

                    // Draw flags
                    let flagCount = 0;
                    if (noteType === 'eighth') flagCount = 1;
                    else if (noteType === 'sixteenth') flagCount = 2;

                    if (flagCount > 0) {
                        if (stemDir > 0) {
                            polylines.push(...SYMBOLS.flagUp(stemX, stemYEnd, flagCount));
                        } else {
                            polylines.push(...SYMBOLS.flagDown(stemX, stemYEnd, flagCount));
                        }
                    }
                }

                // Draw accidental
                if (note.accidental === 'sharp') {
                    polylines.push(...SYMBOLS.sharp(noteX - 12 * cfg.noteScale, noteY, cfg.noteScale * 0.8));
                }

                // Draw dots
                if (dots > 0) {
                    const dotX = noteX + 8 * cfg.noteScale;
                    for (let d = 0; d < dots; d++) {
                        polylines.push(...SYMBOLS.dot(dotX + d * 5 * cfg.noteScale, noteY, cfg.noteScale));
                    }
                }

                // Draw ledger lines
                // Staff lines are at positions 2, 4, 6, 8, 10 (E4, G4, B4, D5, F5)
                // Ledger lines needed below position 2 or above position 10
                if (position < 2) {
                    // Ledger lines below staff (C4=0, middle C needs one ledger)
                    for (let ledgerPos = 0; ledgerPos >= position; ledgerPos -= 2) {
                        const ledgerY = staffCenterY + (6 - ledgerPos) * EM;
                        polylines.push(...SYMBOLS.ledgerLine(noteX, ledgerY, cfg.noteScale));
                    }
                } else if (position > 10) {
                    // Ledger lines above staff
                    for (let ledgerPos = 12; ledgerPos <= position; ledgerPos += 2) {
                        const ledgerY = staffCenterY + (6 - ledgerPos) * EM;
                        polylines.push(...SYMBOLS.ledgerLine(noteX, ledgerY, cfg.noteScale));
                    }
                }
            }
        }

        // Draw final bar line at end of row
        if (cfg.drawBarLines) {
            const finalBarX = rowEndX;
            if (row === rowCount - 1) {
                polylines.push(...SYMBOLS.doubleBarLine(
                    finalBarX - 8,
                    staffCenterY - STAFF_HEIGHT / 2,
                    staffCenterY + STAFF_HEIGHT / 2
                ));
            } else {
                polylines.push(...SYMBOLS.barLine(
                    finalBarX,
                    staffCenterY - STAFF_HEIGHT / 2,
                    staffCenterY + STAFF_HEIGHT / 2
                ));
            }
        }
    }

    return polylines;
}

function renderMidiToPolylines(midiData, startTime = 0, endTime = 0, pageWidth = 800, pageHeight = 600) {
    const midi = parseMidi(midiData);

    // Default layout: 4 measures per row
    const measuresPerRow = 4;
    const pageMargin = 40;
    const staffSpacing = 80;
    const beatsPerMeasure = midi.timeSignature[0] || 4;

    if (endTime <= 0) {
        // Auto-fit: calculate how much music fits on the page
        const usableHeight = pageHeight - 2 * pageMargin;
        const rows = Math.max(1, Math.floor(usableHeight / (STAFF_HEIGHT + staffSpacing)));
        const totalMeasures = measuresPerRow * rows;
        const totalBeats = totalMeasures * beatsPerMeasure;
        endTime = (totalBeats / midi.tempo) * 60;
    }

    let processedMidi = midi;
    if (startTime > 0 || endTime > 0) {
        processedMidi = cropMidi(midi, startTime, endTime);
    }

    return renderScore(processedMidi, { pageWidth, pageHeight, measuresPerRow });
}

// =============================================================================
// Worker Handler
// =============================================================================

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        try {
            const contentType = request.headers.get('Content-Type') || '';
            let midiData;
            let startTime = 0;
            let endTime = 0;
            let pageWidth = 800;
            let pageHeight = 600;

            if (contentType.includes('multipart/form-data')) {
                const formData = await request.formData();
                const file = formData.get('file');
                if (!file) {
                    throw new Error('No MIDI file provided');
                }
                midiData = await file.arrayBuffer();
                startTime = parseFloat(formData.get('start_time') || '0');
                endTime = parseFloat(formData.get('end_time') || '0');
                pageWidth = parseFloat(formData.get('page_width') || '800');
                pageHeight = parseFloat(formData.get('page_height') || '600');
            } else if (contentType.includes('application/json')) {
                const json = await request.json();
                if (!json.midi_data) {
                    throw new Error('No MIDI data provided');
                }
                // Expect base64 encoded MIDI data
                const binaryString = atob(json.midi_data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                midiData = bytes.buffer;
                startTime = json.start_time || 0;
                endTime = json.end_time || 0;
                pageWidth = json.page_width || 800;
                pageHeight = json.page_height || 600;
            } else {
                // Assume raw MIDI data
                midiData = await request.arrayBuffer();
            }

            const polylines = renderMidiToPolylines(midiData, startTime, endTime, pageWidth, pageHeight);

            // Convert to output format matching what the app expects
            const paths = polylines.map(line => line.map(p => ({ x: p.x, y: p.y })));

            return new Response(JSON.stringify({
                success: true,
                paths: paths,
                count: paths.length
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });

        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    }
};

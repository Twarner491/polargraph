# Perlin noise implementation
# Ported from fishdraw.js

import math
from typing import Optional

PERLIN_SIZE = 4095
PERLIN_YWRAPB = 4
PERLIN_YWRAP = 1 << PERLIN_YWRAPB
PERLIN_ZWRAPB = 8
PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB


class PerlinNoise:
    """Perlin noise generator with seeded PRNG."""

    def __init__(self, seed: int = 0x5EED):
        self.jsr = seed
        self.perlin_octaves = 4
        self.perlin_amp_falloff = 0.5
        self.perlin: Optional[list] = None

    def rand(self) -> float:
        """Xorshift random number generator."""
        self.jsr ^= (self.jsr << 17) & 0xFFFFFFFF
        self.jsr ^= (self.jsr >> 13) & 0xFFFFFFFF
        self.jsr ^= (self.jsr << 5) & 0xFFFFFFFF
        self.jsr &= 0xFFFFFFFF
        return self.jsr / 4294967295

    def _scaled_cosine(self, i: float) -> float:
        """Scaled cosine interpolation."""
        return 0.5 * (1.0 - math.cos(i * math.pi))

    def noise(self, x: float, y: float = 0, z: float = 0) -> float:
        """Generate Perlin noise value at (x, y, z)."""
        if self.perlin is None:
            self.perlin = [self.rand() for _ in range(PERLIN_SIZE + 1)]

        x = abs(x)
        y = abs(y)
        z = abs(z)

        xi = int(x)
        yi = int(y)
        zi = int(z)

        xf = x - xi
        yf = y - yi
        zf = z - zi

        r = 0.0
        ampl = 0.5

        for _ in range(self.perlin_octaves):
            of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB)

            rxf = self._scaled_cosine(xf)
            ryf = self._scaled_cosine(yf)

            n1 = self.perlin[of & PERLIN_SIZE]
            n1 += rxf * (self.perlin[(of + 1) & PERLIN_SIZE] - n1)
            n2 = self.perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE]
            n2 += rxf * (self.perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2)
            n1 += ryf * (n2 - n1)

            of += PERLIN_ZWRAP
            n2 = self.perlin[of & PERLIN_SIZE]
            n2 += rxf * (self.perlin[(of + 1) & PERLIN_SIZE] - n2)
            n3 = self.perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE]
            n3 += rxf * (self.perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3)
            n2 += ryf * (n3 - n2)

            n1 += self._scaled_cosine(zf) * (n2 - n1)

            r += n1 * ampl
            ampl *= self.perlin_amp_falloff

            xi <<= 1
            xf *= 2
            yi <<= 1
            yf *= 2
            zi <<= 1
            zf *= 2

            if xf >= 1.0:
                xi += 1
                xf -= 1
            if yf >= 1.0:
                yi += 1
                yf -= 1
            if zf >= 1.0:
                zi += 1
                zf -= 1

        return r

    def reset(self, seed: int = 0x5EED):
        """Reset the PRNG with a new seed."""
        self.jsr = seed
        self.perlin = None


# Global instance for simple usage
_noise = PerlinNoise()


def noise(x: float, y: float = 0, z: float = 0) -> float:
    """Generate Perlin noise value at (x, y, z)."""
    return _noise.noise(x, y, z)


def rand() -> float:
    """Get random value from the noise generator's PRNG."""
    return _noise.rand()


def seed(s: int):
    """Reset the global noise generator with a new seed."""
    _noise.reset(s)


def create_noise(seed_val: int = 0x5EED) -> PerlinNoise:
    """Create a new independent noise generator."""
    return PerlinNoise(seed_val)

import * as THREE from 'three';

export type ThreeCoordinate = [number, number, number];

type Point2D = {
    x: number;
    z: number;
};

class Triangulation {
    static validateTopology(rings: readonly (readonly ThreeCoordinate[])[]): ThreeCoordinate[][] {
        if (rings.length === 0) {
            throw new Error("A polygon must contain an outer ring.");
        }

        const normalizedRings = rings.map((ring) => {
            const points = ring.map(([x, y, z]) => {
                if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                    throw new Error("Polygon coordinates must be finite.");
                }
                return [x, 0, z] as ThreeCoordinate;
            });

            if (
                points.length > 1
                && points[0]![0] === points[points.length - 1]![0]
                && points[0]![2] === points[points.length - 1]![2]
            ) {
                points.pop();
            }
            if (points.length < 3) {
                throw new Error("Each polygon ring must contain at least three distinct points.");
            }
            for (let index = 0; index < points.length; index += 1) {
                const current = points[index]!;
                const next = points[(index + 1) % points.length]!;
                if (current[0] === next[0] && current[2] === next[2]) {
                    throw new Error("Polygon rings must not contain duplicate consecutive points.");
                }
            }

            const twoDimensional = points.map(([x, , z]) => ({ x, z }));
            const tolerance = tolerances(twoDimensional);
            if (Math.abs(signedDoubleArea(twoDimensional)) <= tolerance.area) {
                throw new Error("Polygon rings must enclose a non-zero area.");
            }
            if (hasSelfIntersection(twoDimensional, tolerance)) {
                throw new Error("Polygon rings must not self-intersect.");
            }
            return points;
        });

        const outer = toPoints(normalizedRings[0]!);
        for (let holeIndex = 1; holeIndex < normalizedRings.length; holeIndex += 1) {
            const hole = toPoints(normalizedRings[holeIndex]!);
            if (ringsIntersect(outer, hole, tolerances([...outer, ...hole]))) {
                throw new Error("Polygon holes must not intersect the outer ring.");
            }
            if (!pointInRing(hole[0]!, outer)) {
                throw new Error("Polygon holes must be inside the outer ring.");
            }

            for (let otherIndex = 1; otherIndex < holeIndex; otherIndex += 1) {
                const otherHole = toPoints(normalizedRings[otherIndex]!);
                const tolerance = tolerances([...hole, ...otherHole]);
                if (
                    ringsIntersect(hole, otherHole, tolerance)
                    || pointInRing(hole[0]!, otherHole)
                    || pointInRing(otherHole[0]!, hole)
                ) {
                    throw new Error("Polygon holes must not overlap or contain one another.");
                }
            }
        }

        return normalizedRings;
    }

    static createExtrudedGeometry(
        rings: readonly (readonly ThreeCoordinate[])[],
        levels: readonly number[],
    ): THREE.BufferGeometry {
        const validRings = Triangulation.validateTopology(rings);
        if (
            levels.length < 2
            || levels[0] !== 0
            || levels.some((level, index) =>
                !Number.isFinite(level) || (index > 0 && level <= levels[index - 1]!))
        ) {
            throw new Error("Extrusion levels must be finite and strictly increasing from zero.");
        }

        const height = levels[levels.length - 1]!;
        const pointRings = validRings.map(toPoints);
        const contour = pointRings[0];
        if (!contour) {
            throw new Error("A polygon must contain an outer ring.");
        }
        const holes = pointRings.slice(1);
        const capFaces = THREE.ShapeUtils.triangulateShape(
            contour.map(({ x, z }) => new THREE.Vector2(x, z)),
            holes.map((hole) => hole.map(({ x, z }) => new THREE.Vector2(x, z))),
        );
        const points = pointRings.flat();
        const expectedCapFaceCount = points.length + (holes.length * 2) - 2;
        if (capFaces.length !== expectedCapFaceCount) {
            throw new Error("The polygon could not be triangulated into a complete cap.");
        }

        const positions: number[] = [];
        for (const level of levels) {
            const normalizedLevel = level / height;
            for (const point of points) {
                positions.push(point.x, normalizedLevel, point.z);
            }
        }

        const pointCount = points.length;
        const topOffset = (levels.length - 1) * pointCount;
        const indices: number[] = [];
        for (const [a, b, c] of capFaces) {
            const pointA = points[a]!;
            const pointB = points[b]!;
            const pointC = points[c]!;
            const winding = (pointB.x - pointA.x) * (pointC.z - pointA.z)
                - (pointB.z - pointA.z) * (pointC.x - pointA.x);

            if (winding > 0) {
                indices.push(a, b, c, topOffset + a, topOffset + c, topOffset + b);
            } else {
                indices.push(a, c, b, topOffset + a, topOffset + b, topOffset + c);
            }
        }

        let ringOffset = 0;
        for (let ringIndex = 0; ringIndex < pointRings.length; ringIndex += 1) {
            const ring = pointRings[ringIndex]!;
            const counterClockwise = signedDoubleArea(ring) > 0;
            const reverse = ringIndex === 0 ? counterClockwise : !counterClockwise;

            for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
                const lowerOffset = levelIndex * pointCount;
                const upperOffset = (levelIndex + 1) * pointCount;
                for (let index = 0; index < ring.length; index += 1) {
                    const start = ringOffset + index;
                    const end = ringOffset + ((index + 1) % ring.length);
                    const lowerStart = lowerOffset + start;
                    const lowerEnd = lowerOffset + end;
                    const upperStart = upperOffset + start;
                    const upperEnd = upperOffset + end;

                    if (reverse) {
                        indices.push(lowerStart, upperEnd, lowerEnd, lowerStart, upperStart, upperEnd);
                    } else {
                        indices.push(lowerStart, lowerEnd, upperEnd, lowerStart, upperEnd, upperStart);
                    }
                }
            }
            ringOffset += ring.length;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        // Applying the vertical scale also transforms normals with its inverse transpose.
        geometry.applyMatrix4(new THREE.Matrix4().makeScale(1, height, 1));
        return geometry;
    }
}

function toPoints(ring: readonly ThreeCoordinate[]): Point2D[] {
    return ring.map(([x, , z]) => ({ x, z }));
}

function signedDoubleArea(ring: readonly Point2D[]): number {
    const origin = ring[0]!;
    let area = 0;
    for (let index = 1; index < ring.length - 1; index += 1) {
        const current = ring[index]!;
        const next = ring[index + 1]!;
        area += (current.x - origin.x) * (next.z - origin.z)
            - (current.z - origin.z) * (next.x - origin.x);
    }
    return area;
}

function tolerances(points: readonly Point2D[]): { coordinate: number; orientation: number; area: number } {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const { x, z } of points) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
    }
    const scale = Math.max(1, maxX - minX, maxZ - minZ);
    const coordinate = Number.EPSILON * scale * 32;
    const orientation = Number.EPSILON * scale * scale * 32;
    return { coordinate, orientation, area: orientation * points.length };
}

function hasSelfIntersection(
    ring: readonly Point2D[],
    tolerance: { coordinate: number; orientation: number },
): boolean {
    for (let first = 0; first < ring.length; first += 1) {
        const firstNext = (first + 1) % ring.length;
        for (let second = first + 1; second < ring.length; second += 1) {
            const secondNext = (second + 1) % ring.length;
            if (first === second || firstNext === second || secondNext === first) {
                continue;
            }
            if (segmentsIntersect(ring[first]!, ring[firstNext]!, ring[second]!, ring[secondNext]!, tolerance)) {
                return true;
            }
        }
    }
    return false;
}

function ringsIntersect(
    first: readonly Point2D[],
    second: readonly Point2D[],
    tolerance: { coordinate: number; orientation: number },
): boolean {
    for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
        const firstNext = (firstIndex + 1) % first.length;
        for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
            const secondNext = (secondIndex + 1) % second.length;
            if (
                segmentsIntersect(
                    first[firstIndex]!,
                    first[firstNext]!,
                    second[secondIndex]!,
                    second[secondNext]!,
                    tolerance,
                )
            ) {
                return true;
            }
        }
    }
    return false;
}

function segmentsIntersect(
    a: Point2D,
    b: Point2D,
    c: Point2D,
    d: Point2D,
    tolerance: { coordinate: number; orientation: number },
): boolean {
    const abC = orientation(a, b, c);
    const abD = orientation(a, b, d);
    const cdA = orientation(c, d, a);
    const cdB = orientation(c, d, b);

    if (abC * abD < 0 && cdA * cdB < 0) {
        return true;
    }
    return (
        (Math.abs(abC) <= tolerance.orientation && onSegment(a, b, c, tolerance.coordinate))
        || (Math.abs(abD) <= tolerance.orientation && onSegment(a, b, d, tolerance.coordinate))
        || (Math.abs(cdA) <= tolerance.orientation && onSegment(c, d, a, tolerance.coordinate))
        || (Math.abs(cdB) <= tolerance.orientation && onSegment(c, d, b, tolerance.coordinate))
    );
}

function orientation(a: Point2D, b: Point2D, c: Point2D): number {
    return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function onSegment(a: Point2D, b: Point2D, point: Point2D, tolerance: number): boolean {
    return (
        point.x >= Math.min(a.x, b.x) - tolerance
        && point.x <= Math.max(a.x, b.x) + tolerance
        && point.z >= Math.min(a.z, b.z) - tolerance
        && point.z <= Math.max(a.z, b.z) + tolerance
    );
}

function pointInRing(point: Point2D, ring: readonly Point2D[]): boolean {
    let inside = false;
    for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current, current += 1) {
        const currentPoint = ring[current]!;
        const previousPoint = ring[previous]!;
        const crosses = (currentPoint.z > point.z) !== (previousPoint.z > point.z)
            && point.x < (
                ((previousPoint.x - currentPoint.x) * (point.z - currentPoint.z))
                / (previousPoint.z - currentPoint.z)
            ) + currentPoint.x;
        if (crosses) {
            inside = !inside;
        }
    }
    return inside;
}

export default Triangulation;
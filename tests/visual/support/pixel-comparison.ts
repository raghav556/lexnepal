export function compareRgbPixels(
  actual: Uint8Array,
  expected: Uint8Array,
  width: number,
  height: number,
) {
  const expectedLength = width * height * 3;
  if (
    width <= 0 ||
    height <= 0 ||
    actual.length !== expectedLength ||
    expected.length !== expectedLength
  ) {
    throw new Error("Visual comparisons require identical unscaled RGB dimensions");
  }
  let changedPixels = 0;
  let absoluteDifference = 0;
  for (let pixel = 0; pixel < width * height; pixel++) {
    let changed = false;
    for (let channel = 0; channel < 3; channel++) {
      const offset = pixel * 3 + channel;
      const difference = Math.abs(actual[offset] - expected[offset]);
      absoluteDifference += difference;
      if (difference > 0) changed = true;
    }
    if (changed) changedPixels++;
  }
  return {
    changedPixels,
    changedRatio: changedPixels / (width * height),
    meanAbsoluteChannelDifference: absoluteDifference / expectedLength,
  };
}
